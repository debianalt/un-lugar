# One Place, Every Eye

*Un lugar, todos los ojos.* A small open observatory of what Earth-observation products miss, tried on one bend of the Uruguay River at El Soberbio (Misiones, Argentina), on the border with Brazil.

The page takes a frame of 14 × 12 km and shows, product by product, what each one sees there and what it does not. It is a prototype: read-only, one place, built from tests run during 2026.

## What it shows

| Section | Finding in this frame | File |
|---|---|---|
| Radar | Of 360 usable Sentinel-1 passes (2015–2026), one found the river above the evacuation level of 13 m, and it detected less water (1,142 ha) than the median below 12 m (1,298 ha). The cause is not established. Two NISAR L-band scenes failed a pass criterion fixed before the data were downloaded. | `public/data/radar.json` |
| Relief | Four open elevation models differ by a median of 9.9 m within 300 m of the river. | `public/data/relief.json`, `relief_range.png` |
| Water | At the river height of November 2023 a terrain-based flood simulation made for Spatia reaches 1,283 ha; 482 ha of that is land where the Global Surface Water record (1984–2021) never saw water. | `public/data/water.json`, `water_*.png` |
| Forest | Forest Typology 2020 (ForTy) and MapBiomas disagree about forest in 108 of 1,811 cells, on both banks. In another 124, all on the Argentine side, MapBiomas maps yerba mate or tea and ForTy maps other land. | `public/data/forest.json`, `forest.geojson` |
| What no sensor holds | Empty on purpose: what families, firefighters, farmers and the people of the port know is shown when they decide. See [GOVERNANCE.md](GOVERNANCE.md). | — |
| The region | The two tests that need no fieldwork, run beyond the frame. At ten river gauges with an evacuation level, 17 distinct floods passed it (2015–2026) and a Sentinel-1 scene over a gauge started during 6; counted gauge by gauge they are 46 rises, 9 with a scene. Over 3.3 million Argentine cells, ForTy and MapBiomas disagree about forest on 10.3 %, about 3 million hectares; on 1.7 million of them the difference is in the legend (MapBiomas "flooded forest" includes shrubs, ForTy follows FAO). | `public/data/region_timetable.json`, `region_forest.json`, `region_forest.geojson` |
| Annotations | Fifteen notes, each declared as measured, interpreted, situated or speculated, with its source. | `public/data/annotations.json`, [`annotation.schema.json`](annotation.schema.json) |

## What it does not do yet

- There is no way to add an annotation from the page. The format is a JSON file.
- It covers one place in depth. Only the timetable and the forest crossing have been run over the region; the other tests have not been repeated elsewhere.
- The "situated" notes are newspaper reports, not marks made by residents. Each is set against other public sources of the same flood (a second outlet, an official communiqué, the gauge) and says whether they agree.
- The flood simulation overestimates above about 19 m and starts reaching homes about 2 m later than evacuations begin. The page shows the comparison without correcting it.
- Above the evacuation level the radar test rests on a single pass. The explanation given for it (water under the forest canopy) is a guess and is recorded as one.
- No annotation has a recorded independent reviewer.
- The page tells three kinds of blank apart (not observed, outside the product, kept back by decision), with one example of each. It does not yet draw them on every layer.
- Light theme only.

## Sources

Sentinel-1 (Copernicus, ESA); NISAR (NASA–ISRO); FABDEM (University of Bristol); Copernicus GLO-30; ALOS AW3D30 (JAXA); MERIT DEM; JRC Global Surface Water; MapBiomas Argentina, Collection 3; MapBiomas Brasil, Collection 11; Forest Typology (ForTy) 2020 v1.0 (Google DeepMind, Google Research, WRI, IIASA); river gauge series 61 of the Instituto Nacional del Agua; OpenStreetMap contributors; basemap © CARTO. Each derived file keeps the terms of its source.

## Build

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

The files in `public/data/` are already built. `prep/build_data.py` regenerates them from local research outputs that are not redistributed here (elevation rasters, the flood simulation outputs); it needs the environment variables `UN_LUGAR_DEMO` and `UN_LUGAR_FUENTES`. The forest comparison can be repeated by anyone with an Earth Engine account: `prep/fetch_forest_frame.py` downloads both products for the frame.

## Who

Raimundo Elías Gómez, CONICET / Facultad de Humanidades y Ciencias Sociales, Universidad Nacional de Misiones. The code was written with AI coding agents; the tests, the choices and the mistakes are the author's. The base platform is [Spatia](https://spatia.ar).

## Licence

Code: AGPL-3.0-or-later. What the people of the place contribute, when there is any, is not covered by an open licence: see [GOVERNANCE.md](GOVERNANCE.md).
