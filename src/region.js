// The region: the timetable test on the river gauges of four rivers and the forest test on four provinces.
// Data: public/data/region_timetable.json (prep/build_region_timetable.py) and region_forest.json (prep/build_region_forest.py).

const TXT = {
  en: {
    figT: '{rises} rises above the evacuation level at {gauges} gauges, a radar pass during {seen}',
    subT: 'Each square is one rise, 2015–2026. Dots: no Sentinel-1 scene over the gauge while the river was above the level. Solid: at least one.',
    th: ['Gauge', 'Level', 'Rises', 'Days each'],
    never: 'never above', dam: 'regulated by a dam',
    srcT: 'Gauges read by Prefectura Naval Argentina and the Red Hidrológica Nacional. Evacuation levels: Instituto Nacional del Agua, except El Soberbio (local press). Rises at neighbouring gauges are often the same flood: joined by river, the {rises} rises are {floods} floods, and a scene fell during {floodsSeen}. A scene over the gauge during a rise does not mean the scene shows the water: at El Soberbio it did not. Outside Misiones, Garruchos and Santo Tomé the river level is the daily Prefectura reading alone: the automatic series there show false jumps of several metres.',
    figY: 'Rises and Sentinel-1 passes, year by year',
    subY: 'Each square is one rise, by the year of its peak. Passes: median over the {gauges} gauges. 2026 runs to 15 October.',
    thY: ['Year', 'Rises', 'Passes per gauge', 'Gauges with no pass'],
    figF: 'Cells where ForTy and MapBiomas disagree about forest, 2020',
    subF: 'Share of the cells of each province, about 9 hectares each.',
    srcF: 'Argentine cells only. The largest group, {topHa} hectares, is land MapBiomas calls forest and ForTy calls other land. In {floodHa} of them the MapBiomas class is flooded forest, which its legend defines as trees, shrubs or a mix of both, whilst ForTy follows the forest definition of FAO. There the two maps part ways on what a forest is, before any sensor is involved.',
    unseen: 'rise with no pass', seen: 'rise with a pass',
    tip: '<b>{name}</b>, {date}<br>Peak {peak} m, {d} days above {level} m.<br>{passes}',
    p0: 'No Sentinel-1 scene in that time.', p1: 'Sentinel-1 scenes in that time: {n}.'
  },
  es: {
    figT: '{rises} subidas sobre la cota de evacuación en {gauges} hidrómetros, una pasada de radar durante {seen}',
    subT: 'Cada cuadrado es una subida, 2015–2026. Punteado: ninguna escena de Sentinel-1 sobre el hidrómetro con el río sobre la cota. Lleno: al menos una.',
    th: ['Hidrómetro', 'Cota', 'Subidas', 'Días c/u'],
    never: 'nunca sobre la cota', dam: 'regulado por una represa',
    srcT: 'Hidrómetros leídos por la Prefectura Naval Argentina y la Red Hidrológica Nacional. Cotas de evacuación: Instituto Nacional del Agua, salvo El Soberbio (prensa local). Las subidas de hidrómetros vecinos suelen ser la misma crecida: unidas por río, las {rises} subidas son {floods} crecidas, y una escena cayó durante {floodsSeen}. Una escena sobre el hidrómetro durante una subida no quiere decir que la escena muestre el agua: en El Soberbio no la mostró. Fuera de Misiones, Garruchos y Santo Tomé la altura del río es sólo la lectura diaria de Prefectura: las series automáticas de esos puntos traen saltos falsos de varios metros.',
    figY: 'Subidas y pasadas de Sentinel-1, año por año',
    subY: 'Cada cuadrado es una subida, por el año de su pico. Pasadas: mediana entre los {gauges} hidrómetros. 2026 llega al 15 de octubre.',
    thY: ['Año', 'Subidas', 'Pasadas por hidrómetro', 'Hidrómetros sin pasadas'],
    figF: 'Celdas donde ForTy y MapBiomas no coinciden sobre el bosque, 2020',
    subF: 'Proporción de las celdas de cada provincia, de unas 9 hectáreas cada una.',
    srcF: 'Sólo celdas argentinas. El grupo mayor, {topHa} hectáreas, es tierra que MapBiomas llama bosque y ForTy llama otras tierras. En {floodHa} de ellas la clase de MapBiomas es bosque inundable, que su leyenda define como árboles, arbustos o una mezcla de ambos, mientras que ForTy sigue la definición de bosque de la FAO. Ahí los dos mapas se separan en qué es un bosque, antes de que intervenga ningún sensor.',
    unseen: 'subida sin pasada', seen: 'subida con pasada',
    tip: '<b>{name}</b>, {date}<br>Pico {peak} m, {d} días sobre {level} m.<br>{passes}',
    p0: 'Ninguna escena de Sentinel-1 en ese lapso.', p1: 'Escenas de Sentinel-1 en ese lapso: {n}.'
  }
};

const BLUE = '#1f5ea2', ORANGE = '#c56a1b';

export function region(RT, RF, lang, { h, fill, nf, day, showTip, hideTip }) {
  const t = TXT[lang], frag = document.createDocumentFragment();
  const pct = (x, d = 0) => nf(x * 100, d) + (lang === 'es' ? ' %' : '%');

  // --- gauges: one row each, one square per rise
  const rows = RT.stations.map((s, i) => {
    const sq = s.episodes.map((e, k) => `<i class="rise ${e.passes_inside ? 'seen' : 'blank-unseen'}" data-s="${i}" data-e="${k}"></i>`).join('');
    const note = s.rises ? '' : `<span class="mute">${t.never}${s.regulated ? ', ' + t.dam : ''}</span>`;
    const head = i && RT.stations[i - 1].river === s.river ? '' : `<tr class="grp"><td colspan="4">${s.river}</td></tr>`;
    return `${head}<tr><td class="nw">${s.name}</td><td class="n nw">${nf(s.evacuation_level_m, 1)} m</td><td><div class="rises">${sq}${note}</div></td><td class="n">${s.median_rise_days == null ? '–' : nf(s.median_rise_days, 1)}</td></tr>`;
  }).join('');
  const key = `<div class="key" style="margin-top:8px"><span><i class="sw blank-unseen"></i>${t.unseen}</span><span><i class="sw" style="background:${BLUE}"></i>${t.seen}</span></div>`;
  const f1 = h('div', { class: 'figure' }, `<h3>${fill(t.figT, { rises: nf(RT.rises), gauges: nf(RT.gauges), seen: nf(RT.rises_with_a_pass) })}</h3><p class="sub">${t.subT}</p>
    <table><thead><tr>${t.th.map((x, i) => `<th${i === 1 || i === 3 ? ' class="n"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>${key}
    <p class="sub" style="margin:8px 0 0">${fill(t.srcT, { rises: nf(RT.rises), floods: nf(RT.floods_distinct), floodsSeen: nf(RT.floods_distinct_with_a_pass) })}</p>`);
  f1.addEventListener('pointermove', (ev) => {
    const el = ev.target.closest?.('i.rise'); if (!el) return hideTip();
    const s = RT.stations[el.dataset.s], e = s.episodes[el.dataset.e];
    showTip(ev, fill(t.tip, { name: s.name, date: day(e.date), peak: nf(e.peak_m, 2), d: nf(e.days_above, 1), level: nf(s.evacuation_level_m, 1), passes: e.passes_inside ? fill(t.p1, { n: e.passes_inside }) : t.p0 }));
  });
  f1.addEventListener('pointerleave', hideTip);

  // --- the archive by year: the rises of each year, and how often the radar came
  const yrows = Object.entries(RT.rises_by_year).map(([y, v]) => {
    const sq = '<i class="rise seen"></i>'.repeat(v.with_a_pass) + '<i class="rise blank-unseen"></i>'.repeat(v.rises - v.with_a_pass);
    const none = RT.stations.filter((s) => !s.passes_by_year[y]).length;
    return `<tr><td class="nw">${y}</td><td><div class="rises">${sq}</div></td><td class="n">${nf(RT.passes_per_gauge_by_year[y])}</td><td class="n">${none || '–'}</td></tr>`;
  }).join('');
  const fy = h('div', { class: 'figure' }, `<h3>${t.figY}</h3><p class="sub">${fill(t.subY, { gauges: nf(RT.gauges) })}</p>
    <table><thead><tr>${t.thY.map((x, i) => `<th${i > 1 ? ' class="n"' : ''}>${x}</th>`).join('')}</tr></thead><tbody>${yrows}</tbody></table>${key}`);

  // --- forest: one bar per province
  const prov = Object.entries(RF.by_province).sort((a, b) => b[1].about_forest_share - a[1].about_forest_share);
  const max = Math.max(...prov.map(([, v]) => v.about_forest_share));
  const bars = prov.map(([name, v]) => `<tr><td class="nw">${name}</td><td style="width:55%"><div class="hbar"><i style="width:${(v.about_forest_share / max) * 100}%;background:${ORANGE}"></i></div></td><td class="n nw">${pct(v.about_forest_share, 1)}</td><td class="n nw">${nf(v.about_forest_ha)} ha</td></tr>`).join('');
  const topPair = RF.disagreements[0];
  const f2 = h('div', { class: 'figure' }, `<h3>${t.figF}</h3><p class="sub">${t.subF}</p><table><tbody>${bars}</tbody></table><p class="sub" style="margin:8px 0 0">${fill(t.srcF, { topHa: nf(topPair.ha), floodHa: nf(RF.mapbiomas_forest_forty_other.by_leading_mapbiomas_class.flooded_forest.ha) })}</p>`);

  frag.append(f1, fy, f2);
  return frag;
}
