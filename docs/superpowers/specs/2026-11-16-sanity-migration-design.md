# Migración de Strapi a Sanity — Portfolio Admin

**Fecha:** 2026-11-16
**Estado:** **aprobado por Victor** el 2026-11-16
**Revisión:** pasó por un revisor independiente el 2026-11-16. Sus hallazgos están
integrados; los cambios respecto al primer borrador se listan en "Correcciones tras la
revisión" al final.

## Intención y por qué

El portafolio se sirve hoy de un backend Strapi 5.50.1 autoalojado. Strapi retiró sus
planes gratuitos, así que mantener el sitio implica pagar por alojar un servidor Node
y su base de datos, o dejarlo caer.

Sanity cubre el mismo rol sin servidor propio: el contenido vive en su Content Lake
(API + CDN alojados por ellos) y el panel de administración es una app estática que se
despliega gratis en `*.sanity.studio`. El plan gratuito admite 10.000 documentos y 20
asientos; este proyecto usa 68 documentos y 1 asiento.

El objetivo real no es "cambiar de CMS", es **eliminar la necesidad de alojar y pagar
un backend** sin perder el panel de administración que da nombre al proyecto.

## Objetivos

1. El sitio funciona igual que el Strapi **local**: mismas secciones, mismo contenido,
   **mismo orden**, mismos saltos de línea, mismos estados de carga y error. La línea base
   es el entorno local, no producción, porque producción está caída (ver "Estado actual de
   producción").
2. **El sitio en producción vuelve a mostrar contenido.** Hoy no lo hace.
3. Cero infraestructura de pago. Plan gratuito de Sanity, Studio desplegado gratis.
4. El contenido editable desde un panel web, como ahora.
5. Los tipos de TypeScript se **generan** desde el esquema y las queries (`sanity typegen`),
   no se escriben a mano.
6. El contenido existente en inglés se migra íntegro, incluidas las 45 imágenes.
7. Se introduce Vitest + React Testing Library, que hoy no existen (aprobado por Victor).

## Estado actual de producción

Verificado el 2026-11-16:

- `https://vgdeveloper.dev/` responde **HTTP 200** y sirve el HTML (`<title>Victor Reyes |
  Portfolio</title>`).
- Su bundle apunta a `https://generous-flower-e9bdeecb72.strapiapp.com`, el backend de
  Strapi Cloud.
- Ese host **resuelve por DNS pero falla el handshake TLS**. El proyecto de Strapi Cloud ya
  no se sirve.

Conclusión: **el sitio publicado está roto**. Carga el armazón y cada sección muestra su
`SectionError`. Esto tiene tres consecuencias para el plan:

1. La migración no es preventiva, es una **reparación**. No hay riesgo de "romper
   producción": ya está roto.
2. "Igual que hoy" se juzga contra el Strapi local, que sí funciona.
3. **`backend/.tmp/data.db` es la única copia viva del contenido.** Strapi Cloud ya no está
   para recuperarlo. La tarea 0 pasa de prudente a urgente.

## No objetivos

- **Multiidioma.** El sitio se queda solo en inglés. El contenido duplicado en `es-HN`
  se descarta. Ver "Camino futuro al español" para qué significa esto concretamente.
- **Rediseño visual.** No se toca CSS ni maquetación.
- **Hacer funcionar el formulario de contacto.** Hoy no envía a ningún sitio
  (`<form action="">`); sigue igual.
- **Visual Editing / Presentation tool** de Sanity. Valor bajo para un portafolio de una
  sola página; añade complejidad.
- **Portable Text.** Ver "Conversiones de tipo".

## Anti objetivos

Cosas que harían fracasar la migración aunque técnicamente funcionara:

- Que el sitio quede funcionando pero el panel no sirva para editar cómodamente
  (por ejemplo, 4 *singletons* apareciendo como listas vacías donde hay que crear un
  documento a mano).
- Que los tipos vuelvan a escribirse a mano y se desincronicen del esquema, que es el
  problema que ya existe hoy: [`types.ts:38`](../../../frontend/src/types/types.ts) declara
  `designProperty`, un campo que no existe en el esquema de Strapi ni se usa en ningún
  componente.
- Que quede un paso manual no documentado sin el cual el sitio no arranca.
- **Que se pierda información que no se puede reconstruir.** El orden curado de las
  tecnologías y la base de datos de Strapi entran en esta categoría. Ver "Restricciones".

## Restricciones

| Restricción | Origen |
|---|---|
| Plan gratuito ⇒ el dataset debe ser **público** | Límite del plan. Aceptable: el contenido de un portafolio es público por definición. |
| Las transformaciones de imagen no funcionan en SVG | Documentación oficial: el pipeline solo transforma JPEG, PNG, WebP, PJPG, TIFF, AVIF y GIF. **36 de los 45 assets son SVG.** |
| Tres campos tienen **saltos de línea significativos** | `index.css:499`, `:673` y `:1270` aplican `white-space: pre-line`. El contenido real los usa: `"Hi, I'm Victor Reyes\nFullstack Developer"`, `"UI/UX\nDesign"`. Verificado. |
| El orden visible de 4 tipos **no está en ningún campo** | Verificado: el orden de las tecnologías vive en `technologies_category_lnk.technologie_ord` y **no** coincide con el orden de `id` (posición 10 → id 54, 11 → id 56, 12 → id 59). Es curado a mano. |
| La base de datos y los uploads **no están en git** | `backend/.gitignore` ignora `.tmp` (línea 68) y `public/uploads/*` (línea 83). Los 68 documentos y los 45 archivos existen solo en el working tree. |
| Los orígenes del navegador deben estar en la lista CORS | Requisito de Sanity, incluso para lectura pública (`--no-credentials`). |
| `sanity-typegen.json` está deprecado | La configuración de typegen va en `sanity.cli.ts`. |
| `frontend/tsconfig.app.json` tiene `include: ["src"]` | Los tipos generados deben salir **dentro** de `src/`, o habría que tocar el tsconfig. |
| Frontend usa pnpm, Vite 7, React 19 | Estado actual del repo. |
| Strapi debe poder arrancar localmente durante la migración | El script lee el contenido por su API REST. |

## Enfoques considerados

### A — Diff mínimo: GROQ imita la forma de Strapi

Las queries proyectan alias (`"id": _id`, `"cover": {"url": ...}`) para que
`types.ts` y los 10 componentes queden intactos.

- **A favor:** riesgo casi nulo, diff pequeñísimo.
- **En contra:** arrastra los *Strapi-ismos* para siempre (`documentId`, anidamientos
  artificiales) y mantiene los tipos escritos a mano, que ya se desincronizaron una vez.

### B — Formas nativas de Sanity + typegen  ← **elegido**

Las queries devuelven la forma natural de Sanity y los tipos se generan desde el
esquema. Se reescribe `types.ts` y se ajustan ~15 puntos en componentes.

- **A favor:** el compilador detecta cualquier cambio de esquema. Elimina la clase de
  error que ya existe en el repo. Código que se entiende sin conocer Strapi.
- **En contra:** diff mayor, y hay que tener cuidado de no romper los estados de carga
  y error que ya están afinados por sección.

### C — Monorepo pnpm con paquete de tipos compartido

`packages/types` compartido entre Studio y frontend, con workspaces en la raíz.

- **Descartado:** resuelve la desincronización de tipos, pero `sanity typegen` ya la
  resuelve sin montar tooling de workspaces. Para 12 tipos que cambian poco, el coste
  de mantenimiento no se justifica.

**Decisión: B.** Elegido por Victor. El argumento decisivo fue el `designProperty`
fantasma: los tipos a mano ya fallaron, así que generarlos es el cambio que aporta valor
más allá de sustituir un CMS por otro.

## Arquitectura resultante

```
Portfolio Admin/
├── frontend/            Vite + React 19 (sin cambios de stack)
│   └── src/
│       ├── lib/sanity.ts         cliente
│       ├── lib/image.ts          helper de URLs de imagen (consciente de SVG)
│       ├── lib/queries.ts        las 10 queries GROQ con defineQuery()
│       ├── hooks/useSanity.ts    sustituye a useStrapi
│       └── sanity.types.ts       GENERADO por typegen, versionado
└── studio/              Sanity Studio (antes backend/)
    ├── schemaTypes/
    │   ├── documents/   12 tipos de documento
    │   └── objects/     8 tipos de objeto
    ├── scripts/migrate-from-strapi.ts
    ├── sanity.config.ts
    └── sanity.cli.ts    incluye la config de typegen
```

`backend/` se elimina por completo. No hay servidor que ejecutar: el contenido vive en
el Content Lake de Sanity y `studio/` es solo el panel de administración.

Se sigue el patrón "monorepo" que recomienda la documentación de Sanity: cada app
gestiona sus propias dependencias, sin tooling de workspaces en la raíz.

## Modelo de contenido

### Documentos

| Strapi | Tipo | Sanity | Notas |
|---|---|---|---|
| `biography` | singleType | `biography` | singleton, `_id: "biography"`. Solo locale `en`. |
| `contact` | singleType | `contact` | singleton, `_id: "contact"` |
| `footer` | singleType | `footer` | singleton, `_id: "footer"` |
| `header` | singleType | `header` | singleton, `_id: "header"` |
| `project` | collection | `project` | 4 docs. **+ campo `order` nuevo.** |
| `qualification` | collection | `qualification` | 6 docs. Ya tiene `order`. |
| `qualification-type` | collection | `qualificationType` | 2 docs. Ya tiene `order`. |
| `section-title` | collection | `sectionTitle` | 6 docs. Ya tiene `order`. |
| `service` | collection | `service` | 4 docs. **+ campo `order` nuevo.** |
| `technologie` | collection | `technology` | 34 docs. **+ campo `order` nuevo.** Se corrige el typo. |
| `technology-categorie` | collection | `technologyCategory` | 5 docs. Ya tiene `order`. Se corrige el typo. |
| `testimonial` | collection | `testimonial` | 3 docs. **+ campo `order` nuevo.** |

Los *singletons* se implementan con `_id` fijo y se exponen en el Studio mediante
`structure` personalizada, de forma que el editor abra el documento directamente en
lugar de ver una lista. Sin esto se incurre en uno de los anti objetivos.

### El campo `order` nuevo: por qué y de dónde sale

`service`, `project`, `testimonial` y `technology` no tienen campo de orden en Strapi, y
ninguna de sus queries ordena. Hoy el orden que ve el visitante es el que devuelve la base
de datos por accidente. En GROQ sin `order()` el orden **no está garantizado**, así que sin
este campo el Objetivo 1 se incumple.

El caso crítico es `technology`: su orden está curado a mano en
`technologies_category_lnk.technologie_ord` y no se puede derivar de nada más. Si se borra
`backend/` sin registrarlo, se pierde para siempre.

De dónde se rellena cada uno:

- **`technology`** → de `technologie_ord` de la tabla puente, por categoría.
- **`service`, `project`, `testimonial`** → de la secuencia de `id` de Strapi, que es lo
  que produce el orden visible actual.

Las cuatro queries afectadas añaden `| order(order asc)`. Beneficio colateral: el orden
pasa a ser editable desde el panel, que hoy no lo es.

### Objetos (antes "components" de Strapi)

| Strapi | Sanity | Campos |
|---|---|---|
| `home.personal-info` | `personalInfo` | `title`, `description` (**`text`**) |
| `home.about` | `about` | `title`, `description` (`text`) |
| `home.social-media` | `socialMediaLink` | `icon`, `url` |
| `links.nav-links` | `navLink` | `slug`, `icon`, `label` |
| `contact.contact-info` | `contactInfo` | `label`, `value`, `url` |
| `contact.contact-form` | `contactFormField` | `label`, `placeholder`, `inputType`, `name`, `slug`, `longText` |
| `contact.talk-to-me` | `talkToMe` | `icon`, `title`, `contactInfo[]` |
| `contact.write-me` | `writeMe` | `icon`, `title`, `fields[]` |

`type` se renombra a `inputType` en `contactFormField`: un campo llamado `type` junto al
`_type` de Sanity confunde a la lectura y a las herramientas.

### Conversiones de tipo

| Strapi | Sanity | Razón |
|---|---|---|
| `richtext` → **`text`** en `biography.presentation`, `service.title`, `personalInfo.description` | `text` | **Nunca `string`.** Los tres se renderizan en elementos con `white-space: pre-line` y su contenido tiene saltos de línea reales. Un input de una línea en el Studio se los comería. |
| `richtext` → `text` en `testimonial.description` | `text` | Texto largo, aunque no dependa de `pre-line`. |
| `uid` (`sectionTitle.key`, `technologyCategory.slug`) | `slug` | Equivalente nativo. En GROQ se proyecta `key.current`. |
| `enumeration` (`technology.level`) | `string` + `options.list` | `['Basic','Intermediate','Advanced']`, `initialValue: 'Basic'` |
| `media` (3 campos) | `image` con `hotspot: true` + `alt` | Ver abajo. |
| `integer` (`order`) | `number` | Se mantiene; la ordenación se hace en la query. |
| `relation manyToOne` | `reference` | `qualification.qualificationType`, `technology.category` |
| `relation oneToMany` (lado inverso) | **no existe como campo** | Se resuelve en GROQ con `references(^._id)`. |

Ningún campo pasa a Portable Text. Los cuatro `richtext` de Strapi se renderizan hoy como
string plano; convertirlos sería trabajo sin beneficio.

### El campo `alt`

Strapi ya tiene `alternativeText` escrito para las 9 imágenes raster y **vacío para los 36
SVG** (verificado). El esquema de Sanity lleva `alt` **opcional**, y:

- el script migra el `alternativeText` existente;
- los componentes leen `image.alt` **con fallback al texto que hoy está hardcodeado** en el
  JSX.

Así no se pierde ningún `alt` actual, no hay que escribir 34 textos a mano, y el campo lo
consume alguien — que es lo que lo distingue de un `designProperty`.

### Dos cambios de forma deliberados

**1. La *dynamic zone* `Contact` desaparece.** En Strapi admite `talk-to-me` y `write-me`,
pero en la práctica siempre contiene exactamente uno de cada, en orden fijo, y el frontend
los lee por posición: `Contact[0]`, `Contact[1]`
([`ContactForm.tsx:57`](../../../frontend/src/sections/components/ContactForm.tsx)). Eso se
rompe en silencio si alguien los reordena en el panel.

Pasan a ser dos campos explícitos del singleton `contact`: `talkToMe` y `writeMe`. Se pierde
la capacidad de reordenar o añadir más bloques, que nunca se usó, y se gana que el acceso
sea por nombre. El HTML renderizado es idéntico.

**2. Las relaciones inversas se resuelven en la query.** Sanity no tiene campo inverso.
La forma que recibe el frontend no cambia:

```groq
*[_type == "qualificationType"] | order(order asc) {
  title, icon,
  "qualifications": *[_type == "qualification" && references(^._id)]
    | order(order desc) { title, institution, dateInfo }
}
```

## Camino futuro al español

El primer borrador decía que el esquema se nombraría "de forma que añadir español después
sea agregar campos". Concretamente, la decisión es:

**Nombres de campo planos en inglés, sin sufijos de idioma.** No se escribe `titleEn`.

Si más adelante hace falta español, el camino es el plugin oficial
`@sanity/document-internationalization`, que trabaja a nivel de **documento**: duplica el
documento por idioma y no exige renombrar ni un campo. Es decir, la mejor preparación para
el español es no preparar nada hoy. Sufijar desde el día uno encarecería el trabajo actual
para ahorrar algo que ese plugin ya resuelve.

## Capa de datos del frontend

### Archivos nuevos

- **`src/lib/sanity.ts`** — `createClient({ projectId, dataset, apiVersion, useCdn: true, perspective: 'published' })`
- **`src/lib/image.ts`** — helper de URL. **Debe detectar SVG**: para `mimeType === 'image/svg+xml'`
  devuelve la URL cruda del asset, porque el pipeline no transforma SVG y 36 de los 45
  assets lo son. Para JPG/PNG usa `@sanity/image-url` con ancho explícito.
- **`src/lib/queries.ts`** — las 10 queries con `defineQuery()` del paquete `groq`.
  typegen solo detecta queries asignadas a una variable con `groq` o `defineQuery`, y los
  nombres deben ser únicos en todo el proyecto o typegen los sobrescribe en silencio.
- **`src/hooks/useSanity.ts`** — sustituye a `useStrapi`. **Mantiene la firma de salida**
  `{ data, loading, error, refetch }` para no tocar los componentes más de lo necesario.
- **`src/sanity.types.ts`** — generado. Va dentro de `src/` por el `include: ["src"]` del
  tsconfig. Se versiona en git (opción A de la documentación de Sanity): el repo es de una
  persona, no hay conflictos de merge que temer y el build no necesita ejecutar typegen.

### Archivos que se eliminan o recortan

- `src/lib/strapi.ts` y `src/hooks/useStrapi.ts` — se eliminan.
- `src/utils/constants.ts` — se eliminan `buildQuery` y las 10 queries REST.
  **Se conservan** `DARK_THEME_CLASS`, `ICON_THEME_CLASS` y `getInitialIsDark`, que no
  tienen nada que ver con el CMS.
- `src/types/types.ts` — se queda solo con lo que no describe contenido: `SectionKey`,
  `SectionProps`, `UseSanityResult`. Todo lo demás viene de `sanity.types.ts`.
  `designProperty` desaparece.
- `main.tsx` — el prefetch de `PORTFOLIO_QUERIES` se mantiene tal cual (es lo que evita el
  *waterfall* de dos niveles); solo cambia la `queryKey` de `["strapi", q]` a `["sanity", q]`.

### Dependencias

- Se añaden: `@sanity/client`, `@sanity/image-url`, `groq`; `vitest`,
  `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Se eliminan: `qs`, `@types/qs`.

### Variables de entorno

`VITE_SANITY_PROJECT_ID` y `VITE_SANITY_DATASET`. **Desaparece el token de lectura.** Ambos
valores son públicos por diseño y no son secretos. Se documentan en un `.env.example`
versionado, que hoy no existe en el frontend.

## Tarea 0 — Copia de seguridad de Strapi (obligatoria, antes de todo)

El primer borrador afirmaba que borrar `backend/` en el último commit permitía volver atrás
revirtiendo un commit. **Era falso.** `backend/.gitignore` ignora `.tmp` y
`public/uploads/*`: los 68 documentos y los 45 archivos existen únicamente en el working
tree. `rm -rf backend/` destruye la única copia que hay, y una etiqueta de git no la salva.

Antes de tocar nada:

1. `strapi export` a un tarball, más copia literal de `backend/public/uploads/`.
2. Se guarda **fuera del repo**, en `~/Backups/portfolio-strapi-2026-11-16/`.
   No en el directorio temporal de la sesión, que no es duradero.
3. Se verifica que el tarball se puede abrir antes de continuar.

Esta tarea no depende de ninguna decisión pendiente y puede ejecutarse de inmediato.

## Migración de contenido

**Ruta elegida por Victor:** script propio con token de escritura, frente a hacerlo por el
MCP o por `sanity dataset import`. La razón es que un script es re-ejecutable, tiene
pre-vuelo y se puede testear, y en una migración de 68 documentos con referencias y 45
assets eso importa más que ahorrar un paso manual.

Script `studio/scripts/migrate-from-strapi.ts`, ejecutado una sola vez con Strapi
corriendo en local. Lee el token de `studio/.env.local`.

1. **Pre-vuelo:** cuenta lo publicado en Strapi y lo compara con la tabla de abajo. Si no
   cuadra, aborta antes de escribir nada.
2. **Assets:** sube los 45 originales de `backend/public/uploads` (2,7 MB) y construye un
   mapa `URL de Strapi → _id de asset de Sanity`, arrastrando `alternativeText`. Se
   ignoran las variantes generadas por Strapi (`large_`, `small_`, `thumbnail_`).
3. **Orden:** lee `technologies_category_lnk.technologie_ord` para `technology` y la
   secuencia de `id` para `service`, `project` y `testimonial`.
4. **Documentos, dos pasadas:** primero los documentos sin referencias, luego los que
   referencian. `_id` **deterministas** derivados del `documentId` de Strapi, para que el
   script sea idempotente y se pueda re-ejecutar sin duplicar.
5. **Solo inglés:** `biography` se lee con `locale=en`; el `es-HN` se descarta.
6. **Verificación:** recuento final por tipo, comprobación de que cada referencia resuelve,
   que cada imagen devuelve 200, y que los saltos de línea sobrevivieron.

### Recuento esperado

| Tipo | Docs |
|---|---|
| `biography`, `contact`, `footer`, `header` | 1 cada uno |
| `project` | 4 |
| `qualification` | 6 |
| `qualificationType` | 2 |
| `sectionTitle` | 6 |
| `service` | 4 |
| `technology` | 34 |
| `technologyCategory` | 5 |
| `testimonial` | 3 |
| **Total** | **68 documentos + 45 assets** |

Verificado contra `backend/.tmp/data.db` por el revisor, tipo por tipo. Las claves de
`sectionTitle` son `skills`, `qualification`, `services`, `projects`, `testimonial`,
`contact`, y coinciden con `SECTION_COMPONENTS`.

## Despliegue y configuración

1. Proyecto Sanity **nuevo** en la organización existente (`oHNPn8dSJ`), que ya contiene
   dos proyectos de 2022 (`beige-antelope`, `scenery-app`) sin relación con esto. El plan
   gratuito no limita el número de proyectos. Dataset `production`, **público**.
2. CORS, ambos con `--no-credentials`: `http://localhost:5173` para desarrollo y
   `https://vgdeveloper.dev` para producción.
3. Studio: `npx sanity deploy` → **`vgdeveloper.sanity.studio`**. Si el hostname está
   tomado, la alternativa es `victor-reyes-portfolio`.
4. Frontend: sin cambios de plataforma de despliegue. Hay que sustituir
   `VITE_STRAPI_HOST` y `VITE_STRAPI_TOKEN` por `VITE_SANITY_PROJECT_ID` y
   `VITE_SANITY_DATASET` en el panel del proyecto y volver a desplegar. **El frontend está
   en Netlify** (confirmado por Victor; no hay `netlify.toml` en el repo, así que la
   configuración de build vive en el panel). El MCP de Netlify está conectado en esta
   sesión, así que las variables de entorno y el redespliegue se pueden hacer desde aquí.

### Los dos pasos manuales de Victor

Son los únicos del plan y quedan documentados, para no incurrir en el anti objetivo del
paso manual oculto:

1. `npx sanity login` una vez en `studio/`. La sesión OAuth del MCP no sirve para la CLI, y
   `sanity deploy` la necesita.
2. Crear un **token de escritura** en sanity.io/manage y ponerlo en `studio/.env.local`
   (ignorado por git). Lo consume el script de migración; no se usa en el frontend.

## Modelo de ejecución

Por petición explícita de Victor, la implementación se ejecuta con agentes separados por
rol, siguiendo `superpowers:subagent-driven-development`. Cada tarea del plan pasa por:

1. **Implementador** — escribe el código de esa tarea y nada más.
2. **Revisor** — agente nuevo, sin el contexto del implementador, que revisa contra el
   plan y este documento.
3. **Tests** — agente que escribe y ejecuta las pruebas de esa tarea.

La razón es de diagnóstico: en una migración larga, si algo se rompe, importa saber en qué
tarea y que el revisor no sea quien escribió el código.

Las pruebas que aportan valor aquí son cuatro: que las proyecciones GROQ devuelven la forma
que los componentes esperan; que cada sección renderiza con datos simulados y mantiene sus
estados de carga y error; que el helper de imágenes sirve SVG sin transformar y raster
transformado; y que el script de migración verifica recuentos, referencias y orden.

**Orden de las tareas**, pensado para que se pueda parar en cualquier punto con el sitio
funcionando: **copia de seguridad (tarea 0)** → Studio y esquemas → migración de contenido
→ capa de datos del frontend → componentes → despliegue → **y solo al final, en un commit
propio, borrar `backend/`**.

## Qué queda a criterio del implementador

- Reparto exacto de archivos dentro de `schemaTypes/documents/` y `schemaTypes/objects/`
  (convención kebab-case, un `const` exportado por archivo).
- Formato y organización interna de las queries GROQ.
- Granularidad de los tests más allá de los cuatro bloques indicados.
- Detalles de la `structure` del Studio, más allá del requisito de que los 4 singletons se
  abran directamente.
- Textos de `title`/`description` de los campos en el Studio.

## Riesgos conocidos

| Riesgo | Mitigación |
|---|---|
| SVG sin transformaciones (36 de 45 assets) | `src/lib/image.ts` detecta `mimeType` y sirve la URL cruda. Son iconos pequeños, ya optimizados. Cubierto por test. |
| Pérdida del orden curado de tecnologías | Campo `order` nuevo, rellenado desde `technologie_ord`. Cubierto por test. |
| Pérdida de los saltos de línea | Los tres campos afectados son `text`, no `string`. Cubierto por test. |
| Perder los estados de carga/error afinados por sección | Son parte de los objetivos y de los tests; el revisor los comprueba explícitamente. |
| typegen sobrescribe tipos en silencio con nombres duplicados | Nombres de query únicos y descriptivos, verificado por el revisor. |
| El script de migración se ejecuta a medias | `_id` deterministas ⇒ re-ejecutable sin duplicar. |
| **Destruir la única copia de los datos de Strapi** | Tarea 0, obligatoria y previa a todo. El `.gitignore` hace que git no sea red de seguridad, y Strapi Cloud ya no está para recuperar nada: el `data.db` local es la única copia que existe. |
| La configuración de build de Netlify vive solo en el panel, no en el repo | Se lee por el MCP de Netlify antes de tocar nada, y se anota en el plan. |
| Dataset público en el plan gratuito | El contenido ya es público. Nota de la documentación: los assets de un dataset son públicos **incluso en datasets privados**, así que el plan no cambia nada en esta dimensión. |

## Correcciones tras la revisión

1. **Añadido campo `order`** a `service`, `project`, `testimonial` y `technology`. El
   revisor detectó que el orden visible no está en ningún campo y que el de las tecnologías
   está curado a mano en una tabla puente. Verificado de forma independiente.
2. **Corregida la afirmación sobre volver atrás**, que era falsa, y añadida la tarea 0 de
   copia de seguridad.
3. **`text` en vez de `string`** para los tres campos con saltos de línea significativos,
   por `white-space: pre-line`. Verificado de forma independiente.
4. **Resuelto el campo `alt`**: opcional, migra `alternativeText`, los componentes lo leen
   con fallback al texto actual.
5. **Concretado el camino al español**: campos planos, y más adelante el plugin oficial de
   internacionalización por documento.
6. **Confirmado el estado de la cuenta de Sanity**: organización existente, dos proyectos
   viejos, se crea uno nuevo.
7. Nota del revisor resuelta en el diseño: `about.description` también pasa a `text` por
   compartir la clase CSS `.home__info-description`.

## Decisiones de Victor

Las tres preguntas abiertas quedaron resueltas el 2026-11-16:

1. **Ruta de migración:** script propio con token de escritura.
2. **Producción:** el sitio está publicado en `https://vgdeveloper.dev`, aunque roto. Ese es
   el origen CORS de producción.
3. **Hostname del Studio:** `vgdeveloper`. Interpretado a partir de su respuesta
   `https://vgdeveloper.dev/`, que no es un hostname válido de Studio (tiene que ser una
   etiqueta simple, sin protocolo ni puntos). **Pendiente de su confirmación**; no bloquea
   nada hasta la tarea de despliegue.

No quedan preguntas abiertas.
