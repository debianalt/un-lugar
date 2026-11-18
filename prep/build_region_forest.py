"""Builds public/data/region_forest.json: where the 2020 forest and land-cover products disagree, cell by cell,
over the four provinces of north-eastern Argentina (Misiones, Corrientes, Chaco, Formosa).

Run from the repository root:

    python prep/build_region_forest.py

Inputs, outside the repository, in $UN_LUGAR_FUENTES (pixel counts per H3 resolution-9 cell, 30 m pixels):
  forty/forty_h3.parquet          Forest Typology (ForTy) 2020 v1.0, class of each pixel = most probable one
  uso/uso_h3_anio_clase.parquet   MapBiomas Argentina, Collection 3, legend code of each pixel, per year
  glad/glad_h3.parquet            GLAD tree height 2020 (University of Maryland), pixels with a tree of 5 m or more
  un_lugar/provincias.geojson     province outlines (FAO GAUL 2015, level 1); fetched from Earth Engine if missing

The rule is the one of build_data.py::forest(): each product gives a cell its dominant group (forest, forest
plantation, tree crop, other land) when that group holds half or more of the pixels it could read, "mixed" when no
group does, "nodata" when it read less than half the cell. Two products disagree "about forest" when one says forest
or plantation and the other something else, or when they differ on which of the two; "about crops" when neither says
forest and one says tree crop. The grid is Argentine: Paraguay and Brazil are not in it.

GLAD enters a second, simpler question: is half the cell or more under trees? ForTy and MapBiomas answer with forest
plus plantation; GLAD with trees of 5 m or more.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import duckdb
import h3
import numpy as np
import shapely
from shapely.geometry import shape

FUENTES = Path(os.environ['UN_LUGAR_FUENTES'])
OUT = Path(__file__).resolve().parents[1] / 'public' / 'data'
YEAR = 2020
PROVINCES = ['Misiones', 'Corrientes', 'Chaco', 'Formosa']
FRAME = (-54.27, -27.35, -54.13, -27.24)          # El Soberbio, the frame of build_data.py: the control
PARENT_RES = 6

# MapBiomas legend codes, as in fetch_forest_frame.py. Anything not listed is "other".
MB_GROUP = {3: 'forest', 4: 'forest', 5: 'forest', 6: 'forest', 49: 'forest', 9: 'plantation',
            35: 'treecrop', 36: 'treecrop', 46: 'treecrop', 47: 'treecrop', 48: 'treecrop', 0: 'nodata'}
G = ['forest', 'plantation', 'treecrop', 'other']
CODE = {g: i for i, g in enumerate(G)} | {'mixed': 4, 'nodata': 5}
NAME = {v: k for k, v in CODE.items()}
WOODED = (0, 1)


def provinces() -> dict:
    path = FUENTES / 'un_lugar' / 'provincias.geojson'
    if not path.exists():
        import ee
        ee.Initialize()
        fc = (ee.FeatureCollection('FAO/GAUL/2015/level1').filter(ee.Filter.eq('ADM0_NAME', 'Argentina'))
              .filter(ee.Filter.inList('ADM1_NAME', PROVINCES)))
        gj = fc.map(lambda f: f.simplify(200).select(['ADM1_NAME'])).getInfo()
        path.parent.mkdir(parents=True, exist_ok=True)
        json.dump(gj, open(path, 'w', encoding='utf-8'))
    gj = json.load(open(path, encoding='utf-8'))
    return {f['properties']['ADM1_NAME']: shape(f['geometry']) for f in gj['features']}


def top(counts: np.ndarray, total: np.ndarray) -> np.ndarray:
    """counts: n x 4 pixels per group; total: n pixels in the cell. Returns the code of the dominant group."""
    seen = counts.sum(axis=1)
    k = counts.argmax(axis=1)
    out = np.where(counts[np.arange(len(k)), k] >= 0.5 * seen, k, CODE['mixed'])
    return np.where((seen < 0.5 * total) | (seen == 0), CODE['nodata'], out).astype(np.int8)


def main():
    con = duckdb.connect()
    mb_case = ' '.join(f"WHEN clase IN ({','.join(str(c) for c, g in MB_GROUP.items() if g == grp)}) THEN '{grp}'"
                       for grp in ('forest', 'plantation', 'treecrop', 'nodata'))
    df = con.sql(f"""
        WITH mb AS (
            SELECT h3, CASE {mb_case} ELSE 'other' END AS g, sum(n_px) AS n
            FROM '{(FUENTES / 'uso/uso_h3_anio_clase.parquet').as_posix()}' WHERE anio = {YEAR} GROUP BY 1, 2),
        mbw AS (
            SELECT h3, sum(n) FILTER (g = 'forest') AS mb_forest, sum(n) FILTER (g = 'plantation') AS mb_plantation,
                   sum(n) FILTER (g = 'treecrop') AS mb_treecrop, sum(n) FILTER (g = 'other') AS mb_other,
                   sum(n) AS mb_total FROM mb GROUP BY 1),
        lead AS (
            SELECT h3, arg_max(clase, n) AS mb_lead FROM (
                SELECT h3, clase, sum(n_px) AS n FROM '{(FUENTES / 'uso/uso_h3_anio_clase.parquet').as_posix()}'
                WHERE anio = {YEAR} AND clase IN (3, 4, 5, 6, 49) GROUP BY 1, 2) GROUP BY 1)
        SELECT f.h3, f.px_total AS f_total, f.primario + f.regeneracion AS f_forest, f.plantado + f.plantacion AS f_plantation,
               f.cultivo_arboreo AS f_treecrop, f.otras AS f_other,
               coalesce(m.mb_forest, 0) AS mb_forest, coalesce(m.mb_plantation, 0) AS mb_plantation,
               coalesce(m.mb_treecrop, 0) AS mb_treecrop, coalesce(m.mb_other, 0) AS mb_other, coalesce(m.mb_total, 0) AS mb_total,
               g.px_total AS g_total, g.arb5_{YEAR} AS g_tree, l.mb_lead
        FROM '{(FUENTES / 'forty/forty_h3.parquet').as_posix()}' f
        LEFT JOIN mbw m USING (h3)
        LEFT JOIN lead l USING (h3)
        LEFT JOIN '{(FUENTES / 'glad/glad_h3.parquet').as_posix()}' g USING (h3)
        ORDER BY f.h3""").df()
    n = len(df)
    print(f'{n} cells')

    a = top(df[[f'f_{g}' for g in G]].to_numpy(), df['f_total'].to_numpy())
    b = top(df[[f'mb_{g}' for g in G]].to_numpy(), np.maximum(df['mb_total'].to_numpy(), df['f_total'].to_numpy()))
    nod, mix = CODE['nodata'], CODE['mixed']
    wa, wb = np.isin(a, WOODED), np.isin(b, WOODED)
    kind = np.select([(a == nod) | (b == nod), a == b, (a == mix) | (b == mix), wa | wb], ['nodata', 'agree', 'mixed', 'forest'], 'crop')

    # position, province and area of every cell
    cells = df['h3'].to_numpy()
    ll = np.array([h3.cell_to_latlng(c) for c in cells])
    lat, lon = ll[:, 0], ll[:, 1]
    ha = np.array([h3.cell_area(c, unit='km^2') for c in cells]) * 100
    prov = np.full(n, 'outside', dtype=object)
    for name, geom in provinces().items():
        shapely.prepare(geom)
        prov[shapely.contains_xy(geom, lon, lat)] = name
    print('cells by province', {p: int((prov == p).sum()) for p in PROVINCES + ['outside']})

    def summary(m):
        t = int(m.sum())
        k = {x: int(((kind == x) & m).sum()) for x in ('agree', 'forest', 'crop', 'mixed', 'nodata')}
        return {'cells': t, 'ha': round(float(ha[m].sum())), **{f'{x}': v for x, v in k.items()},
                'about_forest_ha': round(float(ha[m & (kind == 'forest')].sum())),
                'about_crops_ha': round(float(ha[m & (kind == 'crop')].sum())),
                'about_forest_share': round(k['forest'] / t, 4) if t else None,
                'about_crops_share': round(k['crop'] / t, 4) if t else None}

    every = np.ones(n, bool)
    W, S, E, N = FRAME
    frame = (lon >= W) & (lon <= E) & (lat >= S) & (lat <= N)
    pairs = {}
    dis = np.isin(kind, ['forest', 'crop'])
    for x, y, h in zip(a[dis], b[dis], ha[dis]):
        key = (NAME[int(x)], NAME[int(y)])
        c = pairs.setdefault(key, [0, 0.0])
        c[0] += 1
        c[1] += h

    # The largest group: MapBiomas says forest, ForTy says other land. Which MapBiomas forest class leads in those cells?
    # 3 closed forest, 4 open forest, 6 flooded forest, whose legend reads "trees, shrubs or a mix of both".
    big = (kind == 'forest') & (a == CODE['other']) & (b == CODE['forest'])
    lead = df['mb_lead'].fillna(0).to_numpy()
    names = {3: 'closed_forest', 4: 'open_forest', 6: 'flooded_forest'}
    legend = {'cells': int(big.sum()), 'ha': round(float(ha[big].sum())),
              'by_leading_mapbiomas_class': {names.get(int(c), str(int(c))): {'cells': int((big & (lead == c)).sum()), 'ha': round(float(ha[big & (lead == c)].sum()))}
                                             for c in sorted(set(lead[big]))},
              'note': 'MapBiomas Argentina defines flooded forest as natural cover of trees, shrubs or a mix of both in areas under the influence of water. ForTy follows the forest definition of FAO.'}

    # second question: half the cell or more under trees, three products
    seen_f = df[[f'f_{g}' for g in G]].to_numpy().sum(axis=1)
    seen_m = df[[f'mb_{g}' for g in G]].to_numpy().sum(axis=1)
    gt = df['g_total'].fillna(0).to_numpy()
    ok3 = (seen_f >= 0.5 * df['f_total']) & (seen_m >= 0.5 * df['f_total']) & (gt > 0)
    with np.errstate(divide='ignore', invalid='ignore'):
        tf = (df['f_forest'] + df['f_plantation']).to_numpy() / seen_f >= 0.5
        tm = (df['mb_forest'] + df['mb_plantation']).to_numpy() / seen_m >= 0.5
        tg = df['g_tree'].fillna(0).to_numpy() / gt >= 0.5
    votes = tf.astype(int) + tm.astype(int) + tg.astype(int)
    split = ok3 & (votes > 0) & (votes < 3)
    lone = {'forty': int((ok3 & (tf != tm) & (tf != tg)).sum()), 'mapbiomas': int((ok3 & (tm != tf) & (tm != tg)).sum()),
            'glad': int((ok3 & (tg != tf) & (tg != tm)).sum())}
    trees = {'cells': int(ok3.sum()), 'all_say_trees': int((ok3 & (votes == 3)).sum()), 'none_says_trees': int((ok3 & (votes == 0)).sum()),
             'split': int(split.sum()), 'split_ha': round(float(ha[split].sum())), 'split_share': round(float(split.sum() / ok3.sum()), 4),
             'the_one_that_differs': lone,
             'by_province': {p: {'cells': int((ok3 & (prov == p)).sum()), 'split': int((split & (prov == p)).sum()),
                                 'split_share': round(float((split & (prov == p)).sum() / max(1, (ok3 & (prov == p)).sum())), 4)}
                             for p in PROVINCES}}

    # the map: share of cells in disagreement inside each resolution-6 cell
    parent = np.array([h3.cell_to_parent(c, PARENT_RES) for c in cells])
    order = np.argsort(parent, kind='stable')
    uniq, start = np.unique(parent[order], return_index=True)
    feats = []
    for u, grp in zip(uniq, np.split(order, start[1:])):
        valid = grp[kind[grp] != 'nodata']
        if len(valid) < 20:
            continue
        ring = [[round(lng, 3), round(la, 3)] for la, lng in h3.cell_to_boundary(u)]
        feats.append({'type': 'Feature',
                      'properties': {'n': int(len(valid)), 'f': round(float((kind[valid] == 'forest').mean()), 3),
                                     'c': round(float((kind[valid] == 'crop').mean()), 3),
                                     't': round(float(split[grp].sum() / max(1, ok3[grp].sum())), 3)},
                      'geometry': {'type': 'Polygon', 'coordinates': [ring + [ring[0]]]}})
    json.dump({'type': 'FeatureCollection', 'features': feats}, open(OUT / 'region_forest.geojson', 'w'), separators=(',', ':'))

    out = {'year': YEAR, 'grid': 'H3 resolution 9', 'cell_ha_mean': round(float(ha.mean()), 2),
           'sources': {'forty': 'Forest Typology (ForTy) 2020 v1.0', 'mapbiomas': 'MapBiomas Argentina, Collection 3',
                       'glad': 'GLAD Global Land Cover and Land Use Change, tree height 2020'},
           'note': 'Argentine cells only. Dominant group per cell; see prep/build_region_forest.py.',
           'region': summary(every), 'by_province': {p: summary(prov == p) for p in PROVINCES},
           'outside_provinces': int((prov == 'outside').sum()),
           'control_el_soberbio_frame_argentine_cells': summary(frame),
           'disagreements': [{'forty': x, 'mapbiomas': y, 'cells': c, 'ha': round(h),
                              'about': 'forest' if x in ('forest', 'plantation') or y in ('forest', 'plantation') else 'crops'}
                             for (x, y), (c, h) in sorted(pairs.items(), key=lambda kv: -kv[1][0])],
           'mapbiomas_forest_forty_other': legend, 'trees_three_products': trees, 'map': {'file': 'region_forest.geojson', 'parent_resolution': PARENT_RES, 'cells': len(feats)}}
    json.dump(out, open(OUT / 'region_forest.json', 'w'), separators=(',', ':'))
    print(json.dumps({k: out[k] for k in ('region', 'control_el_soberbio_frame_argentine_cells', 'mapbiomas_forest_forty_other')}, indent=1))
    for d in out['disagreements'][:12]:
        print(d)


if __name__ == '__main__':
    main()
