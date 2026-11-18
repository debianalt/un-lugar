// All visible text, in English and Spanish. {curly} tokens are filled from the data files.
export const T = {
  en: {
    lang: 'Español',
    kicker: 'Prototype · November 2026',
    title: 'One Place, Every Eye',
    lede: 'El Soberbio is a town of about 26,000 people on the Uruguay River, between Argentina and Brazil. This page takes one bend of that river and shows what each open Earth-observation product sees there, and what it does not.',
    status: 'This is a first, read-only version built from tests I ran in 2026. The frame is 14 by 12 km. Every number comes from a file in the repository.',
    footer: 'Sources: Sentinel-1 (Copernicus), FABDEM, Copernicus GLO-30, ALOS AW3D30 (JAXA), MERIT, JRC Global Surface Water, MapBiomas Argentina and MapBiomas Brasil, Forest Typology 2020 (Google DeepMind, Google Research, WRI, IIASA), Instituto Nacional del Agua. Code under AGPL-3.0. Built by Raimundo Elías Gómez (CONICET, Universidad Nacional de Misiones) with AI coding agents; the tests, the choices and the mistakes are mine. <a href="https://github.com/debianalt/un-lugar">Repository</a> · <a href="https://spatia.ar">Spatia</a>',
    s: {
      radar: {
        num: '01 · Radar',
        h: 'In {kept} radar passes, one flood, and less water than on an ordinary day',
        p: [
          'Sentinel-1 is the open radar satellite most flood maps rely on, because it sees through cloud. I paired {kept} of its passes over this corridor, from 2015 to 2026, with the river gauge at the port.',
          'Between 0 and 12 m on the gauge the detected water stays near {median} hectares, which is the river itself. Only {above} of the {kept} passes found the river above the evacuation level of 13 m; {low} found it below 6 m. That pass, on {floodDate} with the river at {floodH} m, detected {floodW} hectares: less than on an ordinary day.',
          'I do not know why. The banks here are steep and covered with forest, and my guess is that the C-band signal does not reach water under the trees. It is recorded in the annotations as speculation, not as a finding.',
          'In November 2026 I repeated the test with L-band scenes from NISAR, a radar meant to see under canopy. For two rises of the river in October, the water it showed did not match the water my terrain model expected: the best overlap score was {f1a} and {f1b} out of 1. I had written down the pass criterion before downloading the data, and the result failed it.'
        ],
        fig: 'Water detected by Sentinel-1 against river height',
        sub: 'Each dot is one satellite pass. Hectares of open water in a 20 × 20 km corridor.',
        x: 'River height at the gauge (m)', y: 'Water detected (ha)',
        evac: 'evacuation level, 13 m', unseen: 'not observed: {above} pass in {years} years',
        tip: '{d}: river at {h} m, {w} ha of water detected',
        legend: 'Corridor used for the radar test (20 × 20 km)'
      },
      relief: {
        num: '02 · Relief',
        h: 'Four elevation models, one riverbank, {bankR} m apart',
        p: [
          'Flood maps start from a terrain model. Four global ones are open: FABDEM, Copernicus GLO-30, ALOS AW3D30 and MERIT. Each is built from different sensors and removes trees and buildings in its own way, or not at all.',
          'On the map, darker cells are where the four disagree most. Within 300 m of the river, where people live, the median gap between the highest and the lowest model is {bank} m, and in one cell in ten it passes {p90} m. A flood that reaches 13 m on the gauge is decided inside that gap.',
          'The models also place the channel differently. Across the province, the stream network I derived from FABDEM lies a median of about 100 m away from the streams mapped by hand in OpenStreetMap.'
        ],
        fig: 'The same line across the river, in four models',
        sub: 'Elevation along the line drawn on the map, from the town centre to the Brazilian bank.',
        x: 'Distance along the line (m)', y: 'Elevation (m)', river: 'river',
        legend: 'Gap between the highest and the lowest of four elevation models',
        pix: 'How big one cell of each product is, next to a house',
        house: 'a house', s1: 'Sentinel-1', dem: 'FABDEM, GLO-30', merit: 'MERIT', hex: 'map cell used here'
      },
      water: {
        num: '03 · Water',
        h: 'Thirty-eight years of satellite images have never seen this water',
        p: [
          'The Global Surface Water record marks every 30 m cell where Landsat saw water at least once between 1984 and 2021. Floods here come with days of cloud, so the optical satellites mostly miss them.',
          'I built a flood model from the terrain and the gauge and adjusted it with what local newspapers reported in six floods. At the height of November 2023 the model reaches {reached} hectares in this frame, the river included; {never} of them, {share}, are land where the satellite record has never seen water.',
          'I cannot tell from here which of the two is wrong in each cell. The newspapers say families left from 12 to 13 m; the model starts reaching homes at 15 m. The orange area is where that question is open.'
        ],
        btn: { jrc: 'Satellite record', m2026: 'Model, 15 m', m2023: 'Model, 19.75 m', m2014: 'Model, 22.8 m' },
        fig: 'What the press counted and what the model counts',
        sub: 'Families reported as evacuated and homes the model reaches at the same river height.',
        th: ['Flood', 'Height', 'Families (press)', 'Homes (model)', 'Source'],
        legendJrc: 'How often Landsat saw water here, 1984–2021',
        legendModel: 'Reached by the model at this river height',
        seen: 'water seen at least once by the satellite record', never: 'never seen by the satellite record',
        lo: 'rarely', hi: 'always',
        after: 'flood after 2021: outside the satellite record, which ends that year'
      },
      forest: {
        num: '04 · Forest',
        h: 'Two maps of the same year disagree about forest on one cell in {forestIn}',
        p: [
          'Forest Typology 2020 (ForTy), from Google DeepMind, Google Research, WRI and IIASA, and MapBiomas both classify the year 2020. Whether a plot counts as forest, plantation or crop matters for what may be sold in Europe under the deforestation regulation.',
          'In {cells} cells of about 9 hectares, {forestN}, or {forestShare}, are forest or forest plantation in one map and something else in the other. In another {cropN} neither map sees forest and they still disagree: MapBiomas calls the land yerba mate or tea, and ForTy, which has a class for tree crops, calls it other land.',
          'ForTy is one global product. MapBiomas is two national ones, made by different teams, that meet in the middle of the river. All {cropN} of those tree-crop cells are on the Argentine side; on the Brazilian side MapBiomas maps no perennial crop in this frame.'
        ],
        fig: 'Dominant cover in each cell, 2020',
        sub: 'Both banks of the frame.',
        agree: 'same dominant cover', mixed: 'one of the two has no dominant cover', crop: 'they disagree, and neither says forest', forest: 'they disagree about forest',
        th: ['ForTy 2020', 'MapBiomas 2020', 'Bank', 'Cells'],
        side: { argentina: 'Argentina', brasil: 'Brazil' },
        cls: { forest: 'natural forest', plantation: 'forest plantation', treecrop: 'tree crop (yerba, tea)', other: 'other land', mixed: 'no dominant cover', nodata: 'no data' },
        tip: 'ForTy: {a} · MapBiomas: {b}',
        legend: 'Do the two maps agree on the dominant cover?'
      },
      empty: {
        num: '05 · What no sensor holds',
        h: 'This layer is empty on purpose',
        p: [
          'Mbyá Guaraní families fish this river and sell along the coast road. The official registers of Indigenous communities do not place them here. Three public lists I compared count different numbers of communities for the province and none records where people work.',
          'In 2021 I coordinated the mapping of Indigenous community lands in Misiones for the national survey. I know that this knowledge exists and that it is not mine to publish.'
        ],
        box: [
          'No community knowledge is shown in this prototype.',
          'It stays empty until a community council decides what may be shown and at what precision. Community knowledge is not kept in this repository: it stays in tools the community controls, and this page would show only what the community publishes. The rules are in GOVERNANCE.md.'
        ],
        blanks: 'A blank on a map can mean three things, and this page draws them differently.',
        blank: { unseen: 'the sensor passed and did not see, or never passed (section 01)', outside: 'the product ends here, in space or in time (section 03)', withheld: 'the knowledge exists and is kept back by decision (this section)' },
        legend: 'Kept back by decision. The frame holds no data.'
      },
      notes: {
        num: '06 · Annotations',
        h: 'Four kinds of statement, kept apart',
        p: [
          'Every note on the map says what kind of statement it is, where it comes from and who checked it. For now the “situated” notes are dated newspaper reports, the nearest public trace of what residents and firefighters saw. Four reports I could not read in full were left out.',
          'There is no form to add a note yet. The format is a small open file anyone can copy.'
        ],
        reg: { measured: 'Measured', interpreted: 'Interpreted', situated: 'Situated', speculated: 'Speculated' },
        regHelp: { measured: 'an instrument reading', interpreted: 'a reading of the data by someone', situated: 'what people in the place saw or said', speculated: 'a guess nobody has tested' },
        review: 'How it was checked', by: 'Checked by', source: 'Source',
        indep: 'Notes checked by someone other than their author: {indep} of {n}.',
        legend: 'Annotations by kind of statement'
      }
    }
  },
  es: {
    lang: 'English',
    kicker: 'Prototipo · noviembre de 2026',
    title: 'Un lugar, todos los ojos',
    lede: 'El Soberbio es un pueblo de unas 26.000 personas sobre el río Uruguay, entre la Argentina y Brasil. Esta página toma una curva de ese río y muestra qué ve ahí cada producto abierto de observación de la Tierra, y qué no ve.',
    status: 'Es una primera versión, sólo de lectura, hecha con pruebas que corrí en 2026. El recuadro mide 14 por 12 km. Cada número sale de un archivo del repositorio.',
    footer: 'Fuentes: Sentinel-1 (Copernicus), FABDEM, Copernicus GLO-30, ALOS AW3D30 (JAXA), MERIT, JRC Global Surface Water, MapBiomas Argentina y MapBiomas Brasil, Forest Typology 2020 (Google DeepMind, Google Research, WRI, IIASA), Instituto Nacional del Agua. Código con licencia AGPL-3.0. Hecho por Raimundo Elías Gómez (CONICET, Universidad Nacional de Misiones) con agentes de programación de IA; las pruebas, las decisiones y los errores son míos. <a href="https://github.com/debianalt/un-lugar">Repositorio</a> · <a href="https://spatia.ar">Spatia</a>',
    s: {
      radar: {
        num: '01 · Radar',
        h: 'En {kept} pasadas de radar, una crecida, y menos agua que un día cualquiera',
        p: [
          'Sentinel-1 es el satélite de radar abierto que usan casi todos los mapas de inundación, porque ve a través de las nubes. Comparé {kept} pasadas sobre este corredor, de 2015 a 2026, con el hidrómetro del puerto.',
          'Entre 0 y 12 m de altura del río, el agua detectada se queda cerca de {median} hectáreas, que son el río mismo. Sólo {above} de las {kept} pasadas encontró el río por encima de la cota de evacuación de 13 m; {low} lo encontraron por debajo de 6 m. Esa pasada, el {floodDate} con el río en {floodH} m, detectó {floodW} hectáreas: menos que un día cualquiera.',
          'No sé por qué. Las barrancas son empinadas y tienen monte, y mi conjetura es que la señal de banda C no llega al agua que está bajo los árboles. Está anotada más abajo como especulación, no como hallazgo.',
          'En noviembre de 2026 repetí la prueba con escenas de banda L de NISAR, un radar pensado para ver bajo el dosel. En dos subidas del río de octubre, el agua que mostró no coincidió con la que esperaba mi modelo de terreno: el mejor puntaje de coincidencia fue {f1a} y {f1b} sobre 1. Había anotado el criterio de aprobación antes de bajar los datos, y el resultado no lo cumplió.'
        ],
        fig: 'Agua detectada por Sentinel-1 según la altura del río',
        sub: 'Cada punto es una pasada del satélite. Hectáreas de agua abierta en un corredor de 20 × 20 km.',
        x: 'Altura del río en el hidrómetro (m)', y: 'Agua detectada (ha)',
        evac: 'cota de evacuación, 13 m', unseen: 'sin observar: {above} pasada en {years} años',
        tip: '{d}: río en {h} m, {w} ha de agua detectada',
        legend: 'Corredor de la prueba de radar (20 × 20 km)'
      },
      relief: {
        num: '02 · Relieve',
        h: 'Cuatro modelos de elevación, una barranca, {bankR} m de diferencia',
        p: [
          'Un mapa de inundación parte de un modelo del terreno. Hay cuatro globales y abiertos: FABDEM, Copernicus GLO-30, ALOS AW3D30 y MERIT. Cada uno sale de sensores distintos y quita los árboles y los edificios a su manera, o no los quita.',
          'En el mapa, las celdas más oscuras son donde los cuatro discrepan más. A menos de 300 m del río, donde vive la gente, la diferencia mediana entre el modelo más alto y el más bajo es de {bank} m, y en una celda de cada diez pasa los {p90} m. Una crecida que llega a 13 m en el hidrómetro se decide dentro de esa diferencia.',
          'Los modelos también ubican el cauce en lugares distintos. En toda la provincia, la red de arroyos que derivé de FABDEM queda a una mediana de unos 100 m de los arroyos dibujados a mano en OpenStreetMap.'
        ],
        fig: 'La misma línea a través del río, en cuatro modelos',
        sub: 'Elevación a lo largo de la línea dibujada en el mapa, del centro del pueblo a la costa brasileña.',
        x: 'Distancia sobre la línea (m)', y: 'Elevación (m)', river: 'río',
        legend: 'Diferencia entre el más alto y el más bajo de cuatro modelos de elevación',
        pix: 'Cuánto mide una celda de cada producto, al lado de una casa',
        house: 'una casa', s1: 'Sentinel-1', dem: 'FABDEM, GLO-30', merit: 'MERIT', hex: 'celda de este mapa'
      },
      water: {
        num: '03 · Agua',
        h: 'Treinta y ocho años de imágenes satelitales nunca vieron esta agua',
        p: [
          'El registro Global Surface Water marca cada celda de 30 m donde Landsat vio agua al menos una vez entre 1984 y 2021. Acá las crecidas llegan con días de nubes, y los satélites ópticos casi no las ven.',
          'Armé un modelo de inundación con el terreno y el hidrómetro, y lo ajusté con lo que publicaron los diarios locales en seis crecidas. A la altura de noviembre de 2023 el modelo alcanza {reached} hectáreas en este recuadro, con el río incluido; {never} de ellas, el {share}, son tierra donde el registro satelital nunca vio agua.',
          'Desde acá no puedo saber cuál de los dos se equivoca en cada celda. Los diarios dicen que las familias salen desde los 12 o 13 m; el modelo empieza a alcanzar viviendas a los 15 m. El área naranja es donde esa pregunta está abierta.'
        ],
        btn: { jrc: 'Registro satelital', m2026: 'Modelo, 15 m', m2023: 'Modelo, 19,75 m', m2014: 'Modelo, 22,8 m' },
        fig: 'Lo que contó la prensa y lo que cuenta el modelo',
        sub: 'Familias informadas como evacuadas y viviendas que el modelo alcanza a la misma altura del río.',
        th: ['Crecida', 'Altura', 'Familias (prensa)', 'Viviendas (modelo)', 'Fuente'],
        legendJrc: 'Con qué frecuencia Landsat vio agua acá, 1984–2021',
        legendModel: 'Alcanzado por el modelo a esta altura del río',
        seen: 'agua vista al menos una vez por el registro satelital', never: 'nunca vista por el registro satelital',
        lo: 'rara vez', hi: 'siempre',
        after: 'crecida posterior a 2021: fuera del registro satelital, que termina ese año'
      },
      forest: {
        num: '04 · Bosque',
        h: 'Dos mapas del mismo año discrepan sobre el bosque en una celda de cada {forestIn}',
        p: [
          'Forest Typology 2020 (ForTy), de Google DeepMind, Google Research, WRI e IIASA, y MapBiomas clasifican el año 2020. Que un lote cuente como bosque, plantación o cultivo pesa en lo que puede venderse en Europa con el reglamento de deforestación.',
          'En {cells} celdas de unas 9 hectáreas, {forestN}, el {forestShare}, son bosque o plantación forestal en un mapa y otra cosa en el otro. En otras {cropN} ninguno de los dos ve bosque y tampoco coinciden: MapBiomas llama a esa tierra yerba mate o té, y ForTy, que tiene una clase para cultivos arbóreos, la llama otras tierras.',
          'ForTy es un solo producto global. MapBiomas son dos productos nacionales, hechos por equipos distintos, que se encuentran en el medio del río. Las {cropN} celdas de cultivo arbóreo están todas del lado argentino; del lado brasileño MapBiomas no marca ningún cultivo perenne en este recuadro.'
        ],
        fig: 'Cobertura dominante en cada celda, 2020',
        sub: 'Las dos costas del recuadro.',
        agree: 'misma cobertura dominante', mixed: 'uno de los dos no tiene cobertura dominante', crop: 'no coinciden, y ninguno dice bosque', forest: 'no coinciden sobre el bosque',
        th: ['ForTy 2020', 'MapBiomas 2020', 'Costa', 'Celdas'],
        side: { argentina: 'Argentina', brasil: 'Brasil' },
        cls: { forest: 'bosque nativo', plantation: 'plantación forestal', treecrop: 'cultivo arbóreo (yerba, té)', other: 'otras tierras', mixed: 'sin cobertura dominante', nodata: 'sin dato' },
        tip: 'ForTy: {a} · MapBiomas: {b}',
        legend: '¿Coinciden los dos mapas en la cobertura dominante?'
      },
      empty: {
        num: '05 · Lo que ningún sensor guarda',
        h: 'Esta capa está vacía a propósito',
        p: [
          'Hay familias mbyá guaraní que pescan en este río y venden a la vera de la ruta costera. Los registros oficiales de comunidades indígenas no las ubican acá. Tres listas públicas que comparé cuentan cantidades distintas de comunidades en la provincia y ninguna registra dónde trabaja la gente.',
          'En 2021 coordiné en Misiones el mapeo de tierras de comunidades indígenas para el relevamiento nacional. Sé que ese conocimiento existe y que no me corresponde publicarlo.'
        ],
        box: [
          'En este prototipo no se muestra ningún conocimiento comunitario.',
          'Queda vacía hasta que un consejo comunitario decida qué se puede mostrar y con qué precisión. El conocimiento comunitario no se guarda en este repositorio: queda en herramientas que controla la comunidad, y esta página mostraría sólo lo que la comunidad publique. Las reglas están en GOVERNANCE.md.'
        ],
        blanks: 'Un blanco en un mapa puede querer decir tres cosas, y esta página las dibuja distinto.',
        blank: { unseen: 'el sensor pasó y no vio, o nunca pasó (sección 01)', outside: 'el producto termina acá, en el espacio o en el tiempo (sección 03)', withheld: 'el conocimiento existe y se guarda por decisión (esta sección)' },
        legend: 'Guardado por decisión. El recuadro no tiene datos.'
      },
      notes: {
        num: '06 · Anotaciones',
        h: 'Cuatro clases de afirmación, separadas',
        p: [
          'Cada nota del mapa dice qué clase de afirmación es, de dónde sale y quién la revisó. Por ahora las notas «situadas» son notas de prensa fechadas, el rastro público más cercano de lo que vieron vecinos y bomberos. Dejé afuera cuatro notas que no pude leer completas.',
          'Todavía no hay formulario para sumar una nota. El formato es un archivo abierto y chico que cualquiera puede copiar.'
        ],
        reg: { measured: 'Medido', interpreted: 'Interpretado', situated: 'Situado', speculated: 'Especulado' },
        regHelp: { measured: 'la lectura de un instrumento', interpreted: 'una lectura de los datos hecha por alguien', situated: 'lo que vio o dijo la gente del lugar', speculated: 'una conjetura que nadie probó' },
        review: 'Cómo se revisó', by: 'Revisó', source: 'Fuente',
        indep: 'Notas revisadas por alguien que no es su autor: {indep} de {n}.',
        legend: 'Anotaciones por clase de afirmación'
      }
    }
  }
};
