"""Builds the small public data files of the prototype from the author's local research outputs.

Nothing here downloads anything: every input was computed earlier (see README, "Sources").
Run from the repository root:

    python prep/build_data.py

Inputs live outside the repository and are not redistributed. Point the environment variables
UN_LUGAR_DEMO and UN_LUGAR_FUENTES at the two folders that hold them.

What is deliberately NOT read or written: per-building attributes (people, informal-settlement
flags), locations of Indigenous communities, and any personal name.
"""
from __future__ import annotations

import csv
import json
import os
from datetime import datetime, timezone
from pathlib import Path

import h3
import numpy as np
import rasterio
from PIL import Image
from pyproj import Transformer
from rasterio.windows import from_bounds
from shapely.geometry import shape

DEMO = Path(os.environ['UN_LUGAR_DEMO'])        # folder with the flood model outputs and the radar test
FUENTES = Path(os.environ['UN_LUGAR_FUENTES'])  # folder with the elevation models and the output of fetch_forest_frame.py
SALIDA = DEMO / '10_demo_el_nino/salida'
OUT = Path(__file__).resolve().parents[1] / 'public' / 'data'

# The frame: about 14 x 12 km around the town of El Soberbio, on the Uruguay River.
W, S, E, N = -54.27, -27.35, -54.13, -27.24
UTM = 'EPSG:32721'
to_utm = Transformer.from_crs('EPSG:4326', UTM, always_xy=True)
to_ll = Transformer.from_crs(UTM, 'EPSG:4326', always_xy=True)


def r(x, n=2):
    return None if x is None or not np.isfinite(x) else round(float(x), n)


def utm_window(src):
    """Window of a UTM raster covering the frame, plus the lon/lat of its four corners."""
    xs, ys = to_utm.transform([W, E, W, E], [S, S, N, N])
    win = from_bounds(min(xs), min(ys), max(xs), max(ys), src.transform).round_offsets().round_lengths()
    x0, y1 = src.transform * (win.col_off, win.row_off)
    x1, y0 = src.transform * (win.col_off + win.width, win.row_off + win.height)
    corners = [list(to_ll.transform(x, y)) for x, y in [(x0, y1), (x1, y1), (x1, y0), (x0, y0)]]
    return win, [[round(c[0], 6), round(c[1], 6)] for c in corners], (x0, y0, x1, y1)


def save_rgba(rgba, name, scale=3):
    img = Image.fromarray(rgba, 'RGBA')
    img = img.resize((img.width * scale, img.height * scale), Image.NEAREST)  # keep the pixels visible
    img.save(OUT / name, optimize=True)


def ramp(values, stops):
    """Linear colour ramp. stops = [(value, (r, g, b)), ...] ascending."""
    v = np.asarray(values, dtype='float64')
    out = np.zeros(v.shape + (3,), dtype='float64')
    xs = [s[0] for s in stops]
    for i in range(3):
        out[..., i] = np.interp(v, xs, [s[1][i] for s in stops])
    return out.astype('uint8')


# ---------------------------------------------------------------- 1. radar
EVAC_M = 13.0   # evacuation level on the gauge at the port (annotation s-2025-06-30)


def radar():
    rows = []
    src = DEMO / '06_pruebas/prueba_soberbio_2026-10-22/soberbio_pairs3.csv'
    with open(src, newline='') as f:
        for x in csv.DictReader(f):
            rows.append({k: float(v) for k, v in x.items()})
    vmax = max(x['valid_ha'] for x in rows)
    keep = [x for x in rows if x['valid_ha'] >= 0.85 * vmax and x['near_h'] <= 48 and 0 < x['stage'] < 40]
    pts = [{'d': datetime.fromtimestamp(x['t'], timezone.utc).strftime('%Y-%m-%d'),
            'h': r(x['stage']), 'w': r(x['water_ha'], 0), 'e': r(x['elev_p90'], 1)} for x in keep]
    low = [p['w'] for p in pts if p['h'] <= 12]
    nisar = json.load(open(SALIDA / 'nisar/nisar.json', encoding='utf-8'))
    ev = []
    for e in nisar['eventos'].values():
        best = e['f1_por_delta'][str(e['mejor_delta_m'])]
        ev.append({'date': e['fecha'], 'height_m': e['altura_m'], 'new_water_ha': e['agua_nueva_observada_ha'],
                   'flooded_forest_ha': e['bosque_inundado_ha'], 'f1': best['f1'], 'verdict': e['veredicto']})
    flood = [p for p in pts if p['h'] >= EVAC_M]
    json.dump({'passes_total': len(rows), 'passes_kept': len(pts),
               'evacuation_level_m': EVAC_M, 'passes_above_evacuation': len(flood),
               'passes_below_6m': sum(p['h'] < 6 for p in pts), 'first_year': min(p['d'] for p in pts)[:4], 'last_year': max(p['d'] for p in pts)[:4],
               'flood_passes': [{'d': p['d'], 'h': p['h'], 'w': p['w']} for p in flood],
               'filter': 'coverage >= 85 % of the corridor and a gauge reading within 48 h',
               'water_ha_median_below_12m': r(float(np.median(low)), 0),
               'water_ha_p10_p90_below_12m': [r(float(np.percentile(low, 10)), 0), r(float(np.percentile(low, 90)), 0)],
               'points': pts, 'nisar': ev}, open(OUT / 'radar.json', 'w'), separators=(',', ':'))
    print(f'radar: {len(pts)} of {len(rows)} passes kept')


# ---------------------------------------------------------------- 2. relief
def relief():
    names = {'fabdem': 'FABDEM', 'glo30': 'Copernicus GLO-30', 'aw3d30': 'ALOS AW3D30', 'merit': 'MERIT'}
    stack, corners, box = {}, None, None
    for k in names:
        with rasterio.open(FUENTES / f'crecidas/nisar/{k}.tif') as src:
            win, corners, box = utm_window(src)
            a = src.read(1, window=win).astype('float64')
            a[~np.isfinite(a)] = np.nan
            stack[k] = a
            tr = src.window_transform(win)
    cube = np.stack(list(stack.values()))
    rng = np.nanmax(cube, axis=0) - np.nanmin(cube, axis=0)
    rgb = ramp(np.clip(rng, 0, 30), [(0, (247, 244, 236)), (8, (227, 204, 147)), (16, (197, 106, 27)), (30, (107, 29, 12))])
    alpha = np.where(np.isfinite(rng), np.clip(60 + rng * 9, 60, 235), 0).astype('uint8')
    save_rgba(np.dstack([rgb, alpha]), 'relief_range.png')

    # Transect: from the town centre, through the nearest point of the river, to the far bank.
    zonas = json.load(open(SALIDA / 'microzonas.geojson', encoding='utf-8'))
    centro = next(f for f in zonas['features'] if f['properties']['nombre'].startswith('Centro'))
    cx, cy = to_utm.transform(*shape(centro['geometry']).centroid.coords[0])
    with rasterio.open(SALIDA / 'raw/jrc_occurrence.tif') as src:
        win, _, _ = utm_window(src)
        occ = src.read(1, window=win)
    rows_, cols_ = np.where(occ >= 80)
    rx, ry = rasterio.transform.xy(tr, rows_, cols_)
    rx, ry = np.asarray(rx), np.asarray(ry)
    i = int(np.argmin((rx - cx) ** 2 + (ry - cy) ** 2))
    ux, uy = rx[i] - cx, ry[i] - cy
    d = float(np.hypot(ux, uy)); ux, uy = ux / d, uy / d
    s = np.arange(-600, d + 900, 30.0)
    px, py = cx + ux * s, cy + uy * s
    rr, cc = rasterio.transform.rowcol(tr, px, py)
    rr, cc = np.asarray(rr), np.asarray(cc)
    ok = (rr >= 0) & (rr < rng.shape[0]) & (cc >= 0) & (cc < rng.shape[1])
    prof = {k: [r(v, 1) for v in stack[k][rr[ok], cc[ok]]] for k in names}
    ll = [list(to_ll.transform(x, y)) for x, y in zip(px[ok], py[ok])]
    river = [bool(v) for v in (occ[rr[ok], cc[ok]] >= 80)]

    near = np.zeros_like(occ, dtype=bool)   # land within ~300 m of permanent water
    wr, wc = np.where(occ >= 80)
    for dr in range(-10, 11):
        for dc in range(-10, 11):
            rr2, cc2 = np.clip(wr + dr, 0, occ.shape[0] - 1), np.clip(wc + dc, 0, occ.shape[1] - 1)
            near[rr2, cc2] = True
    near &= occ < 80
    json.dump({'corners': corners, 'names': names,
               'native_resolution_m': {'fabdem': 30, 'glo30': 30, 'aw3d30': 30, 'merit': 90},
               'range_m': {'median_frame': r(float(np.nanmedian(rng)), 1), 'p90_frame': r(float(np.nanpercentile(rng, 90)), 1),
                           'median_riverbank_300m': r(float(np.nanmedian(rng[near])), 1),
                           'p90_riverbank_300m': r(float(np.nanpercentile(rng[near], 90)), 1)},
               'transect': {'step_m': 30, 'distance_m': [r(v, 0) for v in (s[ok] - s[ok][0])], 'profiles': prof,
                            'is_river': river, 'line': [[round(ll[0][0], 6), round(ll[0][1], 6)], [round(ll[-1][0], 6), round(ll[-1][1], 6)]]}},
              open(OUT / 'relief.json', 'w'), separators=(',', ':'))
    print(f'relief: range median {np.nanmedian(rng):.1f} m, riverbank median {np.nanmedian(rng[near]):.1f} m')


# ---------------------------------------------------------------- 3. water
def water():
    with rasterio.open(SALIDA / 'raw/jrc_occurrence.tif') as src:
        win, corners, _ = utm_window(src)
        occ = src.read(1, window=win).astype('float64')
        px_ha = abs(src.res[0] * src.res[1]) / 1e4
    with rasterio.open(SALIDA / 'primer_impacto.tif') as src:
        win2, _, _ = utm_window(src)
        first = src.read(1, window=win2).astype('float64')
    seen = occ > 0
    rgb = ramp(occ, [(0, (174, 198, 221)), (50, (75, 129, 185)), (100, (11, 60, 121))])
    save_rgba(np.dstack([rgb, np.where(seen, 215, 0).astype('uint8')]), 'water_jrc.png')
    stats = {}
    for label, h in [('2026', 15.0), ('2023', 19.75), ('2014', 22.8)]:
        wet = np.isfinite(first) & (first <= h)
        only_model = wet & ~seen
        rgba = np.zeros(wet.shape + (4,), dtype='uint8')
        rgba[wet & seen] = (75, 129, 185, 150)       # the satellite record has seen water here at least once
        rgba[only_model] = (197, 106, 27, 215)       # reached by the calibrated model, never seen in 1984-2021
        save_rgba(rgba, f'water_model_{label}.png')
        stats[label] = {'height_m': h, 'reached_ha': r(wet.sum() * px_ha, 0), 'never_seen_by_jrc_ha': r(only_model.sum() * px_ha, 0),
                        'share_never_seen': r(only_model.sum() / max(wet.sum(), 1), 3)}
    cal = json.load(open(SALIDA / 'calibracion.json', encoding='utf-8'))
    events = [{'date': e['fecha'], 'height_m': e['altura'], 'reported_families': e['hecho'], 'model_homes': e['modelo'],
               'source': e['fuente'].split(':')[0]} for e in cal['eventos']]
    json.dump({'corners': corners, 'jrc_period': '1984-2021', 'scenarios': stats, 'calibration_shift_m': cal['delta_m'],
               'events': sorted(events, key=lambda e: e['height_m'])}, open(OUT / 'water.json', 'w'), separators=(',', ':'))
    print('water:', {k: (v['reached_ha'], v['never_seen_by_jrc_ha']) for k, v in stats.items()})


# ---------------------------------------------------------------- 4. forest
GROUPS = ['forest', 'plantation', 'treecrop', 'other', 'nodata']
WOODED = ('forest', 'plantation')


def forest():
    """Per-cell comparison of ForTy 2020 and MapBiomas 2020 on both banks. Input: prep/fetch_forest_frame.py."""
    def top(d):
        seen = sum(v for k, v in d.items() if k != 'nodata')
        if seen < 0.5 * sum(d.values()) or seen == 0:
            return 'nodata'
        k = max((g for g in GROUPS if g != 'nodata'), key=d.get)
        return k if d[k] >= 0.5 * seen else 'mixed'

    feats, ids, kinds, tally, side_n = [], [], {}, {}, {'argentina': 0, 'brasil': 0}
    with open(FUENTES / 'un_lugar/forest_frame.csv', newline='') as f:
        for x in csv.DictReader(f):
            a = top({g: int(x[f'forty_{g}']) for g in GROUPS})
            b = top({g: int(x[f'mb_{g}']) for g in GROUPS})
            side = 'argentina' if int(x['mb_px_argentina']) >= int(x['mb_px_brasil']) else 'brasil'
            if 'nodata' in (a, b):
                kind = 'nodata'
            elif a == b:
                kind = 'agree'
            elif 'mixed' in (a, b):
                kind = 'mixed'
            elif a in WOODED or b in WOODED:
                kind = 'forest'          # one map says forest or forest plantation and the other does not, or they differ on which
            else:
                kind = 'crop'            # neither says forest: tree crop against other land
            kinds[kind] = kinds.get(kind, 0) + 1
            side_n[side] += 1
            if kind in ('forest', 'crop'):
                tally[(a, b, side)] = tally.get((a, b, side), 0) + 1
            ids.append(x['h3'])
            ring = [[round(lng, 6), round(lat, 6)] for lat, lng in h3.cell_to_boundary(x['h3'])]
            feats.append({'type': 'Feature', 'properties': {'a': a, 'b': b, 'k': kind, 's': side},
                          'geometry': {'type': 'Polygon', 'coordinates': [ring + [ring[0]]]}})
    json.dump({'type': 'FeatureCollection', 'features': feats}, open(OUT / 'forest.geojson', 'w'), separators=(',', ':'))
    n = len(feats)
    ha = float(np.mean([h3.cell_area(c, unit='km^2') for c in ids[:200]])) * 100
    pairs = sorted(tally.items(), key=lambda kv: -kv[1])
    by_side = {s: {k: sum(1 for f in feats if f['properties']['s'] == s and f['properties']['k'] == k)
                   for k in ('agree', 'forest', 'crop', 'mixed', 'nodata')} for s in side_n}
    json.dump({'year': 2020, 'cells': n, 'cell_ha': r(ha, 1), 'cells_by_side': side_n,
               'agree': kinds.get('agree', 0), 'about_forest': kinds.get('forest', 0), 'about_crops': kinds.get('crop', 0),
               'mixed': kinds.get('mixed', 0), 'nodata': kinds.get('nodata', 0),
               'about_forest_share': r(kinds.get('forest', 0) / n, 3), 'about_crops_share': r(kinds.get('crop', 0) / n, 3),
               'by_side': by_side,
               'sources': {'forty': 'Forest Typology (ForTy) 2020 v1.0', 'mapbiomas_argentina': 'MapBiomas Argentina, Collection 3',
                           'mapbiomas_brasil': 'MapBiomas Brasil, Collection 11'},
               'note': 'ForTy is one global product. MapBiomas is two national products that meet at the river.',
               'disagreements': [{'forty': a, 'mapbiomas': b, 'side': s, 'cells': v, 'about': 'forest' if a in WOODED or b in WOODED else 'crops'}
                                 for (a, b, s), v in pairs]},
              open(OUT / 'forest.json', 'w'), separators=(',', ':'))
    print(f'forest: {n} cells; {kinds}; top {pairs[:4]}')


# ---------------------------------------------------------------- 5. places (names only)
def places():
    zonas = json.load(open(SALIDA / 'microzonas.geojson', encoding='utf-8'))
    out = {}
    for f in zonas['features']:
        c = shape(f['geometry']).centroid
        if W <= c.x <= E and S <= c.y <= N:
            out[f['properties']['nombre']] = [round(c.x, 5), round(c.y, 5)]
    json.dump({'frame': [W, S, E, N], 'places': out}, open(OUT / 'places.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'places: {len(out)} named zones')


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    radar(); relief(); water(); forest(); places()
