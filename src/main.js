import 'maplibre-gl/dist/maplibre-gl.css';
import '@fontsource/archivo/400.css';
import '@fontsource/archivo/500.css';
import '@fontsource/archivo/600.css';
import '@fontsource/chivo-mono/400.css';
import '@fontsource/chivo-mono/500.css';
import './style.css';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { T } from './i18n.js';

maplibregl.setWorkerUrl(workerUrl); // maplibre-gl 6 is ESM-only: the worker URL must be set before the first map

const BASE = import.meta.env.BASE_URL + 'data/';
const ORDER = ['radar', 'relief', 'water', 'forest', 'empty', 'notes'];
const REG = ['measured', 'interpreted', 'situated', 'speculated'];
const COLOR = { measured: '#1f5ea2', interpreted: '#c56a1b', situated: '#7a5195', speculated: '#1c7b4c' };
const DEM = { fabdem: ['#1f5ea2', ''], glo30: ['#c56a1b', '6 3'], aw3d30: ['#7a5195', '2 3'], merit: ['#1c7b4c', '9 3 2 3'] };
const RADAR_BOX = [-54.30, -27.40, -54.10, -27.20];
const FOREST = { agree: '#a6caad', mixed: '#cfcfcf', crop: '#d9a441', forest: '#c56a1b' };

// Short horizontal dashes: the page's mark for knowledge that exists and is kept back by decision.
function withheldPattern() {
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const g = c.getContext('2d'); g.strokeStyle = '#74777d'; g.lineWidth = 1.5;
  g.beginPath(); g.moveTo(2, 4); g.lineTo(9, 4); g.moveTo(10, 12); g.lineTo(16, 12); g.moveTo(0, 12); g.lineTo(1, 12); g.stroke();
  return g.getImageData(0, 0, 16, 16);
}

let lang = 'en';
try { const v = localStorage.getItem('un_lugar_lang'); if (v === 'es' || v === 'en') lang = v; else if (navigator.language?.startsWith('es')) lang = 'es'; } catch { /* storage may be blocked */ }
const D = {};
let map, active = 'radar', waterView = 'm2014'; // the 2014 flood falls inside the satellite record
const regOn = Object.fromEntries(REG.map((k) => [k, true]));
const markers = [];

const $ = (s, el = document) => el.querySelector(s);
const fill = (str, o) => str.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const nf = (x, d = 0) => new Intl.NumberFormat(lang === 'es' ? 'es-AR' : 'en-GB', { maximumFractionDigits: d, minimumFractionDigits: d }).format(x);
const pct = (x) => nf(x * 100) + (lang === 'es' ? ' %' : '%');
const day = (iso, month = 'long') => new Intl.DateTimeFormat(lang === 'es' ? 'es-AR' : 'en-GB', { day: 'numeric', month, year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T00:00:00Z'));
// The three kinds of blank the page tells apart (see section 05).
const blank = (k) => `<i class="sw blank-${k}"></i>`;
// Annotation fields may be a plain string or one text per language.
const L = (v) => (v && typeof v === 'object' ? v[lang] ?? v.en : v ?? '');
const h = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.innerHTML = html; return e; };
const tip = $('#tip');
function showTip(ev, html) { tip.innerHTML = html; tip.hidden = false; const x = Math.min(ev.clientX + 12, innerWidth - 270); tip.style.left = x + 'px'; tip.style.top = ev.clientY + 14 + 'px'; }
const hideTip = () => { tip.hidden = true; };

function shape(reg, size = 14) {
  const c = COLOR[reg], s = size, m = s / 2;
  const body = {
    measured: `<circle cx="${m}" cy="${m}" r="${m - 2}" fill="${c}" stroke="#fff" stroke-width="2"/>`,
    interpreted: `<rect x="2" y="2" width="${s - 4}" height="${s - 4}" fill="${c}" stroke="#fff" stroke-width="2"/>`,
    situated: `<path d="M${m} 1.5 L${s - 1.5} ${s - 2} L1.5 ${s - 2} Z" fill="${c}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`,
    speculated: `<path d="M${m} 2 L${s - 2} ${m} L${m} ${s - 2} L2 ${m} Z" fill="#fff" stroke="${c}" stroke-width="2.5" stroke-linejoin="round"/>`
  }[reg];
  return `<svg class="mk" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" aria-hidden="true">${body}</svg>`;
}

// ------------------------------------------------------------------ charts
function scale(d0, d1, r0, r1) { return (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0); }

function radarChart(t) {
  const W = 420, H = 250, L = 44, R = 12, Tp = 10, B = 36;
  const pts = D.radar.points, ymax = Math.ceil(Math.max(...pts.map((p) => p.w)) / 500) * 500;
  const x = scale(0, 18, L, W - R), y = scale(0, ymax, H - B, Tp);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.fig}">`;
  for (let v = 0; v <= ymax; v += 500) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${nf(v)}</text>`;
  for (let v = 0; v <= 18; v += 3) s += `<text x="${x(v)}" y="${H - B + 15}" text-anchor="middle">${v}</text>`;
  s += `<line class="axis" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>`;
  const ev = D.radar.evacuation_level_m, years = D.radar.last_year - D.radar.first_year;
  // Above the evacuation level the sensor has almost never looked: drawn as dots, the page's mark for "not observed".
  s += `<defs><pattern id="unseen" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#9a9da3"/></pattern></defs><rect x="${x(ev)}" y="${Tp}" width="${x(18) - x(ev)}" height="${y(0) - Tp}" fill="url(#unseen)"/>`;
  s += `<line x1="${x(ev)}" x2="${x(ev)}" y1="${Tp}" y2="${y(0)}" stroke="#74777d" stroke-dasharray="3 3"/><text class="lab" x="${x(ev) - 6}" y="${Tp + 10}" text-anchor="end">${t.evac}</text><text x="${x(ev) - 6}" y="${Tp + 24}" text-anchor="end">${fill(t.unseen, { above: D.radar.passes_above_evacuation, years })}</text>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle">${t.x}</text><text x="${L}" y="${Tp - 1}" text-anchor="start" dy="-2">${t.y}</text>`;
  pts.forEach((p, i) => {
    const hi = p.h >= ev; // the passes that caught a flood stand out
    s += `<circle data-i="${i}" cx="${x(Math.min(p.h, 18)).toFixed(1)}" cy="${y(p.w).toFixed(1)}" r="${hi ? 5 : 3.2}" fill="${COLOR.measured}" fill-opacity="${hi ? 1 : 0.55}" stroke="${hi ? '#17181a' : '#fff'}" stroke-width="${hi ? 1.5 : 0.8}"/>`;
    if (hi) s += `<text class="lab" x="${x(Math.min(p.h, 18)).toFixed(1)}" y="${(y(p.w) + 19).toFixed(1)}" text-anchor="middle" stroke="#fff" stroke-width="4" paint-order="stroke" stroke-linejoin="round">${day(p.d, 'short')}</text>`;
  });
  s += '</svg>';
  const el = h('div', {}, s);
  el.addEventListener('pointermove', (ev) => { const i = ev.target.dataset?.i; if (i == null) return hideTip(); const p = pts[i]; showTip(ev, fill(t.tip, { d: p.d, h: nf(p.h, 1), w: nf(p.w) })); });
  el.addEventListener('pointerleave', hideTip);
  return el;
}

function reliefChart(t) {
  const W = 420, H = 250, L = 40, R = 86, Tp = 14, B = 36;
  const tr = D.relief.transect, dist = tr.distance_m, keys = Object.keys(tr.profiles);
  const all = keys.flatMap((k) => tr.profiles[k]).filter((v) => v != null);
  const y0 = Math.floor(Math.min(...all) / 10) * 10, y1 = Math.ceil(Math.max(...all) / 10) * 10;
  const x = scale(0, dist.at(-1), L, W - R), y = scale(y0, y1, H - B, Tp);
  let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t.fig}">`;
  const i0 = tr.is_river.indexOf(true), i1 = tr.is_river.lastIndexOf(true);
  if (i0 >= 0) s += `<rect x="${x(dist[i0])}" y="${Tp}" width="${x(dist[i1]) - x(dist[i0])}" height="${H - B - Tp}" fill="#aec6dd" fill-opacity=".45"/><text x="${(x(dist[i0]) + x(dist[i1])) / 2}" y="${Tp + 11}" text-anchor="middle">${t.river}</text>`;
  for (let v = y0; v <= y1; v += 10) s += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
  for (let v = 0; v <= dist.at(-1); v += 500) s += `<text x="${x(v)}" y="${H - B + 15}" text-anchor="middle">${nf(v)}</text>`;
  s += `<text x="${(L + W - R) / 2}" y="${H - 4}" text-anchor="middle">${t.x}</text><text x="${L}" y="${Tp - 3}">${t.y}</text>`;
  const ends = [];
  for (const k of keys) {
    const d = tr.profiles[k].map((v, i) => (v == null ? '' : `${i ? 'L' : 'M'}${x(dist[i]).toFixed(1)} ${y(v).toFixed(1)}`)).join(' ');
    s += `<path d="${d}" fill="none" stroke="${DEM[k][0]}" stroke-width="2" stroke-dasharray="${DEM[k][1]}" stroke-linejoin="round"/>`;
    ends.push({ k, y: y(tr.profiles[k].at(-1)) });
  }
  ends.sort((a, b) => a.y - b.y); // spread the end labels so they never overlap
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  for (const e of ends) s += `<line x1="${W - R + 3}" x2="${W - R + 15}" y1="${e.y}" y2="${e.y}" stroke="${DEM[e.k][0]}" stroke-width="2" stroke-dasharray="${DEM[e.k][1]}"/><text class="lab" x="${W - R + 19}" y="${e.y + 4}">${D.relief.names[e.k].replace('Copernicus ', '').replace('ALOS ', '')}</text>`;
  s += `<rect data-hit x="${L}" y="${Tp}" width="${W - R - L}" height="${H - B - Tp}" fill="transparent"/><line data-x x1="0" x2="0" y1="${Tp}" y2="${H - B}" stroke="#17181a" stroke-width="1" visibility="hidden"/></svg>`;
  const el = h('div', {}, s), svg = $('svg', el), cross = $('[data-x]', el);
  svg.addEventListener('pointermove', (ev) => {
    const b = svg.getBoundingClientRect(), px = ((ev.clientX - b.left) / b.width) * W;
    if (px < L || px > W - R) { cross.setAttribute('visibility', 'hidden'); return hideTip(); }
    const i = Math.round(((px - L) / (W - R - L)) * (dist.length - 1));
    cross.setAttribute('x1', x(dist[i])); cross.setAttribute('x2', x(dist[i])); cross.setAttribute('visibility', 'visible');
    showTip(ev, `<b>${nf(dist[i])} m</b><br>` + keys.map((k) => `${D.relief.names[k]}: ${tr.profiles[k][i] == null ? '–' : nf(tr.profiles[k][i], 1) + ' m'}`).join('<br>'));
  });
  svg.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); hideTip(); });
  return el;
}

function pixels(t) {
  const k = 0.42; // screen pixels per metre
  const items = [[t.house, 10], [t.s1, 10], [t.dem, 30], [t.merit, 90]]; // all squares: the number is the side
  return h('div', { class: 'figure' }, `<h3>${t.pix}</h3><div class="pix">${items.map(([n, m], i) => `<div><i style="width:${Math.max(m * k, 4)}px;height:${Math.max(m * k, 4)}px;${i === 0 ? 'background:#17181a;' : ''}"></i>${n}<br>${i === 0 ? '≈ ' : ''}${m} m</div>`).join('')}</div>`);
}

// ------------------------------------------------------------------ sections
function build() {
  const t = T[lang];
  document.documentElement.lang = lang;
  document.title = t.title;
  document.querySelectorAll('[data-t]').forEach((e) => { e.innerHTML = t[e.dataset.t]; });
  $('#lang').textContent = t.lang;
  const root = $('#sections'); root.innerHTML = '';
  const sc = D.water.scenarios['2014'], fp = D.radar.flood_passes[0], F = D.forest;
  const vals = {
    kept: nf(D.radar.passes_kept), median: nf(D.radar.water_ha_median_below_12m), f1a: nf(D.radar.nisar[0].f1, 2), f1b: nf(D.radar.nisar[1].f1, 2),
    above: nf(D.radar.passes_above_evacuation), floodDate: day(fp.d), floodH: nf(fp.h, 1), floodW: nf(fp.w),
    p90: nf(D.relief.range_m.p90_riverbank_300m), bankR: nf(D.relief.range_m.median_riverbank_300m), bank: nf(D.relief.range_m.median_riverbank_300m, 1),
    h14: nf(sc.height_m, 1), reached14: nf(sc.reached_ha), never14: nf(sc.never_seen_by_jrc_ha), share14: pct(sc.share_never_seen),
    cells: nf(F.cells), forestN: nf(F.about_forest), forestShare: pct(F.about_forest_share), cropN: nf(F.about_crops), forestIn: nf(Math.round(F.cells / F.about_forest))
  };
  for (const id of ORDER) {
    const s = t.s[id], sec = h('section', { id, 'data-id': id });
    sec.append(h('span', { class: 'num' }, s.num), h('h2', {}, fill(s.h, vals)));
    s.p.forEach((p) => sec.append(h('p', {}, fill(p, vals))));
    if (id === 'radar') { const f = h('div', { class: 'figure' }, `<h3>${s.fig}</h3><p class="sub">${s.sub}</p>`); f.append(radarChart(s)); sec.append(f); }
    if (id === 'relief') { const f = h('div', { class: 'figure' }, `<h3>${s.fig}</h3><p class="sub">${s.sub}</p>`); f.append(reliefChart(s)); sec.append(f, pixels(s)); }
    if (id === 'water') {
      const seg = h('div', { class: 'seg', role: 'group' });
      for (const k of ['jrc', 'm2026', 'm2023', 'm2014']) { const b = h('button', { type: 'button', 'aria-pressed': String(k === waterView), 'data-k': k }, s.btn[k]); b.onclick = () => { waterView = k; seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.k === k))); if (active === 'water') show('water'); }; seg.append(b); }
      sec.append(seg);
      const end = D.water.jrc_period.split('-')[1]; // floods after this year fall outside the satellite record
      const rows = D.water.events.map((e) => `<tr><td class="nw">${e.date.slice(0, 4) > end ? blank('outside') + ' ' : ''}${e.date}</td><td class="n nw">${nf(e.height_m, 2)} m</td><td class="n">${nf(e.reported_families)}</td><td class="n">${nf(e.model_homes)}</td><td>${e.source}</td></tr>`).join('');
      sec.append(h('div', { class: 'figure' }, `<h3>${s.fig}</h3><p class="sub">${s.sub}</p><table><thead><tr>${s.th.map((x, i) => `<th${i > 0 && i < 4 ? ' class="n"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table><div class="key" style="margin-top:8px"><span>${blank('outside')}${s.after}</span></div>`));
    }
    if (id === 'forest') {
      const f = D.forest, n = f.cells;
      const part = [['agree', f.agree], ['mixed', f.mixed], ['crop', f.about_crops], ['forest', f.about_forest]];
      const bar = `<div class="bars">${part.map(([k, v]) => `<i style="flex:${v};background:${FOREST[k]}"></i>`).join('')}</div>
        <div class="key">${part.map(([k, v]) => `<span><i class="sw" style="background:${FOREST[k]}"></i>${s[k]} · ${pct(v / n)}</span>`).join('')}</div>`;
      const rows = f.disagreements.filter((d) => d.cells >= 5).map((d) => `<tr><td>${s.cls[d.forty]}</td><td>${s.cls[d.mapbiomas]}</td><td>${s.side[d.side]}</td><td class="n">${nf(d.cells)}</td></tr>`).join('');
      sec.append(h('div', { class: 'figure' }, `<h3>${s.fig}</h3><p class="sub">${s.sub}</p>${bar}<table style="margin-top:10px"><thead><tr><th>${s.th[0]}</th><th>${s.th[1]}</th><th>${s.th[2]}</th><th class="n">${s.th[3]}</th></tr></thead><tbody>${rows}</tbody></table>`));
    }
    if (id === 'empty') {
      sec.append(h('div', { class: 'empty' }, `<p><b>${s.box[0]}</b></p><p>${s.box[1]}</p>`));
      sec.append(h('div', { class: 'figure' }, `<h3>${s.blanks}</h3><div class="key blanks">${['unseen', 'outside', 'withheld'].map((k) => `<span>${blank(k)}${s.blank[k]}</span>`).join('')}</div>`));
    }
    if (id === 'notes') {
      const fl = h('div', { class: 'filters', role: 'group' });
      for (const k of REG) { const b = h('button', { class: 'chip', type: 'button', 'aria-pressed': String(regOn[k]), title: s.regHelp[k] }, `${shape(k)}${s.reg[k]} · ${D.notes.filter((a) => a.register === k).length}`); b.onclick = () => { regOn[k] = !regOn[k]; b.setAttribute('aria-pressed', String(regOn[k])); syncNotes(); }; fl.append(b); }
      sec.append(fl);
      const list = h('div', { id: 'notelist' });
      for (const a of D.notes) {
        const src = !a.source.url ? L(a.source.title) : `<a href="${a.source.url}" target="_blank" rel="noopener">${L(a.source.title)}</a>`;
        const n = h('div', { class: 'note', 'data-id': a.id, 'data-reg': a.register, tabindex: '0', style: `border-left-color:${COLOR[a.register]}` },
          `<div class="meta">${shape(a.register)}<b>${s.reg[a.register]}</b><span>${a.date ? day(a.date, 'short') : ''}</span><span>${L(a.place)}</span></div><p>${a.statement[lang]}</p><div class="src">${s.source}: ${src}</div><details><summary>${s.review}</summary>${s.by}: ${s.who[a.review.by] ?? a.review.by}${a.review.date ? ', ' + day(a.review.date) : ''}. ${L(a.review.method)}</details>`);
        n.addEventListener('click', (ev) => { if (ev.target.closest('a, summary')) return; focusNote(a.id, true); });
        list.append(n);
      }
      sec.append(list);
    }
    root.append(sec);
  }
  observe();
  show(active);
}

// ------------------------------------------------------------------ map
function poly([w, s, e, n]) { return { type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] } }; }
const vis = (id, on) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');

function initMap() {
  map = new maplibregl.Map({ container: 'map', style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json', bounds: [D.places.frame.slice(0, 2), D.places.frame.slice(2)], fitBoundsOptions: { padding: 30 }, attributionControl: false, cooperativeGestures: true });
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }));
  map.on('load', () => {
    const img = (id, file, corners) => { map.addSource(id, { type: 'image', url: BASE + file, coordinates: corners }); map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-resampling': 'nearest', 'raster-fade-duration': 0 }, layout: { visibility: 'none' } }); };
    img('relief', 'relief_range.png', D.relief.corners);
    img('jrc', 'water_jrc.png', D.water.corners);
    for (const k of ['2026', '2023', '2014']) img('m' + k, `water_model_${k}.png`, D.water.corners);
    map.addSource('forest', { type: 'geojson', data: BASE + 'forest.geojson' });
    map.addLayer({ id: 'forest', type: 'fill', source: 'forest', layout: { visibility: 'none' }, paint: { 'fill-color': ['match', ['get', 'k'], 'agree', FOREST.agree, 'forest', FOREST.forest, 'crop', FOREST.crop, FOREST.mixed], 'fill-opacity': ['match', ['get', 'k'], 'agree', 0.5, 'forest', 0.85, 'crop', 0.85, 0.4], 'fill-outline-color': 'rgba(255,255,255,.7)' } });
    map.addSource('frame', { type: 'geojson', data: poly(D.places.frame) });
    map.addImage('withheld', withheldPattern());
    map.addLayer({ id: 'withheld', type: 'fill', source: 'frame', layout: { visibility: 'none' }, paint: { 'fill-pattern': 'withheld', 'fill-opacity': 0.6 } });
    map.addLayer({ id: 'frame', type: 'line', source: 'frame', paint: { 'line-color': '#17181a', 'line-width': 1.5, 'line-dasharray': [3, 2] } });
    map.addSource('radarbox', { type: 'geojson', data: poly(RADAR_BOX) });
    map.addLayer({ id: 'radarbox', type: 'line', source: 'radarbox', layout: { visibility: 'none' }, paint: { 'line-color': COLOR.measured, 'line-width': 2 } });
    map.addSource('transect', { type: 'geojson', data: { type: 'Feature', geometry: { type: 'LineString', coordinates: D.relief.transect.line } } });
    map.addLayer({ id: 'transect', type: 'line', source: 'transect', layout: { visibility: 'none', 'line-cap': 'round' }, paint: { 'line-color': '#17181a', 'line-width': 3 } });
    map.on('mousemove', 'forest', (e) => { const p = e.features[0].properties, c = T[lang].s.forest; showTip(e.originalEvent, fill(c.tip, { a: c.cls[p.a], b: c.cls[p.b] })); });
    map.on('mouseleave', 'forest', hideTip);
    for (const a of D.notes) {
      const el = h('div', { class: 'marker', 'data-id': a.id, 'data-reg': a.register }, shape(a.register, 22));
      el.addEventListener('click', () => focusNote(a.id, false));
      el.addEventListener('pointermove', (ev) => showTip(ev, `<b>${T[lang].s.notes.reg[a.register]}</b> · ${a.statement[lang]}`));
      el.addEventListener('pointerleave', hideTip);
      markers.push({ a, el, m: new maplibregl.Marker({ element: el }).setLngLat(a.lngLat) });
    }
    document.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');
    window.__unLugar = { map, ready: true };
    show(active);
  });
}

function syncNotes() {
  const on = active === 'notes';
  for (const k of markers) { const want = on && regOn[k.a.register]; if (want) k.m.addTo(map); else k.m.remove(); }
  document.querySelectorAll('#notelist .note').forEach((n) => { n.hidden = !regOn[n.dataset.reg]; });
}

function focusNote(id, fly) {
  document.querySelectorAll('.note').forEach((n) => n.classList.toggle('hot', n.dataset.id === id));
  const k = markers.find((x) => x.a.id === id); if (!k) return;
  if (fly) map.easeTo({ center: k.a.lngLat, zoom: Math.max(map.getZoom(), 14) });
  else $(`.note[data-id="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function legend(id) {
  const t = T[lang].s, L = $('#legend');
  L.dataset.id = id;
  const sw = (c, label, cls = '') => `<span><i class="sw ${cls}" style="background:${c}"></i>${label}</span>`;
  if (id === 'radar') L.innerHTML = `<b>${t.radar.legend}</b><div class="key"><span>${blank('unseen')}${fill(t.radar.unseen, { above: D.radar.passes_above_evacuation, years: D.radar.last_year - D.radar.first_year })}</span></div>`;
  else if (id === 'relief') L.innerHTML = `<b>${t.relief.legend}</b><div class="grad" style="background:linear-gradient(90deg,#f7f4ec,#e3cc93,#c56a1b,#6b1d0c)"></div><div style="display:flex;justify-content:space-between"><span>0 m</span><span>8</span><span>16</span><span>30 m +</span></div>`;
  else if (id === 'water' && waterView === 'jrc') L.innerHTML = `<b>${t.water.legendJrc}</b><div class="grad" style="background:linear-gradient(90deg,#aec6dd,#4b81b9,#0b3c79)"></div><div style="display:flex;justify-content:space-between"><span>${t.water.lo}</span><span>${t.water.hi}</span></div>`;
  else if (id === 'water') L.innerHTML = `<b>${t.water.legendModel}</b><div class="key">${sw('#4b81b9', t.water.seen)}${sw('#c56a1b', t.water.never)}</div>`;
  else if (id === 'forest') L.innerHTML = `<b>${t.forest.legend}</b><div class="key">${['agree', 'mixed', 'crop', 'forest'].map((k) => sw(FOREST[k], t.forest[k])).join('')}</div>`;
  else if (id === 'empty') L.innerHTML = `<div class="key"><span>${blank('withheld')}<b style="margin:0">${t.empty.legend}</b></span></div>`;
  else L.innerHTML = `<b>${t.notes.legend}</b><div class="key">${REG.map((k) => `<span>${shape(k)}${t.notes.reg[k]}: ${t.notes.regHelp[k]}</span>`).join('')}</div>`;
}

function show(id) {
  active = id;
  document.querySelectorAll('#sections section').forEach((s) => s.classList.toggle('on', s.dataset.id === id));
  legend(id);
  if (!map?.getLayer('frame')) return;
  vis('radarbox', id === 'radar'); vis('relief', id === 'relief'); vis('transect', id === 'relief');
  vis('jrc', id === 'water' && waterView === 'jrc');
  for (const k of ['2026', '2023', '2014']) vis('m' + k, id === 'water' && waterView === 'm' + k);
  vis('forest', id === 'forest');
  vis('withheld', id === 'empty');
  syncNotes();
  const f = D.places.frame, town = [[-54.225, -27.318], [-54.172, -27.275]];
  const b = id === 'radar' ? [RADAR_BOX.slice(0, 2), RADAR_BOX.slice(2)] : id === 'notes' || id === 'relief' ? town : [f.slice(0, 2), f.slice(2)];
  map.fitBounds(b, { padding: 30, duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600 });
}

let io;
function observe() {
  io?.disconnect();
  io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]; if (v && v.target.dataset.id !== active) show(v.target.dataset.id); }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.2, 0.6] });
  document.querySelectorAll('#sections section').forEach((s) => io.observe(s));
}

$('#lang').onclick = () => { lang = lang === 'en' ? 'es' : 'en'; try { localStorage.setItem('un_lugar_lang', lang); } catch { /* ignore */ } build(); };

const get = (f) => fetch(BASE + f).then((r) => { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); });
Promise.all(['radar.json', 'relief.json', 'water.json', 'forest.json', 'places.json', 'annotations.json'].map(get)).then(([radar, relief, water, forest, places, ann]) => {
  Object.assign(D, { radar, relief, water, forest, places, notes: ann.annotations });
  build(); initMap();
}).catch((e) => { $('#sections').innerHTML = `<p>Could not load the data files: ${e.message}</p>`; });
