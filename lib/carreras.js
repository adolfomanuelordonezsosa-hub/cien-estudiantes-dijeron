'use strict';
// Catálogo de carreras y unificación de lo que escriben los jugadores.
// "ing industrial", "Ingenieria industrial", "industrial", "IND" -> "Ingeniería Industrial"

const CATALOGO = [
  // Facultad de Ciencias Químicas e Ingeniería (FCQI)
  { nombre: 'Tronco común de Ingeniería', grupo: 'FCQI', claves: ['tronco comun ingenieria', 'tc ingenieria', 'tronco comun ing', 'tronco ingenieria'] },
  { nombre: 'Tronco común de Ciencias Químicas', grupo: 'FCQI', claves: ['tronco comun ciencias quimicas', 'tronco comun quimica', 'tc quimica', 'tronco quimica'] },
  { nombre: 'Ingeniería Industrial', grupo: 'FCQI', claves: ['industrial', 'ingenieria industrial', 'ing industrial', 'ind', 'ii', 'instural', 'industral', 'indutrial', 'indusrial', 'instrial'] },
  { nombre: 'Ingeniería en Computación', grupo: 'FCQI', claves: ['computacion', 'computo', 'compu', 'ingenieria computacion', 'sistemas computacionales', 'computer'] },
  { nombre: 'Ingeniería en Electrónica', grupo: 'FCQI', claves: ['electronica', 'electronico', 'ingenieria electronica'] },
  { nombre: 'Ingeniería Química', grupo: 'FCQI', claves: ['ingenieria quimica', 'ing quimica', 'iq'] },
  { nombre: 'Ingeniería Civil', grupo: 'FCQI', claves: ['civil', 'ingenieria civil', 'ing civil'] },
  { nombre: 'Ingeniería Aeroespacial', grupo: 'FCQI', claves: ['aeroespacial', 'aeronautica', 'aero'] },
  { nombre: 'Ingeniería Mecánica', grupo: 'FCQI', claves: ['mecanica', 'mecanico', 'ingenieria mecanica'] },
  { nombre: 'Ingeniería Mecatrónica', grupo: 'FCQI', claves: ['mecatronica', 'mecatronico'] },
  { nombre: 'Ingeniería Eléctrica', grupo: 'FCQI', claves: ['electrica', 'electrico', 'ingenieria electrica'] },
  { nombre: 'Ingeniería en Energías Renovables', grupo: 'FCQI', claves: ['energias renovables', 'renovables', 'energia'] },
  { nombre: 'Bioingeniería', grupo: 'FCQI', claves: ['bioingenieria', 'biomedica', 'ingenieria biomedica', 'bio'] },
  { nombre: 'Ingeniería en Nanotecnología', grupo: 'FCQI', claves: ['nanotecnologia', 'nano'] },
  { nombre: 'Químico Farmacobiólogo', grupo: 'FCQI', claves: ['quimico farmacobiologo', 'farmacobiologo', 'qfb', 'farmacobiologia'] },
  { nombre: 'Químico Industrial', grupo: 'FCQI', claves: ['quimico industrial', 'qi'] },
  { nombre: 'Licenciatura en Química', grupo: 'FCQI', claves: ['lic quimica', 'licenciatura quimica'] },
  // Otras facultades de la UABC Tijuana
  { nombre: 'Medicina', grupo: 'Otras', claves: ['medicina', 'medico', 'medico cirujano'] },
  { nombre: 'Enfermería', grupo: 'Otras', claves: ['enfermeria', 'enfermero', 'enfermera'] },
  { nombre: 'Odontología', grupo: 'Otras', claves: ['odontologia', 'dentista', 'cirujano dentista'] },
  { nombre: 'Nutrición', grupo: 'Otras', claves: ['nutricion', 'nutriologia'] },
  { nombre: 'Psicología', grupo: 'Otras', claves: ['psicologia', 'psico', 'sicologia'] },
  { nombre: 'Derecho', grupo: 'Otras', claves: ['derecho', 'abogado', 'leyes'] },
  { nombre: 'Arquitectura', grupo: 'Otras', claves: ['arquitectura', 'arqui', 'arquitecto'] },
  { nombre: 'Diseño Gráfico', grupo: 'Otras', claves: ['diseno grafico', 'grafico', 'diseno'] },
  { nombre: 'Diseño Industrial', grupo: 'Otras', claves: ['diseno industrial'] },
  { nombre: 'Contaduría', grupo: 'Otras', claves: ['contaduria', 'contador', 'contabilidad'] },
  { nombre: 'Administración de Empresas', grupo: 'Otras', claves: ['administracion', 'administracion empresas', 'admin empresas', 'lae'] },
  { nombre: 'Negocios Internacionales', grupo: 'Otras', claves: ['negocios internacionales', 'negocios'] },
  { nombre: 'Mercadotecnia', grupo: 'Otras', claves: ['mercadotecnia', 'marketing'] },
  { nombre: 'Informática', grupo: 'Otras', claves: ['informatica'] },
  { nombre: 'Inteligencia de Negocios', grupo: 'Otras', claves: ['inteligencia negocios'] },
  { nombre: 'Relaciones Internacionales', grupo: 'Otras', claves: ['relaciones internacionales'] },
  { nombre: 'Comunicación', grupo: 'Otras', claves: ['comunicacion', 'ciencias comunicacion'] },
  { nombre: 'Ciencias de la Educación', grupo: 'Otras', claves: ['ciencias educacion', 'educacion', 'pedagogia'] },
  { nombre: 'Docencia e Idiomas', grupo: 'Otras', claves: ['idiomas', 'docencia idiomas', 'traduccion', 'ingles', 'lenguas'] },
  { nombre: 'Economía', grupo: 'Otras', claves: ['economia', 'economista'] },
  { nombre: 'Sociología', grupo: 'Otras', claves: ['sociologia'] },
  { nombre: 'Ciencias Políticas', grupo: 'Otras', claves: ['ciencias politicas', 'politica', 'administracion publica'] },
  { nombre: 'Turismo', grupo: 'Otras', claves: ['turismo'] },
  { nombre: 'Gastronomía', grupo: 'Otras', claves: ['gastronomia', 'chef', 'cocina'] },
  { nombre: 'Artes', grupo: 'Otras', claves: ['artes', 'artes plasticas', 'musica', 'danza', 'teatro'] },
  { nombre: 'Actividad Física y Deporte', grupo: 'Otras', claves: ['deporte', 'actividad fisica', 'educacion fisica'] }
];

const PALABRAS_VACIAS = new Set(['ing', 'ingenieria', 'ingeniero', 'ingeniera', 'lic', 'licenciatura', 'licenciado', 'licenciada', 'en', 'de', 'del', 'la', 'el', 'y', 'carrera', 'uabc']);
const base = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const nucleo = t => base(t).split(' ').filter(w => w && !PALABRAS_VACIAS.has(w)).join(' ');

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// Devuelve el nombre oficial de la carrera, o null si no se reconoce
function unificarCarrera(texto) {
  const b = base(texto), n = nucleo(texto);
  if (!b) return null;
  for (const c of CATALOGO) if (base(c.nombre) === b) return c.nombre;
  // "ingenieria quimica" vs "quimico ..." se distinguen por la palabra ingenieria
  const esIng = /\bing(enier[ia]a?|eniero)?\b/.test(b);
  if (esIng && /quimic/.test(b)) return 'Ingeniería Química';
  for (const c of CATALOGO) if (c.claves.some(k => k === b || k === n || nucleo(k) === n)) return c.nombre;
  for (const c of CATALOGO) {
    for (const k of c.claves) {
      const kn = nucleo(k) || k;
      if (kn.length >= 5 && n.length >= 4 && (kn.includes(n) || n.includes(kn))) return c.nombre;
      const tol = kn.length >= 9 ? 2 : kn.length >= 5 ? 1 : 0;
      if (tol && lev(kn, n) <= tol) return c.nombre;
    }
  }
  return null;
}

module.exports = { CATALOGO, unificarCarrera, nombres: CATALOGO.map(c => c.nombre) };
