// All visible text, in English and Spanish. {curly} tokens are filled from the data files.
const SOURCES = 'Sentinel-1 (Copernicus), NISAR (NASA–ISRO), FABDEM, Copernicus GLO-30, ALOS AW3D30 (JAXA), MERIT, JRC Global Surface Water, MapBiomas Argentina, MapBiomas Brasil, Forest Typology 2020 (Google DeepMind, Google Research, WRI, IIASA), Instituto Nacional del Agua, OpenStreetMap.';

export const T = {
  en: {
    lang: 'Español',
    kicker: 'El Soberbio, Uruguay River',
    title: 'One Place, Every Eye',
    lede: 'El Soberbio sits on the Uruguay River, between Argentina and Brazil. When the river passes thirteen metres, families in the low neighbourhoods leave their homes. This is what each open satellite product sees on this bend of the river, and what it does not.',
    status: 'Frame of 14 by 12 km. Data as of November 2026.',
    footer: `<h2>Who and how</h2>
      <p><b>Who.</b> Raimundo Elías Gómez, anthropologist. CONICET / Facultad de Humanidades y Ciencias Sociales, Universidad Nacional de Misiones. In 2021 I coordinated the mapping of Indigenous community lands in Misiones for the national survey. That knowledge exists and it is not mine to publish.</p>
      <p><b>How.</b> The tests are from 2026. The code, written with AI coding agents, and the data are open. No note has yet been checked by anyone other than its author, and a note cannot yet be added from this page.</p>
      <p><b>Sources.</b> ${SOURCES}</p>
      <p><b>Contact.</b> If you live here and something does not match what you saw: <a href="mailto:nealab@spatia.ar">nealab@spatia.ar</a>.</p>
      <p><a href="https://eliasgomez.netlify.app/lab/radar-el-soberbio/">The river rose sixteen metres and the radar saw less water</a> · <a href="https://github.com/debianalt/un-lugar">Code and data</a> · <a href="https://spatia.ar">Spatia</a></p>`,
    s: {
      radar: {
        num: '01 · Radar',
        h: 'In {kept} radar passes there was one flood, and the radar saw less water',
        p: [
          'Sentinel-1 is the open radar most flood maps rely on, because it sees through cloud. Between 2015 and 2026 it passed {kept} times over this corridor with good coverage and a reading of the gauge at the port within 48 hours.',
          'With the river between 0 and 12 m, the water it detects stays near {median} hectares: it is the river itself. Only {above} of the {kept} passes found the river above the evacuation level of 13 m. It was on {floodDate}, at {floodH} m, and it detected {floodW} hectares, less than on an ordinary day.',
          'The cause is not established. The banks are steep and covered with forest, and the water may rise under the trees, where the signal of this radar does not reach. NISAR, a radar built to see under forest, did not confirm it either in two rises of the river in October 2026.'
        ],
        fig: 'Water detected by Sentinel-1 against river height',
        sub: 'Each dot is one satellite pass. Hectares of open water in a 20 × 20 km corridor.',
        x: 'River height at the gauge (m)', y: 'Water detected (ha)',
        evac: 'evacuation level, 13 m', unseen: 'not observed: {above} pass in {years} years',
        tip: '{d}: river at {h} m, {w} ha of water detected',
        legend: 'Corridor of the radar passes (20 × 20 km)'
      },
      relief: {
        num: '02 · Relief',
        h: 'Four elevation models, one riverbank, {bankR} m apart',
        p: [
          'A flood map starts from a model of the terrain. Four global ones are open: FABDEM, Copernicus GLO-30, ALOS AW3D30 and MERIT. Two measure the surface, trees and roofs included; the other two try to remove them.',
          'On the map, darker cells are where the four disagree most. Within 300 m of the river, where people live, the median gap between the highest and the lowest is {bank} m, and in one cell in ten it passes {p90} m. It is a gap the size of the flood that forces an evacuation.'
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
        h: 'Thirty-eight years of satellite images did not see {never14} of these {reached14} hectares',
        p: [
          'The Global Surface Water record marks every 30 m cell where the Landsat satellites saw water at least once between 1984 and 2021. Floods here come with days of cloud, and those satellites do not see through it.',
          'In June 2014 the river passed 22 m, within that period. At {h14} m, a model built from the terrain and the gauge, adjusted with what the newspapers reported in six floods, reaches {reached14} hectares in this frame, the river included. In {never14} of them, {share14}, the record never saw water.',
          'The model is not the truth either. The newspapers say families leave from 12 or 13 m, and the model starts reaching homes at 15 m. In the orange area the model says water and the satellite never saw it; which of the two is wrong in each cell cannot be known without someone who was there.'
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
          'Forest Typology 2020 (ForTy), from Google DeepMind, Google Research, WRI and IIASA, and MapBiomas classify the same year, 2020.',
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
          'Mbyá Guaraní families fish this river and sell along the coast road. The official registers of Indigenous communities do not place them here: three public lists count different numbers of communities for the province and none records where people work.'
        ],
        box: [
          'What the communities know is not shown.',
          'It stays empty until a community council decides what may be shown and at what precision. That knowledge is not kept here: it stays in tools the community controls, and only what the community decides to publish leaves them.'
        ],
        blanks: 'Three kinds of blank',
        blank: { unseen: 'dots: the sensor passed and did not see, or never passed', outside: 'hatching: the product ends, in space or in time', withheld: 'dashes: the knowledge exists and is kept back by decision' },
        legend: 'Kept back by decision. The frame holds no data.'
      },
      notes: {
        num: '06 · Annotations',
        h: 'Four kinds of statement, kept apart',
        p: [
          'Every note says what kind of statement it is, where it comes from and who checked it. The situated notes are, for now, what the newspapers reported of what residents and firefighters saw.'
        ],
        reg: { measured: 'Measured', interpreted: 'Interpreted', situated: 'Situated', speculated: 'Speculated' },
        regHelp: { measured: 'an instrument reading', interpreted: 'a reading of the data by someone', situated: 'what people in the place saw or said', speculated: 'a guess nobody has tested' },
        who: { author: 'the author', 'nobody yet': 'nobody yet', 'nobody independent yet': 'nobody but the author' },
        review: 'How it was checked', by: 'Checked by', source: 'Source',
        legend: 'Annotations by kind of statement'
      }
    }
  },
  es: {
    lang: 'English',
    kicker: 'El Soberbio, río Uruguay',
    title: 'Un lugar, todos los ojos',
    lede: 'El Soberbio está sobre el río Uruguay, entre la Argentina y Brasil. Cuando el río pasa los trece metros, las familias de los barrios bajos salen de sus casas. Acá se muestra qué ve cada producto satelital abierto en esta curva del río, y qué no ve.',
    status: 'Recuadro de 14 por 12 km. Datos a noviembre de 2026.',
    footer: `<h2>Quién y cómo</h2>
      <p><b>Quién.</b> Raimundo Elías Gómez, antropólogo. CONICET / Facultad de Humanidades y Ciencias Sociales, Universidad Nacional de Misiones. En 2021 coordiné en Misiones el mapeo de tierras de comunidades indígenas para el relevamiento nacional. Ese conocimiento existe y no me corresponde publicarlo.</p>
      <p><b>Cómo.</b> Las pruebas son de 2026. El código, escrito con agentes de programación de IA, y los datos son abiertos. Ninguna nota fue revisada todavía por alguien distinto de su autor, y desde esta página todavía no se puede sumar una.</p>
      <p><b>Fuentes.</b> ${SOURCES}</p>
      <p><b>Contacto.</b> Si vivís acá y algo de esto no coincide con lo que viste: <a href="mailto:nealab@spatia.ar">nealab@spatia.ar</a>.</p>
      <p><a href="https://eliasgomez.netlify.app/es/lab/radar-el-soberbio/">El río subió dieciséis metros y el radar vio menos agua</a> · <a href="https://github.com/debianalt/un-lugar">Código y datos</a> · <a href="https://spatia.ar">Spatia</a></p>`,
    s: {
      radar: {
        num: '01 · Radar',
        h: 'En {kept} pasadas de radar hubo una crecida, y el radar vio menos agua',
        p: [
          'Sentinel-1 es el radar abierto que usan casi todos los mapas de inundación, porque ve a través de las nubes. Entre 2015 y 2026 pasó {kept} veces sobre este corredor con buena cobertura y una lectura del hidrómetro del puerto a menos de 48 horas.',
          'Con el río entre 0 y 12 m, el agua que detecta se queda cerca de {median} hectáreas: es el río mismo. Sólo {above} de las {kept} pasadas encontró el río por encima de la cota de evacuación de 13 m. Fue el {floodDate}, con {floodH} m, y detectó {floodW} hectáreas, menos que un día cualquiera.',
          'La causa no está establecida. Las barrancas son empinadas y tienen monte, y es posible que el agua suba bajo los árboles, donde la señal de este radar no llega. NISAR, un radar hecho para ver bajo el monte, tampoco lo confirmó en dos subidas del río de octubre de 2026.'
        ],
        fig: 'Agua detectada por Sentinel-1 según la altura del río',
        sub: 'Cada punto es una pasada del satélite. Hectáreas de agua abierta en un corredor de 20 × 20 km.',
        x: 'Altura del río en el hidrómetro (m)', y: 'Agua detectada (ha)',
        evac: 'cota de evacuación, 13 m', unseen: 'sin observar: {above} pasada en {years} años',
        tip: '{d}: río en {h} m, {w} ha de agua detectada',
        legend: 'Corredor de las pasadas de radar (20 × 20 km)'
      },
      relief: {
        num: '02 · Relieve',
        h: 'Cuatro modelos de elevación, una barranca, {bankR} m de diferencia',
        p: [
          'Un mapa de inundación parte de un modelo del terreno. Hay cuatro globales y abiertos: FABDEM, Copernicus GLO-30, ALOS AW3D30 y MERIT. Dos miden la superficie, con los árboles y los techos incluidos; los otros dos intentan quitarlos.',
          'En el mapa, las celdas más oscuras son donde los cuatro discrepan más. A menos de 300 m del río, donde vive la gente, la diferencia mediana entre el más alto y el más bajo es de {bank} m, y en una celda de cada diez pasa los {p90} m. Es una diferencia del tamaño de la crecida que obliga a evacuar.'
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
        h: 'Treinta y ocho años de imágenes satelitales no vieron {never14} de estas {reached14} hectáreas',
        p: [
          'El registro Global Surface Water marca cada celda de 30 m donde los satélites Landsat vieron agua al menos una vez entre 1984 y 2021. Acá las crecidas llegan con días de nubes, y esos satélites no ven a través de ellas.',
          'En junio de 2014 el río pasó los 22 m, dentro de ese período. A {h14} m, un modelo hecho con el terreno y el hidrómetro, ajustado con lo que publicaron los diarios en seis crecidas, alcanza {reached14} hectáreas en este recuadro, con el río incluido. En {never14} de ellas, el {share14}, el registro nunca vio agua.',
          'El modelo tampoco es la verdad. Los diarios dicen que las familias salen desde los 12 o 13 m, y el modelo empieza a alcanzar viviendas a los 15 m. En el área naranja el modelo dice agua y el satélite nunca la vio; cuál de los dos se equivoca en cada celda no se sabe sin alguien que haya estado ahí.'
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
          'Forest Typology 2020 (ForTy), de Google DeepMind, Google Research, WRI e IIASA, y MapBiomas clasifican el mismo año, 2020.',
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
          'Hay familias mbyá guaraní que pescan en este río y venden a la vera de la ruta costera. Los registros oficiales de comunidades indígenas no las ubican acá: tres listas públicas cuentan cantidades distintas de comunidades en la provincia y ninguna registra dónde trabaja la gente.'
        ],
        box: [
          'Lo que saben las comunidades no se muestra.',
          'Queda vacía hasta que un consejo comunitario decida qué se puede mostrar y con qué precisión. Ese conocimiento no se guarda acá: queda en herramientas que controla la comunidad, y de ahí sale sólo lo que ella decida publicar.'
        ],
        blanks: 'Tres clases de blanco',
        blank: { unseen: 'punteado: el sensor pasó y no vio, o nunca pasó', outside: 'rayado: el producto termina, en el espacio o en el tiempo', withheld: 'guiones: el conocimiento existe y se guarda por decisión' },
        legend: 'Guardado por decisión. El recuadro no tiene datos.'
      },
      notes: {
        num: '06 · Anotaciones',
        h: 'Cuatro clases de afirmación, separadas',
        p: [
          'Cada nota dice qué clase de afirmación es, de dónde sale y quién la revisó. Las notas situadas son, por ahora, lo que publicaron los diarios sobre lo que vieron vecinos y bomberos.'
        ],
        reg: { measured: 'Medido', interpreted: 'Interpretado', situated: 'Situado', speculated: 'Especulado' },
        regHelp: { measured: 'la lectura de un instrumento', interpreted: 'una lectura de los datos hecha por alguien', situated: 'lo que vio o dijo la gente del lugar', speculated: 'una conjetura que nadie probó' },
        who: { author: 'el autor', 'nobody yet': 'nadie todavía', 'nobody independent yet': 'nadie más que el autor' },
        review: 'Cómo se revisó', by: 'Revisó', source: 'Fuente',
        legend: 'Anotaciones por clase de afirmación'
      }
    }
  }
};
