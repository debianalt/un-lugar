"""Builds public/data/region_timetable.json: at every river gauge of the region that has a published evacuation level,
each rise above that level against the timetable of Sentinel-1 passes over the gauge.

It is build_timetable.py (El Soberbio alone) run on ten gauges of the Uruguay, Iguazú and Paraná rivers.

Run from the repository root (needs an Earth Engine account for the list of passes, fetched once):

    python prep/build_region_timetable.py

Inputs, in $UN_LUGAR_CRECIDAS (outside the repository):
  manifiesto.json          the gauges read by Prefectura Naval and, for each, the other series within 5 km
  ina/series.json          the catalogue of Argentina's Instituto Nacional del Agua, with alert and evacuation levels
  ina/obs_<id>.json        readings of each series, https://alerta.ina.gob.ar/a5/obs/puntual/observaciones?series_id=<id>
  nino/nino34_ersstv6.txt  monthly Niño 3.4 anomaly (NOAA PSL, ERSST v6)
  s1_pasadas/<id>.json     written by this script: start times of the Sentinel-1 scenes that cover the gauge

Rules, the same as build_timetable.py:
- The evacuation level is the one the Instituto Nacional del Agua publishes for the Prefectura gauge. El Soberbio has
  none published; 13 m is the level reported by the local press and used by the fire brigade. Gauges with no level
  (Pepirí Miní, Alba Posse, Panambí) are left out.
- River level at each hour: the Red Hidrológica Nacional series of the same site, then its telemetry, then the daily
  Prefectura reading. A companion series is used only if its median difference with the Prefectura reading, on the
  days both exist, is 0.1 m or less (some are on another scale or another river). El Soberbio keeps the three series
  of build_timetable.py so that its row here equals timetable.json.
- Linear interpolation, never across more than 48 h; telemetry spikes of more than 5 m above both neighbours dropped;
  two rises less than 48 h apart count as one.
- A rise is "seen" if at least one Sentinel-1 scene covering the gauge started while the river was above the level.
  Whether that scene shows the water is another question; at El Soberbio it did not.
- Rises at neighbouring gauges are often the same flood: "floods_distinct" joins the rises of one river whose peaks
  are no more than ten days apart.
- El Niño or La Niña at the peak of each rise: three-month mean of the Niño 3.4 anomaly at or beyond 0.5 °C.
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd

CRECIDAS = Path(os.environ['UN_LUGAR_CRECIDAS'])
OUT = Path(__file__).resolve().parents[1] / 'public' / 'data'
MERGE_H = 48
END = '2026-10-16'                      # passes are listed up to here, as in build_timetable.py
COMPANION_TOL_M = 0.1
SOBERBIO = '61'
LEVEL_OVERRIDE = {SOBERBIO: 13.0}
SERIES_OVERRIDE = {SOBERBIO: [6490, 33241, 61]}
S1 = 'COPERNICUS/S1_GRD'


def series(sid: int) -> pd.Series:
    obs = json.load(open(CRECIDAS / f'ina/obs_{sid}.json', encoding='utf-8'))
    x = pd.Series([o['valor'] for o in obs], index=pd.to_datetime([o['timestart'] for o in obs], utc=True)).dropna()
    x = x[(x > -5) & (x < 40)]
    return x[~x.index.duplicated()].sort_index()


def despike(x: pd.Series, jump=5.0) -> pd.Series:
    bad = (x - x.shift(1) > jump) & (x - x.shift(-1) > jump)
    return x[~bad]


def hourly(x: pd.Series, t0, t1) -> pd.Series:
    idx = pd.date_range(t0.floor('h'), t1.ceil('h'), freq='1h')
    return x.resample('1h').mean().reindex(idx).interpolate(limit=MERGE_H, limit_area='inside')


def passes_over(sid: str, lon: float, lat: float) -> pd.DatetimeIndex:
    path = CRECIDAS / 's1_pasadas' / f'{sid}.json'
    if not path.exists():
        import ee
        ee.Initialize()
        col = (ee.ImageCollection(S1).filterBounds(ee.Geometry.Point([lon, lat])).filterDate('2014-01-01', END)
               .filter(ee.Filter.eq('instrumentMode', 'IW')))
        t = col.aggregate_array('system:time_start').getInfo()
        path.parent.mkdir(parents=True, exist_ok=True)
        json.dump({'collection': S1, 'point': [lon, lat], 'until': END, 'time_start_ms': sorted(t)}, open(path, 'w'))
    t = np.array(sorted(json.load(open(path))['time_start_ms']), dtype='int64')
    t = t[np.insert(np.diff(t) > 120_000, 0, True)]      # consecutive slices of one orbit count as one pass
    return pd.to_datetime(t, unit='ms', utc=True)


def enso() -> pd.Series:
    rows = []
    for line in open(CRECIDAS / 'nino/nino34_ersstv6.txt'):
        p = line.split()
        if len(p) == 13 and p[0].isdigit():
            rows += [(pd.Timestamp(int(p[0]), m + 1, 1, tz='UTC'), float(v)) for m, v in enumerate(p[1:])]
    x = pd.Series(dict(rows)).sort_index()
    x = x[x > -90]
    return x.rolling(3, center=True, min_periods=2).mean()


def phase(oni: pd.Series, t: pd.Timestamp) -> str | None:
    key = pd.Timestamp(t.year, t.month, 1, tz='UTC')
    if key not in oni.index or pd.isna(oni[key]):
        return None
    v = oni[key]
    return 'nino' if v >= 0.5 else 'nina' if v <= -0.5 else 'neutral'


def main():
    man = json.load(open(CRECIDAS / 'manifiesto.json', encoding='utf-8'))['hidrometros']
    cat = {r['id']: r for r in json.load(open(CRECIDAS / 'ina/series.json', encoding='utf-8'))['rows']}
    oni = enso()
    stations, left_out = [], []
    for sid, m in man.items():
        st = cat[int(sid)]['estacion']
        level = LEVEL_OVERRIDE.get(sid, st['nivel_evacuacion'])
        if level is None:
            left_out.append(m['nombre'])
            continue
        lon, lat = st['geom']['coordinates']
        passes = passes_over(sid, lon, lat)
        t0, t1 = passes[0], passes[-1]

        pref = series(int(sid))
        if sid in SERIES_OVERRIDE:
            order = SERIES_OVERRIDE[sid]
        else:
            daily, order = pref[t0:].resample('1D').mean(), []
            for c in m['companeras']:
                x = series(c['serie'])[t0:]
                d = (x.resample('1D').mean() - daily).dropna()
                if len(d) >= 200 and abs(d.median()) <= COMPANION_TOL_M:
                    order.append(c['serie'])
            order = sorted(order, key=lambda s: 'SAT' in cat[s]['estacion']['red']['nombre']) + [int(sid)]
        h = None
        for s in order:
            x = hourly(despike(series(s)), t0, t1)
            h = x if h is None else h.fillna(x)

        up = (h >= level).fillna(False)
        runs = []
        for _, g in h[up].groupby((up != up.shift()).cumsum()[up]):
            if runs and (g.index[0] - runs[-1]['end']).total_seconds() < MERGE_H * 3600:
                runs[-1].update(end=g.index[-1], hours=runs[-1]['hours'] + len(g), peak=max(runs[-1]['peak'], g.max()),
                                peak_t=g.idxmax() if g.max() > runs[-1]['peak'] else runs[-1]['peak_t'])
            else:
                runs.append({'start': g.index[0], 'end': g.index[-1], 'hours': len(g), 'peak': g.max(), 'peak_t': g.idxmax()})
        episodes = []
        for e in runs:
            inside = passes[(passes >= e['start']) & (passes <= e['end'])]
            episodes.append({'date': e['peak_t'].strftime('%Y-%m-%d'), 'peak_m': round(float(e['peak']), 2),
                             'days_above': round(e['hours'] / 24, 1), 'passes_inside': int(len(inside)),
                             'enso': phase(oni, e['peak_t'])})
        known = int(h.notna().sum())
        share = float(up.sum()) / known
        dur = [e['days_above'] for e in episodes]
        stations.append({
            'id': int(sid), 'name': m['nombre'], 'river': {'uruguay': 'Uruguay', 'iguazu': 'Iguazú', 'parana': 'Paraná'}.get(
                m['grupo'], 'Iguazú' if 'Iguaz' in m['nombre'] else 'Paraná'),
            'regulated': m['grupo'] == 'regulado', 'lon': round(lon, 4), 'lat': round(lat, 4),
            'evacuation_level_m': level, 'level_source': 'local press' if sid in LEVEL_OVERRIDE else 'Instituto Nacional del Agua',
            'series': order, 'first': t0.strftime('%Y-%m-%d'), 'last': t1.strftime('%Y-%m-%d'),
            'gauge_hours_known_share': round(known / len(h), 3), 'passes_total': int(len(passes)),
            'max_m': round(float(h.max()), 2), 'rises': len(episodes), 'rises_with_a_pass': sum(e['passes_inside'] > 0 for e in episodes),
            'days_above': round(float(up.sum()) / 24, 1), 'share_above': round(share, 5),
            'median_rise_days': round(float(np.median(dur)), 1) if dur else None,
            'passes_above': int(sum(e['passes_inside'] for e in episodes)), 'expected_passes_above': round(len(passes) * share, 1),
            'mean_days_between_passes': round((t1 - t0).total_seconds() / 86400 / (len(passes) - 1), 1),
            'episodes': episodes})
        s = stations[-1]
        print(f"{s['name']:<16}{s['river']:<8} level {level:>5}  max {s['max_m']:>6}  rises {s['rises']:>3}  with a pass {s['rises_with_a_pass']:>3}  "
              f"median {s['median_rise_days']} d  days {s['days_above']:>6}  passes {s['passes_total']} ({s['mean_days_between_passes']} d)  "
              f"known {s['gauge_hours_known_share']}  series {order}")

    eps = [(s, e) for s in stations for e in s['episodes']]
    short = [e for _, e in eps if e['days_above'] < 3]
    by_enso = {k: sum(1 for _, e in eps if e['enso'] == k) for k in ('nino', 'neutral', 'nina')}
    # rises at neighbouring gauges are often one flood: same river, peaks no more than ten days apart
    floods = []
    for river, date, seen in sorted((s['river'], pd.Timestamp(e['date']), e['passes_inside'] > 0) for s, e in eps):
        if floods and floods[-1][0] == river and (date - floods[-1][1]).days <= 10:
            floods[-1][1], floods[-1][2] = date, floods[-1][2] or seen
        else:
            floods.append([river, date, seen])
    months = oni[stations[0]['first'][:7]:END[:7]]
    out = {'until': END, 'gauges': len(stations), 'gauges_without_level': left_out,
           'gauges_never_above': [s['name'] for s in stations if s['rises'] == 0],
           'rises': len(eps), 'rises_with_a_pass': sum(e['passes_inside'] > 0 for _, e in eps),
           'floods_distinct': len(floods), 'floods_distinct_with_a_pass': sum(f[2] for f in floods),
           'rises_under_3_days': len(short), 'rises_under_3_days_with_a_pass': sum(e['passes_inside'] > 0 for e in short),
           'rises_by_enso': by_enso,
           'months_by_enso': {'nino': int((months >= 0.5).sum()), 'neutral': int(((months > -0.5) & (months < 0.5)).sum()),
                              'nina': int((months <= -0.5).sum())},
           'enso_source': 'Niño 3.4 anomaly, ERSST v6, NOAA PSL; three-month mean at or beyond 0.5 °C',
           'stations': stations}
    json.dump(out, open(OUT / 'region_timetable.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print({k: v for k, v in out.items() if k != 'stations'})


if __name__ == '__main__':
    main()
