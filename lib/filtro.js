'use strict';
// Filtro de groserías para los nombres de usuario.
// Detecta también trucos comunes: P3nd3j0, p.u.t.o, puuuto, p u t o, etc.
// Para agregar palabras, súmalas a RAICES (se buscan dentro del nombre) o a PALABRAS (palabra completa).

// Se buscan DENTRO del nombre (sin espacios ni símbolos). Solo raíces que no aparecen en nombres normales.
const RAICES = [
  'pendej', 'pndj', 'zorrit', 'zorron', 'perrit', 'chingad', 'chingar', 'chingue', 'chingon', 'chinguen', 'mierd', 'cabron', 'kbron', 'culer', 'culito',
  'panoch', 'puñet', 'punet', 'putit', 'putaz', 'putot', 'putisim', 'hijodeputa', 'hijueputa', 'hdp', 'ptm', 'alv',
  'mamaver', 'mamadas', 'mamada', 'mamon', 'verguer', 'vergot', 'vergaz', 'pinche', 'pinchi', 'joton', 'mariconz',
  'maricon', 'cagad', 'caguen', 'cojer', 'coger', 'cogid', 'cogien', 'follar', 'ojete', 'nalgon', 'nalgas', 'tetas', 'tetot', 'chichis',
  'pito', 'pene', 'vagina', 'clitor', 'porno', 'sexo', 'sexual', 'violad', 'violar', 'pedofil', 'zoofil', 'nazi', 'hitler', 'narco',
  'fuck', 'fuk', 'shit', 'bitch', 'bastard', 'asshole', 'pussy', 'cock', 'dick', 'nigg', 'niga', 'whore', 'slut', 'porn', 'rape', 'cum',
  'estupid', 'imbecil', 'idiota', 'retrasad', 'mongol', 'subnormal', 'malparid', 'gonorrea', 'huevon', 'guevon', 'webon', 'pucha'
];

// Se comparan como palabra completa (o la palabra empieza así), para no bloquear nombres reales
// (por ejemplo "puto" está dentro de "cómputo" y "verga" dentro de "Vergara").
const PALABRAS = [
  'puto', 'puta', 'putos', 'putas', 'puton', 'verga', 'vergas', 'culo', 'culos', 'joto', 'jotos', 'marica', 'perra', 'perras',
  'zorra', 'zorras', 'naco', 'naca', 'prieto', 'indio', 'gay', 'lesbiana', 'trolo', 'ano', 'anal', 'mamar', 'chupa', 'chupala',
  'teta', 'pija', 'pajero', 'paja', 'wey', 'buey', 'guey', 'mamona', 'mamones', 'cagon', 'caca', 'popo', 'meco', 'mecos',
  'chocha', 'chimba', 'concha', 'cono', 'polla', 'zorron', 'ass', 'tits', 'fag', 'gey', 'kk', 'xxx', 'sex', 'nalga', 'pedo'
];

const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '6': 'g', '2': 'z' };

function base(t) {
  return String(t || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/(^|\s)[0-9]+(?=\s|$)/g, ' ') // números sueltos ("Jugador 45") no se convierten en letras
    .replace(/[0-9!|@$+]/g, c => LEET[c] || c)
    .replace(/k(?=[aou])/g, 'c').replace(/qu(?=[ei])/g, 'qu').replace(/[vw]/g, m => (m === 'w' ? 'w' : 'v'));
}
const sinRepetidas = s => s.replace(/(.)\1+/g, '$1');
const hastaDos = s => s.replace(/(.)\1{2,}/g, '$1$1');
// variantes de una palabra para detectar letras repetidas a propósito: "puuuto", "zorrrra"
const variantes = w => [w, sinRepetidas(w), hastaDos(w)];

function esOfensivo(nombre) {
  const b = base(nombre);
  const pegado = sinRepetidas(b.replace(/[^a-zñ]/g, ''));
  const pegadoConRep = b.replace(/[^a-zñ]/g, '');
  for (const r of RAICES) {
    const rr = sinRepetidas(r);
    if (pegado.includes(rr) || pegadoConRep.includes(r)) {
      // "pito" y "pene" solo como inicio de palabra (evita "Hipólito", "Penélope" sí se bloquearía: se permite)
      if (['pito', 'pene', 'cum', 'alv', 'hdp', 'ptm', 'cock', 'dick', 'sexo', 'narco', 'mongol', 'coger', 'cojer', 'tetas'].includes(r)) {
        const palabrasR = b.split(/[^a-zñ]+/).map(sinRepetidas);
        if (palabrasR.some(p => p === r || (p.startsWith(r) && !['penelope', 'pitol', 'cumbia', 'alvar', 'alvaro', 'alvarez', 'dickens', 'mongolia', 'narcis', 'narciso'].some(ok => p.startsWith(ok))))) return true;
        if (b.replace(/[^a-zñ]/g, '') === r) return true;
        continue;
      }
      return true;
    }
  }
  const palabras = b.split(/[^a-zñ]+/).filter(Boolean);
  // también letras separadas: "p u t o" o "p.u.t.o"
  if (palabras.length >= 3 && palabras.every(p => p.length === 1)) palabras.push(palabras.join(''));
  for (const p0 of palabras) {
    const p = sinRepetidas(p0);
    if (variantes(p0).some(v => PALABRAS.includes(v))) return true;
    if (['puto', 'puta', 'verga', 'culo', 'joto', 'marica'].some(w => p.startsWith(w) && !['vergara', 'culon'].includes(p) && p.length <= w.length + 4)) return true;
  }
  return false;
}

// Devuelve un mensaje de error o '' si el nombre está bien
function validarNombre(nombre) {
  const n = String(nombre || '').replace(/\s+/g, ' ').trim();
  if (n.length < 2) return 'Escribe un nombre de al menos 2 letras';
  if (n.length > 20) return 'El nombre puede tener máximo 20 caracteres';
  if (!/[a-zA-ZáéíóúüñÁÉÍÓÚÜÑ]/.test(n)) return 'El nombre debe tener letras';
  if (/(https?:|www\.|\.com)/i.test(n)) return 'No se permiten enlaces en el nombre';
  if (esOfensivo(n)) return 'Ese nombre no está permitido. Usa tu nombre o un apodo respetuoso 🙂';
  return '';
}

// ---------------------------------------------------------------- nombres reales
// Pide Nombre + Apellido y revisa que parezcan reales: solo letras, sin apodos tipo "LA ANTO",
// sin títulos, sin letras repetidas a propósito ni "teclazos" (asdf, qwerty).
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'san', 'santa', 'van', 'von', 'mc', 'da', 'di', 'do', 'dos']);
const NO_NOMBRES = new Set([
  'la', 'el', 'los', 'las', 'lil', 'lill', 'the', 'mr', 'mrs', 'ms', 'miss', 'sr', 'sra', 'srta', 'senor', 'senora', 'señor', 'señora', 'don', 'dona', 'doña',
  'dr', 'dra', 'doctor', 'doctora', 'ing', 'inge', 'lic', 'licenciado', 'profe', 'profesor', 'maestro', 'maestra', 'yo', 'soy', 'tu', 'mi', 'su', 'un', 'una',
  'super', 'mega', 'ultra', 'baby', 'bebe', 'bb', 'king', 'queen', 'rey', 'reina', 'princesa', 'principe', 'crack', 'pro', 'gamer', 'noob', 'chavo', 'chava',
  'compa', 'carnal', 'bro', 'bestie', 'hola', 'hi', 'hello', 'anonimo', 'anonima', 'anonymous', 'anon', 'user', 'usuario', 'jugador', 'jugadora', 'player',
  'test', 'prueba', 'nadie', 'nombre', 'apellido', 'equipo', 'team', 'asdf', 'qwerty', 'xd', 'jaja', 'jajaja', 'lol', 'xx', 'xxx', 'nn', 'na', 'no', 'si',
  'mister', 'papi', 'mami', 'tio', 'tia', 'compadre', 'comadre', 'cuate', 'vato', 'morro', 'morra', 'plebe', 'patron', 'jefe', 'jefa', 'boss', 'dios', 'diosa'
]);
const TECLAZOS = ['asd', 'sdf', 'dfg', 'fgh', 'ghj', 'hjk', 'jkl', 'qwe', 'wer', 'ert', 'rty', 'tyu', 'yui', 'uio', 'zxc', 'xcv', 'cvb', 'vbn', 'bnm', 'qaz', 'wsx'];
const sinAcento = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

function revisarPalabras(texto, campo, maxPalabras) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!t) return { error: `Escribe tu ${campo}` };
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/.test(t)) return { error: `Tu ${campo} solo puede llevar letras (sin números, emojis ni símbolos)` };
  const palabras = t.split(/[ -]/).filter(Boolean);
  const reales = palabras.filter(w => !PARTICULAS.has(sinAcento(w.toLowerCase())));
  if (!reales.length) return { error: `Escribe tu ${campo}` };
  if (reales.length > maxPalabras) return { error: `Escribe solo tu ${campo} (máximo ${maxPalabras} palabras)` };
  for (const w0 of reales) {
    const w = sinAcento(w0.toLowerCase()).replace(/'/g, '');
    if (w.length < 2 && !(w === 'o' && campo === 'apellido')) return { error: `Escribe tu ${campo} completo, sin iniciales` };
    if (w.length > 15) return { error: `Revisa tu ${campo}: hay una palabra muy larga` };
    if (!/[aeiouy]/.test(w)) return { error: `Revisa tu ${campo}: no parece un ${campo} real` };
    if (/(.)\1\1/.test(w)) return { error: `Revisa tu ${campo}: tiene letras repetidas` };
    if (/[^aeiouyh]{5,}/.test(w)) return { error: `Revisa tu ${campo}: no parece un ${campo} real` };
    if (TECLAZOS.some(k => w.includes(k)) && !/^(asdrubal)/.test(w)) return { error: `Revisa tu ${campo}: no parece un ${campo} real` };
  }
  return { palabras };
}
// Escribe con mayúscula inicial: "mARIA de la CRUZ" -> "Maria de la Cruz"
function formatoNombre(t) {
  return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase().split(' ').map((w, i) =>
    (i > 0 && PARTICULAS.has(sinAcento(w))) ? w : w.split('-').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('-')
  ).join(' ');
}
// Devuelve { error } o { nombre, apellido } ya con formato
function validarNombreReal(nombre, apellido) {
  const a = revisarPalabras(nombre, 'nombre', 2);
  if (a.error) return a;
  const primera = sinAcento(a.palabras[0].toLowerCase());
  if (NO_NOMBRES.has(primera) || a.palabras.some(w => NO_NOMBRES.has(sinAcento(w.toLowerCase())) && !PARTICULAS.has(sinAcento(w.toLowerCase()))))
    return { error: 'Escribe tu nombre real, sin apodos ni títulos (por ejemplo: Ana, Luis Fernando)' };
  const b = revisarPalabras(apellido, 'apellido', 3);
  if (b.error) return b;
  if (b.palabras.some(w => NO_NOMBRES.has(sinAcento(w.toLowerCase())) && !PARTICULAS.has(sinAcento(w.toLowerCase()))))
    return { error: 'Escribe tu apellido real' };
  const completo = `${nombre} ${apellido}`;
  if (esOfensivo(completo) || esOfensivo(nombre) || esOfensivo(apellido)) return { error: 'Ese nombre no está permitido. Escribe tu nombre real 🙂' };
  return { nombre: formatoNombre(nombre), apellido: formatoNombre(apellido) };
}
// Para carrera y colonia: texto libre pero sin groserías ni enlaces
function validarTextoLibre(texto, campo) {
  const t = String(texto || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  if (t.length > 60) return `Escribe tu ${campo} más corto`;
  if (/(https?:|www\.|\.com|@)/i.test(t)) return `No se permiten enlaces en ${campo}`;
  if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9 .,'#°-]+$/.test(t)) return `Tu ${campo} solo puede llevar letras y números`;
  if (esOfensivo(t)) return `Escribe tu ${campo} sin groserías 🙂`;
  return '';
}

module.exports = { validarNombre, esOfensivo, validarNombreReal, validarTextoLibre, formatoNombre };

