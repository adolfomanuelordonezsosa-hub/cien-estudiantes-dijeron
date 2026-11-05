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

module.exports = { validarNombre, esOfensivo };
