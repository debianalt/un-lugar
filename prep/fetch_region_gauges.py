"""Widens the list of gauges of build_region_timetable.py from Misiones to the four provinces of the region.

Writes $UN_LUGAR_CRECIDAS/manifiesto_nea.json, same format as manifiesto.json (which is left untouched), and
downloads the readings that are missing into $UN_LUGAR_CRECIDAS/ina/obs_<id>.json.

Run from the repository root:

    python prep/fetch_region_gauges.py

Rule for a gauge to enter, fixed before looking at any result:
- a height series (var 2) of the network "escalas Prefectura Nacional" in the catalogue of the Instituto Nacional
  del Agua (ina/series.json),
- with a published evacuation level,
- in Misiones, Corrientes, Chaco or Formosa. Inside the bounding box of the four provinces two gauges belong to
  other provinces and are left out by name: La Paz (Entre Ríos) and Reconquista (Santa Fe).
The gauges already in manifiesto.json are copied as they are, so their rows do not change.

Companion series: any other height series of another network within 5 km and on the same river when the series
says which, the rule of neahub/pipeline/crecidas/bajar.py.
"""
from __future__ import annotations

import json
import math
import os
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

CRECIDAS = Path(os.environ['UN_LUGAR_CRECIDAS'])
INA = 'https://alerta.ina.gob.ar/a5/obs/puntual'
UA = {'User-Agent': 'Mozilla/5.0'}
COMPANION_KM = 5.0
BBOX = (-63.0, -30.8, -53.5, -21.9)             # Misiones, Corrientes, Chaco and Formosa
NETWORK = 'escalas Prefectura Nac'
OTHER_PROVINCE = {24: 'Reconquista (Santa Fe)', 26: 'La Paz (Entre Ríos)'}
RIVER = {'PARAGUAY': ('Paraguay', 'paraguay'), 'PARANAMED': ('Paraná', 'parana_medio'),
         'PARANAINF': ('Paraná', 'parana_medio'), 'BARRANQUERAS': ('Paraná', 'parana_medio'),
         'URUGUAY': ('Uruguay', 'uruguay_medio')}


def get(url, params=None, timeout=300):
    for attempt in range(4):
        try:
            r = requests.get(url, params=params, headers=UA, timeout=timeout)
            r.raise_for_status()
            return r
        except requests.RequestException as e:
            if attempt == 3:
                raise
            print(f'  retry {attempt + 1} ({e.__class__.__name__})')
            time.sleep(5 * (attempt + 1))


def km(a, b):
    (x1, y1), (x2, y2) = a, b
    return math.hypot((x2 - x1) * 111.32 * math.cos(math.radians((y1 + y2) / 2)), (y2 - y1) * 110.57)


def plain(s):
    s = (s or '').lower()
    for a, b in (('á', 'a'), ('é', 'e'), ('í', 'i'), ('ó', 'o'), ('ú', 'u')):
        s = s.replace(a, b)
    return s


def main():
    old = json.load(open(CRECIDAS / 'manifiesto.json', encoding='utf-8'))
    rows = json.load(open(CRECIDAS / 'ina/series.json', encoding='utf-8'))['rows']
    gauges = dict(old['hidrometros'])
    for s in rows:
        e = s.get('estacion') or {}
        if str(s['id']) in gauges or s['id'] in OTHER_PROVINCE or (s.get('var') or {}).get('id') != 2:
            continue
        if not (e.get('red') or {}).get('nombre', '').startswith(NETWORK) or e.get('nivel_evacuacion') is None or not e.get('geom'):
            continue
        lon, lat = e['geom']['coordinates']
        if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
            continue
        river, group = RIVER[e['rio']]
        p, comp = (lon, lat), []
        for o in rows:
            oe = o.get('estacion') or {}
            if o['id'] == s['id'] or not oe.get('geom') or (o.get('var') or {}).get('id') != 2:
                continue
            if (oe.get('red') or {}).get('nombre') == e['red']['nombre']:
                continue
            d = km(p, tuple(oe['geom']['coordinates']))
            r_o = plain(oe.get('rio'))
            if d <= COMPANION_KM and (not r_o or plain(river)[:5] in r_o or r_o in plain(e.get('rio'))):
                dr = o.get('date_range') or {}
                comp.append(dict(serie=o['id'], red=oe['red']['nombre'], nombre=oe.get('nombre'), km=round(d, 2),
                                 desde=dr.get('timestart'), hasta=dr.get('timeend'), n=dr.get('count')))
        gauges[str(s['id'])] = dict(nombre=e['nombre'], rio=river, grupo=group, companeras=comp)
        print(f"{s['id']:>4} {e['nombre']:<20}{river:<9} level {e['nivel_evacuacion']:>5}  companions: "
              + (', '.join(f"{c['serie']} ({c['red'][:10]}, {c['km']} km, n={c['n']})" for c in comp) or '—'))

    counts = {}
    for sid in [int(k) for k in gauges] + sorted({c['serie'] for g in gauges.values() for c in g['companeras']}):
        path = CRECIDAS / 'ina' / f'obs_{sid}.json'
        if not path.exists():
            r = get(f'{INA}/observaciones', {'series_id': sid, 'timestart': '1900-01-01', 'timeend': '2030-01-01'})
            json.loads(r.content)                                  # a truncated answer must not be saved
            path.write_bytes(r.content)
            print(f'  downloaded obs {sid}')
        counts[str(sid)] = len(json.load(open(path, encoding='utf-8')))

    out = dict(old, bajado_nea=datetime.now(timezone.utc).isoformat(timespec='seconds'), hidrometros=gauges, conteo=counts,
               fuera_por_provincia=OTHER_PROVINCE)
    (CRECIDAS / 'manifiesto_nea.json').write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f"{len(gauges)} gauges ({len(old['hidrometros'])} already there) -> {CRECIDAS / 'manifiesto_nea.json'}")


if __name__ == '__main__':
    main()
