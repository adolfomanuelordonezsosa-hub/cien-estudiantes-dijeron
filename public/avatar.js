/* Avatares personalizables con animaciones (OCUN · 100 estudiantes dijeron)
   Código: 1 letra + 10 dígitos.  M = mujer, H = hombre, A = animal.
   Humano:  piel, peinado, color de pelo, ropa, color de ropa, abajo, color de abajo, sombrero, color de sombrero, accesorio
   Animal:  especie, pelaje, detalle, ropa, color de ropa, abajo, color de abajo, sombrero, color de sombrero, accesorio
   Cada avatar es un SVG con partes separadas (cabeza, brazos, piernas) para poder animarlo:
   saluda, mira-abajo, mira-izq, mira-der, mira-arriba, brinca, aplaude, camina, busca, nada, sentado, con-corona. */
(function () {
  'use strict';

  // ------------------------------------------------------------- opciones
  const PIEL = ['#f9dcc4', '#f1c27d', '#e0ac69', '#c68642', '#a8714a', '#8d5524', '#6b3e26', '#4a2b1a'];
  const PELO = ['#1b1b1b', '#3b2416', '#6a4325', '#a0522d', '#d4a017', '#e8d5a3', '#8a8a8a', '#b03a2e'];
  const ROPA_C = ['#00723F', '#DD971A', '#FEBE10', '#20419A', '#c0392b', '#f4f4f4', '#6c757d', '#24292e'];
  const ABAJO_C = ['#1d3557', '#24292e', '#6c757d', '#8d6e63', '#024731', '#457b9d', '#7b2d3a', '#ece6d6'];
  const SOMB_C = ['#c0392b', '#FEBE10', '#00723F', '#20419A', '#fefae0', '#6a4c93', '#DD971A', '#5c3d2e'];
  const PELAJE = ['#8d5a2b', '#e9d3a8', '#8f8f8f', '#2b2b2b', '#e07a2e', '#f5f5f5', '#f2a7b8', '#d4a017'];
  const DETALLE = ['#f5e6c8', '#ffffff', '#f7c6d0', '#cfcfcf', '#ffe08a', '#c8e6c9', '#bfe3f5', '#3a3a3a'];

  const PEINADOS = ['Corto', 'Rapado', 'Copete', 'Rizado', 'Largo', 'Coleta', 'Chongo', 'Trenzas'];
  const ROPAS = ['Playera', 'Sudadera', 'Camisa', 'Chamarra', 'Bata de laboratorio', 'Chaleco reflejante', 'Deportiva', 'Suéter'];
  const ABAJOS = ['Pantalón', 'Short', 'Falda', 'Pants'];
  const SOMBREROS = ['Ninguno', 'Playa', 'Gorra', 'Vaquero', 'Casco', 'Gorro', 'Copa', 'Charro'];
  const ACCESORIOS = ['Ninguno', 'Lentes', 'Lentes de sol', 'Bigote', 'Barba', 'Moño', 'Aretes', 'Pecas'];
  const ESPECIES = ['Perro', 'Gato', 'Conejo', 'Oso', 'Panda', 'Zorro', 'Ajolote', 'Mapache'];
  const DEF = { M: 'M2410000006', H: 'H1000303000', A: 'A0001003000' };
  const DEFECTO = DEF.H;

  // ------------------------------------------------------------- código
  function fix(c) {
    c = String(c || '');
    if (/^[MHA][0-7]{10}$/.test(c)) return c;
    if (/^[0-7]{6}$/.test(c)) { // avatares de la versión anterior (6 dígitos)
      return 'H' + c[0] + '0' + c[1] + '0' + c[2] + '0' + c[3] + c[5] + c[4] + '0';
    }
    return DEFECTO;
  }
  const leer = c => { c = fix(c); return { tipo: c[0], d: c.slice(1).split('').map(Number) }; };
  const armar = (tipo, d) => tipo + d.join('');
  const aleatorio = () => {
    const tipo = 'MHA'[Math.random() * 3 | 0];
    const d = Array.from({ length: 10 }, () => Math.random() * 8 | 0);
    d[5] = Math.random() * 4 | 0;
    if (tipo === 'H' && d[1] >= 4 && Math.random() < .6) d[1] = Math.random() * 4 | 0;
    if (Math.random() < .5) d[7] = 0;
    if (Math.random() < .5) d[9] = 0;
    return armar(tipo, d);
  };

  // ------------------------------------------------------------- dibujo
  const oscuro = (hex, f = .72) => {
    const n = parseInt(hex.slice(1), 16);
    const r = Math.round((n >> 16) * f), g = Math.round((n >> 8 & 255) * f), b = Math.round((n & 255) * f);
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  };

  function sombrero(h, col) {
    const s = `fill="${col}"`;
    switch (h) {
      case 1: return `<g ${s}><ellipse cx="50" cy="18" rx="25" ry="5"/><path d="M38 18Q38 4 50 4Q62 4 62 18Z"/><path d="M38.5 13.5H61.5V17H38.5Z" fill="#000" opacity=".25"/></g>`;
      case 2: return `<g ${s}><path d="M33 24Q33 7 50 7Q67 7 67 24Z"/><path d="M50 23H82Q82 29 72 29H50Z"/><path d="M50 23H82Q82 29 72 29H50Z" fill="#000" opacity=".18"/><circle cx="50" cy="7" r="2.2"/></g>`;
      case 3: return `<g ${s}><path d="M37 21Q35 5 44 6Q50 10 56 6Q65 5 63 21Z"/><path d="M37 16.5H63V20.5H37Z" fill="#000" opacity=".28"/><path d="M15 17Q24 25 50 23Q76 25 85 17Q83 29 50 29Q17 29 15 17Z"/></g>`;
      case 4: return `<g ${s}><path d="M32 24Q32 5 50 5Q68 5 68 24Z"/><rect x="47" y="5" width="6" height="18" fill="#000" opacity=".15"/><rect x="28" y="22" width="44" height="5" rx="2.5"/><circle cx="40" cy="15" r="4.2" fill="#fff"/><path d="M40 12.2L42.7 17H37.3Z" fill="#20419A"/></g>`;
      case 5: return `<g ${s}><circle cx="50" cy="5" r="4.5"/><path d="M33 25Q33 7 50 7Q67 7 67 25Z"/><path d="M38 13H62M35 18H65" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none"/><rect x="31" y="20" width="38" height="8" rx="4"/><rect x="31" y="20" width="38" height="8" rx="4" fill="#000" opacity=".2"/></g>`;
      case 6: return `<g ${s}><rect x="39" y="0" width="22" height="18" rx="1.5"/><rect x="39" y="12.5" width="22" height="3.5" fill="#000" opacity=".35"/><ellipse cx="50" cy="18.5" rx="19" ry="3.5"/></g>`;
      case 7: return `<g ${s}><ellipse cx="50" cy="20" rx="36" ry="6"/><ellipse cx="50" cy="20" rx="34" ry="4.6" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.4"/><path d="M40 20Q39 1 50 1Q61 1 60 20Z"/><path d="M40.3 15H59.7V18H40.3Z" fill="#000" opacity=".25"/></g>`;
      default: return '';
    }
  }

  function peloAtras(p, c) {
    switch (p) {
      case 4: return `<path d="M33 28Q33 12 50 12Q67 12 67 28L69 58Q60 62 50 60Q40 62 31 58Z" fill="${c}"/>`;
      case 5: return `<path d="M64 24Q78 30 74 52Q72 60 66 56Q70 44 62 32Z" fill="${c}"/>`;
      case 6: return `<circle cx="50" cy="12" r="7.5" fill="${c}"/>`;
      case 7: return `<path d="M34 34Q30 46 32 60" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/><path d="M66 34Q70 46 68 60" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="32" cy="61" r="3" fill="${oscuro(c)}"/><circle cx="68" cy="61" r="3" fill="${oscuro(c)}"/>`;
      default: return '';
    }
  }
  function peloFrente(p, c) {
    const gorro = 'M34 30Q34 14 50 14Q66 14 66 30Q58 22 50 22Q42 22 34 30Z';
    switch (p) {
      case 1: return `<path d="${gorro}" fill="${c}" opacity=".45"/>`;
      case 2: return `<path d="${gorro}" fill="${c}"/><path d="M40 20Q44 8 58 11Q54 15 56 19Q48 16 40 20Z" fill="${c}"/>`;
      case 3: return [[36, 24], [40, 18], [46, 15], [53, 15], [59, 18], [64, 24], [34, 30], [66, 30]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.2" fill="${c}"/>`).join('');
      case 4: case 5: case 6: case 7: return `<path d="M34 31Q33 14 50 14Q67 14 66 31Q63 21 54 19Q44 22 34 31Z" fill="${c}"/>`;
      default: return `<path d="${gorro}" fill="${c}"/>`;
    }
  }

  function cabezaAnimal(e, pel, det) {
    const os = oscuro(pel, .6);
    const ojos = `<g class="av-ojos"><circle cx="44" cy="32" r="2.2" fill="#1b1b1b"/><circle cx="56" cy="32" r="2.2" fill="#1b1b1b"/><circle cx="44.7" cy="31.3" r=".7" fill="#fff"/><circle cx="56.7" cy="31.3" r=".7" fill="#fff"/></g>`;
    let atras = '', cara = '', base = `<circle cx="50" cy="32" r="16" fill="${pel}"/>`;
    switch (e) {
      case 0: // perro
        atras = `<ellipse cx="34" cy="30" rx="5.5" ry="11" fill="${os}" transform="rotate(18 34 30)"/><ellipse cx="66" cy="30" rx="5.5" ry="11" fill="${os}" transform="rotate(-18 66 30)"/>`;
        cara = `<ellipse cx="50" cy="39" rx="8" ry="6" fill="${det}"/><ellipse cx="50" cy="36.5" rx="2.8" ry="2" fill="#1b1b1b"/><path d="M46 41Q50 44 54 41" stroke="#1b1b1b" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse cx="50" cy="44" rx="2" ry="1.6" fill="#e86a7a"/>`;
        break;
      case 1: // gato
        atras = `<path d="M35 24L36 8L46 18Z" fill="${pel}"/><path d="M65 24L64 8L54 18Z" fill="${pel}"/><path d="M38 20L38.5 12L43 17Z" fill="${det}"/><path d="M62 20L61.5 12L57 17Z" fill="${det}"/>`;
        cara = `<path d="M48.5 37H51.5L50 39Z" fill="#e86a7a"/><path d="M50 39Q48 42 46 41M50 39Q52 42 54 41" stroke="#1b1b1b" stroke-width="1.2" fill="none"/><path d="M42 38H32M42 40L33 43M58 38H68M58 40L67 43" stroke="#1b1b1b" stroke-width=".8" opacity=".6"/>`;
        break;
      case 2: // conejo
        atras = `<ellipse cx="43" cy="8" rx="4.5" ry="13" fill="${pel}"/><ellipse cx="57" cy="8" rx="4.5" ry="13" fill="${pel}"/><ellipse cx="43" cy="9" rx="2.2" ry="9" fill="${det}"/><ellipse cx="57" cy="9" rx="2.2" ry="9" fill="${det}"/>`;
        cara = `<ellipse cx="50" cy="37.5" rx="2" ry="1.5" fill="#e86a7a"/><path d="M50 39V41M47 40Q50 43 53 40" stroke="#1b1b1b" stroke-width="1.1" fill="none"/><rect x="48.4" y="41" width="3.2" height="3" rx=".6" fill="#fff" stroke="#ccc" stroke-width=".4"/>`;
        break;
      case 3: // oso
        atras = `<circle cx="37" cy="18" r="5.5" fill="${pel}"/><circle cx="63" cy="18" r="5.5" fill="${pel}"/><circle cx="37" cy="18" r="2.8" fill="${det}"/><circle cx="63" cy="18" r="2.8" fill="${det}"/>`;
        cara = `<ellipse cx="50" cy="39" rx="7" ry="5.5" fill="${det}"/><ellipse cx="50" cy="37" rx="2.6" ry="1.9" fill="#1b1b1b"/><path d="M47 41Q50 43.5 53 41" stroke="#1b1b1b" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
        break;
      case 4: // panda
        base = `<circle cx="50" cy="32" r="16" fill="#f7f7f2"/>`;
        atras = `<circle cx="37" cy="18" r="5.5" fill="${pel === '#f5f5f5' ? '#2b2b2b' : pel}"/><circle cx="63" cy="18" r="5.5" fill="${pel === '#f5f5f5' ? '#2b2b2b' : pel}"/>`;
        cara = `<ellipse cx="44" cy="32.5" rx="4.2" ry="5" fill="${pel === '#f5f5f5' ? '#2b2b2b' : pel}" transform="rotate(20 44 32)"/><ellipse cx="56" cy="32.5" rx="4.2" ry="5" fill="${pel === '#f5f5f5' ? '#2b2b2b' : pel}" transform="rotate(-20 56 32)"/><ellipse cx="50" cy="38" rx="2.4" ry="1.7" fill="#1b1b1b"/><path d="M47 41Q50 43.5 53 41" stroke="#1b1b1b" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
        return { atras, base, cara: cara + `<g class="av-ojos"><circle cx="44" cy="32" r="1.6" fill="#fff"/><circle cx="56" cy="32" r="1.6" fill="#fff"/><circle cx="44.3" cy="32.2" r=".9" fill="#1b1b1b"/><circle cx="56.3" cy="32.2" r=".9" fill="#1b1b1b"/></g>` };
      case 5: // zorro
        atras = `<path d="M34 26L33 6L47 17Z" fill="${pel}"/><path d="M66 26L67 6L53 17Z" fill="${pel}"/><path d="M36.5 20L36 11L43 17Z" fill="#2b2b2b"/><path d="M63.5 20L64 11L57 17Z" fill="#2b2b2b"/>`;
        cara = `<path d="M34 34Q42 46 50 47Q58 46 66 34Q58 40 50 39Q42 40 34 34Z" fill="${det}"/><ellipse cx="50" cy="38.5" rx="2.4" ry="1.7" fill="#1b1b1b"/><path d="M47.5 42Q50 44 52.5 42" stroke="#1b1b1b" stroke-width="1.1" fill="none"/>`;
        break;
      case 6: // ajolote
        base = `<ellipse cx="50" cy="33" rx="19" ry="15" fill="${pel}"/>`;
        atras = [[-1, 22], [-1, 30], [-1, 38], [1, 22], [1, 30], [1, 38]].map(([s, y]) => {
          const x = s < 0 ? 31 : 69, x2 = s < 0 ? 21 : 79;
          return `<path d="M${x} ${y}Q${(x + x2) / 2} ${y - 6} ${x2} ${y - 3}" stroke="${det}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
        }).join('');
        cara = `<path d="M42 39Q50 45 58 39" stroke="#1b1b1b" stroke-width="1.4" fill="none" stroke-linecap="round"/><circle cx="39" cy="37" r="2.2" fill="#f28ba0" opacity=".6"/><circle cx="61" cy="37" r="2.2" fill="#f28ba0" opacity=".6"/>`;
        break;
      case 7: // mapache
        atras = `<path d="M36 24L35 10L45 18Z" fill="${pel}"/><path d="M64 24L65 10L55 18Z" fill="${pel}"/><path d="M38 20L37.5 14L42 18Z" fill="${det}"/><path d="M62 20L62.5 14L58 18Z" fill="${det}"/>`;
        cara = `<path d="M34 31Q42 25 50 31Q58 25 66 31Q60 37 54 34Q50 33 46 34Q40 37 34 31Z" fill="#2b2b2b"/><ellipse cx="50" cy="39" rx="7" ry="5" fill="${det === '#3a3a3a' ? '#e8e8e8' : det}"/><ellipse cx="50" cy="37.3" rx="2.3" ry="1.7" fill="#1b1b1b"/><path d="M47.5 41Q50 43 52.5 41" stroke="#1b1b1b" stroke-width="1.1" fill="none"/>`;
        return { atras, base, cara: cara + `<g class="av-ojos"><circle cx="44" cy="31.5" r="1.9" fill="#fff"/><circle cx="56" cy="31.5" r="1.9" fill="#fff"/><circle cx="44.3" cy="31.7" r="1" fill="#1b1b1b"/><circle cx="56.3" cy="31.7" r="1" fill="#1b1b1b"/></g>` };
    }
    return { atras, base, cara: ojos + cara };
  }

  function accesorio(a, peloCol) {
    switch (a) {
      case 1: return `<g fill="none" stroke="#24292e" stroke-width="1.3"><circle cx="44" cy="32.5" r="4.4"/><circle cx="56" cy="32.5" r="4.4"/><path d="M48.4 32.5H51.6"/></g>`;
      case 2: return `<g><rect x="38.5" y="29" width="10.5" height="6.5" rx="2.5" fill="#1b1b1b"/><rect x="51" y="29" width="10.5" height="6.5" rx="2.5" fill="#1b1b1b"/><path d="M49 31H51" stroke="#1b1b1b" stroke-width="1.4"/><path d="M40 30.5L43 30.5" stroke="#fff" stroke-width=".8" opacity=".6"/></g>`;
      case 3: return `<path d="M42.5 38.6Q46 36 50 37.6Q54 36 57.5 38.6Q54 40 50 38.8Q46 40 42.5 38.6Z" fill="${peloCol}"/>`;
      case 4: return `<path d="M35 33Q36 47 50 49Q64 47 65 33Q62 42 56 42Q50 45 44 42Q38 42 35 33Z" fill="${peloCol}"/>`;
      case 5: return `<g fill="#c0392b"><path d="M58 15L65 11L65 19Z"/><path d="M58 15L51 11L51 19Z"/><circle cx="58" cy="15" r="2"/></g>`;
      case 6: return `<g fill="#FEBE10" stroke="#B08208" stroke-width=".5"><circle cx="34" cy="37" r="1.8"/><circle cx="66" cy="37" r="1.8"/></g>`;
      case 7: return `<g fill="#a0522d" opacity=".55"><circle cx="40" cy="37" r=".9"/><circle cx="42.5" cy="38.5" r=".9"/><circle cx="39" cy="39.5" r=".8"/><circle cx="60" cy="37" r=".9"/><circle cx="57.5" cy="38.5" r=".9"/><circle cx="61" cy="39.5" r=".8"/></g>`;
      default: return '';
    }
  }

  const CORONA = `<g class="av-corona"><path d="M36 14L39 -1L45 7L50 -4L55 7L61 -1L64 14Z" fill="#FEBE10" stroke="#B08208" stroke-width="1.2" stroke-linejoin="round"/><rect x="36" y="12" width="28" height="4" rx="1.5" fill="#DD971A"/><circle cx="50" cy="6" r="2" fill="#c0392b"/><circle cx="42" cy="9" r="1.4" fill="#20419A"/><circle cx="58" cy="9" r="1.4" fill="#20419A"/><g class="av-brillos" fill="#fff"><path d="M30 2l1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/><path d="M70 0l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z"/><path d="M50 -10l.8 2.4 2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z"/></g></g>`;

  function svg(codigo, cls) {
    const { tipo, d } = leer(codigo);
    const animal = tipo === 'A';
    const piel = animal ? PELAJE[d[1]] : PIEL[d[0]];
    const detalle = DETALLE[d[2]];
    const pelo = PELO[d[2]];
    const ropaT = d[3], ropaC = ROPA_C[d[4]], abajoT = d[5] % 4, abajoC = ABAJO_C[d[6]];
    const somb = d[7], sombC = SOMB_C[d[8]], acc = d[9];
    const largas = [1, 3, 4, 7].includes(ropaT);
    const mangaCol = ropaT === 4 ? '#f7f7f7' : ropaC;
    const cuerpoCol = ropaT === 4 ? '#f7f7f7' : ropaT === 5 ? '#f4f4f4' : ropaC;
    const zapato = animal ? oscuro(piel, .7) : '#2b2b2b';

    // piernas
    const pierna = (x, cls2) => {
      let s = `<g class="av-pierna ${cls2}">`;
      const largo = abajoT === 0 || abajoT === 3;
      s += `<rect x="${x}" y="84" width="10" height="35" rx="3" fill="${largo ? abajoC : piel}"/>`;
      if (abajoT === 1) s += `<rect x="${x - .5}" y="84" width="11" height="15" rx="2" fill="${abajoC}"/>`;
      if (abajoT === 3) s += `<rect x="${x + (x < 50 ? 1 : 7)}" y="86" width="2" height="31" fill="#fff" opacity=".8"/>`;
      s += animal ? `<ellipse cx="${x + 5}" cy="120.5" rx="6.5" ry="4" fill="${zapato}"/>`
        : `<path d="M${x - 2} 118H${x + 10}V124H${x - 3}Q${x - 3} 118 ${x - 2} 118Z" fill="${zapato}"/>`;
      return s + '</g>';
    };
    // brazos
    const brazo = (der) => {
      const sx = der ? 64 : 36, codo = der ? 70 : 30, mx = der ? 73 : 27;
      let s = `<g class="av-brazo ${der ? 'av-bd' : 'av-bi'}">`;
      s += `<path d="M${sx} 58L${mx} 81" stroke="${piel}" stroke-width="7.5" stroke-linecap="round"/>`;
      s += `<path d="M${sx} 58L${largas ? (der ? 72 : 28) : codo} ${largas ? 78 : 68}" stroke="${mangaCol}" stroke-width="9" stroke-linecap="round"/>`;
      if (ropaT === 7) s += `<path d="M${der ? 66 : 34} 64L${der ? 69 : 31} 63M${der ? 68 : 32} 70L${der ? 71 : 29} 69" stroke="#000" stroke-opacity=".2" stroke-width="2"/>`;
      s += `<circle cx="${mx}" cy="83" r="4.6" fill="${piel}"/>`;
      return s + '</g>';
    };
    // torso y ropa
    let torso = `<g class="av-torso"><path d="M33 55Q50 47 67 55L66 88H34Z" fill="${cuerpoCol}"/>`;
    if (ropaT === 1) torso += `<path d="M40 52Q50 60 60 52" stroke="#000" stroke-opacity=".25" stroke-width="2" fill="none"/><rect x="41" y="72" width="18" height="9" rx="3" fill="#000" opacity=".12"/>`;
    if (ropaT === 2) torso += `<path d="M44 51L50 58L47 61ZM56 51L50 58L53 61Z" fill="#fff" opacity=".9"/><circle cx="50" cy="65" r="1" fill="#000" opacity=".35"/><circle cx="50" cy="72" r="1" fill="#000" opacity=".35"/><circle cx="50" cy="79" r="1" fill="#000" opacity=".35"/>`;
    if (ropaT === 3) torso += `<path d="M50 54V88" stroke="#000" stroke-opacity=".3" stroke-width="1.5"/><path d="M43 51L50 57L57 51" stroke="#000" stroke-opacity=".25" stroke-width="2" fill="none"/>`;
    if (ropaT === 4) torso += `<path d="M44 52L50 64L56 52Z" fill="${ropaC}"/><path d="M44 52L50 64M56 52L50 64" stroke="#cfcfcf" stroke-width="1.2"/><rect x="56" y="66" width="7" height="6" rx="1" fill="none" stroke="#cfcfcf"/><path d="M58 64V69" stroke="#20419A" stroke-width="1.2"/>`;
    if (ropaT === 5) torso += `<path d="M36 55Q42 52 45 51L45 88H35ZM64 55Q58 52 55 51L55 88H65Z" fill="${ropaC}"/><rect x="35" y="70" width="10" height="3" fill="#e8e8e8"/><rect x="55" y="70" width="10" height="3" fill="#e8e8e8"/><rect x="35" y="78" width="10" height="3" fill="#e8e8e8"/><rect x="55" y="78" width="10" height="3" fill="#e8e8e8"/>`;
    if (ropaT === 6) torso += `<path d="M38 55V88M62 55V88" stroke="#fff" stroke-width="2.5" opacity=".85"/>`;
    if (ropaT === 7) torso += `<path d="M34 64H66M34 72H66M34 80H66" stroke="#000" stroke-opacity=".18" stroke-width="2.5"/>`;
    if (abajoT === 2) torso += `<path d="M34 84H66L71 104Q50 108 29 104Z" fill="${abajoC}"/>`;
    torso += `<rect x="45" y="44" width="10" height="10" rx="3" fill="${piel}"/></g>`;

    // cabeza
    let cab = '<g class="av-cabeza">';
    let cara;
    if (animal) {
      const a = cabezaAnimal(d[0], piel, detalle);
      cab += a.atras + a.base;
      cara = a.cara;
    } else {
      cab += peloAtras(d[1], pelo) + `<circle cx="50" cy="32" r="16" fill="${piel}"/>`;
      cara = `<g class="av-ojos"><circle cx="44" cy="33" r="2" fill="#1b1b1b"/><circle cx="56" cy="33" r="2" fill="#1b1b1b"/></g>`
        + (tipo === 'M' ? `<path d="M41.5 30.5L42.6 31.6M58.5 30.5L57.4 31.6" stroke="#1b1b1b" stroke-width="1"/>` : '')
        + `<path class="av-boca" d="M44 39Q50 44 56 39" stroke="#1b1b1b" stroke-width="2" fill="none" stroke-linecap="round"/>`
        + `<circle cx="39.5" cy="37" r="2.4" fill="#f28ba0" opacity=".25"/><circle cx="60.5" cy="37" r="2.4" fill="#f28ba0" opacity=".25"/>`;
    }
    cab += `<g class="av-cara">${cara}${accesorio(acc, animal ? oscuro(piel, .55) : pelo)}</g>`;
    if (!animal) cab += peloFrente(d[1], pelo);
    cab += `<g class="av-sombrero">${sombrero(somb, sombC)}</g>${CORONA}</g>`;

    return `<svg class="av av-${tipo} ${cls || ''}" viewBox="0 -12 100 142" overflow="visible" aria-hidden="true"><g class="av-todo">${pierna(38, 'av-pi')}${pierna(52, 'av-pd')}${brazo(false)}${brazo(true)}${torso}${cab}</g></svg>`;
  }

  // ------------------------------------------------------------- animaciones
  const CSS = `
.av{display:block;overflow:visible}
.av g{transform-box:view-box}
.av .av-todo{transform-origin:50px 124px;transition:transform .45s ease}
.av .av-bi{transform-origin:36px 58px;transition:transform .35s ease}
.av .av-bd{transform-origin:64px 58px;transition:transform .35s ease}
.av .av-pi{transform-origin:43px 86px;transition:transform .45s ease}
.av .av-pd{transform-origin:57px 86px;transition:transform .45s ease}
.av .av-cabeza{transform-origin:50px 48px;transition:transform .35s ease}
.av .av-cara{transition:transform .3s ease}
.av .av-ojos{transform-origin:50px 32.5px;animation:av-parpadeo 4.6s infinite}
.av .av-corona{opacity:0;transform-origin:50px 6px;transform:translateY(-14px) scale(.6);transition:opacity .5s,transform .6s cubic-bezier(.3,1.6,.5,1)}
.av .av-sombrero{transition:opacity .3s}
.av.con-corona .av-corona{opacity:1;transform:none}
.av.con-corona .av-sombrero{opacity:0}
.av.con-corona .av-corona path:first-child{animation:av-brilla 1.8s ease-in-out infinite}
.av.con-corona .av-brillos{animation:av-chispa 1.4s ease-in-out infinite}
.anim-idle .av-todo{animation:av-respira 3.2s ease-in-out infinite}
.anim-saluda .av-bd{animation:av-saluda 1.8s ease-in-out}
.anim-mira-abajo .av-cara{transform:translateY(3px)}
.anim-mira-abajo .av-cabeza{transform:rotate(4deg)}
.anim-mira-arriba .av-cara{transform:translateY(-2.5px)}
.anim-mira-izq .av-cara{transform:translateX(-3.5px)}
.anim-mira-der .av-cara{transform:translateX(3.5px)}
.anim-mira-izq .av-cabeza{transform:rotate(-6deg)}
.anim-mira-der .av-cabeza{transform:rotate(6deg)}
.anim-brinca .av-todo{animation:av-brinca .8s ease 2}
.anim-aplaude .av-bi{animation:av-aplaude-i .5s ease-in-out 4}
.anim-aplaude .av-bd{animation:av-aplaude-d .5s ease-in-out 4}
.anim-camina .av-pi{animation:av-paso .5s ease-in-out infinite alternate}
.anim-camina .av-pd{animation:av-paso .5s ease-in-out infinite alternate-reverse}
.anim-camina .av-bi{animation:av-balanceo .5s ease-in-out infinite alternate-reverse}
.anim-camina .av-bd{animation:av-balanceo .5s ease-in-out infinite alternate}
.anim-camina .av-todo{animation:av-bota .25s ease-in-out infinite alternate}
.anim-busca .av-bd{transform:rotate(-168deg)}
.anim-busca .av-cabeza{animation:av-busca 2.4s ease-in-out infinite}
.anim-busca .av-cara{animation:av-busca-cara 2.4s ease-in-out infinite}
.anim-nada .av-bi{transform:rotate(70deg)}
.anim-nada .av-bd{transform:rotate(-70deg)}
.anim-nada .av-cabeza{animation:av-niega .7s ease-in-out 3}
.anim-nada .av-todo{transform:translateY(-1.5px)}
.anim-sentado .av-pi,.anim-sentado .av-pd{transform:scaleY(.4)}
.anim-sentado .av-todo{transform:translateY(19px)}
.anim-sentado .av-bi{transform:rotate(-18deg)}
.anim-sentado .av-bd{transform:rotate(18deg)}
@keyframes av-parpadeo{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}
@keyframes av-respira{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.018)}}
@keyframes av-saluda{0%,100%{transform:rotate(0)}20%{transform:rotate(-155deg)}35%{transform:rotate(-130deg)}50%{transform:rotate(-158deg)}65%{transform:rotate(-130deg)}80%{transform:rotate(-155deg)}}
@keyframes av-brinca{0%,100%{transform:translateY(0)}40%{transform:translateY(-10px)}}
@keyframes av-aplaude-i{0%,100%{transform:rotate(150deg)}50%{transform:rotate(128deg)}}
@keyframes av-aplaude-d{0%,100%{transform:rotate(-150deg)}50%{transform:rotate(-128deg)}}
@keyframes av-paso{from{transform:translateY(0)}to{transform:translateY(-5px) rotate(4deg)}}
@keyframes av-balanceo{from{transform:rotate(-14deg)}to{transform:rotate(14deg)}}
@keyframes av-bota{from{transform:translateY(0)}to{transform:translateY(-2px)}}
@keyframes av-busca{0%,100%{transform:rotate(-7deg)}50%{transform:rotate(7deg)}}
@keyframes av-busca-cara{0%,100%{transform:translateX(-3.5px)}50%{transform:translateX(3.5px)}}
@keyframes av-niega{0%,100%{transform:rotate(0)}25%{transform:rotate(-8deg)}75%{transform:rotate(8deg)}}
@keyframes av-brilla{0%,100%{filter:drop-shadow(0 0 1px #FEBE10)}50%{filter:drop-shadow(0 0 5px #FEBE10) brightness(1.15)}}
@keyframes av-chispa{0%,100%{opacity:.2}50%{opacity:1}}
@media (prefers-reduced-motion:reduce){.av *{animation:none!important;transition:none!important}}
.av-mini{display:inline-block;vertical-align:middle;border-radius:8px;background:radial-gradient(circle at 50% 38%,#fffdf5,#f3dc9a);overflow:hidden;flex:none}
.av-mini .av{width:100%;height:100%}
/* editor */
.av-editor{display:grid;grid-template-columns:110px 1fr;gap:14px;align-items:start}
.av-editor .av-prev{width:110px;height:150px;border-radius:14px;background:radial-gradient(circle at 50% 38%,#fffdf5,#f3dc9a);position:sticky;top:70px;overflow:hidden;padding-top:6px}
.av-editor .av-prev .av{width:100%;height:100%}
.av-tipos{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}
.av-tipos button{border:2px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:var(--gis,#f6f3e8);border-radius:12px;padding:8px 4px;font:800 14px Montserrat,system-ui,sans-serif;cursor:pointer}
.av-tipos button.on{border-color:var(--amarillo,#FEBE10);background:var(--amarillo,#FEBE10);color:var(--tinta,#024731)}
.av-tabs{display:flex;flex-wrap:wrap;gap:6px}
.av-tab{border:0;background:rgba(255,255,255,.1);color:var(--gis,#f6f3e8);border-radius:999px;padding:6px 10px;font:700 13px Montserrat,system-ui,sans-serif;cursor:pointer}
.av-tab.on{background:var(--amarillo,#FEBE10);color:var(--tinta,#024731)}
.av-sw{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.av-sw button{width:32px;height:32px;border-radius:50%;border:3px solid rgba(0,0,0,.35);box-shadow:0 0 0 2px rgba(255,255,255,.25);cursor:pointer;padding:0}
.av-sw button.on{box-shadow:0 0 0 3px var(--amarillo,#FEBE10)}
.av-op{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.av-op button{border:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);border-radius:10px;padding:3px 2px 4px;cursor:pointer;font:700 10.5px Montserrat,system-ui,sans-serif;color:var(--gis-tenue,#cfdcd2);line-height:1.15}
.av-op button.on{border-color:var(--amarillo,#FEBE10);color:var(--gis,#f6f3e8);background:rgba(254,190,16,.12)}
.av-op .mini{display:block;height:46px;margin:0 auto 2px;width:40px}
.av-op .mini .av{width:100%;height:100%}
.av-lbl{font:800 12px Montserrat,system-ui,sans-serif;color:var(--gis-tenue,#cfdcd2);margin-top:10px}
.av-rnd{border:0;background:none;color:var(--amarillo,#FEBE10);font:800 14px Montserrat,system-ui,sans-serif;margin-top:10px;cursor:pointer;padding:0}
@media (max-width:380px){.av-editor{grid-template-columns:88px 1fr}.av-editor .av-prev{width:88px;height:120px}.av-op{grid-template-columns:repeat(3,1fr)}}`;

  function instalar() {
    if (document.getElementById('av-estilos')) return;
    const s = document.createElement('style');
    s.id = 'av-estilos';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // avatar pequeño con fondo (rankings)
  const mini = (c, ancho, cls) => `<span class="av-mini" style="width:${ancho}px;height:${Math.round(ancho * 1.42)}px">${svg(c, cls || 'anim-idle')}</span>`;

  // Hace una animación una vez (quita la clase al terminar)
  function animar(el, nombre, ms) {
    const s = el && (el.tagName === 'svg' ? el : el.querySelector('svg.av'));
    if (!s) return;
    s.classList.add('anim-' + nombre);
    setTimeout(() => s.classList.remove('anim-' + nombre), ms || 1900);
  }

  // ------------------------------------------------------------- editor
  function editor(cont, codigo, onCambio) {
    instalar();
    let { tipo, d } = leer(codigo);
    let parte = 0;
    const PARTES = {
      humano: [['piel', 'Piel'], ['peinado', 'Peinado'], ['pelo', 'Color de pelo'], ['ropa', 'Ropa'], ['abajo', 'Abajo'], ['sombrero', 'Sombrero'], ['acc', 'Accesorios']],
      animal: [['especie', 'Animal'], ['pelaje', 'Pelaje'], ['detalle', 'Detalle'], ['ropa', 'Ropa'], ['abajo', 'Abajo'], ['sombrero', 'Sombrero'], ['acc', 'Accesorios']]
    };
    cont.innerHTML = `<div class="av-editor"><div class="av-prev"></div><div><div class="av-tipos"><button type="button" data-t="M">👩 Mujer</button><button type="button" data-t="H">👨 Hombre</button><button type="button" data-t="A">🐾 Animal</button></div><div class="av-tabs"></div><div class="av-opc"></div><button type="button" class="av-rnd">🎲 Sorpréndeme</button></div></div>`;
    const prev = cont.querySelector('.av-prev'), tabs = cont.querySelector('.av-tabs'), opc = cont.querySelector('.av-opc');
    const partes = () => PARTES[tipo === 'A' ? 'animal' : 'humano'];
    const cod = () => armar(tipo, d);
    const variante = (i, v) => { const c = d.slice(); c[i] = v; return armar(tipo, c); };
    const opciones = (i, nombres) => '<div class="av-op">' + nombres.map((n, v) => `<button type="button" data-i="${i}" data-v="${v}" class="${d[i] % nombres.length === v ? 'on' : ''}"><span class="mini">${svg(variante(i, v))}</span>${n}</button>`).join('') + '</div>';
    const colores = (i, pal, lbl) => (lbl ? `<div class="av-lbl">${lbl}</div>` : '') + '<div class="av-sw">' + pal.map((c, v) => `<button type="button" aria-label="${lbl || 'Color'} ${v + 1}" data-i="${i}" data-v="${v}" class="${d[i] === v ? 'on' : ''}" style="background:${c}"></button>`).join('') + '</div>';

    function pintarTipos() { cont.querySelectorAll('.av-tipos button').forEach(b => b.classList.toggle('on', b.dataset.t === tipo)); }
    function pintarTabs() { tabs.innerHTML = partes().map(([, l], i) => `<button type="button" class="av-tab${i === parte ? ' on' : ''}" data-p="${i}">${l}</button>`).join(''); }
    function pintarOpc() {
      const k = partes()[parte][0];
      let h = '';
      if (k === 'piel') h = colores(0, PIEL);
      if (k === 'peinado') h = opciones(1, PEINADOS);
      if (k === 'pelo') h = colores(2, PELO);
      if (k === 'especie') h = opciones(0, ESPECIES);
      if (k === 'pelaje') h = colores(1, PELAJE);
      if (k === 'detalle') h = colores(2, DETALLE, 'Color de cara, panza u orejas');
      if (k === 'ropa') h = opciones(3, ROPAS) + colores(4, ROPA_C, 'Color');
      if (k === 'abajo') h = opciones(5, ABAJOS) + colores(6, ABAJO_C, 'Color');
      if (k === 'sombrero') h = opciones(7, SOMBREROS) + colores(8, SOMB_C, 'Color');
      if (k === 'acc') h = opciones(9, ACCESORIOS);
      opc.innerHTML = h;
    }
    function pintar(saludar) {
      prev.innerHTML = svg(cod(), 'anim-idle');
      if (saludar) animar(prev, 'saluda', 1800);
      pintarTipos(); pintarOpc();
      onCambio && onCambio(cod());
    }
    cont.querySelector('.av-tipos').onclick = e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.t === tipo) return;
      const nuevo = leer(DEF[t.dataset.t]);
      if (tipo !== 'A' && t.dataset.t !== 'A') { tipo = t.dataset.t; if (t.dataset.t === 'M' && d[1] < 4) d[1] = 4; if (t.dataset.t === 'H' && d[1] >= 4) d[1] = 0; }
      else { tipo = nuevo.tipo; d = nuevo.d; }
      parte = 0; pintarTabs(); pintar(true);
    };
    tabs.onclick = e => { const p = e.target.dataset.p; if (p != null) { parte = +p; pintarTabs(); pintarOpc(); } };
    opc.onclick = e => {
      const b = e.target.closest('button'); if (!b || b.dataset.i == null) return;
      d[+b.dataset.i] = +b.dataset.v;
      if (+b.dataset.i === 8 && !d[7]) d[7] = 1;
      pintar(false);
    };
    cont.querySelector('.av-rnd').onclick = () => { const r = leer(aleatorio()); tipo = r.tipo; d = r.d; parte = 0; pintarTabs(); pintar(true); };
    pintarTabs(); pintar(false);
    return { codigo: cod };
  }

  window.Avatar = { instalar, fix, svg, mini, editor, aleatorio, animar, DEFECTO };
  if (document.head) instalar(); else document.addEventListener('DOMContentLoaded', instalar);
})();
