'use strict';
// "100 estudiantes dijeron" — juego individual multijugador (OCUN · UABC Tijuana)
// Flujo: Bienvenida (avatar + registro) → Juego (una pregunta a la vez) → ¡Gracias! → Resultados + Top 10.
// Las respuestas correctas salen de los reportes históricos de Tijuana (data/preguntas.js).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normKey, sameKey, titleCase } = require('./lib/texto');
const { validarNombreReal, validarTextoLibre, esOfensivo } = require('./lib/filtro');
const { CATALOGO, unificarCarrera } = require('./lib/carreras');
const { crearAlmacen } = require('./lib/almacen');
const COLONIAS = require('./data/colonias');
const DATOS = require('./data/preguntas');
const HIST = require('./data/historico');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'nino2026';
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const MAX_TACHAS = 3;
const TOP = 10;
const C_CONFIG = 'juego_config', C_PARTIDAS = 'partidas', C_JUGADAS = 'jugadas', C_VOCES = 'voces';
const AVATAR_OK = /^([MHA][0-7]{10}|[0-7]{6})$/;
// Grabaciones que venían como archivos en public/audio: se cargan al banco de voces la primera vez
const AUDIO_INICIAL = { bienvenida: ['bienvenida'], invitacion: ['invitacion'], top: ['entra_top'], primero: ['nuevo_primero'], dijeron: ['correcta', 'dijeron'] };

// ---------------------------------------------------------------- estado
let almacen;
let config = configInicial();
const partidas = new Map();      // id -> partida
const jugadas = [];              // cada intento de respuesta
const voces = new Map();         // id -> { id, evento, mime, buf, creado }
const pendientes = new Set();
let configPendiente = false;
const ultimoIntento = new Map();

function configInicial() {
  return {
    titulo: '100 estudiantes dijeron',
    fuente: DATOS.meta.fuente, reportes: DATOS.meta.reportes,
    vozTTS: true,      // usar voz de computadora cuando un evento no tiene grabación
    creadores: [],
    preguntas: DATOS.preguntas.map(q => ({
      id: q.id, texto: q.texto, dato: q.dato, exp: q.exp || '', tip: q.tip || '', totalReportes: q.totalReportes,
      tablero: q.tablero.map(t => ({ texto: t.texto, reportes: t.reportes, puntos: t.puntos, alias: t.alias || [] }))
    }))
  };
}
const ahora = () => new Date().toISOString();
const limpiar = (t, max) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, max);

// ---------------------------------------------------------------- nombres y carreras
// En pantallas públicas: "Adolfo O." (nombre + inicial del apellido)
function nombrePublico(p) {
  if (!p.apellido) return p.nombre;
  const inicial = p.apellido.split(' ').find(w => !/^(de|del|la|las|los|y|san|santa|van|von|mc)$/i.test(w)) || p.apellido;
  return `${p.nombre} ${inicial.charAt(0).toUpperCase()}.`;
}
const nombreCompleto = p => p.apellido ? `${p.nombre} ${p.apellido}` : p.nombre;
// Unifica también las carreras guardadas antes de este cambio
function carreraDe(p) {
  if (p.estudiante === false) return '';
  if (!p.carrera) return '';
  return unificarCarrera(p.carrera) || titleCase(p.carrera);
}

// ---------------------------------------------------------------- comparación de respuestas
let indiceCol = null;
function indiceColonias() {
  if (indiceCol) return indiceCol;
  const vistos = new Map();
  for (const n of COLONIAS) { const k = normKey(n); if (k && !vistos.has(k)) vistos.set(k, n); }
  indiceCol = [...vistos].map(([key, nombre]) => ({ key, nombre }));
  return indiceCol;
}
function buscarEnTablero(tab, texto) {
  const k = normKey(texto);
  if (!k) return -1;
  const llaves = tab.map(t => [normKey(t.texto), ...t.alias.map(normKey)]);
  const i = llaves.findIndex(ls => ls.includes(k));
  if (i >= 0) return i;
  // si lo que escribió es claramente OTRA colonia conocida, no se le da por buena aunque se parezca
  const exacta = indiceColonias().find(c => c.key === k);
  if (exacta) return llaves.findIndex(ls => ls.includes(exacta.key));
  return llaves.findIndex(ls => ls.some(l => sameKey(l, k)));
}
function contarEn(mapa, texto) {
  if (!mapa) return null;
  const k = normKey(texto);
  let mejor = 0, hallada = false;
  for (const [nombre, n] of Object.entries(mapa)) {
    const nk = normKey(nombre);
    if (nk === k || sameKey(nk, k)) { hallada = true; if (n > mejor) mejor = n; }
  }
  return hallada ? mejor : 0;
}
function explicarError(q, colonia) {
  const s = n => (n === 1 ? '' : 's');
  const minTab = Math.min(...q.tablero.map(t => t.reportes || 0));
  const nTipo = contarEn(HIST[q.id], colonia);
  const nTotal = contarEn(HIST.q1, colonia);
  const conocida = indiceColonias().some(c => c.key === normKey(colonia) || sameKey(c.key, normKey(colonia)));
  if (nTipo === null) return 'No está entre las respuestas del tablero de esta pregunta.';
  if (nTipo > 0) return `Sí tiene ${nTipo} reporte${s(nTipo)} de esto, pero no le alcanza para el tablero: la última colonia del tablero tiene ${minTab}.`;
  if (q.id !== 'q1' && nTotal > 0) return `Tiene ${nTotal} reporte${s(nTotal)} por lluvia, pero ninguno de este tipo.`;
  if (conocida) return 'No tiene reportes en el histórico de Tijuana. Puede que sí le afecte la lluvia, pero nadie lo ha reportado: por eso es importante reportar.';
  return 'No la encontramos como colonia de Tijuana en el histórico. Revisa cómo se escribe.';
}
function nombreColonia(texto) {
  const k = normKey(texto);
  if (!k) return '';
  const c = indiceColonias().find(x => x.key === k) || indiceColonias().find(x => sameKey(x.key, k));
  return c ? c.nombre : titleCase(texto);
}

// ---------------------------------------------------------------- partidas
function crearPartida(datos) {
  const p = {
    id: crypto.randomUUID(), nombre: datos.nombre, apellido: datos.apellido, avatar: datos.avatar,
    estudiante: datos.estudiante, carrera: datos.carrera, colonia: datos.colonia,
    inicio: Date.now(), fin: null, ms: null, qIndex: 0, puntos: 0, terminada: false,
    progreso: {}, creada: ahora()
  };
  partidas.set(p.id, p);
  pendientes.add(p.id);
  return p;
}
function progresoDe(p, qid) {
  return p.progreso[qid] || (p.progreso[qid] = { encontrados: [], tachas: 0, puntos: 0, terminada: false });
}
function terminarPregunta(p) {
  const q = config.preguntas[p.qIndex];
  if (q) progresoDe(p, q.id).terminada = true;
  p.qIndex++;
  if (p.qIndex >= config.preguntas.length) {
    const antes = top().map(r => r.id);
    p.terminada = true;
    p.fin = Date.now();
    p.ms = p.fin - p.inicio;
    anunciarSiTop(p, antes);
  }
  pendientes.add(p.id);
}
function ranking() {
  return [...partidas.values()].filter(p => p.terminada && !p.oculta)
    .sort((a, b) => b.puntos - a.puntos || a.ms - b.ms || a.fin - b.fin);
}
function posicion(p) {
  const i = ranking().findIndex(x => x.id === p.id);
  return i >= 0 ? i + 1 : null;
}
const filaRanking = (p, i) => ({ lugar: i + 1, id: p.id, nombre: nombrePublico(p), avatar: p.avatar || '', puntos: p.puntos, ms: p.ms, carrera: carreraDe(p), fecha: p.creada });
function top() { return ranking().slice(0, TOP).map(filaRanking); }

function vistaPartida(p) {
  const total = config.preguntas.length;
  const base = { id: p.id, nombre: p.nombre, nombrePublico: nombrePublico(p), avatar: p.avatar || '', puntos: p.puntos, total, terminada: p.terminada, inicio: p.inicio };
  if (!p.terminada) {
    const q = config.preguntas[p.qIndex];
    const pr = progresoDe(p, q.id);
    return {
      ...base, transcurrido: Date.now() - p.inicio,
      pregunta: {
        id: q.id, numero: p.qIndex + 1, texto: q.texto, respuestas: q.tablero.length,
        tachas: pr.tachas, maxTachas: MAX_TACHAS, puntos: pr.puntos,
        encontradas: pr.encontrados.map(i => ({ indice: i, texto: q.tablero[i].texto, puntos: q.tablero[i].puntos }))
      }
    };
  }
  return {
    ...base, ms: p.ms, lugar: posicion(p), jugadores: ranking().length, top: top(),
    fuente: config.fuente, reportes: config.reportes,
    resultados: config.preguntas.map(q => {
      const pr = p.progreso[q.id] || { encontrados: [], puntos: 0, tachas: 0 };
      return {
        texto: q.texto, dato: q.dato, exp: q.exp || '', tip: q.tip || '', totalReportes: q.totalReportes, puntos: pr.puntos,
        maxPuntos: q.tablero.reduce((a, t) => a + t.puntos, 0),
        tablero: q.tablero.map((t, i) => ({ texto: t.texto, reportes: t.reportes, puntos: t.puntos, acerto: pr.encontrados.includes(i) })),
        errores: (pr.fallidas || []).slice(0, 3).map(c => ({ texto: c, motivo: explicarError(q, c) }))
      };
    })
  };
}

function responder(id, texto) {
  const p = partidas.get(id);
  if (!p) return { status: 404, error: 'Tu partida ya no existe, vuelve a empezar' };
  if (p.terminada) return { status: 409, error: 'Ya terminaste tu partida', partida: vistaPartida(p) };
  const t = Date.now();
  if (t - (ultimoIntento.get(id) || 0) < 400) return { status: 429, error: 'Más despacio 🙂' };
  ultimoIntento.set(id, t);
  const q = config.preguntas[p.qIndex];
  const pr = progresoDe(p, q.id);
  const limpio = limpiar(texto, 80);
  if (!normKey(limpio)) return { status: 400, error: 'Escribe una colonia' };
  if (esOfensivo(limpio)) return { status: 400, error: 'Escribe una colonia sin groserías 🙂' };

  const idx = buscarEnTablero(q.tablero, limpio);
  let resultado;
  if (idx >= 0 && pr.encontrados.includes(idx)) {
    resultado = { tipo: 'repetida', texto: q.tablero[idx].texto };
  } else if (idx >= 0) {
    pr.encontrados.push(idx);
    pr.puntos += q.tablero[idx].puntos;
    p.puntos += q.tablero[idx].puntos;
    resultado = { tipo: 'acierto', indice: idx, texto: q.tablero[idx].texto, puntos: q.tablero[idx].puntos };
  } else {
    pr.tachas++;
    pr.fallidas = pr.fallidas || [];
    pr.fallidas.push(nombreColonia(limpio));
    resultado = { tipo: 'tache', tachas: pr.tachas };
  }
  const jug = {
    partida: id, nombre: nombreCompleto(p), qid: q.id, pregunta: p.qIndex + 1, texto: limpio, colonia: nombreColonia(limpio),
    resultado: resultado.tipo, respuestaTablero: idx >= 0 ? q.tablero[idx].texto : '',
    puntos: resultado.tipo === 'acierto' ? resultado.puntos : 0, msDesdeInicio: t - p.inicio, fecha: ahora()
  };
  jugadas.push(jug);
  almacen.insert(C_JUGADAS, jug).catch(e => console.error('jugada', e.message));

  const fin = pr.tachas >= MAX_TACHAS || pr.encontrados.length >= q.tablero.length;
  if (fin) { resultado.finPregunta = true; resultado.completo = pr.encontrados.length >= q.tablero.length; terminarPregunta(p); }
  pendientes.add(id);
  return { ok: true, resultado, partida: vistaPartida(p) };
}

// ---------------------------------------------------------------- contador de personas
function personas(lista) {
  return new Set(lista.map(p => normKey(nombreCompleto(p)))).size;
}

// ---------------------------------------------------------------- análisis / dashboard
function analisis() {
  const lista = [...partidas.values()].filter(p => !p.oculta);
  const term = lista.filter(p => p.terminada);
  const prom = (arr, f) => arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0;
  const r1 = x => Math.round(x * 10) / 10;
  const cuenta = arr => {
    const m = new Map();
    for (const x of arr) if (x) m.set(x, (m.get(x) || 0) + 1);
    return [...m].map(([texto, n]) => ({ texto, n })).sort((a, b) => b.n - a.n);
  };
  const maxPuntos = config.preguntas.reduce((a, q) => a + q.tablero.reduce((s, t) => s + t.puntos, 0), 0);

  const porPregunta = config.preguntas.map(q => {
    const js = jugadas.filter(j => j.qid === q.id);
    const jugadores = new Set(js.map(j => j.partida));
    const jugaron = Math.max(jugadores.size, term.filter(p => p.progreso[q.id]).length);
    const hallaron = q.tablero.map(t => new Set(js.filter(j => j.respuestaTablero === t.texto && j.resultado === 'acierto').map(j => j.partida)).size);
    // Percepción vs realidad: % de jugadores que la mencionó vs % de los reportes de esa pregunta
    const hist = HIST[q.id] || null;
    const totalHist = hist ? Object.values(hist).reduce((a, b) => a + b, 0) : 0;
    const menciones = new Map();
    for (const j of js) {
      const nombre = j.respuestaTablero || j.colonia;
      if (!nombre) continue;
      if (!menciones.has(nombre)) menciones.set(nombre, new Set());
      menciones.get(nombre).add(j.partida);
    }
    const totalMenciones = [...menciones.values()].reduce((a, s) => a + s.size, 0);
    const nombres = new Set([...q.tablero.map(t => t.texto), ...[...menciones].sort((a, b) => b[1].size - a[1].size).slice(0, 8).map(x => x[0])]);
    const comparacion = [...nombres].map(nombre => {
      const t = q.tablero.find(x => x.texto === nombre);
      const rep = t ? t.reportes : (hist ? (contarEn(hist, nombre) || 0) : 0);
      const m = menciones.get(nombre);
      return {
        colonia: nombre, enTablero: !!t, reportes: rep,
        pctReal: totalHist ? r1(rep / totalHist * 100) : 0,
        pctCreen: totalMenciones ? r1((m ? m.size : 0) / totalMenciones * 100) : 0,
        jugadores: m ? m.size : 0
      };
    }).sort((a, b) => b.pctReal - a.pctReal || b.pctCreen - a.pctCreen);
    return {
      id: q.id, texto: q.texto, dato: q.dato, jugaron, intentos: js.length, totalReportes: totalHist,
      aciertos: js.filter(j => j.resultado === 'acierto').length,
      conocimiento: jugaron ? r1(hallaron.reduce((a, b) => a + b, 0) / (jugaron * q.tablero.length) * 100) : 0,
      puntosPromedio: r1(prom(term, p => (p.progreso[q.id] || {}).puntos || 0)),
      tablero: q.tablero.map((t, i) => ({ texto: t.texto, reportes: t.reportes, puntos: t.puntos, hallaron: hallaron[i], pct: jugaron ? r1(hallaron[i] / jugaron * 100) : 0 })),
      comparacion,
      mitos: cuenta(js.filter(j => j.resultado === 'tache').map(j => j.colonia)).slice(0, 8).map(x => ({ ...x, reportes: hist ? (contarEn(hist, x.texto) || 0) : null }))
    };
  });

  // partidas por día y por hora (hora de Tijuana)
  const fmtDia = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Tijuana', day: '2-digit', month: 'short' });
  const fmtHora = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Tijuana', hour: '2-digit', hour12: false });
  const dias = new Map(), horas = Array(24).fill(0);
  for (const p of lista.slice().sort((a, b) => a.inicio - b.inicio)) {
    const d = fmtDia.format(new Date(p.inicio));
    dias.set(d, (dias.get(d) || 0) + 1);
    horas[Number(fmtHora.format(new Date(p.inicio))) % 24]++;
  }
  // distribución de puntajes
  const tramos = 8, ancho = Math.max(1, Math.ceil(maxPuntos / tramos));
  const histograma = Array.from({ length: tramos }, (_, i) => ({ desde: i * ancho, hasta: Math.min(maxPuntos, (i + 1) * ancho), n: 0 }));
  for (const p of term) histograma[Math.min(tramos - 1, Math.floor(p.puntos / ancho))].n++;
  // por carrera
  const porCarrera = new Map();
  for (const p of term) {
    const c = p.estudiante === false ? 'No es estudiante' : (carreraDe(p) || 'Sin dato');
    const x = porCarrera.get(c) || { carrera: c, n: 0, puntos: 0 };
    x.n++; x.puntos += p.puntos; porCarrera.set(c, x);
  }
  const est = lista.filter(p => p.estudiante !== false && (p.estudiante === true || p.carrera)).length;

  return {
    generado: ahora(), almacen: almacen.tipo,
    resumen: {
      personas: personas(lista), partidas: lista.length, terminadas: term.length, jugadas: jugadas.length,
      precision: jugadas.length ? r1(jugadas.filter(j => j.resultado === 'acierto').length / jugadas.length * 100) : 0,
      puntajePromedio: r1(prom(term, p => p.puntos)), tiempoPromedio: Math.round(prom(term, p => p.ms)), maxPuntos,
      estudiantes: est, noEstudiantes: lista.length - est
    },
    porPregunta,
    dias: [...dias].map(([dia, n]) => ({ dia, n })),
    horas: horas.map((n, h) => ({ hora: h, n })),
    histograma,
    carreras: [...porCarrera.values()].map(x => ({ carrera: x.carrera, n: x.n, promedio: r1(x.puntos / x.n) })).sort((a, b) => b.n - a.n),
    residencia: cuenta(lista.map(p => p.colonia ? titleCase(p.colonia) : '')).slice(0, 15)
  };
}

// ---------------------------------------------------------------- CSV
function csv(filas) {
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return '﻿' + filas.map(f => f.map(esc).join(',')).join('\n');
}
const seg = ms => ms == null ? '' : (ms / 1000).toFixed(1);
function exportar(tipo) {
  if (tipo === 'partidas') {
    const lugar = new Map(ranking().map((p, i) => [p.id, i + 1]));
    return csv([['partida_id', 'nombre', 'apellido', 'es_estudiante', 'carrera', 'delegacion_o_colonia', 'avatar', 'fecha', 'terminada', 'puntos', 'tiempo_segundos', 'lugar_ranking',
      ...config.preguntas.map((q, i) => `puntos_p${i + 1}`), 'oculta_del_ranking'],
      ...[...partidas.values()].map(p => [p.id, p.nombre, p.apellido || '', p.estudiante === false ? 'no' : p.estudiante === true ? 'sí' : '', carreraDe(p), p.colonia, p.avatar, p.creada, p.terminada ? 'sí' : 'no', p.puntos, seg(p.ms), lugar.get(p.id) || '',
        ...config.preguntas.map(q => (p.progreso[q.id] || {}).puntos || 0), p.oculta ? 'sí' : ''])]);
  }
  if (tipo === 'jugadas') {
    return csv([['fecha', 'partida_id', 'nombre', 'pregunta_num', 'pregunta', 'lo_que_escribio', 'colonia_reconocida', 'resultado', 'respuesta_del_tablero', 'puntos', 'segundos_desde_inicio'],
      ...jugadas.map(j => [j.fecha, j.partida, j.nombre, j.pregunta, (config.preguntas.find(q => q.id === j.qid) || {}).texto || j.qid,
        j.texto, j.colonia, j.resultado, j.respuestaTablero, j.puntos, seg(j.msDesdeInicio)])]);
  }
  if (tipo === 'ranking') {
    return csv([['lugar', 'nombre', 'apellido', 'carrera', 'puntos', 'tiempo_segundos', 'fecha'], ...ranking().map((p, i) => [i + 1, p.nombre, p.apellido || '', carreraDe(p), p.puntos, seg(p.ms), p.creada])]);
  }
  return null;
}

// ---------------------------------------------------------------- voces (grabaciones de Victor)
function listaVoces() {
  const eventos = {};
  for (const v of [...voces.values()].sort((a, b) => a.creado.localeCompare(b.creado))) (eventos[v.evento] = eventos[v.evento] || []).push('/voz/' + v.id);
  return { eventos, tts: config.vozTTS !== false };
}
async function guardarVoz(evento, mime, buf, origen) {
  const id = crypto.randomBytes(8).toString('hex');
  const v = { id, evento, mime, buf, creado: ahora(), origen: origen || 'panel', bytes: buf.length };
  voces.set(id, v);
  await almacen.upsert(C_VOCES, id, { id, evento, mime, data: buf.toString('base64'), creado: v.creado, origen: v.origen });
  return v;
}
async function importarAudiosIniciales() {
  if (voces.size) return;
  let archivos = [];
  try { archivos = fs.readdirSync(AUDIO_DIR); } catch { return; }
  for (const f of archivos) {
    const ext = path.extname(f).toLowerCase();
    const nombre = path.basename(f, ext).toLowerCase();
    const mime = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg' }[ext];
    if (!mime) continue;
    const eventos = AUDIO_INICIAL[nombre] || (/^[a-z_0-9]+$/.test(nombre) ? [nombre] : []);
    for (const ev of eventos) await guardarVoz(ev, mime, fs.readFileSync(path.join(AUDIO_DIR, f)), 'archivo');
  }
  if (voces.size) console.log(`[voces] ${voces.size} grabaciones importadas de public/audio`);
}

// ---------------------------------------------------------------- tiempo real
const clientes = new Set();
function enviar(c, ev, data) { try { c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* cerrado */ } }
function publico() {
  const lista = [...partidas.values()].filter(p => !p.oculta);
  return {
    titulo: config.titulo, top: top(), totalPreguntas: config.preguntas.length,
    stats: {
      personas: personas(lista), partidas: lista.length,
      jugando: lista.filter(p => !p.terminada && Date.now() - p.inicio < 30 * 60000).length,
      terminadas: lista.filter(p => p.terminada).length
    }
  };
}
let tEstado = null;
function avisarCambios() {
  if (tEstado) return;
  tEstado = setTimeout(() => {
    tEstado = null;
    const d = `event: estado\ndata: ${JSON.stringify(publico())}\n\n`;
    for (const c of clientes) { try { c.res.write(d); } catch { /* */ } }
  }, 500);
}
function anunciarSiTop(p, topAntes) {
  const lugar = posicion(p);
  if (!lugar || lugar > TOP) return;
  const ahoraTop = top();
  // a quién rebasó: los que estaban en el top y ahora bajaron de lugar o salieron
  const desplazados = topAntes.map((id, i) => ({ id, antes: i + 1, despues: (ahoraTop.find(r => r.id === id) || {}).lugar || null })).filter(x => x.despues == null || x.despues > x.antes);
  const datos = { id: p.id, nombre: nombrePublico(p), avatar: p.avatar || '', puntos: p.puntos, ms: p.ms, lugar, desplazados };
  for (const c of clientes) enviar(c, 'nuevoTop', datos);
}
setInterval(() => { for (const c of clientes) { try { c.res.write(': ping\n\n'); } catch { /* */ } } }, 20000);

setInterval(async () => {
  try {
    if (configPendiente) { configPendiente = false; await almacen.upsert(C_CONFIG, 'principal', config); }
    if (pendientes.size) {
      const docs = [...pendientes].map(id => partidas.get(id)).filter(Boolean);
      pendientes.clear();
      await almacen.upsertMany(C_PARTIDAS, docs.map(p => ({ id: p.id, doc: p })));
      avisarCambios();
    }
  } catch (e) { console.error('[guardar]', e.message); }
}, 1000);

// ---------------------------------------------------------------- HTTP
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const RUTAS_PAGINA = { '/': 'index.html', '/tv': 'tablero.html', '/tablero': 'tablero.html', '/ranking': 'tablero.html', '/admin': 'admin.html' };

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function leerCuerpo(req, limite = 2e6) {
  return new Promise((ok, mal) => {
    const partes = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > limite) { mal(new Error('El archivo es demasiado grande')); req.destroy(); } else partes.push(c); });
    req.on('end', () => { try { const t = Buffer.concat(partes).toString('utf8'); ok(t ? JSON.parse(t) : {}); } catch { mal(new Error('Datos inválidos')); } });
    req.on('error', mal);
  });
}
function archivoEstatico(res, rel) {
  const ruta = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!ruta.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end(); }
  fs.stat(ruta, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(ruta).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    fs.createReadStream(ruta).pipe(res);
  });
}
const esAdmin = (req, url) => (req.headers['x-admin-key'] || url.searchParams.get('key')) === ADMIN_KEY;
const creadoresPublicos = () => (config.creadores || []).map(c => ({ nombre: c.nombre, carrera: c.carrera, rol: c.rol, avatar: c.avatar }));

async function manejar(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;

  if (p === '/eventos') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\n');
    const c = { res };
    clientes.add(c);
    enviar(c, 'estado', publico());
    req.on('close', () => clientes.delete(c));
    return;
  }
  const mv = p.match(/^\/voz\/([a-f0-9]{16})$/);
  if (mv && m === 'GET') {
    const v = voces.get(mv[1]);
    if (!v) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': v.mime, 'Content-Length': v.buf.length, 'Cache-Control': 'public, max-age=31536000, immutable' });
    return res.end(v.buf);
  }

  // ---------- API pública
  if (p === '/api/info' && m === 'GET') {
    return json(res, 200, {
      titulo: config.titulo, totalPreguntas: config.preguntas.length, maxTachas: MAX_TACHAS,
      carreras: CATALOGO.map(c => ({ nombre: c.nombre, grupo: c.grupo })), colonias: COLONIAS,
      fuente: config.fuente, reportes: config.reportes, personas: personas([...partidas.values()].filter(x => !x.oculta))
    });
  }
  if (p === '/api/voces' && m === 'GET') return json(res, 200, listaVoces());
  if (p === '/api/creadores' && m === 'GET') return json(res, 200, creadoresPublicos());
  if (p === '/api/ranking' && m === 'GET') return json(res, 200, publico());
  if (p === '/api/partida' && m === 'GET') {
    const pa = partidas.get(url.searchParams.get('id') || '');
    return pa ? json(res, 200, vistaPartida(pa)) : json(res, 404, { error: 'No existe' });
  }
  if (p === '/api/empezar' && m === 'POST') {
    const b = await leerCuerpo(req, 1e5);
    const n = validarNombreReal(limpiar(b.nombre, 40), limpiar(b.apellido, 50));
    if (n.error) return json(res, 400, { error: n.error, campo: /apellido/.test(n.error) ? 'apellido' : 'nombre' });
    if (![true, false, 'si', 'no'].includes(b.estudiante)) return json(res, 400, { error: 'Dinos si eres estudiante (Sí o No)', campo: 'estudiante' });
    const estudiante = b.estudiante === true || b.estudiante === 'si';
    let carrera = '';
    if (estudiante) {
      const texto = limpiar(b.carrera, 60);
      if (!texto) return json(res, 400, { error: 'Elige o escribe tu carrera', campo: 'carrera' });
      const e = validarTextoLibre(texto, 'carrera');
      if (e) return json(res, 400, { error: e, campo: 'carrera' });
      carrera = unificarCarrera(texto) || titleCase(texto);
    }
    const colonia = limpiar(b.colonia, 60);
    const ec = validarTextoLibre(colonia, 'delegación o colonia');
    if (ec) return json(res, 400, { error: ec, campo: 'colonia' });
    const avatar = AVATAR_OK.test(String(b.avatar || '')) ? String(b.avatar) : 'H1000303000';
    const pa = crearPartida({ nombre: n.nombre, apellido: n.apellido, avatar, estudiante, carrera, colonia });
    avisarCambios();
    return json(res, 200, vistaPartida(pa));
  }
  if (p === '/api/responder' && m === 'POST') {
    const b = await leerCuerpo(req, 1e5);
    const r = responder(b.id, b.texto);
    return json(res, r.status || 200, r);
  }
  if (p === '/api/pasar' && m === 'POST') {
    const b = await leerCuerpo(req, 1e5);
    const pa = partidas.get(b.id);
    if (!pa) return json(res, 404, { error: 'Tu partida ya no existe, vuelve a empezar' });
    if (!pa.terminada && Number(b.numero) === pa.qIndex + 1) terminarPregunta(pa);
    return json(res, 200, { partida: vistaPartida(pa) });
  }

  // ---------- API admin
  if (p.startsWith('/api/admin/')) {
    if (!esAdmin(req, url)) return json(res, 401, { error: 'Clave incorrecta' });
    const accion = p.slice('/api/admin/'.length);
    if (m === 'GET' && accion === 'estado') return json(res, 200, { ...publico(), config, almacen: almacen.tipo });
    if (m === 'GET' && accion === 'analisis') return json(res, 200, analisis());
    if (m === 'GET' && accion === 'voces') {
      return json(res, 200, { tts: config.vozTTS !== false, lista: [...voces.values()].map(v => ({ id: v.id, evento: v.evento, mime: v.mime, bytes: v.bytes, creado: v.creado, origen: v.origen, url: '/voz/' + v.id })) });
    }
    if (m === 'GET' && accion === 'partidas') {
      const lugar = new Map(ranking().map((x, i) => [x.id, i + 1]));
      return json(res, 200, [...partidas.values()].sort((a, b) => b.inicio - a.inicio).slice(0, 300).map(x => ({
        id: x.id, nombre: nombreCompleto(x), avatar: x.avatar || '', carrera: carreraDe(x), estudiante: x.estudiante, colonia: x.colonia,
        puntos: x.puntos, ms: x.ms, terminada: x.terminada, oculta: !!x.oculta, lugar: lugar.get(x.id) || null, fecha: x.creada
      })));
    }
    const exp = accion.match(/^exportar\/(partidas|jugadas|ranking)\.csv$/);
    if (m === 'GET' && exp) {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${exp[1]}-100-estudiantes.csv"` });
      return res.end(exportar(exp[1]));
    }
    if (m !== 'POST') return json(res, 404, { error: 'Ruta no encontrada' });
    const b = await leerCuerpo(req, accion === 'voces' ? 6e6 : 2e6);

    if (accion === 'voces') {
      const evento = String(b.evento || '');
      if (!/^[a-z_0-9]{2,30}$/.test(evento)) return json(res, 400, { error: 'Evento inválido' });
      const mime = String(b.mime || '').split(';')[0];
      if (!/^audio\/(mpeg|mp3|mp4|x-m4a|aac|wav|x-wav|ogg|webm)$/.test(mime)) return json(res, 400, { error: 'Formato de audio no soportado (usa mp3, m4a, wav, ogg o webm)' });
      const buf = Buffer.from(String(b.data || ''), 'base64');
      if (buf.length < 500) return json(res, 400, { error: 'La grabación está vacía' });
      if (buf.length > 4e6) return json(res, 400, { error: 'La grabación es muy larga (máximo 4 MB)' });
      if ((listaVoces().eventos[evento] || []).length >= 6) return json(res, 400, { error: 'Máximo 6 versiones por frase. Borra una para agregar otra.' });
      const v = await guardarVoz(evento, mime === 'audio/mp3' ? 'audio/mpeg' : mime, buf, 'panel');
      return json(res, 200, { ok: true, id: v.id, url: '/voz/' + v.id });
    }
    if (accion === 'voces/borrar') {
      if (!voces.has(b.id)) return json(res, 404, { error: 'No existe' });
      voces.delete(b.id);
      const resto = [...voces.values()].map(v => ({ id: v.id, doc: { id: v.id, evento: v.evento, mime: v.mime, data: v.buf.toString('base64'), creado: v.creado, origen: v.origen } }));
      await almacen.clear(C_VOCES);
      await almacen.upsertMany(C_VOCES, resto);
      return json(res, 200, { ok: true });
    }
    if (accion === 'voces/opciones') {
      config.vozTTS = !!b.tts;
      configPendiente = true;
      return json(res, 200, { ok: true });
    }
    if (accion === 'creadores') {
      const lista = (Array.isArray(b.creadores) ? b.creadores : []).map(c => ({
        nombre: limpiar(c.nombre, 60), carrera: limpiar(c.carrera, 60), rol: limpiar(c.rol, 60),
        avatar: AVATAR_OK.test(String(c.avatar || '')) ? String(c.avatar) : 'H1000303000'
      })).filter(c => c.nombre).slice(0, 20);
      config.creadores = lista;
      configPendiente = true;
      return json(res, 200, { ok: true, creadores: lista });
    }
    if (accion === 'ocultar') {
      const pa = partidas.get(b.id);
      if (!pa) return json(res, 404, { error: 'No existe' });
      pa.oculta = !!b.oculta;
      pendientes.add(pa.id);
    } else if (accion === 'preguntas') {
      const nuevas = (Array.isArray(b.preguntas) ? b.preguntas : []).map((q, qi) => {
        const tablero = (Array.isArray(q.tablero) ? q.tablero : []).map(t => ({
          texto: limpiar(t.texto, 60), reportes: Math.max(0, Number(t.reportes) || 0), puntos: Math.max(0, Math.round(Number(t.puntos) || 0)),
          alias: (Array.isArray(t.alias) ? t.alias : String(t.alias || '').split(',')).map(a => limpiar(a, 60)).filter(Boolean)
        })).filter(t => t.texto).slice(0, 8);
        return { id: /^[\w-]{1,20}$/.test(q.id || '') ? q.id : 'q' + (qi + 1) + crypto.randomBytes(2).toString('hex'), texto: limpiar(q.texto, 200), dato: limpiar(q.dato, 200), exp: limpiar(q.exp, 600), tip: limpiar(q.tip, 600), totalReportes: Number(q.totalReportes) || 0, tablero };
      }).filter(q => q.texto && q.tablero.length);
      if (!nuevas.length) return json(res, 400, { error: 'Debe haber al menos una pregunta con respuestas' });
      config.preguntas = nuevas;
      if (b.titulo) config.titulo = limpiar(b.titulo, 60);
      configPendiente = true;
    } else if (accion === 'restaurar-preguntas') {
      const ini = configInicial();
      config.preguntas = ini.preguntas;
      configPendiente = true;
    } else if (accion === 'reiniciar') {
      partidas.clear(); jugadas.length = 0; pendientes.clear();
      await almacen.clear(C_PARTIDAS);
      await almacen.clear(C_JUGADAS);
    } else {
      return json(res, 404, { error: 'Acción no encontrada' });
    }
    avisarCambios();
    return json(res, 200, { ok: true, ...publico(), config });
  }

  // ---------- páginas y archivos
  if (m !== 'GET' && m !== 'HEAD') return json(res, 405, { error: 'Método no permitido' });
  if (RUTAS_PAGINA[p]) return archivoEstatico(res, RUTAS_PAGINA[p]);
  return archivoEstatico(res, decodeURIComponent(p).replace(/^\/+/, ''));
}

const server = http.createServer((req, res) => {
  manejar(req, res).catch(e => {
    console.error(e);
    if (!res.headersSent) json(res, 400, { error: e.message || 'Error' });
    else res.end();
  });
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

async function iniciar() {
  almacen = await crearAlmacen();
  const c = await almacen.get(C_CONFIG, 'principal');
  if (c && Array.isArray(c.preguntas) && c.preguntas.length) {
    config = { ...configInicial(), ...c };
    const base = configInicial().preguntas;
    for (const q of config.preguntas) {
      const d = base.find(x => x.id === q.id);
      if (d) { if (!q.exp) q.exp = d.exp; if (!q.tip) q.tip = d.tip; }
    }
  }
  for (const pa of await almacen.all(C_PARTIDAS)) if (pa && pa.id) { pa.progreso = pa.progreso || {}; partidas.set(pa.id, pa); }
  for (const j of await almacen.all(C_JUGADAS)) if (j && j.partida) jugadas.push(j);
  for (const v of await almacen.all(C_VOCES)) {
    if (v && v.id && v.data) voces.set(v.id, { id: v.id, evento: v.evento, mime: v.mime, buf: Buffer.from(v.data, 'base64'), creado: v.creado || ahora(), origen: v.origen, bytes: Math.round(v.data.length * .75) });
  }
  await importarAudiosIniciales();
  server.listen(PORT, () => {
    console.log(`\n  100 estudiantes dijeron — puerto ${PORT}`);
    console.log(`  Jugadores:  http://localhost:${PORT}/`);
    console.log(`  Ranking TV: http://localhost:${PORT}/tv`);
    console.log(`  Admin:      http://localhost:${PORT}/admin   (clave: ${process.env.ADMIN_KEY ? '******' : ADMIN_KEY})\n`);
  });
}
iniciar().catch(e => { console.error('No se pudo iniciar:', e); process.exit(1); });
