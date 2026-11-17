# One Place, Every Eye

*Un lugar, todos los ojos.* A small open observatory of what Earth-observation products miss, tried on one bend of the Uruguay River at El Soberbio (Misiones, Argentina), on the border with Brazil.

The page takes a frame of 14 × 12 km and shows, product by product, what each one sees there and what it does not. It is a prototype: read-only, one place, built from tests run during 2026.

## What it shows

| Section | Finding in this frame | File |
|---|---|---|
| Radar | In 360 Sentinel-1 passes (2015–2026) the detected water area does not grow as the river rises from 0 to 16 m. Two NISAR L-band scenes failed a pass criterion fixed before the data were downloaded. | `public/data/radar.json` |
| Relief | Four open elevation models differ by a median of 9.9 m within 300 m of the river. | `public/data/relief.json`, `relief_range.png` |
| Water | At the river height of November 2023 a terrain-based flood model reaches 1,283 ha; 482 ha of that is land where the Global Surface Water record (1984–2021) never saw water. | `public/data/water.json`, `water_*.png` |
| Forest | MapBiomas Argentina and the JRC Forest Types map name a different dominant cover for 2020 in 191 of 1,223 cells. Both stop at the border. | `public/data/forest.json`, `forest.geojson` |
| What no sensor holds | Empty on purpose. See [GOVERNANCE.md](GOVERNANCE.md). | — |
| Annotations | Fifteen notes, each declared as measured, interpreted, situated or speculated, with source and review. | `public/data/annotations.json`, [`annotation.schema.json`](annotation.schema.json) |

## What it does not do yet

- There is no way to add an annotation from the page. The format is a JSON file.
- It covers one place. The method has not been repeated elsewhere.
- The "situated" notes are newspaper reports, not marks made by residents. They were found with an automated web search on 23 October 2026 and the figures were taken from the article text. Four reports that could only be read as automatic summaries were left out.
- The flood model overestimates above about 19 m and starts reaching homes about 2 m later than evacuations begin. The page shows the comparison without correcting it.
- The Brazilian bank has no land-cover data in either source used.
- Light theme only.

## Sources

Sentinel-1 (Copernicus, ESA); NISAR (NASA–ISRO); FABDEM (University of Bristol); Copernicus GLO-30; ALOS AW3D30 (JAXA); MERIT DEM; JRC Global Surface Water; MapBiomas Argentina, Collection 3; JRC Global Forest Types 2020; river gauge series 61 of the Instituto Nacional del Agua; OpenStreetMap contributors; basemap © CARTO. Each derived file keeps the terms of its source.

## Build

```sh
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
```

The files in `public/data/` are already built. `prep/build_data.py` regenerates them from local research outputs that are not redistributed here (elevation rasters, the per-cell land-cover tables, the flood model outputs); it needs the environment variables `UN_LUGAR_DEMO` and `UN_LUGAR_FUENTES`.

## Who

Raimundo Elías Gómez, CONICET / Facultad de Humanidades y Ciencias Sociales, Universidad Nacional de Misiones. The code was written with AI coding agents; the tests, the choices and the mistakes are the author's. The base platform is [Spatia](https://spatia.ar).

## Licence

Code: AGPL-3.0-or-later. Community knowledge, when there is any, is not covered by an open licence: see [GOVERNANCE.md](GOVERNANCE.md).
