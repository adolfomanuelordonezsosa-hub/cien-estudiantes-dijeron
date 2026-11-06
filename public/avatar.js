/* Avatar personalizable (tomado del otro proyecto "100 estudiantes dijeron" y adaptado).
   Código de 6 dígitos: piel, cabello, camisa, pantalón, color de sombrero, tipo de sombrero.
   Un solo dibujo SVG que cada avatar reutiliza con <use> + variables CSS: 100 avatares cuestan casi nada. */
(function () {
  'use strict';
  const PARTS = [['skin', 'Piel'], ['hair', 'Cabello'], ['shirt', 'Camisa'], ['pants', 'Pantalón'], ['hat', 'Sombrero']];
  const PAL = {
    skin: ['#f9dcc4', '#f1c27d', '#e0ac69', '#c68642', '#a8714a', '#8d5524', '#6b3e26', '#4a2b1a'],
    hair: ['#1b1b1b', '#3b2416', '#6a4325', '#a0522d', '#d4a017', '#e8d5a3', '#8a8a8a', '#c0392b'],
    shirt: ['#e63946', '#f4a261', '#2a9d8f', '#264653', '#457b9d', '#8338ec', '#ffbe0b', '#ffffff'],
    pants: ['#1d3557', '#2b2d42', '#6c757d', '#8d6e63', '#3a5a40', '#111111', '#457b9d', '#b5838d'],
    hat: ['#e63946', '#ffbe0b', '#2a9d8f', '#1d3557', '#fefae0', '#6a4c93', '#f77f00', '#5c3d2e']
  };
  const HATS = ['Ninguno', 'Playa', 'Gorra', 'Vaquero', 'Casco', 'Gorro', 'Copa', 'Charro'];
  const DEFECTO = '214301';

  const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<symbol id="avA" viewBox="0 0 100 130">
<path d="M35 85H65L63 119H52L50 96L48 119H37Z" style="fill:var(--pants)"/>
<path d="M36 118H48V124H32Q32 118 36 118ZM52 118H64Q68 118 68 124H52Z" fill="#2b2b2b"/>
<path d="M34 56L22 78L28 81L38 64ZM66 56L78 78L72 81L62 64Z" style="fill:var(--shirt)"/>
<circle cx="25" cy="81" r="4.5" style="fill:var(--skin)"/><circle cx="75" cy="81" r="4.5" style="fill:var(--skin)"/>
<path d="M33 54Q50 46 67 54L66 87H34Z" style="fill:var(--shirt)"/>
<rect x="45" y="44" width="10" height="11" rx="3" style="fill:var(--skin)"/>
<path d="M33 32Q33 12 50 12Q67 12 67 32V44Q62 42 62 34H38Q38 42 33 44Z" style="fill:var(--hair)"/>
<circle cx="50" cy="32" r="16" style="fill:var(--skin)"/>
<path d="M34 30Q34 14 50 14Q66 14 66 30Q58 22 50 22Q42 22 34 30Z" style="fill:var(--hair)"/>
<circle cx="44" cy="33" r="2" fill="#1b1b1b"/><circle cx="56" cy="33" r="2" fill="#1b1b1b"/>
<path d="M44 39Q50 44 56 39" stroke="#1b1b1b" stroke-width="2" fill="none" stroke-linecap="round"/>
</symbol>
<defs>
<g id="avH1" style="fill:var(--hat)"><ellipse cx="50" cy="18" rx="25" ry="5"/><path d="M38 18Q38 4 50 4Q62 4 62 18Z"/><path d="M38.5 13.5H61.5V17H38.5Z" fill="#000" opacity=".25"/></g>
<g id="avH2" style="fill:var(--hat)"><path d="M33 24Q33 7 50 7Q67 7 67 24Z"/><path d="M50 23H82Q82 29 72 29H50Z"/><path d="M50 23H82Q82 29 72 29H50Z" fill="#000" opacity=".18"/><circle cx="50" cy="7" r="2.2"/></g>
<g id="avH3" style="fill:var(--hat)"><path d="M37 21Q35 5 44 6Q50 10 56 6Q65 5 63 21Z"/><path d="M37 16.5H63V20.5H37Z" fill="#000" opacity=".28"/><path d="M15 17Q24 25 50 23Q76 25 85 17Q83 29 50 29Q17 29 15 17Z"/></g>
<g id="avH4" style="fill:var(--hat)"><path d="M32 24Q32 5 50 5Q68 5 68 24Z"/><rect x="47" y="5" width="6" height="18" fill="#000" opacity=".15"/><rect x="28" y="22" width="44" height="5" rx="2.5"/><circle cx="40" cy="15" r="4.2" fill="#fff"/><path d="M40 12.2L42.7 17H37.3Z" fill="#1d4e89"/></g>
<g id="avH5" style="fill:var(--hat)"><circle cx="50" cy="5" r="4.5"/><path d="M33 25Q33 7 50 7Q67 7 67 25Z"/><path d="M38 13H62M35 18H65" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none"/><rect x="31" y="20" width="38" height="8" rx="4"/><rect x="31" y="20" width="38" height="8" rx="4" fill="#000" opacity=".2"/></g>
<g id="avH6" style="fill:var(--hat)"><rect x="39" y="0" width="22" height="18" rx="1.5"/><rect x="39" y="12.5" width="22" height="3.5" fill="#000" opacity=".35"/><ellipse cx="50" cy="18.5" rx="19" ry="3.5"/></g>
<g id="avH7" style="fill:var(--hat)"><ellipse cx="50" cy="20" rx="36" ry="6"/><ellipse cx="50" cy="20" rx="34" ry="4.6" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1.4"/><path d="M40 20Q39 1 50 1Q61 1 60 20Z"/><path d="M40.3 15H59.7V18H40.3Z" fill="#000" opacity=".25"/></g>
</defs></svg>`;

  const CSS = `
.av{display:block}
.av-editor{display:flex;gap:14px;align-items:center}
.av-editor .av-prev{flex:none;width:104px;height:135px;border-radius:14px;background:radial-gradient(circle at 50% 40%,#e8fff5,#9be8c9)}
.av-editor .av-prev .av{width:100%;height:100%}
.av-editor .av-ctrl{flex:1;min-width:0}
.av-tabs{display:flex;flex-wrap:wrap;gap:6px}
.av-tab{border:0;background:rgba(255,255,255,.1);color:var(--gis,#f3f0e6);border-radius:999px;padding:6px 10px;font:700 13px Montserrat,system-ui,sans-serif;cursor:pointer}
.av-tab.on{background:var(--menta,#9be8c9);color:var(--tinta,#16231d)}
.av-sw{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.av-sw button{width:32px;height:32px;border-radius:50%;border:3px solid #2a2c2b;box-shadow:0 0 0 2px rgba(255,255,255,.25);cursor:pointer;padding:0}
.av-sw button.on{box-shadow:0 0 0 3px var(--naranja,#f6a65a)}
.av-hs{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:10px}
.av-hs button{border:2px solid rgba(255,255,255,.15);background:rgba(255,255,255,.06);border-radius:10px;padding:2px;cursor:pointer;font:700 10px Montserrat,system-ui,sans-serif;color:var(--gis-tenue,#c3c0b6)}
.av-hs button.on{border-color:var(--naranja,#f6a65a);color:var(--gis,#f3f0e6)}
.av-hs svg{display:block;width:100%;height:28px}
.av-lbl{font:800 12px Montserrat,system-ui,sans-serif;color:var(--gis-tenue,#c3c0b6);margin-top:8px}
.av-rnd{border:0;background:none;color:var(--naranja,#f6a65a);font:800 14px Montserrat,system-ui,sans-serif;margin-top:8px;cursor:pointer;padding:0}
.av-mini{display:inline-block;vertical-align:middle;border-radius:8px;background:radial-gradient(circle at 50% 40%,#e8fff5,#9be8c9);overflow:hidden;flex:none}
.av-mini .av{width:100%;height:100%}`;

  function instalar() {
    if (document.getElementById('avA')) return;
    const d = document.createElement('div');
    d.innerHTML = SPRITE;
    document.body.prepend(d.firstChild);
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  const fix = c => { c = String(c || ''); return /^[0-7]{6}$/.test(c) ? c : DEFECTO; };
  const estilo = c => PARTS.map(([k], i) => `--${k}:${PAL[k][+c[i] || 0]}`).join(';');
  function svg(c, cls) {
    c = fix(c);
    const h = +c[5];
    return `<svg class="av ${cls || ''}" viewBox="0 0 100 130" style="${estilo(c)}" aria-hidden="true"><use href="#avA"/>${h ? `<use href="#avH${h}"/>` : ''}</svg>`;
  }
  // avatar pequeño con fondo (para rankings): ancho en px
  const mini = (c, ancho) => `<span class="av-mini" style="width:${ancho}px;height:${Math.round(ancho * 1.3)}px">${svg(c)}</span>`;
  const aleatorio = () => Array.from({ length: 6 }, () => Math.random() * 8 | 0).join('');

  // Editor: pinta en `cont` y llama onCambio(codigo) cada vez que cambia
  function editor(cont, codigo, onCambio) {
    instalar();
    let av = fix(codigo).split('').map(Number), parte = 0;
    cont.innerHTML = `<div class="av-editor"><div class="av-prev"></div><div class="av-ctrl"><div class="av-tabs"></div><div class="av-opc"></div><button type="button" class="av-rnd">🎲 Aleatorio</button></div></div>`;
    const prev = cont.querySelector('.av-prev'), tabs = cont.querySelector('.av-tabs'), opc = cont.querySelector('.av-opc');
    const pintarTabs = () => { tabs.innerHTML = PARTS.map(([, l], i) => `<button type="button" class="av-tab${i === parte ? ' on' : ''}" data-p="${i}">${l}</button>`).join(''); };
    function pintarOpc() {
      const k = PARTS[parte][0];
      let h = '<div class="av-sw">' + PAL[k].map((c, i) => `<button type="button" aria-label="${PARTS[parte][1]} color ${i + 1}" data-c="${i}" class="${av[parte] === i ? 'on' : ''}" style="background:${c}"></button>`).join('') + '</div>';
      if (parte === 4) {
        h = '<div class="av-hs">' + HATS.map((n, i) => `<button type="button" data-h="${i}" class="${av[5] === i ? 'on' : ''}"><svg viewBox="12 -2 76 34" style="--hat:${PAL.hat[av[4]]}">${i ? `<use href="#avH${i}"/>` : '<path d="M30 15H70" stroke="#94a3b8" stroke-width="3"/>'}</svg>${n}</button>`).join('') + '</div><div class="av-lbl">Color</div>' + h;
      }
      opc.innerHTML = h;
    }
    function pintar() { const c = av.join(''); prev.innerHTML = svg(c); pintarOpc(); onCambio && onCambio(c); }
    tabs.onclick = e => { const p = e.target.dataset.p; if (p != null) { parte = +p; pintarTabs(); pintarOpc(); } };
    opc.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.h != null) av[5] = +b.dataset.h;
      else if (b.dataset.c != null) { av[parte] = +b.dataset.c; if (parte === 4 && !av[5]) av[5] = 1; }
      else return;
      pintar();
    };
    cont.querySelector('.av-rnd').onclick = () => { av = aleatorio().split('').map(Number); pintar(); };
    pintarTabs(); pintar();
  }

  window.Avatar = { instalar, fix, svg, mini, editor, aleatorio, DEFECTO };
  if (document.body) instalar(); else document.addEventListener('DOMContentLoaded', instalar);
})();
