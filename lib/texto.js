'use strict';
// Normaliza y compara respuestas escritas por los jugadores
// ("Col. Camino Verde", "camino berde", "CAMINO VERDE" -> misma respuesta).

const STOP = new Set([
  'colonia', 'col', 'cols', 'fracc', 'fraccionamiento', 'fraccto', 'frac',
  'el', 'la', 'los', 'las', 'de', 'del', 'y', 'en', 'un', 'una'
]);

function normKey(t) {
  return String(t == null ? '' : t)
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(w => w && !STOP.has(w))
    .join(' ');
}

function lev(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let min = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (cur[j] < min) min = cur[j];
    }
    if (min > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

// ¿Dos claves normalizadas son "la misma respuesta"? (tolera faltas de ortografía)
// Para evitar confusiones ("El Florido" vs "Cañadas del Florido"), una respuesta incompleta
// solo cuenta si cubre al menos 60% del nombre.
function sameKey(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const corto = a.length <= b.length ? a : b;
  const largo = a.length <= b.length ? b : a;
  if (corto.length >= 6 && largo.includes(corto) && corto.length / largo.length >= 0.6) return true;
  const L = largo.length;
  const tol = L >= 9 ? 2 : L >= 5 ? 1 : 0;
  return tol > 0 && lev(a, b, tol) <= tol;
}

function titleCase(t) {
  return String(t == null ? '' : t).trim().replace(/\s+/g, ' ').toLowerCase()
    .replace(/(^|\s)(\S)/g, (m, s, c) => s + c.toUpperCase());
}

module.exports = { normKey, sameKey, titleCase };
