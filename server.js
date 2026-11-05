'use strict';
// "100 estudiantes dijeron" — servidor multijugador en tiempo real (OCUN · UABC Tijuana)
// Tiempo real con Server-Sent Events: aguanta cientos de celulares conectados a la vez.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normKey, sameKey, titleCase } = require('./lib/texto');
const { crearAlmacen } = require('./lib/almacen');
const COLONIAS_BASE = require('./data/colonias');
const PREGUNTAS_DEFAULT = require('./data/preguntas');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'nino2026';
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const MAX_TACHAS = 3;
const FASES = ['lobby', 'encuesta', 'juego', 'comparar', 'ranking'];
const CARRERAS = [
  'Ingeniería Industrial', 'Ingeniería en Computación', 'Ingeniería Electrónica', 'Ingeniería Química',
  'Ingeniería Civil', 'Ingeniería Aeroespacial', 'Ingeniería Mecánica', 'Ingeniería en Bioingeniería',
  'Químico Farmacobiólogo', 'Químico Industrial', 'Tronco común de Ingeniería', 'Tronco común de Ciencias Químicas',
  'Idiomas', 'Otra facultad', 'Personal / docente', 'Visitante'
];

// ---------------------------------------------------------------- estado en memoria
let almacen;
let estado = estadoInicial();
let historico = []; // [{colonia, key, reportes, municipio}]
let histVer = 0;
const jugadores = new Map();
const respuestas = [];
const intentos = [];
const respondidas = new Set();
const conteoPorPregunta = {};
const encuestados = new Set();
const jugadoresPendientes = new Set();
let estadoPendiente = false;
let historicoPendiente = false;
const ultimoIntento = new Map();

function estadoInicial() {
  return {
    fase: 'lobby', qIndex: 0, titulo: '100 estudiantes dijeron', meta: 100, topN: 6,
    preguntas: JSON.parse(JSON.stringify(PREGUNTAS_DEFAULT)), equipos: [],
    tableros: {}, revelados: {}, encontradas: {}, primeros: {}, versionTablero: 1
  };
}
const ahora = () => new Date().toISOString();
const preguntaActual = () => estado.preguntas[estado.qIndex] || null;
const marcarEstado = () => { estadoPendiente = true; };
const limpiar = (t, max) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, max);

// ---------------------------------------------------------------- colonias y agrupación
let indiceCache = null, indiceVer = -1;
function indiceColonias() {
  if (indiceCache && indiceVer === histVer) return indiceCache;
  const vistos = new Map();
  for (const n of [...historico.map(h => h.colonia), ...COLONIAS_BASE]) {
    const k = normKey(n);
    if (k && !vistos.has(k)) vistos.set(k, n);
  }
  indiceCache = [...vistos].map(([key, nombre]) => ({ key, nombre }));
  indiceVer = histVer;
  return indiceCache;
}
function canonColonia(k) {
  const idx = indiceColonias();
  return idx.find(c => c.key === k) || idx.find(c => sameKey(c.key, k)) || null;
}
function masComun(mapa) {
  let mejor = '', n = -1;
  for (const [t, c] of mapa) if (c > n) { mejor = t; n = c; }
  return mejor;
}
// Agrupa respuestas parecidas y las cuenta: [{texto, key, alias[], votos}]
function agrupar(textos, tipo) {
  const usarColonias = tipo === 'colonia';
  const grupos = [];
  for (const t of textos) {
    const original = normKey(t);
    if (!original) continue;
    let k = original, canon = null;
    if (usarColonias) {
      const c = canonColonia(original);
      if (c) { canon = c.nombre; k = c.key; }
    }
    let g = grupos.find(x => x.key === k) || grupos.find(x => sameKey(x.key, k));
    if (!g) { g = { key: k, canon, variantes: new Map(), alias: new Set(), votos: 0 }; grupos.push(g); }
    g.votos++;
    g.alias.add(original);
    const limpio = limpiar(t, 80);
    g.variantes.set(limpio, (g.variantes.get(limpio) || 0) + 1);
    if (!g.canon && canon) g.canon = canon;
  }
  return grupos
    .map(g => {
      const comun = masComun(g.variantes);
      const texto = g.canon || (usarColonias ? titleCase(comun) : comun.charAt(0).toUpperCase() + comun.slice(1));
      return { texto, key: g.key, alias: [...g.alias], votos: g.votos };
    })
    .sort((a, b) => b.votos - a.votos);
}
function mapaAgrupado(qid) {
  const q = estado.preguntas.find(p => p.id === qid);
  const grupos = agrupar(respuestas.filter(r => r.qid === qid).map(r => r.texto), q ? q.tipo : 'libre');
  const m = new Map();
  for (const g of grupos) for (const a of g.alias) m.set(a, g.texto);
  return m;
}

// ---------------------------------------------------------------- histórico real
function histOrdenado() { return historico.slice().sort((a, b) => b.reportes - a.reportes); }
function buscarHist(hist, key) {
  let i = hist.findIndex(h => h.key === key);
  if (i < 0) i = hist.findIndex(h => sameKey(h.key, key));
  return i >= 0 ? { ...hist[i], rank: i + 1 } : null;
}
function cruzar(items, tally, n) {
  const hist = histOrdenado().filter(h => h.reportes > 0);
  const est = items.map(it => {
    const h = buscarHist(hist, it.key);
    return { texto: it.texto, valor: it.valor, reportes: h ? h.reportes : 0, rank: h ? h.rank : null, enTop: !!(h && h.rank <= n) };
  });
  const topHist = hist.slice(0, n).map((h, i) => {
    const g = tally.find(x => x.key === h.key) || tally.find(x => sameKey(x.key, h.key));
    return { colonia: h.colonia, municipio: h.municipio || '', reportes: h.reportes, rank: i + 1, votos: g ? g.votos : 0, nombrada: items.some(it => sameKey(it.key, h.key)) };
  });
  return {
    hayHistorico: hist.length > 0, n, estudiantes: est, historico: topHist,
    aciertos: est.filter(e => e.enTop).length, conReportes: est.filter(e => e.reportes > 0).length
  };
}
let cacheComp = { clave: '', valor: null };
function comparacionTV(qid) {
  const q = estado.preguntas.find(p => p.id === qid);
  if (!q || q.tipo !== 'colonia') return { tipoLibre: true };
  const clave = `${qid}|${respuestas.length}|${histVer}|${estado.versionTablero}`;
  if (cacheComp.clave === clave) return cacheComp.valor;
  const tab = estado.tableros[qid] || [];
  const tally = agrupar(respuestas.filter(r => r.qid === qid).map(r => r.texto), 'colonia');
  const items = tab.length ? tab.map(t => ({ texto: t.texto, key: t.key, valor: t.puntos }))
    : tally.slice(0, estado.topN).map(g => ({ texto: g.texto, key: g.key, valor: g.votos }));
  const valor = cruzar(items, tally, items.length || estado.topN);
  cacheComp = { clave, valor };
  return valor;
}

// ---------------------------------------------------------------- tableros
function reiniciarConteosTablero(qid) {
  const n = (estado.tableros[qid] || []).length;
  estado.revelados[qid] = Array(n).fill(false);
  estado.encontradas[qid] = Array(n).fill(0);
  estado.primeros[qid] = Array(n).fill(null);
  for (const j of jugadores.values()) {
    if (j.progreso[qid]) {
      j.puntos -= j.progreso[qid].puntos || 0;
      if (j.puntos < 0) j.puntos = 0;
      delete j.progreso[qid];
      jugadoresPendientes.add(j.pid);
    }
  }
  estado.versionTablero++;
  marcarEstado();
}
function generarTablero(qid, topN) {
  const q = estado.preguntas.find(p => p.id === qid);
  if (!q) throw new Error('Pregunta no encontrada');
  const lista = respuestas.filter(r => r.qid === qid);
  const total = lista.length;
  const n = Math.min(8, Math.max(3, Number(topN) || estado.topN));
  const grupos = agrupar(lista.map(r => r.texto), q.tipo).slice(0, n);
  estado.tableros[qid] = grupos.map(g => ({
    texto: g.texto, key: g.key, alias: g.alias, votos: g.votos,
    puntos: total ? Math.max(1, Math.round(g.votos / total * 100)) : 0
  }));
  reiniciarConteosTablero(qid);
  return estado.tableros[qid];
}
function tableroManual(qid, items) {
  if (!estado.preguntas.find(p => p.id === qid)) throw new Error('Pregunta no encontrada');
  const limpios = (Array.isArray(items) ? items : []).map(it => {
    const texto = limpiar(it.texto, 60);
    const alias = [normKey(texto), ...String(it.alias || '').split(',').map(normKey)].filter(Boolean);
    return { texto, key: normKey(texto), alias: [...new Set(alias)], votos: Number(it.puntos) || 0, puntos: Math.max(0, Math.round(Number(it.puntos) || 0)) };
  }).filter(it => it.key).slice(0, 8);
  if (!limpios.length) throw new Error('Escribe al menos una respuesta');
  limpios.sort((a, b) => b.puntos - a.puntos);
  estado.tableros[qid] = limpios;
  reiniciarConteosTablero(qid);
  return limpios;
}
function buscarEnTablero(tab, k, tipo) {
  let i = tab.findIndex(t => t.key === k || t.alias.includes(k));
  if (i >= 0) return i;
  if (tipo === 'colonia') {
    const c = canonColonia(k);
    if (c) { i = tab.findIndex(t => t.key === c.key || sameKey(t.key, c.key)); if (i >= 0) return i; }
  }
  return tab.findIndex(t => sameKey(t.key, k) || t.alias.some(a => sameKey(a, k)));
}

// ---------------------------------------------------------------- jugadores
function posicionDe(j) {
  let p = 1;
  for (const o of jugadores.values()) if (o.puntos > j.puntos) p++;
  return p;
}
function vistaJugador(j) {
  const q = preguntaActual();
  const tab = q ? estado.tableros[q.id] : null;
  const pr = q ? j.progreso[q.id] : null;
  return {
    pid: j.pid, nombre: j.nombre, equipo: j.equipo, puntos: j.puntos,
    posicion: posicionDe(j), totalJugadores: jugadores.size,
    encuesta: estado.preguntas.map(p => ({ id: p.id, texto: p.texto, tipo: p.tipo, respondida: respondidas.has(j.pid + '|' + p.id) })),
    juego: q && tab && tab.length ? {
      qid: q.id, total: tab.length, maxTachas: MAX_TACHAS,
      tachas: pr ? pr.tachas : 0, puntos: pr ? pr.puntos : 0,
      encontradas: (pr ? pr.encontrados : []).map(i => ({ indice: i, texto: tab[i].texto, puntos: tab[i].puntos }))
    } : null
  };
}
function registrarRespuestaMem(r) {
  respuestas.push(r);
  respondidas.add(r.pid + '|' + r.qid);
  conteoPorPregunta[r.qid] = (conteoPorPregunta[r.qid] || 0) + 1;
  encuestados.add(r.pid);
}

function adivinar(pid, texto) {
  const j = jugadores.get(pid);
  if (!j) return { status: 404, error: 'Tu registro ya no existe, vuelve a registrarte' };
  if (estado.fase !== 'juego') return { status: 409, error: 'En este momento no se está jugando' };
  const q = preguntaActual();
  const tab = q && estado.tableros[q.id];
  if (!tab || !tab.length) return { status: 409, error: 'El tablero todavía no está listo' };
  const t = Date.now();
  if (t - (ultimoIntento.get(pid) || 0) < 600) return { status: 429, error: 'Más despacio 🙂' };
  ultimoIntento.set(pid, t);
  const pr = j.progreso[q.id] || (j.progreso[q.id] = { encontrados: [], tachas: 0, puntos: 0 });
  if (pr.tachas >= MAX_TACHAS) return { status: 409, error: 'Ya usaste tus 3 oportunidades en esta pregunta', mio: vistaJugador(j) };
  const limpio = limpiar(texto, 80);
  const k = normKey(limpio);
  if (!k) return { status: 400, error: 'Escribe una respuesta' };

  const idx = buscarEnTablero(tab, k, q.tipo);
  let resultado;
  if (idx >= 0 && pr.encontrados.includes(idx)) {
    resultado = { tipo: 'repetida', indice: idx, texto: tab[idx].texto };
  } else if (idx >= 0 && estado.revelados[q.id] && estado.revelados[q.id][idx]) {
    resultado = { tipo: 'revelada', indice: idx, texto: tab[idx].texto };
  } else if (idx >= 0) {
    pr.encontrados.push(idx);
    pr.puntos += tab[idx].puntos;
    j.puntos += tab[idx].puntos;
    estado.encontradas[q.id][idx] = (estado.encontradas[q.id][idx] || 0) + 1;
    if (!estado.primeros[q.id][idx]) {
      estado.primeros[q.id][idx] = j.nombre;
      emitir('primero', { nombre: j.nombre, numero: idx + 1 }, ['tv', 'admin']);
    }
    resultado = { tipo: 'acierto', indice: idx, texto: tab[idx].texto, puntos: tab[idx].puntos };
  } else {
    pr.tachas++;
    resultado = { tipo: 'tache', tachas: pr.tachas };
  }
  const reg = {
    pid, qid: q.id, texto: limpio, resultado: resultado.tipo,
    respuestaTablero: idx >= 0 ? tab[idx].texto : '', puntos: resultado.tipo === 'acierto' ? resultado.puntos : 0, fecha: ahora()
  };
  intentos.push(reg);
  almacen.insert('intentos', reg).catch(e => console.error('intento', e.message));
  jugadoresPendientes.add(pid);
  marcarEstado();
  programarBroadcast();
  return { ok: true, resultado, mio: vistaJugador(j) };
}

// ---------------------------------------------------------------- vistas públicas
function snapshot() {
  const q = preguntaActual();
  const tab = q ? estado.tableros[q.id] : null;
  const rev = q ? (estado.revelados[q.id] || []) : [];
  const enc = q ? (estado.encontradas[q.id] || []) : [];
  const lista = [...jugadores.values()].sort((a, b) => b.puntos - a.puntos);
  return {
    fase: estado.fase, titulo: estado.titulo, meta: estado.meta, versionTablero: estado.versionTablero,
    pregunta: q ? { id: q.id, texto: q.texto, tipo: q.tipo, numero: estado.qIndex + 1, total: estado.preguntas.length } : null,
    tablero: tab && tab.length ? tab.map((t, i) => ({
      n: i + 1, revelada: !!rev[i], texto: rev[i] ? t.texto : null, puntos: rev[i] ? t.puntos : null, encontradaPor: enc[i] || 0
    })) : null,
    preguntas: estado.preguntas.map(p => ({ id: p.id, texto: p.texto, respuestas: conteoPorPregunta[p.id] || 0 })),
    stats: { jugadores: jugadores.size, encuestados: encuestados.size, intentos: intentos.length },
    ranking: lista.slice(0, 10).map(j => ({ nombre: j.nombre, puntos: j.puntos, equipo: j.equipo || '' })),
    equipos: estado.equipos.map(e => {
      let p = 0, n = 0;
      for (const j of jugadores.values()) if (j.equipo === e) { p += j.puntos; n++; }
      return { nombre: e, puntos: p, jugadores: n };
    }),
    comparacion: estado.fase === 'comparar' && q ? comparacionTV(q.id) : null
  };
}
function snapshotAdmin() {
  const q = preguntaActual();
  const tab = q ? (estado.tableros[q.id] || []) : [];
  return {
    ...snapshot(),
    qIndex: estado.qIndex, topN: estado.topN, equiposConfig: estado.equipos, almacen: almacen ? almacen.tipo : '',
    preguntasCompletas: estado.preguntas,
    historicoN: historico.length, historicoConReportes: historico.filter(h => h.reportes > 0).length,
    tableroCompleto: tab.map((t, i) => ({
      n: i + 1, texto: t.texto, votos: t.votos, puntos: t.puntos, alias: t.alias.slice(0, 12),
      revelada: !!(estado.revelados[q.id] || [])[i], encontradaPor: (estado.encontradas[q.id] || [])[i] || 0,
      primero: (estado.primeros[q.id] || [])[i] || ''
    })),
    respuestasActual: q ? (conteoPorPregunta[q.id] || 0) : 0
  };
}

// ---------------------------------------------------------------- análisis
function analisis() {
  const lista = [...jugadores.values()];
  const aciertos = intentos.filter(i => i.resultado === 'acierto').length;
  const jugadorDe = pid => jugadores.get(pid) || {};
  const conteo = arr => {
    const m = new Map();
    for (const x of arr) m.set(x, (m.get(x) || 0) + 1);
    return [...m].map(([texto, n]) => ({ texto, n })).sort((a, b) => b.n - a.n);
  };
  const porPregunta = estado.preguntas.map(q => {
    const rs = respuestas.filter(r => r.qid === q.id);
    const grupos = agrupar(rs.map(r => r.texto), q.tipo);
    const total = rs.length;
    const aliasA = new Map();
    for (const g of grupos) for (const a of g.alias) aliasA.set(a, g.texto);
    const top5 = grupos.slice(0, 5).map(g => g.texto);
    const porCarrera = {};
    for (const r of rs) {
      const c = jugadorDe(r.pid).carrera || 'Sin dato';
      const g = aliasA.get(normKey(r.texto));
      if (!top5.includes(g)) continue;
      porCarrera[c] = porCarrera[c] || {};
      porCarrera[c][g] = (porCarrera[c][g] || 0) + 1;
    }
    const its = intentos.filter(i => i.qid === q.id);
    return {
      id: q.id, texto: q.texto, tipo: q.tipo, total,
      top: grupos.slice(0, 15).map(g => ({ texto: g.texto, votos: g.votos, pct: total ? Math.round(g.votos / total * 1000) / 10 : 0 })),
      distintas: grupos.length, top5, porCarrera,
      intentos: its.length, aciertos: its.filter(i => i.resultado === 'acierto').length,
      fallidas: agrupar(its.filter(i => i.resultado === 'tache').map(i => i.texto), q.tipo).slice(0, 10).map(g => ({ texto: g.texto, veces: g.votos })),
      tablero: (estado.tableros[q.id] || []).map((t, i) => ({ texto: t.texto, puntos: t.puntos, encontradaPor: (estado.encontradas[q.id] || [])[i] || 0 })),
      comparacion: q.tipo === 'colonia' ? cruzar(grupos.slice(0, 10).map(g => ({ texto: g.texto, key: g.key, valor: g.votos })), grupos, 10) : null
    };
  });
  const conColonia = lista.filter(j => j.colonia);
  let riesgoPropio = null;
  if (historico.length && conColonia.length) {
    const hist = histOrdenado();
    const enRiesgo = conColonia.filter(j => { const h = buscarHist(hist, normKey(j.colonia)); return h && h.reportes > 0; }).length;
    riesgoPropio = { conColonia: conColonia.length, enRiesgo, pct: Math.round(enRiesgo / conColonia.length * 1000) / 10 };
  }
  return {
    generado: ahora(), almacen: almacen.tipo,
    resumen: {
      jugadores: lista.length, encuestados: encuestados.size, respuestas: respuestas.length, intentos: intentos.length,
      precision: intentos.length ? Math.round(aciertos / intentos.length * 1000) / 10 : 0,
      puntajePromedio: lista.length ? Math.round(lista.reduce((s, j) => s + j.puntos, 0) / lista.length * 10) / 10 : 0,
      historico: historico.length
    },
    porPregunta,
    residencia: agrupar(conColonia.map(j => j.colonia), 'colonia').slice(0, 15).map(g => ({ texto: g.texto, n: g.votos })),
    carreras: conteo(lista.map(j => j.carrera || 'Sin dato')),
    equipos: estado.equipos.length ? conteo(lista.map(j => j.equipo || 'Sin equipo')) : [],
    riesgoPropio
  };
}

// ---------------------------------------------------------------- CSV
function csv(filas) {
  const esc = v => {
    const s = v == null ? '' : String(v);
    return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return '﻿' + filas.map(f => f.map(esc).join(',')).join('\n');
}
function exportar(tipo) {
  const textoPregunta = id => (estado.preguntas.find(p => p.id === id) || {}).texto || id;
  if (tipo === 'respuestas') {
    const mapas = {};
    for (const q of estado.preguntas) mapas[q.id] = mapaAgrupado(q.id);
    return csv([['fecha', 'jugador_id', 'nombre', 'carrera', 'colonia_donde_vive', 'equipo', 'pregunta_id', 'pregunta', 'respuesta', 'respuesta_agrupada'],
      ...respuestas.map(r => {
        const j = jugadores.get(r.pid) || {};
        return [r.fecha, r.pid, j.nombre, j.carrera, j.colonia, j.equipo, r.qid, textoPregunta(r.qid), r.texto, (mapas[r.qid] && mapas[r.qid].get(normKey(r.texto))) || ''];
      })]);
  }
  if (tipo === 'intentos') {
    return csv([['fecha', 'jugador_id', 'nombre', 'carrera', 'equipo', 'pregunta_id', 'pregunta', 'intento', 'resultado', 'respuesta_del_tablero', 'puntos'],
      ...intentos.map(i => {
        const j = jugadores.get(i.pid) || {};
        return [i.fecha, i.pid, j.nombre, j.carrera, j.equipo, i.qid, textoPregunta(i.qid), i.texto, i.resultado, i.respuestaTablero, i.puntos];
      })]);
  }
  if (tipo === 'jugadores') {
    return csv([['jugador_id', 'nombre', 'carrera', 'colonia_donde_vive', 'equipo', 'puntos', 'registrado', 'preguntas_respondidas'],
      ...[...jugadores.values()].map(j => [j.pid, j.nombre, j.carrera, j.colonia, j.equipo, j.puntos, j.registrado,
        estado.preguntas.filter(p => respondidas.has(j.pid + '|' + p.id)).length])]);
  }
  return null;
}

// ---------------------------------------------------------------- tiempo real (SSE)
const clientes = new Set();
function enviar(c, ev, data) { try { c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* cliente cerrado */ } }
function emitir(ev, data, roles) { for (const c of clientes) if (!roles || roles.includes(c.rol)) enviar(c, ev, data); }
let temporizador = null;
function programarBroadcast() {
  if (temporizador) return;
  temporizador = setTimeout(() => {
    temporizador = null;
    const pub = `event: estado\ndata: ${JSON.stringify(snapshot())}\n\n`;
    let adm = null;
    for (const c of clientes) {
      try {
        if (c.rol === 'admin') {
          if (!adm) adm = `event: admin\ndata: ${JSON.stringify(snapshotAdmin())}\n\n`;
          c.res.write(adm);
        } else c.res.write(pub);
      } catch { /* cliente cerrado */ }
    }
  }, 300);
}
setInterval(() => { for (const c of clientes) { try { c.res.write(': ping\n\n'); } catch { /* */ } } }, 20000);

// guardado periódico
setInterval(async () => {
  try {
    if (estadoPendiente) { estadoPendiente = false; await almacen.upsert('estado', 'principal', estado); }
    if (historicoPendiente) { historicoPendiente = false; await almacen.upsert('estado', 'historico', { filas: historico }); }
    if (jugadoresPendientes.size) {
      const docs = [...jugadoresPendientes].map(id => jugadores.get(id)).filter(Boolean);
      jugadoresPendientes.clear();
      await almacen.upsertMany('jugadores', docs.map(j => ({ id: j.pid, doc: j })));
    }
  } catch (e) { console.error('[guardar]', e.message); }
}, 1500);

// ---------------------------------------------------------------- HTTP
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};
const RUTAS_PAGINA = { '/': 'index.html', '/tv': 'tablero.html', '/tablero': 'tablero.html', '/admin': 'admin.html' };

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function leerCuerpo(req, limite = 8e6) {
  return new Promise((ok, mal) => {
    let datos = '', n = 0;
    req.on('data', c => {
      n += c.length;
      if (n > limite) { mal(new Error('Archivo demasiado grande')); req.destroy(); } else datos += c;
    });
    req.on('end', () => { try { ok(datos ? JSON.parse(datos) : {}); } catch { mal(new Error('JSON inválido')); } });
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
function listaAudios() {
  try {
    const out = {};
    for (const f of fs.readdirSync(AUDIO_DIR)) {
      const ext = path.extname(f).toLowerCase();
      if (['.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) out[path.basename(f, ext).toLowerCase()] = '/audio/' + encodeURIComponent(f);
    }
    return out;
  } catch { return {}; }
}
const esAdmin = (req, url) => (req.headers['x-admin-key'] || url.searchParams.get('key')) === ADMIN_KEY;

async function reiniciar(que) {
  for (const j of jugadores.values()) { j.puntos = 0; j.progreso = {}; jugadoresPendientes.add(j.pid); }
  intentos.length = 0;
  await almacen.clear('intentos');
  for (const qid of Object.keys(estado.tableros)) {
    const n = estado.tableros[qid].length;
    estado.revelados[qid] = Array(n).fill(false);
    estado.encontradas[qid] = Array(n).fill(0);
    estado.primeros[qid] = Array(n).fill(null);
  }
  if (que === 'encuesta' || que === 'todo') {
    respuestas.length = 0; respondidas.clear(); encuestados.clear();
    for (const k of Object.keys(conteoPorPregunta)) delete conteoPorPregunta[k];
    estado.tableros = {}; estado.revelados = {}; estado.encontradas = {}; estado.primeros = {};
    await almacen.clear('respuestas');
  }
  if (que === 'todo') {
    jugadores.clear(); jugadoresPendientes.clear();
    await almacen.clear('jugadores');
    estado.fase = 'lobby'; estado.qIndex = 0;
  }
  estado.versionTablero++;
  marcarEstado();
}

async function manejar(req, res) {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  const m = req.method;

  if (p === '/eventos') {
    let rol = url.searchParams.get('rol') || 'jugador';
    if (rol === 'admin' && !esAdmin(req, url)) return json(res, 401, { error: 'Clave incorrecta' });
    if (!['tv', 'jugador', 'admin'].includes(rol)) rol = 'jugador';
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 3000\n\n');
    const c = { res, rol };
    clientes.add(c);
    enviar(c, rol === 'admin' ? 'admin' : 'estado', rol === 'admin' ? snapshotAdmin() : snapshot());
    req.on('close', () => clientes.delete(c));
    return;
  }

  // ---------- API pública
  if (p === '/api/info' && m === 'GET') {
    return json(res, 200, { titulo: estado.titulo, equipos: estado.equipos, carreras: CARRERAS, colonias: indiceColonias().map(c => c.nombre).slice(0, 3000) });
  }
  if (p === '/api/audios' && m === 'GET') return json(res, 200, listaAudios());
  if (p === '/api/yo' && m === 'GET') {
    const j = jugadores.get(url.searchParams.get('pid') || '');
    return j ? json(res, 200, vistaJugador(j)) : json(res, 404, { error: 'No registrado' });
  }
  if (p === '/api/unirse' && m === 'POST') {
    const b = await leerCuerpo(req, 1e5);
    const nombre = limpiar(b.nombre, 30);
    if (!nombre) return json(res, 400, { error: 'Escribe tu nombre o apodo' });
    let equipo = limpiar(b.equipo, 30);
    if (estado.equipos.length && !estado.equipos.includes(equipo)) return json(res, 400, { error: 'Elige tu equipo' });
    if (!estado.equipos.length) equipo = '';
    const j = { pid: crypto.randomUUID(), nombre, carrera: limpiar(b.carrera, 60), colonia: limpiar(b.colonia, 60), equipo, puntos: 0, progreso: {}, registrado: ahora() };
    jugadores.set(j.pid, j);
    jugadoresPendientes.add(j.pid);
    programarBroadcast();
    return json(res, 200, vistaJugador(j));
  }
  if (p === '/api/encuesta' && m === 'POST') {
    const b = await leerCuerpo(req, 1e5);
    const j = jugadores.get(b.pid);
    if (!j) return json(res, 404, { error: 'Tu registro ya no existe, vuelve a registrarte' });
    if (estado.fase !== 'encuesta') return json(res, 409, { error: 'La encuesta está cerrada en este momento' });
    const resp = b.respuestas || {};
    let n = 0;
    for (const q of estado.preguntas) {
      const texto = limpiar(resp[q.id], 80);
      if (!texto || !normKey(texto) || respondidas.has(j.pid + '|' + q.id)) continue;
      const r = { pid: j.pid, qid: q.id, texto, fecha: ahora() };
      registrarRespuestaMem(r);
      almacen.insert('respuestas', r).catch(e => console.error('respuesta', e.message));
      n++;
    }
    programarBroadcast();
    return json(res, 200, { guardadas: n, mio: vistaJugador(j) });
  }
  if (p === '/api/adivinar' && m === 'POST') {
    const b = await leerCuerpo(req, 1e5);
    const r = adivinar(b.pid, b.texto);
    return json(res, r.status || 200, r);
  }

  // ---------- API admin
  if (p.startsWith('/api/admin/')) {
    if (!esAdmin(req, url)) return json(res, 401, { error: 'Clave incorrecta' });
    const accion = p.slice('/api/admin/'.length);

    if (m === 'GET' && accion === 'estado') return json(res, 200, snapshotAdmin());
    if (m === 'GET' && accion === 'analisis') return json(res, 200, analisis());
    if (m === 'GET' && accion === 'historico') return json(res, 200, { filas: histOrdenado() });
    const exp = accion.match(/^exportar\/(respuestas|intentos|jugadores)\.csv$/);
    if (m === 'GET' && exp) {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${exp[1]}-100-estudiantes.csv"` });
      return res.end(exportar(exp[1]));
    }
    if (m !== 'POST') return json(res, 404, { error: 'Ruta no encontrada' });
    const b = await leerCuerpo(req);

    if (accion === 'fase') {
      if (!FASES.includes(b.fase)) return json(res, 400, { error: 'Fase inválida' });
      if (Number.isInteger(b.qIndex) && estado.preguntas[b.qIndex]) estado.qIndex = b.qIndex;
      estado.fase = b.fase;
      const q = preguntaActual();
      if (b.fase === 'juego' && q && !(estado.tableros[q.id] || []).length && (conteoPorPregunta[q.id] || 0) > 0) generarTablero(q.id, estado.topN);
      marcarEstado();
    } else if (accion === 'pregunta') {
      const i = Number(b.qIndex);
      if (!estado.preguntas[i]) return json(res, 400, { error: 'Pregunta inválida' });
      estado.qIndex = i;
      const q = preguntaActual();
      if (estado.fase === 'juego' && !(estado.tableros[q.id] || []).length && (conteoPorPregunta[q.id] || 0) > 0) generarTablero(q.id, estado.topN);
      marcarEstado();
    } else if (accion === 'tablero') {
      const q = estado.preguntas.find(x => x.id === b.qid) || preguntaActual();
      if (!q) return json(res, 400, { error: 'No hay pregunta' });
      if (!(conteoPorPregunta[q.id] || 0)) return json(res, 400, { error: 'Esa pregunta todavía no tiene respuestas de la encuesta. Usa el tablero manual o abre la encuesta.' });
      if (b.topN) estado.topN = Math.min(8, Math.max(3, Number(b.topN)));
      generarTablero(q.id, estado.topN);
    } else if (accion === 'tablero-manual') {
      const q = estado.preguntas.find(x => x.id === b.qid) || preguntaActual();
      tableroManual(q.id, b.items);
    } else if (accion === 'revelar') {
      const q = preguntaActual();
      const tab = q && estado.tableros[q.id];
      if (!tab || !tab.length) return json(res, 400, { error: 'No hay tablero' });
      const indices = b.todo ? tab.map((_, i) => i) : [Number(b.indice)];
      const nuevos = indices.filter(i => tab[i] && !estado.revelados[q.id][i]);
      for (const i of nuevos) estado.revelados[q.id][i] = true;
      if (nuevos.length) emitir('revelar', { items: nuevos.map(i => ({ indice: i, texto: tab[i].texto, puntos: tab[i].puntos })) });
      marcarEstado();
    } else if (accion === 'ocultar') {
      const q = preguntaActual();
      if (q && estado.revelados[q.id]) estado.revelados[q.id] = estado.revelados[q.id].map(() => false);
      marcarEstado();
    } else if (accion === 'tache') {
      emitir('tache', { n: Math.min(3, Math.max(1, Number(b.n) || 1)) }, ['tv']);
    } else if (accion === 'config') {
      if (b.titulo != null) estado.titulo = limpiar(b.titulo, 60) || '100 estudiantes dijeron';
      if (b.meta != null) estado.meta = Math.max(1, Math.round(Number(b.meta)) || 100);
      if (b.topN != null) estado.topN = Math.min(8, Math.max(3, Number(b.topN) || 6));
      if (Array.isArray(b.equipos)) estado.equipos = [...new Set(b.equipos.map(e => limpiar(e, 30)).filter(Boolean))].slice(0, 8);
      if (Array.isArray(b.preguntas)) {
        const nuevas = b.preguntas.map(x => ({
          id: /^[\w-]{1,20}$/.test(x.id || '') ? x.id : 'q' + crypto.randomBytes(3).toString('hex'),
          texto: limpiar(x.texto, 200), tipo: x.tipo === 'colonia' ? 'colonia' : 'libre'
        })).filter(x => x.texto);
        if (!nuevas.length) return json(res, 400, { error: 'Debe haber al menos una pregunta' });
        estado.preguntas = nuevas;
        if (estado.qIndex >= nuevas.length) estado.qIndex = 0;
      }
      estado.versionTablero++;
      marcarEstado();
    } else if (accion === 'historico') {
      const filas = Array.isArray(b.filas) ? b.filas : [];
      const mapa = new Map();
      for (const f of filas) {
        const nombre = limpiar(f.colonia, 80);
        const key = normKey(nombre);
        if (!key) continue;
        const rep = Number(String(f.reportes == null ? '0' : f.reportes).replace(/[^\d.-]/g, '')) || 0;
        const prev = mapa.get(key);
        if (prev) prev.reportes += rep;
        else mapa.set(key, { colonia: nombre === nombre.toUpperCase() ? titleCase(nombre) : nombre, key, reportes: rep, municipio: limpiar(f.municipio, 40) });
      }
      historico = [...mapa.values()];
      histVer++;
      historicoPendiente = true;
      estado.versionTablero++;
      marcarEstado();
    } else if (accion === 'reiniciar') {
      if (!['juego', 'encuesta', 'todo'].includes(b.que)) return json(res, 400, { error: 'Opción inválida' });
      await reiniciar(b.que);
    } else {
      return json(res, 404, { error: 'Acción no encontrada' });
    }
    programarBroadcast();
    return json(res, 200, snapshotAdmin());
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
  const e = await almacen.get('estado', 'principal');
  if (e) estado = { ...estadoInicial(), ...e };
  const h = await almacen.get('estado', 'historico');
  if (h && Array.isArray(h.filas)) { historico = h.filas; histVer++; }
  for (const j of await almacen.all('jugadores')) {
    if (j && j.pid) { j.progreso = j.progreso || {}; j.puntos = Number(j.puntos) || 0; jugadores.set(j.pid, j); }
  }
  for (const r of await almacen.all('respuestas')) if (r && r.pid && r.qid) registrarRespuestaMem(r);
  for (const i of await almacen.all('intentos')) if (i && i.pid) intentos.push(i);
  server.listen(PORT, () => {
    console.log(`\n  100 estudiantes dijeron — puerto ${PORT}`);
    console.log(`  Jugadores:  http://localhost:${PORT}/`);
    console.log(`  Pantalla:   http://localhost:${PORT}/tv`);
    console.log(`  Admin:      http://localhost:${PORT}/admin   (clave: ${process.env.ADMIN_KEY ? '******' : ADMIN_KEY})\n`);
  });
}
iniciar().catch(e => { console.error('No se pudo iniciar:', e); process.exit(1); });
