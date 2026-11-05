'use strict';
// Guarda todo lo que pasa en el juego.
// - Si existe la variable MONGODB_URI (o MONGO_URL) usa MongoDB (recomendado en Railway).
// - Si no, usa archivos en la carpeta /datos (sirve para probar en tu compu).
const fs = require('fs');
const path = require('path');

async function crearAlmacen() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (uri) {
    try {
      const { MongoClient } = require('mongodb');
      const cliente = new MongoClient(uri);
      await cliente.connect();
      const db = cliente.db(process.env.MONGODB_DB || 'cien_estudiantes');
      console.log('[almacén] MongoDB conectado');
      return {
        tipo: 'MongoDB',
        insert: (c, d) => db.collection(c).insertOne({ ...d }),
        upsert: (c, id, d) => db.collection(c).replaceOne({ _id: id }, { ...d, _id: id }, { upsert: true }),
        upsertMany: async (c, items) => {
          if (!items.length) return;
          await db.collection(c).bulkWrite(items.map(({ id, doc }) => ({
            replaceOne: { filter: { _id: id }, replacement: { ...doc, _id: id }, upsert: true }
          })), { ordered: false });
        },
        all: async c => (await db.collection(c).find({}).toArray()).map(({ _id, ...d }) => d),
        get: async (c, id) => {
          const d = await db.collection(c).findOne({ _id: id });
          if (!d) return null;
          const { _id, ...r } = d;
          return r;
        },
        clear: c => db.collection(c).deleteMany({})
      };
    } catch (e) {
      console.error('[almacén] No se pudo usar MongoDB (' + e.message + '). Se usarán archivos locales.');
    }
  }

  const dir = process.env.DATA_DIR || path.join(__dirname, '..', 'datos');
  fs.mkdirSync(dir, { recursive: true });
  const archivoLineas = c => path.join(dir, c + '.jsonl');
  const archivoMapa = c => path.join(dir, c + '.json');
  const cache = {};
  const mapa = c => {
    if (!cache[c]) {
      try { cache[c] = JSON.parse(fs.readFileSync(archivoMapa(c), 'utf8')); } catch { cache[c] = {}; }
    }
    return cache[c];
  };
  const escribirMapa = c => {
    const tmp = archivoMapa(c) + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(mapa(c)));
    fs.renameSync(tmp, archivoMapa(c));
  };
  console.log('[almacén] Archivos locales en ' + dir);
  return {
    tipo: 'Archivos locales',
    insert: async (c, d) => fs.appendFileSync(archivoLineas(c), JSON.stringify(d) + '\n'),
    upsert: async (c, id, d) => { mapa(c)[id] = d; escribirMapa(c); },
    upsertMany: async (c, items) => { for (const { id, doc } of items) mapa(c)[id] = doc; escribirMapa(c); },
    all: async c => {
      if (fs.existsSync(archivoLineas(c))) {
        return fs.readFileSync(archivoLineas(c), 'utf8').split('\n').filter(Boolean)
          .map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
      }
      return Object.values(mapa(c));
    },
    get: async (c, id) => mapa(c)[id] || null,
    clear: async c => {
      try { fs.unlinkSync(archivoLineas(c)); } catch { /* no existe */ }
      try { fs.unlinkSync(archivoMapa(c)); } catch { /* no existe */ }
      cache[c] = {};
    }
  };
}

module.exports = { crearAlmacen };
