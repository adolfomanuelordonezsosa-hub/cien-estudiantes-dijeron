/* Voz del conductor (Victor) para celulares y TV.
   Cada "evento" del juego tiene una o varias grabaciones (se suben o graban en /admin → Voces).
   Si un evento tiene varias, se elige una al azar para que no suene repetido.
   Los nombres de los jugadores no se pueden grabar por adelantado: se muestran en pantalla,
   y el lugar (1 al 10) sí se dice con las grabaciones "Lugar 1" ... "Lugar 10". */
(function () {
  'use strict';
  const EVENTOS = [
    { id: 'bienvenida', titulo: 'Bienvenida', donde: 'Celular y TV', cuando: 'Al abrir el juego (primer toque)', texto: '¡Bienvenidos a Cien estudiantes dijeron! Arma tu avatar y demuestra cuánto sabes de las lluvias en Tijuana.', sugerencias: ['¡Bienvenidos a 100 estudiantes dijeron! Arma tu avatar y demuestra cuánto sabes de las lluvias en Tijuana.', '¡Qué tal, qué tal! Bienvenido a 100 estudiantes dijeron. ¿Listo para jugar?'] },
    { id: 'invitacion', titulo: 'Invitación a jugar', donde: 'TV', cuando: 'Cada 3 minutos para atraer gente', texto: '¿Crees que sabes qué colonias se inundan más? Escanea el código y juega.', sugerencias: ['¿Crees que sabes qué colonias se inundan más? Escanea el código y juega.', '¡Ándale, anímate! Escanea el código y demuestra lo que sabes.'] },
    { id: 'pregunta', titulo: 'Sale una pregunta', donde: 'Celular', cuando: 'Al aparecer cada pregunta', texto: '¡Ahí va la pregunta!', sugerencias: ['¡Ahí va la pregunta!', '¡Pon atención, ahí te va!', 'Preguntamos a 100 estudiantes…'] },
    { id: 'correcta', titulo: 'Respuesta correcta', donde: 'Celular', cuando: 'Cuando la colonia sí está en el tablero', texto: '¡Está en el tablero!', sugerencias: ['¡100 estudiantes dijeron!', '¡Está en el tablero!', '¡Eso, muy bien!', '¡Bravo, campeón!'] },
    { id: 'incorrecta', titulo: 'Respuesta incorrecta', donde: 'Celular', cuando: 'Cuando la colonia no está en el tablero', texto: '¡No está en el tablero!', sugerencias: ['¡No está en el tablero!', '¡Uy, casi!', '¡Nooo, esa no!', 'Mmm… no, esa no es.'] },
    { id: 'tiempo', titulo: 'Se acabó el tiempo', donde: 'Celular', cuando: 'Cuando se acaban los 10 segundos de una vida', texto: '¡Se acabó el tiempo!', sugerencias: ['¡Se acabó el tiempo!', '¡Uy, se te fue el tiempo!'] },
    { id: 'sin_oportunidades', titulo: 'Se acabaron las oportunidades', donde: 'Celular', cuando: 'Al tercer error de una pregunta', texto: 'Se acabaron tus oportunidades.', sugerencias: ['¡Se acabaron tus oportunidades! Vamos a la siguiente.', 'Ni modo, ¡a la siguiente!'] },
    { id: 'tablero_completo', titulo: 'Encontró todas', donde: 'Celular', cuando: 'Cuando encuentra todas las colonias de una pregunta', texto: '¡Las encontraste todas!', sugerencias: ['¡Las encontraste todas! ¡Qué bárbaro!', '¡Tablero completo!'] },
    { id: 'gracias', titulo: 'Gracias por jugar', donde: 'Celular', cuando: 'Al terminar la última pregunta', texto: '¡Gracias por jugar! Ahora veamos las respuestas correctas.', sugerencias: ['¡Gracias por jugar! Ahora veamos las respuestas correctas.', '¡Muchas gracias por participar! Mira cómo te fue.'] },
    { id: 'entra_top', titulo: 'Entró al Top 10', donde: 'Celular y TV', cuando: 'Cuando alguien termina y queda en el Top 10 (después suena "Lugar N")', texto: '¡Bravo, campeón! ¡Eres la mera pistola! Quedaste en el Top 10.', sugerencias: ['¡Bravo, campeón! ¡Eres la mera pistola! Quedaste en el…', '¡Así se hace! ¡Ya estás en el Top 10, en el…'] },
    { id: 'nuevo_primero', titulo: 'Nuevo primer lugar', donde: 'Celular y TV', cuando: 'Cuando alguien queda en primer lugar', texto: '¡Tenemos nuevo campeón! ¡Primer lugar!', sugerencias: ['¡Atención! ¡Tenemos nuevo campeón! ¡Primer lugar!', '¡Abran paso, que llegó el nuevo número uno!'] },
    { id: 'te_rebasaron', titulo: 'Le quitaron su lugar', donde: 'Celular (de quien bajó)', cuando: 'Si alguien le gana su lugar mientras tiene abierta la página', texto: 'Perdón, campeón, pero hay alguien más gallo que tú.', sugerencias: ['Perdón, campeón, pero hay alguien más gallo que tú.', '¡Uy! Te acaban de ganar el lugar. ¡Juega otra vez y recupéralo!'] },
    { id: 'salio_top', titulo: 'Salió del Top 10', donde: 'Celular (de quien salió)', cuando: 'Si alguien lo saca del Top 10 mientras tiene abierta la página', texto: 'Ni modo, campeón, te sacaron del Top 10. ¡Juega otra vez!', sugerencias: ['Ni modo, campeón, te sacaron del Top 10. ¡Juega otra vez!'] },
    { id: 'dijeron', titulo: '"100 estudiantes dijeron"', donde: 'TV', cuando: 'Botón "Probar voz" de la TV', texto: '¡Cien estudiantes dijeron!', sugerencias: ['¡100 estudiantes dijeron!'] }
  ];
  const NUM = ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
  for (let i = 1; i <= 10; i++) EVENTOS.push({ id: 'lugar_' + i, titulo: 'Lugar ' + i, donde: 'Celular y TV', cuando: `Después de "Entró al Top 10" o "Te quitaron el lugar"`, texto: 'Lugar ' + NUM[i - 1] + '.', sugerencias: ['¡Lugar ' + i + '!'], numero: true });

  const espera = ms => new Promise(r => setTimeout(r, ms));
  const leerLS = k => { try { return localStorage.getItem(k); } catch { return null; } };
  const guardarLS = (k, v) => { try { localStorage.setItem(k, v); } catch { /* */ } };

  const Voz = {
    EVENTOS, activo: true, clave: 'voz_activa', urls: {}, tts: true, crudos: {}, buffers: {}, ctx: null, listo: null, ultima: {},
    token: 0, fuente: null, audioEl: null, vozTTS: null, desbloqueado: false,

    async iniciar(opciones = {}) {
      this.clave = opciones.clave || this.clave;
      this.activo = leerLS(this.clave) !== '0';
      try {
        const r = await fetch('/api/voces', { cache: 'no-store' });
        const d = await r.json();
        this.urls = d.eventos || {};
        this.tts = d.tts !== false;
      } catch { this.urls = {}; }
      // descarga las grabaciones de una vez (se decodifican al primer toque)
      await Promise.all(Object.values(this.urls).flat().map(async u => {
        if (this.crudos[u]) return;
        try { this.crudos[u] = await (await fetch(u)).arrayBuffer(); } catch { /* */ }
      }));
      if (this.ctx) this.decodificar();
      if ('speechSynthesis' in window) { this.elegirVoz(); speechSynthesis.onvoiceschanged = () => this.elegirVoz(); }
    },
    tiene(evento) { return !!(this.urls[evento] && this.urls[evento].length); },
    elegirVoz() {
      const vs = speechSynthesis.getVoices().filter(v => /^es/i.test(v.lang));
      this.vozTTS = vs.find(v => /es[-_]MX/i.test(v.lang)) || vs.find(v => /es[-_]US/i.test(v.lang)) || vs[0] || null;
    },
    // Llamar dentro de un toque/clic del usuario (requisito de los navegadores de celular)
    desbloquear() {
      if (this.desbloqueado) return this.listo || Promise.resolve();
      this.desbloqueado = true;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const b = this.ctx.createBuffer(1, 1, 22050), s = this.ctx.createBufferSource();
        s.buffer = b; s.connect(this.ctx.destination); s.start(0);
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } catch { this.ctx = null; }
      try { this.audioEl = new Audio(); this.audioEl.play().catch(() => {}); } catch { /* */ }
      return this.decodificar();
    },
    decodificar() {
      if (!this.ctx) return Promise.resolve();
      this.listo = Promise.all(Object.entries(this.crudos).map(([u, ab]) => {
        if (this.buffers[u]) return null;
        return new Promise(ok => {
          try { this.ctx.decodeAudioData(ab.slice(0), b => { this.buffers[u] = b; ok(); }, () => ok()); } catch { ok(); }
        });
      }));
      return this.listo;
    },
    alternar(v) {
      this.activo = v == null ? !this.activo : !!v;
      guardarLS(this.clave, this.activo ? '1' : '0');
      if (!this.activo) this.detener();
      return this.activo;
    },
    detener() {
      this.token++;
      try { this.fuente && this.fuente.stop(); } catch { /* */ }
      this.fuente = null;
      try { this.audioEl && this.audioEl.pause(); } catch { /* */ }
      try { 'speechSynthesis' in window && speechSynthesis.cancel(); } catch { /* */ }
    },
    elegir(evento) {
      const lista = this.urls[evento] || [];
      if (!lista.length) return null;
      if (lista.length === 1) return lista[0];
      let u; do { u = lista[Math.random() * lista.length | 0]; } while (u === this.ultima[evento]);
      this.ultima[evento] = u;
      return u;
    },
    async tocarUrl(u, tk) {
      if (this.listo) await Promise.race([this.listo, espera(2500)]);
      if (tk !== this.token) return;
      const b = this.buffers[u];
      if (b && this.ctx) {
        if (this.ctx.state === 'suspended') { try { await this.ctx.resume(); } catch { /* */ } }
        return new Promise(ok => {
          const s = this.ctx.createBufferSource();
          s.buffer = b; s.connect(this.ctx.destination);
          s.onended = ok; this.fuente = s; s.start();
          setTimeout(ok, b.duration * 1000 + 300);
        });
      }
      // respaldo: elemento <audio>
      return new Promise(ok => {
        const a = this.audioEl || new Audio();
        a.src = u; a.onended = ok; a.onerror = ok;
        a.play().catch(ok);
        setTimeout(ok, 12000);
      });
    },
    // Nunca se usa voz de computadora: si una frase no tiene grabación, no suena nada
    decir(texto, tk) {
      return Promise.resolve();
      // eslint-disable-next-line no-unreachable
      if (!this.activo || !this.tts || !texto || !('speechSynthesis' in window) || tk !== this.token) return Promise.resolve();
      return new Promise(ok => {
        const u = new SpeechSynthesisUtterance(texto);
        if (!this.vozTTS) this.elegirVoz();
        if (this.vozTTS) { u.voice = this.vozTTS; u.lang = this.vozTTS.lang; } else u.lang = 'es-MX';
        u.rate = 1.05;
        let listo = false; const fin = () => { if (!listo) { listo = true; ok(); } };
        u.onend = fin; u.onerror = fin; setTimeout(fin, 1200 + texto.length * 95);
        speechSynthesis.speak(u);
      });
    },
    async evento(id, tk) {
      if (!this.activo || tk !== this.token) return;
      const u = this.elegir(id);
      if (u) return this.tocarUrl(u, tk);
      // sin grabación: silencio (nunca voz robótica)
    },
    // efectos de sonido
    tono(f, t0, d, tipo = 'triangle', vol = .2) {
      if (!this.activo || !this.ctx) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime + t0;
      o.type = tipo; o.frequency.value = f;
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(vol, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + .05);
    },
    ding() { this.tono(784, 0, .35, 'sine', .25); this.tono(1175, .09, .5, 'sine', .2); },
    buzzer() { this.tono(92, 0, .7, 'sawtooth', .16); this.tono(97, 0, .7, 'square', .08); },
    fanfarria() { [523, 659, 784, 1047].forEach((f, i) => this.tono(f, i * .13, .5)); },
    redoble() { for (let i = 0; i < 14; i++) this.tono(180 + (i % 2) * 20, i * .07, .08, 'square', .06); },
    // Ejecuta pasos en orden: {evento}, {lugar: n}, {decir}, {efecto}, {pausa}. Una secuencia nueva corta la anterior.
    async secuencia(pasos, opciones = {}) {
      if (!opciones.encolar) this.detener();
      const tk = this.token;
      for (const p of pasos) {
        if (tk !== this.token || !this.activo) return;
        if (p.efecto) { this[p.efecto](); await espera(p.pausa || 250); }
        else if (p.evento) await this.evento(p.evento, tk);
        else if (p.lugar) { if (p.lugar >= 1 && p.lugar <= 10) await this.evento('lugar_' + p.lugar, tk); }
        else if (p.decir) await this.decir(p.decir, tk);
        else if (p.pausa) await espera(p.pausa);
      }
    }
  };
  window.Voz = Voz;
})();
