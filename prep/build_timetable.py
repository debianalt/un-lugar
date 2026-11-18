"""Builds public/data/timetable.json: every rise of the river above the evacuation level
against the timetable of Sentinel-1 passes.
It also writes public/data/timetable_daily.json, the river day by day, for the sketch of The Timetable.

Run from the repository root:

    python prep/build_timetable.py

Inputs, outside the repository:
- UN_LUGAR_DEMO: the folder with the radar test (the list of passes, soberbio_pairs3.csv).
- UN_LUGAR_INA: a folder with the gauge readings of El Soberbio as served by the public API of
  Argentina's Instituto Nacional del Agua, one file per series, obs_<id>.json:
  https://alerta.ina.gob.ar/a5/obs/puntual/observaciones?series_id=<id>&timestart=1900-01-01

Three series read the same gauge site:
  6490   Red Hidrológica Nacional, every 12 h, to August 2026
  33241  telemetry, every 4 h, from February 2023
  61     Prefectura, once a day
The river level at each hour is taken from 6490; where it has no reading within 48 h, from 33241;
where neither has one, from 61. Readings are joined by linear interpolation, never across more
than 48 h. Single telemetry readings that jump more than 5 m above both neighbours are dropped
(six, all near 15.5 m with the river near 2 m).
"""
from __future__ import annotations

import csv
import json
import os
from pathlib import Path

import pandas as pd

DEMO = Path(os.environ['UN_LUGAR_DEMO'])
INA = Path(os.environ['UN_LUGAR_INA'])
OUT = Path(__file__).resolve().parents[1] / 'public' / 'data'
EVAC_M = 13.0
HALF_WINDOW_D = 10      # days drawn on each side of a peak
MERGE_H = 48            # two rises less than this apart count as one


def series(sid: int) -> pd.Series:
    obs = json.load(open(INA / f'obs_{sid}.json', encoding='utf-8'))
    x = pd.Series([o['valor'] for o in obs], index=pd.to_datetime([o['timestart'] for o in obs], utc=True)).dropna()
    x = x[(x > -5) & (x < 40)]
    return x[~x.index.duplicated()].sort_index()


def despike(x: pd.Series, jump=5.0) -> tuple[pd.Series, int]:
    bad = (x - x.shift(1) > jump) & (x - x.shift(-1) > jump)
    return x[~bad], int(bad.sum())


def hourly(x: pd.Series, t0, t1) -> pd.Series:
    idx = pd.date_range(t0.floor('h'), t1.ceil('h'), freq='1h')
    h = x.resample('1h').mean().reindex(idx)
    return h.interpolate(limit=MERGE_H, limit_area='inside')


def main():
    rows = list(csv.DictReader(open(DEMO / '06_pruebas/prueba_soberbio_2026-10-22/soberbio_pairs3.csv', newline='')))
    passes = pd.to_datetime(sorted(float(r['t']) for r in rows), unit='s', utc=True)
    t0, t1 = passes[0], passes[-1]

    tele, dropped = despike(series(33241))
    h = hourly(series(6490), t0, t1)
    h = h.fillna(hourly(tele, t0, t1)).fillna(hourly(series(61), t0, t1))

    up = (h >= EVAC_M).fillna(False)
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
        before, after = passes[passes < e['start']], passes[passes > e['end']]
        w0, w1 = e['peak_t'] - pd.Timedelta(days=HALF_WINDOW_D), e['peak_t'] + pd.Timedelta(days=HALF_WINDOW_D)
        curve = h[w0:w1][::3]
        near = passes[(passes >= w0) & (passes <= w1)]
        off = lambda t: round((t - e['peak_t']).total_seconds() / 86400, 2)
        episodes.append({
            'date': e['peak_t'].strftime('%Y-%m-%d'), 'peak_m': round(float(e['peak']), 2),
            'days_above': round(e['hours'] / 24, 1), 'passes_inside': int(len(inside)),
            'last_pass_before_d': round((e['start'] - before[-1]).total_seconds() / 86400, 1) if len(before) else None,
            'next_pass_after_d': round((after[0] - e['end']).total_seconds() / 86400, 1) if len(after) else None,
            'curve': [[off(t), None if pd.isna(v) else round(float(v), 2)] for t, v in curve.items()],
            'passes': [off(t) for t in near]})

    known = int(h.notna().sum())
    share = float(up.sum()) / known
    days = sorted({t.strftime('%Y-%m-%d') for t in passes})
    origin = pd.Timestamp(t0.year, 1, 1, tz='UTC')
    out = {
        'evacuation_level_m': EVAC_M, 'first': t0.strftime('%Y-%m-%d'), 'last': t1.strftime('%Y-%m-%d'),
        'passes_total': int(len(passes)), 'pass_dates': len(days),
        'gauge_hours_known_share': round(known / len(h), 3),
        'days_above': round(float(up.sum()) / 24, 1), 'share_above': round(share, 5),
        'expected_passes_above': round(len(passes) * share, 1),
        'episodes_total': len(episodes), 'episodes_with_a_pass': sum(e['passes_inside'] > 0 for e in episodes),
        'telemetry_spikes_dropped': dropped,
        'origin': origin.strftime('%Y-%m-%d'),
        'pass_days': [int((pd.Timestamp(d, tz='UTC') - origin).days) for d in days],
        'episode_days': [int((pd.Timestamp(e['date'], tz='UTC') - origin).days) for e in episodes],
        'gauge': {'site': 'El Soberbio, Uruguay River', 'series': [6490, 33241, 61],
                  'api': 'https://alerta.ina.gob.ar/a5/obs/puntual/observaciones?series_id=<id>'},
        'episodes': episodes}
    json.dump(out, open(OUT / 'timetable.json', 'w'), separators=(',', ':'))
    # the river day by day, for the sketch of The Timetable (src/piece.js): the highest hourly level of each day
    daily = h.resample('1D').max().reindex(pd.date_range(origin, t1.floor('D'), freq='1D'))
    json.dump({'origin': out['origin'], 'evacuation_level_m': EVAC_M, 'unit': 'm above the zero of the gauge',
               'note': 'highest hourly level of each day, one value per day from origin; null where no reading within 48 h',
               'level_m': [None if pd.isna(v) else round(float(v), 1) for v in daily],
               'passes_note': 'every Sentinel-1 pass: days from origin, and the river level at that hour',
               'passes': [[round((t - origin).total_seconds() / 86400, 2), None if pd.isna(v) else round(float(v), 1)]
                          for t, v in zip(passes, h.reindex(passes.round('h')).to_numpy())]},
              open(OUT / 'timetable_daily.json', 'w'), separators=(',', ':'))
    print(f"timetable: {len(episodes)} rises above {EVAC_M} m, {out['days_above']} days ({share:.2%}); "
          f"{out['episodes_with_a_pass']} with a pass; expected by chance {out['expected_passes_above']}; spikes dropped {dropped}")
    for e in episodes:
        print(f"  {e['date']}  {e['days_above']:4} d  peak {e['peak_m']:5}  inside {e['passes_inside']}  before {e['last_pass_before_d']}  after {e['next_pass_after_d']}")


if __name__ == '__main__':
    main()
