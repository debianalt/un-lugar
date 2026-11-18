// The Timetable, a first sketch of the piece proposed for LAS Art Foundation.
// Eleven years of one river as sound and light: the river is heard all the time, as filtered noise, and it is seen only when a
// Sentinel-1 pass falls on it. Data: public/data/timetable_daily.json and timetable.json (prep/build_timetable.py).
// Light is drawn as thin lines and small dots, never as a flash of the whole panel.

const TXT = {
  en: {
    h: 'The Timetable, a first sketch',
    sub: 'Eleven years in two minutes. The river is the sound: the water gets louder and wider as the gauge at the port rises, and rougher above 13 m. The radar is the only light: each Sentinel-1 pass shows the river as it was at that hour.',
    play: 'Play', pause: 'Pause', again: 'Play again', soundOn: 'Sound on', soundOff: 'Sound off',
    idle: 'Press play. Sound starts with it.',
    now: '{date} · river at {h} m', nowNone: '{date} · no gauge reading',
    above: ' · above the evacuation level',
    count: 'Rises above 13 m so far: {n}. Lit by a pass: {seen}.',
    keyPass: 'pass, river below 13 m', keyLit: 'pass, river above 13 m', keyDark: 'rise with no pass', keySeen: 'rise with a pass',
    foot: 'A first sketch of The Timetable, the piece proposed for LAS Art Foundation; it is not the piece. The data are those of the figure above. Light is drawn as thin lines, with no flashing of the whole panel.',
    aria: 'Eleven years of the Uruguay River at El Soberbio: dots where a radar pass saw the river, marks where it rose above 13 m.'
  },
  es: {
    h: 'The Timetable, un primer boceto',
    sub: 'Once años en dos minutos. El río es el sonido: el agua se oye más fuerte y más ancha a medida que sube el hidrómetro del puerto, y más áspera sobre los 13 m. El radar es la única luz: cada pasada de Sentinel-1 muestra el río como estaba a esa hora.',
    play: 'Reproducir', pause: 'Pausa', again: 'Otra vez', soundOn: 'Sonido activado', soundOff: 'Sonido apagado',
    idle: 'Apretá reproducir. El sonido empieza ahí.',
    now: '{date} · río en {h} m', nowNone: '{date} · sin lectura del hidrómetro',
    above: ' · sobre la cota de evacuación',
    count: 'Subidas sobre 13 m hasta acá: {n}. Iluminadas por una pasada: {seen}.',
    keyPass: 'pasada, río bajo 13 m', keyLit: 'pasada, río sobre 13 m', keyDark: 'subida sin pasada', keySeen: 'subida con pasada',
    foot: 'Un primer boceto de The Timetable, la pieza propuesta para LAS Art Foundation; no es la pieza. Los datos son los de la figura de arriba. La luz se dibuja con líneas finas, sin destellos de todo el panel.',
    aria: 'Once años del río Uruguay en El Soberbio: puntos donde una pasada de radar vio el río, marcas donde subió sobre 13 m.'
  }
};

// How the water follows the gauge: louder and wider as the river rises. Exported so that it can be checked without a browser.
const FLOOD_HZ = 180, FLOOD_GAIN = 0.8;
const share = (m) => Math.max(0, Math.min(m, 21)) / 21;
export const riverGain = (m) => 0.18 + 0.4 * share(m);            // loudness of the river layer
export const riverCutoff = (m) => 350 * 2 ** (share(m) * 2.6);    // Hz: 350 at 0 m, about 2,100 at 21 m; small speakers carry little below that

const SECONDS = 120, TOP_M = 21, DARK = '#0b0c0e', PALE = '#9fc2ee', LIT = '#ffd98a', MUTE = '#5d6168';
let stopPrevious = null;   // the page is rebuilt when the language changes: the running sketch must stop first

export function piece(DAILY, TT, lang, { h, fill, nf, day }) {
  stopPrevious?.();
  const t = TXT[lang], ev = DAILY.evacuation_level_m, level = DAILY.level_m, passes = DAILY.passes;
  const d0 = Math.floor(passes[0][0]), d1 = level.length - 1, speed = (d1 - d0) / SECONDS;   // days per second
  const origin = Date.parse(DAILY.origin + 'T00:00:00Z');
  const iso = (d) => new Date(origin + Math.floor(d) * 864e5).toISOString().slice(0, 10);
  const rises = TT.episode_days.map((d, i) => ({ d, seen: TT.episodes[i].passes_inside > 0 }));

  const fig = h('div', { class: 'figure piece', id: 'the-timetable' }, `<h3>${t.h}</h3><p class="sub">${t.sub}</p>
    <canvas role="img" aria-label="${t.aria}"></canvas>
    <div class="piece-bar"><button type="button" class="pp">${t.play}</button><button type="button" class="snd" aria-pressed="true">${t.soundOn}</button><span class="now" aria-live="off">${t.idle}</span></div>
    <p class="sub count" style="margin:6px 0 0"></p>
    <div class="key" style="margin-top:8px"><span><i class="sw" style="background:${PALE};border-radius:50%"></i>${t.keyPass}</span><span><i class="sw" style="background:${LIT};border-radius:50%"></i>${t.keyLit}</span><span><i class="sw tri dark"></i>${t.keyDark}</span><span><i class="sw tri seen"></i>${t.keySeen}</span></div>
    <p class="sub" style="margin:8px 0 0">${t.foot}</p>`);
  const cv = fig.querySelector('canvas'), ctx = cv.getContext('2d');
  const bPlay = fig.querySelector('.pp'), bSnd = fig.querySelector('.snd'), now = fig.querySelector('.now'), count = fig.querySelector('.count');

  let T = d0, playing = false, sound = true, raf = 0, last = 0, audio = null, nextPass = 0;

  // ---- drawing: a pure function of the day T
  function draw() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth || 600, hgt = Math.round(w * 0.46);
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr); cv.style.height = hgt + 'px'; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const L = 8, R = 8, top = 20, bot = hgt - 20;
    const x = (d) => L + ((d - d0) / (d1 - d0)) * (w - L - R), y = (m) => bot - (Math.max(0, Math.min(m, TOP_M)) / TOP_M) * (bot - top);
    ctx.fillStyle = DARK; ctx.fillRect(0, 0, w, hgt);
    ctx.font = '10px system-ui, sans-serif'; ctx.fillStyle = MUTE; ctx.strokeStyle = '#26282c'; ctx.lineWidth = 1;
    for (let yr = +DAILY.origin.slice(0, 4); ; yr++) {                     // years along the bottom
      const d = (Date.UTC(yr, 0, 1) - origin) / 864e5; if (d > d1) break;
      if (d >= d0) { ctx.beginPath(); ctx.moveTo(x(d), bot); ctx.lineTo(x(d), bot + 4); ctx.stroke(); }
      const mid = d + 182; if (mid > d0 && mid < d1) { ctx.textAlign = 'center'; ctx.fillText(String(yr).slice(2), x(mid), hgt - 5); }
    }
    ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(L, y(ev)); ctx.lineTo(w - R, y(ev)); ctx.stroke(); ctx.setLineDash([]);
    ctx.textAlign = 'left'; ctx.fillText(nf(ev) + ' m', L, y(ev) - 4);

    for (const [d, m] of passes) {                                         // what the archive holds: one dot per pass
      if (d > T) break;
      const lit = m != null && m >= ev, age = (T - d) / speed;             // seconds since the pass
      if (playing && age < 0.25) {                                         // the pass itself: a thin line that fades
        ctx.strokeStyle = lit ? LIT : PALE; ctx.globalAlpha = 0.5 * (1 - age / 0.25); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x(d), top); ctx.lineTo(x(d), bot); ctx.stroke();
      }
      ctx.globalAlpha = lit ? 1 : 0.6; ctx.fillStyle = m == null ? MUTE : lit ? LIT : PALE;
      ctx.beginPath(); ctx.arc(x(d), m == null ? bot : y(m), lit ? 3.2 : 1.4, 0, 6.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
    let n = 0, seen = 0;
    for (const r of rises) {                                               // the rises: marked once they have happened
      if (r.d > T) break;
      n++; seen += r.seen;
      ctx.beginPath(); ctx.moveTo(x(r.d), top - 4); ctx.lineTo(x(r.d) - 4, top - 12); ctx.lineTo(x(r.d) + 4, top - 12); ctx.closePath();
      if (r.seen) { ctx.fillStyle = LIT; ctx.fill(); } else { ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 1; ctx.stroke(); }
    }
    if (playing) { ctx.fillStyle = '#3a3d42'; ctx.fillRect(x(T), bot, 1, 6); }   // where the time is, below the dark
    const m = level[Math.floor(T)];
    if (playing || T > d0) now.textContent = m == null ? fill(t.nowNone, { date: day(iso(T), 'short') }) : fill(t.now, { date: day(iso(T), 'short'), h: nf(m, 1) }) + (m >= ev ? t.above : '');
    count.textContent = T > d0 ? fill(t.count, { n: nf(n), seen: nf(seen) }) : '';
  }

  // ---- sound: the river is filtered noise, like water; a rougher layer joins it above the level; a drop for each pass
  function startAudio() {
    if (audio) return audio.ctx.resume();
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = new AC(), master = c.createGain(); master.gain.value = sound ? 1 : 0; master.connect(c.destination);
    // brown noise, generated here: no audio file. The end is faded into the start so that the loop has no click.
    const n = c.sampleRate * 6, fade = Math.floor(c.sampleRate * 0.5), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let k = 0, v = 0; k < n; k++) { v = (v + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[k] = v * 3.5; }
    for (let k = 0; k < fade; k++) { const a = k / fade; d[k] = d[k] * a + d[n - fade + k] * (1 - a); }
    const layer = (type, q, offset) => {
      const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      src.buffer = buf; src.loop = true; src.loopEnd = (n - fade) / c.sampleRate; f.type = type; f.Q.value = q; g.gain.value = 0;
      src.connect(f).connect(g); src.start(0, offset); return { f, g };
    };
    const river = layer('lowpass', 0.7, 0), flood = layer('bandpass', 1.1, 2.3);
    river.g.connect(master);
    // the flood layer is low and rough: its loudness trembles a dozen times a second
    const rough = c.createGain(), lfo = c.createOscillator(), depth = c.createGain();
    rough.gain.value = 0.6; lfo.frequency.value = 12; depth.gain.value = 0.4; lfo.connect(depth).connect(rough.gain); lfo.start();
    flood.f.frequency.value = FLOOD_HZ; flood.g.connect(rough).connect(master);
    audio = { ctx: c, master, river, flood };
  }
  function tone() {
    if (!audio) return;
    const m = level[Math.floor(T)], at = audio.ctx.currentTime, on = m != null && playing;
    audio.river.g.gain.setTargetAtTime(on ? riverGain(m) : 0, at, 0.08);
    audio.flood.g.gain.setTargetAtTime(on && m >= ev ? FLOOD_GAIN : 0, at, 0.06);
    if (m != null) audio.river.f.frequency.setTargetAtTime(riverCutoff(m), at, 0.08);
  }
  function tick(lit) {
    if (!audio) return;
    const c = audio.ctx, o = c.createOscillator(), g = c.createGain(), at = c.currentTime, len = lit ? 2.4 : 0.09;
    o.type = 'sine';
    if (lit) o.frequency.value = 1320;                                   // the one pass that met a flood: a bell
    else { o.frequency.setValueAtTime(1500, at); o.frequency.exponentialRampToValueAtTime(480, at + 0.07); }   // every other pass: a drop
    g.gain.setValueAtTime(lit ? 0.2 : 0.07, at); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(audio.master); o.start(at); o.stop(at + len + 0.02);
  }

  function frame(ts) {
    if (!playing) return;
    T += Math.min((ts - last) / 1000, 0.1) * speed; last = ts;
    while (nextPass < passes.length && passes[nextPass][0] <= T) { const m = passes[nextPass][1]; tick(m != null && m >= ev); nextPass++; }
    if (T >= d1) { T = d1; playing = false; bPlay.textContent = t.again; }
    tone(); draw();
    if (playing) raf = requestAnimationFrame(frame);
  }
  function toggle() {
    if (playing) { playing = false; cancelAnimationFrame(raf); bPlay.textContent = t.play; tone(); draw(); return; }
    if (T >= d1) { T = d0; nextPass = 0; }
    startAudio(); playing = true; bPlay.textContent = t.pause; last = performance.now(); raf = requestAnimationFrame(frame);
  }
  bPlay.addEventListener('click', toggle);
  bSnd.addEventListener('click', () => {
    sound = !sound; bSnd.textContent = sound ? t.soundOn : t.soundOff; bSnd.setAttribute('aria-pressed', sound);
    if (audio) audio.master.gain.setTargetAtTime(sound ? 1 : 0, audio.ctx.currentTime, 0.02);
  });

  // the finished record, still, for people who asked for less motion and for the link #the-timetable-end
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || location.hash === '#the-timetable-end') { T = d1; nextPass = passes.length; bPlay.textContent = t.again; }
  const ro = new ResizeObserver(draw); ro.observe(cv);
  requestAnimationFrame(draw);
  stopPrevious = () => { playing = false; cancelAnimationFrame(raf); ro.disconnect(); audio?.ctx.close(); audio = null; };
  return fig;
}
