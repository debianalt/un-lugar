// The timetable: every rise of the river above the evacuation level against the Sentinel-1 passes.
// No imagery is needed to see this blind spot: only the gauge and the dates of the passes.
// Data: public/data/timetable.json, built by prep/build_timetable.py.

const TXT = {
  en: {
    p: 'Leave the images aside and look only at the timetable. Between {first} and {last} the river stood above 13 m {n} times, {days} days in all. Sentinel-1 passed during {seen} of them. The highest, {topH} m in {topDate}, rose and fell between two passes. In {lastDate} the radar passed about two hours before the river crossed the level. With {passes} passes and the river above the level {share} of the time, chance alone gives about {expected} passes over a flood: a rise here lasts two days and the radar returns every six to twelve.',
    fig: '{n} rises above the evacuation level, {seen} radar pass',
    sub: 'Each panel is twenty days around one rise. Line: the gauge at the port. Vertical marks: Sentinel-1 passes. Dashed: 13 m.',
    strip: 'Sentinel-1 passes, {first}–{last}',
    rises: 'rises above 13 m',
    none: 'no pass', one: '1 pass',
    tip: '<b>{date}</b><br>Peak {peak} m, {d} days above 13 m.<br>Last pass {b} days before the river crossed 13 m; next pass {a} days after it fell below.',
    tipIn: '<b>{date}</b><br>Peak {peak} m, {d} days above 13 m.<br>One pass with the river above 13 m.',
    src: 'Gauge readings: Instituto Nacional del Agua, three series of the same site. Passes: every Sentinel-1 acquisition over the corridor, {passes} on {dates} dates.',
    unseen: 'above 13 m, not observed', seen: 'above 13 m, observed'
  },
  es: {
    p: 'Sin mirar ninguna imagen, sólo el horario. Entre {first} y {last} el río estuvo sobre 13 m {n} veces, {days} días en total. Sentinel-1 pasó durante {seen} de ellas. La más alta, {topH} m en {topDate}, subió y bajó entre dos pasadas. En {lastDate} el radar pasó unas dos horas antes de que el río cruzara la cota. Con {passes} pasadas y el río sobre la cota el {share} del tiempo, el azar solo da unas {expected} pasadas sobre una crecida: acá una subida dura dos días y el radar vuelve cada seis a doce.',
    fig: '{n} subidas sobre la cota de evacuación, {seen} pasada de radar',
    sub: 'Cada panel son veinte días alrededor de una subida. Línea: el hidrómetro del puerto. Marcas verticales: pasadas de Sentinel-1. Punteado: 13 m.',
    strip: 'Pasadas de Sentinel-1, {first}–{last}',
    rises: 'subidas sobre 13 m',
    none: 'sin pasada', one: '1 pasada',
    tip: '<b>{date}</b><br>Pico {peak} m, {d} días sobre 13 m.<br>Última pasada {b} días antes de que el río cruzara los 13 m; la siguiente, {a} días después de que bajara.',
    tipIn: '<b>{date}</b><br>Pico {peak} m, {d} días sobre 13 m.<br>Una pasada con el río sobre 13 m.',
    src: 'Lecturas del hidrómetro: Instituto Nacional del Agua, tres series del mismo sitio. Pasadas: todas las adquisiciones de Sentinel-1 sobre el corredor, {passes} en {dates} fechas.',
    unseen: 'sobre 13 m, no observado', seen: 'sobre 13 m, observado'
  }
};

const BLUE = '#1f5ea2', INK = '#17181a';

export function timetable(TT, lang, { h, fill, nf, day, showTip, hideTip }) {
  const t = TXT[lang], eps = TT.episodes, ev = TT.evacuation_level_m;
  const month = (iso) => new Intl.DateTimeFormat(lang === 'es' ? 'es-AR' : 'en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
  const top = eps.reduce((a, b) => (b.peak_m > a.peak_m ? b : a));
  const y0 = +TT.first.slice(0, 4), y1 = +TT.last.slice(0, 4);
  const figT = fill(t.fig, { n: TT.episodes_total, seen: TT.episodes_with_a_pass });
  const frag = document.createDocumentFragment();
  frag.append(h('p', {}, fill(t.p, {
    first: month(TT.first), last: month(TT.last), n: nf(TT.episodes_total), days: nf(TT.days_above), seen: nf(TT.episodes_with_a_pass),
    topH: nf(top.peak_m, 1), topDate: month(top.date), lastDate: month(eps.at(-1).date), passes: nf(TT.passes_total),
    share: nf(TT.share_above * 100, 1) + (lang === 'es' ? ' %' : '%'), expected: nf(Math.round(TT.expected_passes_above))
  })));

  // --- strip: eleven years of passes, with the rises marked above
  const W = 420, L = 6, R = 6, SH = 58;
  const span = (y1 + 1 - y0) * 365.25, sx = (d) => L + (d / span) * (W - L - R);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${SH}" role="img" aria-label="${fill(t.strip, { first: y0, last: y1 })}">`;
  s += `<text x="${L}" y="9">${t.rises}</text>`;
  for (const d of TT.episode_days) s += `<path d="M${sx(d).toFixed(1)} 22 l-4 -8 h8 Z" fill="${INK}"/>`;
  for (const d of TT.pass_days) s += `<line x1="${sx(d).toFixed(1)}" x2="${sx(d).toFixed(1)}" y1="25" y2="40" stroke="${BLUE}" stroke-width=".7" stroke-opacity=".6"/>`;
  s += `<line class="axis" x1="${L}" x2="${W - R}" y1="41" y2="41"/>`;
  for (let y = y0; y <= y1; y++) s += `<line class="axis" x1="${sx((y - y0) * 365.25)}" x2="${sx((y - y0) * 365.25)}" y1="41" y2="45"/><text x="${sx((y - y0 + 0.5) * 365.25)}" y="55" text-anchor="middle">${String(y).slice(2)}</text>`;
  s += '</svg>';

  // --- small multiples: one panel per rise
  const cols = 3, pw = 128, ph = 70, gx = 18, gy = 40, rowsN = Math.ceil(eps.length / cols), H = rowsN * (ph + gy);
  const half = 10, ymax = 20;
  s += `<svg class="chart tt" viewBox="0 0 ${W} ${H}" role="img" aria-label="${figT}"><defs><pattern id="tt-unseen" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="1" fill="#74777d"/></pattern></defs>`;
  eps.forEach((e, i) => {
    const ox = (i % cols) * (pw + gx), oy = Math.floor(i / cols) * (ph + gy) + 26;
    const x = (d) => ox + ((d + half) / (2 * half)) * pw, y = (m) => oy + ph - (Math.min(m, ymax) / ymax) * ph;
    const pts = e.curve.filter((c) => c[1] != null), seen = e.passes_inside > 0;
    s += `<g data-i="${i}"><text class="lab" x="${ox}" y="${oy - 14}">${day(e.date, 'short')}</text><text x="${ox}" y="${oy - 3}">${nf(e.peak_m, 1)} m · ${seen ? t.one : t.none}</text>`;
    // the part of the rise above the level: dots when no pass fell on it, solid when one did
    const over = pts.map((c) => `${x(c[0]).toFixed(1)} ${y(Math.max(c[1], ev)).toFixed(1)}`).join(' L');
    s += `<path d="M${x(pts[0][0]).toFixed(1)} ${y(ev)} L${over} L${x(pts.at(-1)[0]).toFixed(1)} ${y(ev)} Z" fill="${seen ? BLUE : 'url(#tt-unseen)'}" fill-opacity="${seen ? 0.35 : 1}"/>`;
    for (const d of e.passes) s += `<line x1="${x(d).toFixed(1)}" x2="${x(d).toFixed(1)}" y1="${oy}" y2="${oy + ph}" stroke="${BLUE}" stroke-width="1.4"/>`;
    s += `<line x1="${ox}" x2="${ox + pw}" y1="${y(ev)}" y2="${y(ev)}" stroke="#74777d" stroke-dasharray="3 3"/>`;
    s += `<path d="${pts.map((c, k) => `${k ? 'L' : 'M'}${x(c[0]).toFixed(1)} ${y(c[1]).toFixed(1)}`).join(' ')}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    s += `<line class="axis" x1="${ox}" x2="${ox + pw}" y1="${oy + ph}" y2="${oy + ph}"/><rect x="${ox}" y="${oy - 24}" width="${pw}" height="${ph + 24}" fill="transparent"/></g>`;
  });
  s += '</svg>';
  const key = `<div class="key" style="margin-top:8px"><span><i class="sw blank-unseen"></i>${t.unseen}</span><span><i class="sw" style="background:${BLUE};opacity:.45"></i>${t.seen}</span></div>`;
  const f = h('div', { class: 'figure' }, `<h3>${figT}</h3><p class="sub">${t.sub}</p>${s}${key}<p class="sub" style="margin:8px 0 0">${fill(t.src, { passes: nf(TT.passes_total), dates: nf(TT.pass_dates) })}</p>`);
  f.addEventListener('pointermove', (evn) => {
    const g = evn.target.closest?.('g[data-i]'); if (!g) return hideTip();
    const e = eps[g.dataset.i];
    showTip(evn, fill(e.passes_inside ? t.tipIn : t.tip, { date: day(e.date), peak: nf(e.peak_m, 2), d: nf(e.days_above, 1), b: nf(e.last_pass_before_d, 1), a: nf(e.next_pass_after_d, 1) }));
  });
  f.addEventListener('pointerleave', hideTip);
  frag.append(f);
  return frag;
}
