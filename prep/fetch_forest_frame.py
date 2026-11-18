"""Downloads the two 2020 forest and land-cover products for the whole frame, both banks of the river.

Needs an Earth Engine account (`earthengine authenticate`). Run from the repository root, before build_data.py:

    python prep/fetch_forest_frame.py

Sources, all read on the 30 m grid of MapBiomas Argentina:
  - Forest Typology (ForTy) 2020 v1.0, Google DeepMind, Google Research, WRI and IIASA (CC-BY 4.0). Five probability
    bands, 0-250; "other land" is 250 minus their sum. The class of a pixel is the most probable one. At 30 m Earth
    Engine averages the 10 m probabilities before that choice.
  - MapBiomas Argentina, Collection 3, year 2020. It ends at the border.
  - MapBiomas Brasil, Collection 11, year 2020. It ends at the border from the other side. Where the two overlap,
    the Argentine one is used.

Each pixel goes to the H3 resolution-9 cell that contains its centre. Output: one row per cell, with pixel counts,
in $UN_LUGAR_FUENTES/un_lugar/forest_frame.csv.
"""
from __future__ import annotations

import csv
import io
import os
from pathlib import Path

import ee
import h3
import numpy as np

W, S, E, N = -54.27, -27.35, -54.13, -27.24           # the same frame as build_data.py
OUT = Path(os.environ['UN_LUGAR_FUENTES']) / 'un_lugar' / 'forest_frame.csv'

FORTY = 'projects/nature-trace/assets/forest_typology/forest_typology_2020_v1_0_collection'
FORTY_BANDS = ['PrimaryForest', 'NaturallyRegeneratingForest', 'PlantedForest', 'PlantationForest', 'TreeCropsAndAgroforestry']
MB_AR = 'projects/mapbiomas-public/assets/argentina/lulc/collection3/mapbiomas_argentina_collection3_coverage_v1'
MB_BR = 'projects/mapbiomas-public/assets/brazil/lulc/v1'
MB_BR_COLLECTION = 11.0

# ForTy codes 0-4 follow FORTY_BANDS, 5 is other land, 9 is no data.
FORTY_GROUP = {0: 'forest', 1: 'forest', 2: 'plantation', 3: 'plantation', 4: 'treecrop', 5: 'other', 9: 'nodata'}
# MapBiomas legend codes (the two countries share them). Anything not listed is "other"; 0 is no data.
MB_GROUP = {3: 'forest', 4: 'forest', 5: 'forest', 6: 'forest', 49: 'forest', 9: 'plantation',
            35: 'treecrop', 36: 'treecrop', 46: 'treecrop', 47: 'treecrop', 48: 'treecrop', 0: 'nodata'}
GROUPS = ['forest', 'plantation', 'treecrop', 'other', 'nodata']


def main():
    ee.Initialize()
    dx, _, x0, _, dy, y0 = ee.Image(MB_AR).projection().getInfo()['transform']
    c0, c1 = int(np.floor((W - x0) / dx)) - 2, int(np.ceil((E - x0) / dx)) + 2
    r0, r1 = int(np.floor((N - y0) / dy)) - 2, int(np.ceil((S - y0) / dy)) + 2
    width, height, xa, ya = c1 - c0, r1 - r0, x0 + c0 * dx, y0 + r0 * dy
    region = ee.Geometry.Rectangle([xa, ya + height * dy, xa + width * dx, ya], 'EPSG:4326', False)

    mos = ee.ImageCollection(FORTY).filterBounds(region).mosaic().select(FORTY_BANDS)
    probs = mos.updateMask(mos.select(0).neq(255)).toFloat()
    stack = probs.addBands(ee.Image(250).subtract(probs.reduce(ee.Reducer.sum())).max(0))
    forty = stack.toArray().arrayArgmax().arrayGet([0]).unmask(9).toUint8().rename('forty')
    ar = ee.Image(MB_AR).select('classification_2020').unmask(0).toUint8().rename('mb_ar')
    br = (ee.ImageCollection(MB_BR).filter(ee.Filter.eq('collection_id', MB_BR_COLLECTION)).filter(ee.Filter.eq('year', 2020))
          .mosaic().select('classification').unmask(0).toUint8().rename('mb_br'))
    px = np.load(io.BytesIO(ee.data.computePixels({
        'expression': forty.addBands(ar).addBands(br), 'fileFormat': 'NPY',
        'grid': {'dimensions': {'width': width, 'height': height}, 'crsCode': 'EPSG:4326',
                 'affineTransform': {'scaleX': dx, 'shearX': 0, 'translateX': xa, 'shearY': 0, 'scaleY': dy, 'translateY': ya}}})))
    fo, a, b = px['forty'], px['mb_ar'], px['mb_br']
    print(f'{width} x {height} pixels; ForTy codes {dict(zip(*np.unique(fo, return_counts=True)))}')
    print(f'MapBiomas Argentina codes {dict(zip(*np.unique(a, return_counts=True)))}')
    print(f'MapBiomas Brasil codes {dict(zip(*np.unique(b, return_counts=True)))}')

    frame = set(h3.polygon_to_cells(h3.LatLngPoly([(S, W), (S, E), (N, E), (N, W)]), 9))
    rows = {c: {'forty': dict.fromkeys(GROUPS, 0), 'mb': dict.fromkeys(GROUPS, 0), 'ar': 0, 'br': 0} for c in frame}
    for i in range(height):
        lat = ya + (i + 0.5) * dy
        for j in range(width):
            c = h3.latlng_to_cell(lat, xa + (j + 0.5) * dx, 9)
            if c not in rows:
                continue
            row = rows[c]
            row['forty'][FORTY_GROUP[int(fo[i, j])]] += 1
            code = int(a[i, j]) or int(b[i, j])        # Argentina first; Brazil where Argentina has no data
            row['mb'][MB_GROUP.get(code, 'other')] += 1
            row['ar'] += int(a[i, j] > 0)
            row['br'] += int(a[i, j] == 0 and b[i, j] > 0)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['h3'] + [f'forty_{g}' for g in GROUPS] + [f'mb_{g}' for g in GROUPS] + ['mb_px_argentina', 'mb_px_brasil'])
        for c in sorted(rows):
            row = rows[c]
            w.writerow([c] + [row['forty'][g] for g in GROUPS] + [row['mb'][g] for g in GROUPS] + [row['ar'], row['br']])
    print(f'{len(rows)} cells written to {OUT}')


if __name__ == '__main__':
    main()
