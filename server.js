'use strict';
// "100 estudiantes dijeron" — juego individual multijugador (OCUN · UABC Tijuana)
// Flujo: Bienvenida → Juego (una pregunta a la vez) → Resultados + Top 10 histórico.
// Las respuestas correctas salen de los reportes históricos de Tijuana (data/preguntas.js).
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { normKey, sameKey, titleCase } = require('./lib/texto');
const { validarNombre } = require('./lib/filtro');
const { crearAlmacen } = require('./lib/almacen');
const COLONIAS = require('./data/colonias');
const DATOS = require('./data/preguntas');

const PORT = Number(process.env.PORT) || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || 'nino2026';
const PUBLIC_DIR = path.join(__dirname, 'public');
const AUDIO_DIR = path.join(PUBLIC_DIR, 'audio');
const MAX_TACHAS = 3;
const TOP = 10;
const CARRERAS = [
  'Ingeniería Industrial', 'Ingeniería en Computación', 'Ingeniería Electrónica', 'Ingeniería Química',
  'Ingeniería Civil', 'Ingeniería Aeroespacial', 'Ingeniería Mecánica', 'Ingeniería en Bioingeniería',
  'Químico Farmacobiólogo', 'Químico Industrial', 'Tronco común de Ingeniería', 'Tronco común de Ciencias Químicas',
  'Idiomas', 'Otra facultad', 'Personal / docente', 'Visitante'
];
// Colecciones nuevas (no se mezclan con las de la versión anterior)
const C_CONFIG = 'juego_config', C_PARTIDAS = 'partidas', C_JUGADAS = 'jugadas';

// ---------------------------------------------------------------- estado
let almacen;
let config = configInicial();
const partidas = new Map();      // id -> partida
const jugadas = [];              // cada intento de respuesta
const pendientes = new Set();    // partidas por guardar
let configPendiente = false;
const ultimoIntento = new Map();

function configInicial() {
  return {
    titulo: '100 estudiantes dijeron',
    fuente: DATOS.meta.fuente, reportes: DATOS.meta.reportes,
    preguntas: DATOS.preguntas.map(q => ({
      id: q.id, texto: q.texto, dato: q.dato, totalReportes: q.totalReportes,
      tablero: q.tablero.map(t => ({ texto: t.texto, reportes: t.reportes, puntos: t.puntos, alias: t.alias || [] }))
    }))
  };
}
const ahora = () => new Date().toISOString();
const limpiar = (t, max) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, max);

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
  let i = llaves.findIndex(ls => ls.includes(k));
  if (i >= 0) return i;
  // si lo que escribió es claramente OTRA colonia conocida, no se le da por buena aunque se parezca
  const exacta = indiceColonias().find(c => c.key === k);
  if (exacta) return llaves.findIndex(ls => ls.includes(exacta.key));
  return llaves.findIndex(ls => ls.some(l => sameKey(l, k)));
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
    id: crypto.randomUUID(), nombre: datos.nombre, carrera: datos.carrera, colonia: datos.colonia,
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
    p.terminada = true;
    p.fin = Date.now();
    p.ms = p.fin - p.inicio;
    anunciarSiTop(p);
  }
  pendientes.add(p.id);
}
function ranking() {
  return [...partidas.values()].filter(p => p.terminada && !p.oculta)
    .sort((a, b) => b.puntos - a.puntos || a.ms - b.ms || a.fin - b.fin);
}
function posicion(p) {
  const r = ranking();
  const i = r.findIndex(x => x.id === p.id);
  return i >= 0 ? i + 1 : null;
}
const filaRanking = (p, i) => ({ lugar: i + 1, id: p.id, nombre: p.nombre, puntos: p.puntos, ms: p.ms, carrera: p.carrera || '', fecha: p.creada });
function top() { return ranking().slice(0, TOP).map(filaRanking); }

function vistaPartida(p) {
  const total = config.preguntas.length;
  const base = { id: p.id, nombre: p.nombre, puntos: p.puntos, total, terminada: p.terminada, inicio: p.inicio };
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
  // resultados: ahora sí se muestran todas las respuestas correctas
  return {
    ...base, ms: p.ms, lugar: posicion(p), jugadores: ranking().length, top: top(),
    fuente: config.fuente, reportes: config.reportes,
    resultados: config.preguntas.map(q => {
      const pr = p.progreso[q.id] || { encontrados: [], puntos: 0, tachas: 0 };
      return {
        texto: q.texto, dato: q.dato, totalReportes: q.totalReportes, puntos: pr.puntos,
        tablero: q.tablero.map((t, i) => ({ texto: t.texto, reportes: t.reportes, puntos: t.puntos, acerto: pr.encontrados.includes(i) })),
        fallidas: (pr.fallidas || []).slice(0, 3)
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

  const idx = buscarEnTablero(q.tablero, limpio);
  let resultado;
  if (idx >= 0 && pr.encontrados.includes(idx)) {
    resultado = { tipo: 'repetida', texto: q.tablero[idx].texto };
  } else if (idx >= 0) {
    pr.encontrados.push(idx);
    pr.puntos += q.tablero[idx].puntos;
    p.puntos += q.tablero[idx].puntos;
    resultado = { tipo: 'acierto', texto: q.tablero[idx].texto, puntos: q.tablero[idx].puntos };
  } else {
    pr.tachas++;
    pr.fallidas = pr.fallidas || [];
    pr.fallidas.push(nombreColonia(limpio));
    resultado = { tipo: 'tache', tachas: pr.tachas };
  }
  const jug = {
    partida: id, nombre: p.nombre, qid: q.id, pregunta: p.qIndex + 1, texto: limpio, colonia: nombreColonia(limpio),
    resultado: resultado.tipo, respuestaTablero: idx >= 0 ? q.tablero[idx].texto : '',
    puntos: resultado.tipo === 'acierto' ? resultado.puntos : 0, msDesdeInicio: t - p.inicio, fecha: ahora()
  };
  jugadas.push(jug);
  almacen.insert(C_JUGADAS, jug).catch(e => console.error('jugada', e.message));

  // la pregunta termina sola si se acaban las oportunidades o si encontró todas
  const fin = pr.tachas >= MAX_TACHAS || pr.encontrados.length >= q.tablero.length;
  if (fin) { resultado.finPregunta = true; terminarPregunta(p); }
  pendientes.add(id);
  return { ok: true, resultado, partida: vistaPartida(p) };
}

// ---------------------------------------------------------------- análisis
function analisis() {
  const lista = [...partidas.values()].filter(p => !p.oculta);
  const term = lista.filter(p => p.terminada);
  const prom = (arr, f) => arr.length ? arr.reduce((s, x) => s + f(x), 0) / arr.length : 0;
  const cuenta = arr => {
    const m = new Map();
    for (const x of arr) if (x) m.set(x, (m.get(x) || 0) + 1);
    return [...m].map(([texto, n]) => ({ texto, n })).sort((a, b) => b.n - a.n);
  };
  const porPregunta = config.preguntas.map(q => {
    const js = jugadas.filter(j => j.qid === q.id);
    const jugaron = new Set(js.map(j => j.partida)).size;
    const hallaron = q.tablero.map(t => new Set(js.filter(j => j.respuestaTablero === t.texto && j.resultado === 'acierto').map(j => j.partida)).size);
    return {
      id: q.id, texto: q.texto, dato: q.dato, jugaron, intentos: js.length,
      aciertos: js.filter(j => j.resultado === 'acierto').length,
      tablero: q.tablero.map((t, i) => ({ texto: t.texto, reportes: t.reportes, puntos: t.puntos, hallaron: hallaron[i], pct: jugaron ? Math.round(hallaron[i] / jugaron * 1000) / 10 : 0 })),
      percepcion: cuenta(js.map(j => j.colonia)).slice(0, 12).map(x => ({ ...x, correcta: q.tablero.some(t => t.texto === x.texto || sameKey(normKey(t.texto), normKey(x.texto))) })),
      fallidas: cuenta(js.filter(j => j.resultado === 'tache').map(j => j.colonia)).slice(0, 10)
    };
  });
  return {
    generado: ahora(), almacen: almacen.tipo,
    resumen: {
      partidas: lista.length, terminadas: term.length, jugadas: jugadas.length,
      precision: jugadas.length ? Math.round(jugadas.filter(j => j.resultado === 'acierto').length / jugadas.length * 1000) / 10 : 0,
      puntajePromedio: Math.round(prom(term, p => p.puntos) * 10) / 10,
      tiempoPromedio: Math.round(prom(term, p => p.ms)),
      maxPuntos: config.preguntas.length * 100
    },
    porPregunta,
    residencia: cuenta(lista.map(p => p.colonia ? nombreColonia(p.colonia) : '')).slice(0, 15),
    carreras: cuenta(lista.map(p => p.carrera || 'Sin dato'))
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
    return csv([['partida_id', 'nombre', 'carrera', 'colonia_donde_vive', 'fecha', 'terminada', 'puntos', 'tiempo_segundos', 'lugar_ranking',
      ...config.preguntas.map((q, i) => `puntos_p${i + 1}`), 'oculta_del_ranking'],
      ...[...partidas.values()].map(p => [p.id, p.nombre, p.carrera, p.colonia, p.creada, p.terminada ? 'sí' : 'no', p.puntos, seg(p.ms), lugar.get(p.id) || '',
        ...config.preguntas.map(q => (p.progreso[q.id] || {}).puntos || 0), p.oculta ? 'sí' : ''])]);
  }
  if (tipo === 'jugadas') {
    return csv([['fecha', 'partida_id', 'nombre', 'pregunta_num', 'pregunta', 'lo_que_escribio', 'colonia_reconocida', 'resultado', 'respuesta_del_tablero', 'puntos', 'segundos_desde_inicio'],
      ...jugadas.map(j => [j.fecha, j.partida, j.nombre, j.pregunta, (config.preguntas.find(q => q.id === j.qid) || {}).texto || j.qid,
        j.texto, j.colonia, j.resultado, j.respuestaTablero, j.puntos, seg(j.msDesdeInicio)])]);
  }
  if (tipo === 'ranking') {
    return csv([['lugar', 'nombre', 'carrera', 'puntos', 'tiempo_segundos', 'fecha'], ...ranking().map((p, i) => [i + 1, p.nombre, p.carrera, p.puntos, seg(p.ms), p.creada])]);
  }
  return null;
}

// ---------------------------------------------------------------- tiempo real (TV y admin)
const clientes = new Set();
function enviar(c, ev, data) { try { c.res.write(`event: ${ev}\ndata: ${JSON.stringify(data)}\n\n`); } catch { /* cerrado */ } }
function publico() {
  const lista = [...partidas.values()].filter(p => !p.oculta);
  return {
    titulo: config.titulo, top: top(), totalPreguntas: config.preguntas.length,
    stats: { partidas: lista.length, jugando: lista.filter(p => !p.terminada && Date.now() - p.inicio < 30 * 60000).length, terminadas: lista.filter(p => p.terminada).length }
  };
}
let tEstado = null;
function avisarCambios() {
  if (tEstado) return;
  tEstado = setTimeout(() => {
    tEstado = null;
    const d = publico();
    for (const c of clientes) enviar(c, 'estado', d);
  }, 500);
}
function anunciarSiTop(p) {
  const lugar = posicion(p);
  if (lugar && lugar <= TOP) for (const c of clientes) enviar(c, 'nuevoTop', { nombre: p.nombre, puntos: p.puntos, ms: p.ms, lugar });
}
setInterval(() => { for (const c of clientes) { try { c.res.write(': ping\n\n'); } catch { /* */ } } }, 20000);

// guardado periódico
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
    let datos = '', n = 0;
    req.on('data', c => { n += c.length; if (n > limite) { mal(new Error('Demasiado grande')); req.destroy(); } else datos += c; });
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

  // ---------- API pública
  if (p === '/api/info' && m === 'GET') {
    return json(res, 200, { titulo: config.titulo, totalPreguntas: config.preguntas.length, maxTachas: MAX_TACHAS, carreras: CARRERAS, colonias: COLONIAS, fuente: config.fuente, reportes: config.reportes });
  }
  if (p === '/api/ranking' && m === 'GET') return json(res, 200, publico());
  if (p === '/api/audios' && m === 'GET') return json(res, 200, listaAudios());
  if (p === '/api/partida' && m === 'GET') {
    const pa = partidas.get(url.searchParams.get('id') || '');
    return pa ? json(res, 200, vistaPartida(pa)) : json(res, 404, { error: 'No existe' });
  }
  if (p === '/api/validar-nombre' && m === 'POST') {
    const b = await leerCuerpo(req, 1e4);
    const e = validarNombre(b.nombre);
    return json(res, e ? 400 : 200, e ? { error: e } : { ok: true });
  }
  if (p === '/api/empezar' && m === 'POST') {
    const b = await leerCuerpo(req, 1e5);
    const nombre = limpiar(b.nombre, 20);
    const err = validarNombre(nombre);
    if (err) return json(res, 400, { error: err });
    const pa = crearPartida({ nombre, carrera: limpiar(b.carrera, 60), colonia: limpiar(b.colonia, 60) });
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
    if (m === 'GET' && accion === 'partidas') {
      const lugar = new Map(ranking().map((x, i) => [x.id, i + 1]));
      return json(res, 200, [...partidas.values()].sort((a, b) => b.inicio - a.inicio).slice(0, 300).map(x => ({
        id: x.id, nombre: x.nombre, carrera: x.carrera, colonia: x.colonia, puntos: x.puntos, ms: x.ms, terminada: x.terminada, oculta: !!x.oculta, lugar: lugar.get(x.id) || null, fecha: x.creada
      })));
    }
    const exp = accion.match(/^exportar\/(partidas|jugadas|ranking)\.csv$/);
    if (m === 'GET' && exp) {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${exp[1]}-100-estudiantes.csv"` });
      return res.end(exportar(exp[1]));
    }
    if (m !== 'POST') return json(res, 404, { error: 'Ruta no encontrada' });
    const b = await leerCuerpo(req);

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
        return { id: /^[\w-]{1,20}$/.test(q.id || '') ? q.id : 'q' + (qi + 1) + crypto.randomBytes(2).toString('hex'), texto: limpiar(q.texto, 200), dato: limpiar(q.dato, 200), totalReportes: Number(q.totalReportes) || 0, tablero };
      }).filter(q => q.texto && q.tablero.length);
      if (!nuevas.length) return json(res, 400, { error: 'Debe haber al menos una pregunta con respuestas' });
      config.preguntas = nuevas;
      if (b.titulo) config.titulo = limpiar(b.titulo, 60);
      configPendiente = true;
    } else if (accion === 'restaurar-preguntas') {
      config = configInicial();
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
  if (c && Array.isArray(c.preguntas) && c.preguntas.length) config = { ...configInicial(), ...c };
  for (const pa of await almacen.all(C_PARTIDAS)) if (pa && pa.id) { pa.progreso = pa.progreso || {}; partidas.set(pa.id, pa); }
  for (const j of await almacen.all(C_JUGADAS)) if (j && j.partida) jugadas.push(j);
  server.listen(PORT, () => {
    console.log(`\n  100 estudiantes dijeron — puerto ${PORT}`);
    console.log(`  Jugadores:  http://localhost:${PORT}/`);
    console.log(`  Ranking TV: http://localhost:${PORT}/tv`);
    console.log(`  Admin:      http://localhost:${PORT}/admin   (clave: ${process.env.ADMIN_KEY ? '******' : ADMIN_KEY})\n`);
  });
}
iniciar().catch(e => { console.error('No se pudo iniciar:', e); process.exit(1); });
