# Migración de Strapi a Sanity — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sustituir el backend Strapi del portafolio por Sanity, dejando el sitio en
`https://vgdeveloper.dev` sirviendo contenido otra vez y el panel de administración en
`vgdeveloper.sanity.studio`.

**Architecture:** El contenido pasa al Content Lake de Sanity. `backend/` (Strapi) se
sustituye por `studio/` (Sanity Studio, que es solo el panel: no hay servidor que ejecutar).
El frontend Vite conserva su estructura, su React Query y sus estados de carga/error; cambian
la capa de datos (10 queries REST → 10 queries GROQ) y los tipos, que pasan a generarse con
`sanity typegen` en vez de escribirse a mano.

**Tech Stack:** Sanity Studio 6.23.0, `@sanity/client`, `@sanity/image-url`, `groq`, GROQ,
`sanity typegen`; frontend Vite 7 + React 19 + TanStack Query v5 + pnpm; Vitest +
React Testing Library (nuevos); Netlify para el frontend.

**Spec:** [`docs/superpowers/specs/2026-11-16-sanity-migration-design.md`](../specs/2026-11-16-sanity-migration-design.md)

## Global Constraints

- Dataset `production`, **público** (requisito del plan gratuito). El frontend lee **sin token**.
- **36 de los 45 assets son SVG.** El pipeline de imágenes de Sanity solo transforma JPEG,
  PNG, WebP, PJPG, TIFF, AVIF y GIF. Nunca se transforma un SVG.
- **`text`, nunca `string`**, en `biography.presentation`, `service.title`,
  `personalInfo.description` y `about.description`: sus saltos de línea se renderizan vía
  `white-space: pre-line` (`frontend/src/index.css:499`, `:673`, `:1270`).
- La configuración de typegen va en `studio/sanity.cli.ts`. **`sanity-typegen.json` está
  deprecado.**
- Los tipos generados se escriben en `frontend/src/sanity.types.ts` — **dentro de `src/`**,
  porque `frontend/tsconfig.app.json` tiene `include: ["src"]`. Se versionan en git.
- Toda query GROQ se asigna a una variable con `defineQuery()` y **nombre único en todo el
  proyecto**; typegen sobrescribe los duplicados en silencio.
- Campos de nombre **plano y en inglés**. Sin sufijos de idioma (`titleEn` no).
- Ningún campo pasa a Portable Text.
- `useSanity` mantiene la firma de salida `{ data, loading, error, refetch }`.
- CORS, ambos con `--no-credentials`: `http://localhost:5173` y `https://vgdeveloper.dev`.
- Hostname del Studio: `vgdeveloper`; alternativa si está tomado: `victor-reyes-portfolio`.
- Objetivo de migración: **68 documentos + 45 subidas de asset**, que producen **44
  documentos `sanity.imageAsset`**: `project1_1b9650e9c9.jpg` y `project1_f2b31920e8.jpg` son
  byte a byte idénticos (sha1 `db6182b0e67e…`) y Sanity deduplica por sha1. El mapa
  `URL → assetId` sí tiene 45 entradas, dos de ellas al mismo asset. `_id` deterministas.
- **No se toca `frontend/src/index.css`** ni ninguna clase CSS.
- Se conservan `DARK_THEME_CLASS`, `ICON_THEME_CLASS` y `getInitialIsDark` de
  `frontend/src/utils/constants.ts`.
- `studio/` y `frontend/` usan **pnpm**, cada uno con sus dependencias (sin workspaces).
- Todo mensaje de commit termina con:
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`

## Review Focus

Clases de entrada que el diseño implica y que hay que cubrir explícitamente. Cada línea
tiene su test asignado a la tarea dueña del código.

1. **Un SVG llega al helper de imagen.** Debe devolver la URL cruda, sin parámetros de
   transformación. 36 de 45 assets. → Tarea 7.
2. **Una referencia inversa no resuelve** (una categoría sin tecnologías, un tipo de
   titulación sin titulaciones). `references()` devuelve `[]`; la sección debe renderizar
   vacía, no romper. → Tarea 8.
3. **`sectionTitle.key` con un valor que no está en `SECTION_COMPONENTS`.** Hoy
   `MainContent` hace `if (!Component) return null`. Debe seguir ignorándolo. → Tarea 8.
4. **Un campo opcional ausente** (`navLink.icon`, `contactInfo.url`, `image.alt`). Hoy el
   código usa `item?.url ? ... : null` y un `alt` fijo. No deben aparecer `ri-undefined`
   ni enlaces vacíos. → Tarea 8.
5. **Una query devuelve `null` o `[]`.** Deben aparecer los skeletons y `SectionError`, no
   una pantalla en blanco. → Tarea 8.

---

## Estructura de archivos

**Se crea:**

| Archivo | Responsabilidad |
|---|---|
| `studio/sanity.config.ts` | Configuración del Studio: projectId, dataset, schema, structure |
| `studio/sanity.cli.ts` | CLI + configuración de typegen apuntando a `../frontend` |
| `studio/structure.ts` | Los 4 singletons se abren directos, sin lista |
| `studio/schemaTypes/index.ts` | Exporta los 20 tipos |
| `studio/schemaTypes/objects/*.ts` | 8 tipos de objeto, uno por archivo |
| `studio/schemaTypes/documents/*.ts` | 12 tipos de documento, uno por archivo |
| `studio/scripts/migrate-from-strapi.ts` | Script de migración, un solo uso |
| `studio/scripts/lib/transform.ts` | Funciones puras de mapeo Strapi → Sanity (testeables) |
| `studio/scripts/lib/strapi-order.ts` | Lectura del orden curado desde SQLite |
| `frontend/src/lib/sanity.ts` | Cliente de Sanity |
| `frontend/src/lib/image.ts` | URLs y `alt` de imagen, consciente de SVG |
| `frontend/src/lib/queries.ts` | Las 10 queries GROQ |
| `frontend/src/hooks/useSanity.ts` | Hook de consumo sobre React Query |
| `frontend/src/sanity.types.ts` | **Generado** por typegen |

**Se modifica:** los 10 puntos de consumo del frontend (`MainContent.tsx`, `Header.tsx`,
`Footer.tsx`, y los 6 de `sections/components/`), `main.tsx`, `utils/constants.ts`,
`types/types.ts`, ambos `package.json`.

**Se elimina:** `frontend/src/lib/strapi.ts`, `frontend/src/hooks/useStrapi.ts`, y
`backend/` completo (última tarea).

---

### Task 1: Copia de seguridad de Strapi

Única copia viva del contenido: Strapi Cloud ya no responde y `.gitignore` excluye
`.tmp` y `public/uploads/*`. Nada más puede empezar antes que esto.

**Files:**
- Create: `~/Backups/portfolio-strapi-2026-11-16/` (fuera del repo)

**Interfaces:**
- Consumes: nada
- Produces: `~/Backups/portfolio-strapi-2026-11-16/strapi-export.tar.gz` y
  `~/Backups/portfolio-strapi-2026-11-16/uploads/` con 67 archivos

- [ ] **Step 1: Crear el directorio de respaldo**

```bash
mkdir -p ~/Backups/portfolio-strapi-2026-11-16
```

- [ ] **Step 2: Copiar la base de datos y los uploads en crudo**

Copia literal de `backend/.tmp/data.db` (2,2 MB) y de `backend/public/uploads/`
(67 archivos, 2,7 MB). Es la red de seguridad que no depende de que Strapi arranque.

- [ ] **Step 3: Exportar con la herramienta de Strapi**

Run: `cd backend && npx strapi export --no-encrypt --file ~/Backups/portfolio-strapi-2026-11-16/strapi-export`
Expected: termina sin error y crea `strapi-export.tar.gz`

- [ ] **Step 4: Verificar que el respaldo es legible y completo**

Run:
```bash
tar -tzf ~/Backups/portfolio-strapi-2026-11-16/strapi-export.tar.gz | head
ls ~/Backups/portfolio-strapi-2026-11-16/uploads | wc -l
sqlite3 ~/Backups/portfolio-strapi-2026-11-16/data.db "select count(*) from technologies"
```
Expected: el tar lista entradas sin error; 67 archivos; `68`

**No hay commit:** el respaldo vive fuera del repo a propósito.

---

### Task 2: Proyecto Sanity y andamiaje del Studio

**Files:**
- Create: `studio/package.json`, `studio/sanity.config.ts`, `studio/sanity.cli.ts`,
  `studio/.env.example`, `studio/.gitignore`, `studio/schemaTypes/index.ts`

**Interfaces:**
- Consumes: nada
- Produces: `projectId` real; `studio/schemaTypes/index.ts` exportando
  `export const schemaTypes: SchemaTypeDefinition[]` (vacío por ahora)

- [ ] **Step 1: Crear el proyecto y el dataset vía el MCP de Sanity**

Usar `create_project` (organización `oHNPn8dSJ`, nombre `portfolio`) y `create_dataset`
(`production`, **público**). Anotar el `projectId` devuelto: lo consumen las tareas 5, 7 y 9.

- [ ] **Step 2: Registrar los dos orígenes CORS**

Usar `add_cors_origin` para `http://localhost:5173` y `https://vgdeveloper.dev`, ambos
**sin credenciales**.

- [ ] **Step 3: Verificar que quedaron registrados**

Run: `cors_origins_list` (MCP)
Expected: los dos orígenes, ambos con `allowCredentials: false`

- [ ] **Step 4: Crear el token de escritura**

**Paso manual de Victor.** En sanity.io/manage → el proyecto nuevo → API → Tokens, crear un
token con permiso de **Editor** y guardarlo en `studio/.env.local` como
`SANITY_WRITE_TOKEN=…`. Lo consume el script de la tarea 5. No se usa en el frontend y no
entra en git.

Expected: `studio/.env.local` existe y está ignorado por git
(`git check-ignore studio/.env.local` devuelve la ruta).

- [ ] **Step 5: Andamiar `studio/` con pnpm**

`sanity` y `@sanity/vision` como dependencias; scripts `dev`, `build`, `deploy` y
`typegen` (`sanity schemas extract --force --enforce-required-fields && sanity typegen generate`).
**`schemas` en plural**: verificado empíricamente en sanity 6.23.0, es la forma canónica
que da el texto de ayuda. La documentación vigente usa ambas y la primera versión de este
plan decía `schema`, en singular.
`studio/.gitignore` debe ignorar `.env.local`, `node_modules`, `dist` y `schema.json`.

- [ ] **Step 6: Escribir `sanity.cli.ts` con la configuración de typegen**

`defineCliConfig` con `api: { projectId, dataset: 'production' }` y:

```ts
typegen: {
  enabled: true,
  path: '../frontend/src/**/*.{ts,tsx}',
  schema: 'schema.json',
  generates: '../frontend/src/sanity.types.ts',
  overloadClientMethods: true,
}
```

- [ ] **Step 7: Verificar que el Studio arranca**

Run: `cd studio && pnpm build`
Expected: build correcto con esquema vacío

- [ ] **Step 8: Commit**

```bash
git add studio/
git commit -m "feat(studio): andamiaje de Sanity Studio con typegen"
```

---

### Task 3: Tipos de objeto del esquema

**Files:**
- Create: `studio/schemaTypes/objects/{personal-info,about,social-media-link,nav-link,contact-info,contact-form-field,talk-to-me,write-me}.ts`
- Modify: `studio/schemaTypes/index.ts`
- Test: `studio/schemaTypes/__tests__/schema.test.ts`

**Interfaces:**
- Consumes: `schemaTypes` de la tarea 2
- Produces: los nombres de tipo `personalInfo`, `about`, `socialMediaLink`, `navLink`,
  `contactInfo`, `contactFormField`, `talkToMe`, `writeMe`. La tarea 4 los referencia por
  nombre.

Campos, según la tabla "Objetos" del diseño. Dos detalles que el diseño fija y el
implementador no debe decidir: `personalInfo.description` y `about.description` son **`text`**;
en `contactFormField` el campo de Strapi `type` se llama **`inputType`**.

- [ ] **Step 1: Instalar Vitest en el Studio y escribir el test que falla**

```ts
// studio/schemaTypes/__tests__/schema.test.ts
import { schemaTypes } from '../index'

const byName = (n: string) => schemaTypes.find((t) => t.name === n)

test('los 8 tipos de objeto están registrados', () => {
  for (const n of ['personalInfo','about','socialMediaLink','navLink',
                   'contactInfo','contactFormField','talkToMe','writeMe']) {
    expect(byName(n)).toBeDefined()
  }
})

test('las descripciones con saltos de línea son text, no string', () => {
  for (const n of ['personalInfo','about']) {
    const f = byName(n).fields.find((f) => f.name === 'description')
    expect(f.type).toBe('text')
  }
})

test('contactFormField usa inputType, no type', () => {
  const names = byName('contactFormField').fields.map((f) => f.name)
    expect(names).toContain('inputType')
    expect(names).not.toContain('type')
})
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

Run: `cd studio && pnpm vitest run schemaTypes/__tests__/schema.test.ts`
Expected: FAIL — `schemaTypes` está vacío

- [ ] **Step 3: Escribir los 8 tipos de objeto con `defineType`/`defineField`**

Un archivo por tipo, kebab-case, un `const` exportado por archivo. `talkToMe.contactInfo` y
`writeMe.fields` son `array` de `contactInfo` y `contactFormField` respectivamente.

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

Run: `cd studio && pnpm vitest run schemaTypes/__tests__/schema.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add studio/
git commit -m "feat(studio): tipos de objeto del esquema"
```

---

### Task 4: Tipos de documento del esquema y estructura del Studio

**Files:**
- Create: `studio/schemaTypes/documents/*.ts` (12 archivos), `studio/structure.ts`
- Modify: `studio/schemaTypes/index.ts`, `studio/sanity.config.ts`
- Test: `studio/schemaTypes/__tests__/documents.test.ts`

**Interfaces:**
- Consumes: los nombres de objeto de la tarea 3
- Produces: los nombres de tipo `biography`, `contact`, `footer`, `header`, `project`,
  `qualification`, `qualificationType`, `sectionTitle`, `service`, `technology`,
  `technologyCategory`, `testimonial`. Las tareas 5 y 7 los consumen.

Según la tabla "Documentos" del diseño. Lo que el diseño fija: los 4 singletons
(`biography`, `contact`, `footer`, `header`); el campo **`order` nuevo** en `service`,
`project`, `testimonial` y `technology`; `technology.level` como `string` con
`options.list: ['Basic','Intermediate','Advanced']` e `initialValue: 'Basic'`;
`sectionTitle.key` y `technologyCategory.slug` como `slug`; las imágenes con
`options: { hotspot: true }` y un campo `alt` **opcional**; `contact` con dos campos
explícitos `talkToMe` y `writeMe` (**no** un array: la dynamic zone desaparece).

- [ ] **Step 1: Escribir el test que falla**

```ts
test('los 12 tipos de documento están registrados', () => {
  for (const n of ['biography','contact','footer','header','project','qualification',
                   'qualificationType','sectionTitle','service','technology',
                   'technologyCategory','testimonial']) {
    expect(byName(n)).toBeDefined()
  }
})

test('los 4 tipos con order nuevo lo tienen como number', () => {
  for (const n of ['service','project','testimonial','technology']) {
    const f = byName(n).fields.find((f) => f.name === 'order')
    expect(f?.type).toBe('number')
  }
})

test('presentation y service.title son text, no string', () => {
  expect(field('biography','presentation').type).toBe('text')
  expect(field('service','title').type).toBe('text')
})

test('contact expone talkToMe y writeMe como campos, no como array', () => {
  const names = byName('contact').fields.map((f) => f.name)
  expect(names).toEqual(expect.arrayContaining(['talkToMe','writeMe']))
  expect(byName('contact').fields.find((f) => f.type === 'array')).toBeUndefined()
})

test('las tres imágenes llevan hotspot y alt opcional', () => {
  for (const [doc, fld] of [['biography','photo'],['project','cover'],['technology','icon']]) {
    const f = field(doc, fld)
    expect(f.type).toBe('image')
    expect(f.options.hotspot).toBe(true)
    expect(f.fields.find((x) => x.name === 'alt')).toBeDefined()
  }
})

test('las dos referencias apuntan al tipo correcto', () => {
  expect(field('qualification','qualificationType').to[0].type).toBe('qualificationType')
  expect(field('technology','category').to[0].type).toBe('technologyCategory')
})
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `cd studio && pnpm vitest run schemaTypes/__tests__/documents.test.ts`
Expected: FAIL

- [ ] **Step 3: Escribir los 12 tipos de documento**

- [ ] **Step 4: Escribir `structure.ts` y conectarlo en `sanity.config.ts`**

Los 4 singletons como `S.document().schemaType(x).documentId(x)` para que el editor abra el
documento directamente. Los 8 tipos de colección como listas normales.

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `cd studio && pnpm vitest run schemaTypes/`
Expected: PASS

- [ ] **Step 6: Extraer el esquema y comprobar que es válido**

Run: `cd studio && pnpm typegen`
Expected: genera `schema.json` y `../frontend/src/sanity.types.ts` sin error

- [ ] **Step 7: Commit**

```bash
git add studio/ frontend/src/sanity.types.ts
git commit -m "feat(studio): tipos de documento y estructura de singletons"
```

---

### Task 5: Script de migración

**Files:**
- Create: `studio/scripts/migrate-from-strapi.ts`, `studio/scripts/lib/transform.ts`,
  `studio/scripts/lib/strapi-order.ts`
- Test: `studio/scripts/lib/__tests__/transform.test.ts`,
  `studio/scripts/lib/__tests__/strapi-order.test.ts`

**Interfaces:**
- Consumes: los nombres de tipo de las tareas 3 y 4; el `projectId` de la tarea 2
- Produces:
  ```ts
  // transform.ts
  export function toSanityId(type: string, strapiDocumentId: string): string
  export const SINGLETON_IDS: Record<'biography'|'contact'|'footer'|'header', string>
  export function mapAssetReference(strapiUrl: string, assetMap: Map<string,string>): {_type:'image', asset:{_type:'reference', _ref:string}, alt?:string}
  // strapi-order.ts
  export function readTechnologyOrder(dbPath: string): Map<string, number>
  ```
  **Indexado por `document_id`, no por el `id` numérico**, porque es `documentId` lo que
  devuelve la API REST de Strapi. Lee con `node:sqlite`, disponible de forma nativa en el
  Node 22 de esta máquina: no hace falta añadir ninguna dependencia.

Las funciones de red (subida de assets, escritura de documentos) viven en
`migrate-from-strapi.ts` y **no se testean**; las puras viven en `lib/` y sí.

El script lee el token de escritura de `studio/.env.local` (`SANITY_WRITE_TOKEN`).

- [ ] **Step 1: Escribir los tests que fallan**

```ts
test('toSanityId es determinista y legible', () => {
  expect(toSanityId('technology', 'abc123')).toBe('technology-abc123')
  expect(toSanityId('technology', 'abc123')).toBe(toSanityId('technology', 'abc123'))
})

test('los singletons tienen _id fijo', () => {
  expect(SINGLETON_IDS.biography).toBe('biography')
})

test('readTechnologyOrder devuelve el orden curado, no el orden de id', () => {
  const order = readTechnologyOrder('../backend/.tmp/data.db')
  // Verificado en la base real. La tabla puente tiene 68 filas (borrador + publicado),
  // asi que hay que FILTRAR a publicadas. Borrador y publicado comparten document_id.
  // Posiciones 10-12 de "Frontend Development", ids publicados 55, 58 y 60:
  expect(order.get('sap51k3w7pqzl60dybv5ya58')).toBe(10) // Material UI
  expect(order.get('s3trc9bhijhiq82ibg9yedpb')).toBe(11) // Typescript
  expect(order.get('aqv4vuva7yekfrjmaxb37xwa')).toBe(12) // Postman
  expect(order.size).toBe(34)
})

test('el orden es por categoria, no global', () => {
  const order = readTechnologyOrder('../backend/.tmp/data.db')
  // 5 categorias con 12, 12, 3, 3 y 4 tecnologias: varias comparten la posicion 1.
  const ones = [...order.values()].filter((v) => v === 1)
  expect(ones).toHaveLength(5)
})

test('mapAssetReference falla fuerte si el asset no está en el mapa', () => {
  expect(() => mapAssetReference('/uploads/x.svg', new Map())).toThrow()
})
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `cd studio && pnpm vitest run scripts/`
Expected: FAIL

- [ ] **Step 3: Implementar `transform.ts` y `strapi-order.ts`**

`readTechnologyOrder` consulta `technologies_category_lnk` (columna `technologie_ord`).
`mapAssetReference` lanza en vez de devolver `undefined`: un asset ausente es un fallo de
migración, no un caso válido.

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `cd studio && pnpm vitest run scripts/`
Expected: PASS (4 tests)

- [ ] **Step 5: Implementar `migrate-from-strapi.ts`**

Orden de operaciones, según el diseño:
1. **Pre-vuelo:** contar lo publicado en Strapi por tipo y comparar con la tabla del diseño
   (68 documentos). Abortar sin escribir nada si no cuadra.
2. **Assets:** subir los 45 originales de `backend/public/uploads`, ignorando las **cuatro**
   familias de variantes que genera Strapi: `large_`, `small_`, `thumbnail_` y **`medium_`**.
   Verificado: excluyendo solo las tres primeras quedan 47 archivos; con `medium_` quedan
   exactamente 45, que es lo que dice la tabla `files`. Arrastra `alternativeText` y construye
   el mapa `URL de Strapi → assetId`.
3. **Orden:** `readTechnologyOrder` para `technology`; para `service`, `project` y
   `testimonial`, el **índice de la respuesta REST sin parámetro de sort**, que es literalmente
   lo que el sitio muestra hoy. No derivarlo de los `id` numéricos: mezclan borradores.
4. **Dos pasadas:** primero los documentos sin referencias, luego los que referencian.
5. `biography` solo con `locale=en`.

Escribe documentos publicados (no borradores). Idempotente por los `_id` deterministas.

- [ ] **Step 6: Commit**

```bash
git add studio/scripts/
git commit -m "feat(studio): script de migración desde Strapi"
```

---

### Task 6: Ejecutar la migración y verificar el contenido

Tarea de ejecución, no de código. Se separa porque un revisor puede rechazar el resultado
de la migración aun aprobando el script.

**Files:**
- Create: `studio/scripts/verify-migration.ts`

**Interfaces:**
- Consumes: el script de la tarea 5
- Produces: el dataset `production` poblado: 68 documentos, 45 subidas → 44 assets

**La API REST de Strapi exige token.** Verificado en `up_permissions`: el rol Público tiene
**0** permisos `find`, así que una petición sin credenciales devuelve 403. El script usa
`STRAPI_API_TOKEN` y, si no está, cae a `VITE_STRAPI_TOKEN` de `frontend/.env`. Si ese token
está caducado, el pre-vuelo aborta con un 401/403 explícito y **no escribe nada**.

- [ ] **Step 1: Arrancar Strapi en local**

Run: `cd backend && pnpm dev` (o `npm run dev`)
Expected: responde en `http://localhost:1337`

- [ ] **Step 2: Ensayo en seco, ANTES de escribir nada**

Run: `cd studio && pnpm sanity exec scripts/migrate-from-strapi.ts -- --dry-run`
(`tsx` no está instalado y el script necesita `getCliClient` de `sanity/cli`)
Expected: el pre-vuelo cuadra, el script imprime el plan completo y **no sube ningún asset ni
escribe ningún documento**.

El `--dry-run` no estaba en el plan original; lo añadió el implementador de la tarea 5 y el
revisor lo valoró como reducción neta de riesgo. Se usa porque las 45 subidas de asset ocurren
**antes** de que el transform valide los documentos: si una validación fallara en el run real,
quedarían 45 assets huérfanos. Son inofensivos (aditivos, deduplicados por sha1, y un
re-lanzamiento los reutiliza), pero el ensayo en seco los evita por completo.

**Tres cosas que mirar en la salida del ensayo**, que el revisor marcó como no verificables
desde el diff:
1. Que `status=published`, `populate=*` y `populate[Contact][populate]=*` se comporten como se
   asume en Strapi 5.50.1 real. Las tres tienen aborto ruidoso, así que un supuesto equivocado
   para el run, no lo corrompe.
2. **Las secuencias de `order` de `service`, `project` y `testimonial`**, comparadas a ojo con
   el sitio en vivo. Salen del índice de la respuesta REST, que la base determina sin
   `ORDER BY`, así que es el único punto donde el orden no está garantizado por contrato.
3. Que el recuento de assets sea de 45 subidas y **44** documentos de asset.

- [ ] **Step 3: Ejecutar la migración de verdad**

Run: `cd studio && pnpm sanity exec scripts/migrate-from-strapi.ts`
Expected: el pre-vuelo cuadra y el script informa 68 documentos y 45 subidas (44 assets, por
deduplicación de sha1)

- [ ] **Step 4: Escribir el script de verificación**

Comprueba, vía GROQ contra el dataset real:
- recuento por tipo, contra la tabla del diseño;
- que las 2 referencias resuelven en los 40 documentos que las usan;
- que las 34 tecnologías tienen `order` y que el orden coincide con `technologie_ord`;
- que los saltos de línea sobrevivieron: **1** `service.title` (`"UI/UX\nDesign"`), **2**
  `service.description`, `biography.presentation` y 2 de los 3 `homeLeft[].description`
  contienen `\n`. (El plan decía antes "los 2 `service.title` afectados": era falso, solo hay
  uno con salto; verificado en el dataset migrado);
- que las 45 URLs del mapa de assets devuelven HTTP 200, apuntando a **44** documentos
  `sanity.imageAsset` distintos.

- [ ] **Step 5: Ejecutar la verificación**

Run: `cd studio && pnpm sanity exec scripts/verify-migration.ts`
Expected: todas las comprobaciones en verde; salida distinta de cero si alguna falla

- [ ] **Step 6: Revisar el contenido a ojo en el Studio**

Run: `cd studio && pnpm dev`
Expected: los 4 singletons abren directos; las skills salen en el orden curado

- [ ] **Step 7: Commit**

```bash
git add studio/scripts/verify-migration.ts
git commit -m "feat(studio): verificación de la migración"
```

---

### Task 7: Capa de datos del frontend

**Files:**
- Create: `frontend/src/lib/sanity.ts`, `frontend/src/lib/image.ts`,
  `frontend/src/lib/queries.ts`, `frontend/src/hooks/useSanity.ts`,
  `frontend/.env.example`, `frontend/vitest.config.ts`
- Modify: `frontend/package.json`, `frontend/.env`
- Test: `frontend/src/lib/__tests__/image.test.ts`,
  `frontend/src/lib/__tests__/queries.test.ts`

**Interfaces:**
- Consumes: los nombres de tipo de las tareas 3 y 4. **No** requiere el dataset poblado:
  los tests de esta tarea son unitarios sobre strings y sobre `image.ts`. El dataset de la
  tarea 6 hace falta a partir de la tarea 8, paso 7 (comparación a ojo).
- Produces:
  ```ts
  // lib/sanity.ts
  export const client: SanityClient   // useCdn: true, perspective: 'published'
  // lib/image.ts
  export type SanityImageField = {
    alt?: string | null
    asset?: { _id: string; url: string | null; mimeType: string | null } | null
  } | null | undefined
  export function imageUrl(image: SanityImageField, width?: number): string | undefined
  export function imageAlt(image: SanityImageField, fallback: string): string
  // hooks/useSanity.ts
  export function useSanity<T>(query: string): UseSanityResult<T>
  // lib/queries.ts — 10 constantes con defineQuery()
  export const HEADER_QUERY, BIOGRAPHY_QUERY, SECTION_TITLES_QUERY, SKILLS_QUERY,
    QUALIFICATIONS_QUERY, SERVICES_QUERY, PROJECTS_QUERY, TESTIMONIALS_QUERY,
    CONTACT_QUERY, FOOTER_QUERY: string
  export const PORTFOLIO_QUERIES: string[]
  ```

Las queries proyectan las imágenes como `{alt, "asset": asset->{_id, url, mimeType}}`:
`mimeType` es lo que permite a `imageUrl` detectar los SVG, y `_id` lo que permite a
`@sanity/image-url` transformar los raster.

- [ ] **Step 1: Instalar dependencias y Vitest**

Añadir `@sanity/client`, `@sanity/image-url`, `groq`; `vitest`, `@testing-library/react`,
`@testing-library/jest-dom`, `jsdom` como dev. `vitest.config.ts` con
`environment: 'jsdom'`.

**`qs` y `@types/qs` NO se eliminan aquí**, aunque dejen de usarse: `utils/constants.ts`
sigue importando `qs` hasta la tarea 8, y quitarlos ahora rompería el `tsc -b` del paso 6.
Se eliminan en la tarea 8, paso 4.

- [ ] **Step 2: Escribir los tests que fallan**

```ts
// image.test.ts  — Review Focus #1
const svg = { asset: { _id: 'image-abc-24x24-svg', url: 'https://cdn.sanity.io/…/abc.svg', mimeType: 'image/svg+xml' } }
const png = { asset: { _id: 'image-def-800x800-png', url: 'https://cdn.sanity.io/…/def.png', mimeType: 'image/png' } }

test('un SVG se sirve crudo, sin parámetros de transformación', () => {
  const url = imageUrl(svg, 48)
  expect(url).toBe(svg.asset.url)
  expect(url).not.toContain('?')
})

test('un raster se transforma al ancho pedido', () => {
  expect(imageUrl(png, 800)).toContain('w=800')
})

test('sin imagen devuelve undefined, para que React omita el src', () => {
  expect(imageUrl(null)).toBeUndefined()
  expect(imageUrl({ asset: null })).toBeUndefined()
})

test('imageAlt cae al texto de reserva cuando alt está vacío', () => {
  expect(imageAlt(svg, 'skills image')).toBe('skills image')
  expect(imageAlt({ ...png, alt: 'Victor' }, 'Home profile')).toBe('Victor')
})

// queries.test.ts
test('las 10 queries tienen nombres únicos y proyectan mimeType en las imágenes', () => {
  expect(new Set(PORTFOLIO_QUERIES).size).toBe(10)
  for (const q of [BIOGRAPHY_QUERY, PROJECTS_QUERY, SKILLS_QUERY]) {
    expect(q).toContain('mimeType')
  }
})

test('las cuatro queries con order nuevo ordenan por él', () => {
  for (const q of [SERVICES_QUERY, PROJECTS_QUERY, TESTIMONIALS_QUERY]) {
    expect(q).toContain('order(order asc)')
  }
  expect(SKILLS_QUERY).toContain('order(order asc)')
})

test('las titulaciones anidadas van en orden descendente, como en Strapi', () => {
  // constants.ts hoy: qualification-types sort asc, qualifications anidadas sort DESC
  expect(QUALIFICATIONS_QUERY).toContain('order(order desc)')
  expect(QUALIFICATIONS_QUERY).toContain('order(order asc)')
})
```

- [ ] **Step 3: Ejecutar y verificar que fallan**

Run: `cd frontend && pnpm vitest run src/lib`
Expected: FAIL

- [ ] **Step 4: Implementar `sanity.ts`, `image.ts`, `queries.ts` y `useSanity.ts`**

`imageUrl` devuelve `undefined` sin asset, la URL cruda si `mimeType === 'image/svg+xml'`, y
`urlFor(...).width(w).auto('format').url()` en los demás casos. `useSanity` replica
exactamente lo que hace `useStrapi` hoy (caché por `queryKey`, `signal`, `isPending`), con
`queryKey: ['sanity', query]`.

Las 10 queries GROQ traducen una a una las de `utils/constants.ts`, resolviendo las
relaciones inversas con `*[_type == "…" && references(^._id)]` y proyectando `key.current`
y `slug.current` para los `slug`.

- [ ] **Step 5: Ejecutar y verificar que pasan**

Run: `cd frontend && pnpm vitest run src/lib`
Expected: PASS (7 tests)

- [ ] **Step 6: Regenerar los tipos y comprobar que las queries tipan**

Run: `cd studio && pnpm typegen && cd ../frontend && pnpm tsc -b`
Expected: `sanity.types.ts` incluye los 10 `*_QUERY_RESULT`; `tsc` sin errores

- [ ] **Step 7: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): capa de datos de Sanity con tipos generados"
```

---

### Task 8: Componentes y limpieza de Strapi

**Files:**
- Modify: `frontend/src/sections/{MainContent,Header,Footer}.tsx`,
  `frontend/src/sections/components/{SkillsSection,Qualifications,Services,Projects,Testimonial,ContactForm}.tsx`,
  `frontend/src/main.tsx`, `frontend/src/utils/constants.ts`, `frontend/src/types/types.ts`
- Delete: `frontend/src/lib/strapi.ts`, `frontend/src/hooks/useStrapi.ts`
- Test: `frontend/src/sections/__tests__/sections.test.tsx`

**Interfaces:**
- Consumes: todo lo que produce la tarea 7
- Produces: el frontend sin una sola referencia a Strapi

Cada punto de consumo pasa de `useStrapi<XTypes>(xQuery)` a
`useSanity<X_QUERY_RESULT>(X_QUERY)`, con el tipo importado de `sanity.types.ts`. Las
`key` pasan de `item.id` a `item._id` (documentos) o `item._key` (miembros de array). Las
imágenes pasan de `getStrapiImages(x.url)` a `imageUrl(x)` más `imageAlt(x, '<alt actual>')`.
`ContactForm` deja de indexar por posición: usa `data.talkToMe` y `data.writeMe`.

- [ ] **Step 1: Escribir los tests que fallan (Review Focus #2 a #5)**

```tsx
test('una categoría sin tecnologías renderiza vacía, no rompe', () => {
  // Review Focus #2
  renderWithData(SkillsSection, [{ _id: 'c1', title: 'Frontend', technologies: [] }])
  expect(screen.getByText('Frontend')).toBeInTheDocument()
})

test('un sectionTitle.key desconocido se ignora', () => {
  // Review Focus #3
  renderWithData(MainContent, { sections: [{ _id: 's1', key: 'inexistente', title: 'X', subtitle: 'Y' }] })
  expect(screen.queryByText('X')).not.toBeInTheDocument()
})

test('un navLink sin icono no genera la clase ri-undefined', () => {
  // Review Focus #4
  renderWithData(Header, { logoName: 'VR', navLinks: [{ _key: 'k1', slug: '#home', label: 'Home' }] })
  expect(document.querySelector('.ri-undefined')).toBeNull()
})

test('un contactInfo sin url no renderiza el enlace', () => {
  // Review Focus #4
  renderWithData(ContactForm, {
    talkToMe: { icon: 'mail', title: 'Talk to me', contactInfo: [
      { _key: 'a', label: 'Email', value: 'a@b.c', url: 'mailto:a@b.c' },
      { _key: 'b', label: 'Phone', value: '+504', url: null },
    ] },
  })
  expect(screen.getAllByText('Write me')).toHaveLength(1)
})

test.each([
  ['SkillsSection', SkillsSection],
  ['Qualifications', Qualifications],
  ['Services', Services],
  ['Projects', Projects],
  ['Testimonial', Testimonial],
  ['ContactForm', ContactForm],
])('%s muestra skeleton al cargar y SectionError al fallar', (_name, Component) => {
  // Review Focus #5
  renderLoading(Component)
  expect(document.querySelector('.skeleton, .skeleton-lines')).not.toBeNull()
  renderError(Component)
  expect(screen.getByRole('button', { name: /retry|reintentar/i })).toBeInTheDocument()
})

test('los saltos de línea del contenido llegan al DOM', () => {
  renderWithData(MainContent, { biography: { presentation: "Hi, I'm Victor Reyes\nFullstack Developer" } })
  expect(screen.getByRole('heading', { level: 1 }).textContent).toContain('\n')
})
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `cd frontend && pnpm vitest run src/sections`
Expected: FAIL

- [ ] **Step 3: Migrar los 10 puntos de consumo**

- [ ] **Step 4: Recortar `constants.ts` y `types.ts`, y eliminar los archivos de Strapi**

Eliminar `qs` y `@types/qs` de `package.json` en este paso, una vez que `constants.ts`
deja de importarlos (aplazado desde la tarea 7).

De `constants.ts` se conservan **solo** `DARK_THEME_CLASS`, `ICON_THEME_CLASS` y
`getInitialIsDark`. De `types.ts` se conservan **solo** `SectionKey`, `SectionProps` y
`UseSanityResult`; `designProperty` desaparece. `main.tsx` importa `PORTFOLIO_QUERIES` de
`lib/queries.ts` y usa `queryKey: ['sanity', query]`.

- [ ] **Step 5: Ejecutar y verificar que pasan**

Run: `cd frontend && pnpm vitest run && pnpm tsc -b && pnpm lint`
Expected: PASS, sin errores de tipo ni de lint

- [ ] **Step 6: Comprobar que no queda rastro de Strapi en el frontend**

Run: `grep -ri "strapi" frontend/src frontend/.env.example`
Expected: sin resultados

- [ ] **Step 7: Comparar contra el Strapi local a ojo**

Run: `cd frontend && pnpm dev`
Expected: las 7 secciones idénticas al Strapi local, mismo orden de skills, mismos saltos
de línea en el título y en los servicios

- [ ] **Step 8: Commit**

```bash
git add frontend/
git commit -m "feat(frontend): consumir Sanity y eliminar la capa de Strapi"
```

---

### Task 9: Despliegue

**Files:**
- Modify: variables de entorno del proyecto en Netlify (vía MCP)

**Interfaces:**
- Consumes: todo lo anterior
- Produces: `vgdeveloper.sanity.studio` en línea y `https://vgdeveloper.dev` sirviendo
  contenido otra vez

- [ ] **Step 1: Iniciar sesión en la CLI de Sanity**

Run: `cd studio && npx sanity login`
Expected: sesión establecida. **Paso manual de Victor**; la sesión OAuth del MCP no sirve
para la CLI.

- [ ] **Step 2: Desplegar el Studio**

Run: `cd studio && pnpm deploy` con hostname `vgdeveloper`
Expected: `https://vgdeveloper.sanity.studio` responde y permite editar. Si el hostname está
tomado, usar `victor-reyes-portfolio`.

- [ ] **Step 3: Leer la configuración actual del proyecto en Netlify**

Usar `netlify-project-services-reader` para localizar el proyecto de `vgdeveloper.dev` y
anotar sus variables actuales (`VITE_STRAPI_HOST`, `VITE_STRAPI_TOKEN`) antes de tocar nada.

- [ ] **Step 4: Sustituir las variables de entorno**

Usar `netlify-project-services-updater`: añadir `VITE_SANITY_PROJECT_ID` y
`VITE_SANITY_DATASET`, eliminar las dos de Strapi.

- [ ] **Step 5: Redesplegar y verificar en producción**

Run:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://vgdeveloper.dev/
curl -sS https://vgdeveloper.dev/ | grep -o 'assets/[^"]*\.js'
```
Expected: `200`; y el bundle nuevo **no** contiene `strapiapp.com`. Comprobar a ojo que las
7 secciones muestran contenido, que es justo lo que hoy no hacen.

- [ ] **Step 6: Commit**

```bash
git add frontend/.env.example
git commit -m "chore: variables de entorno de Sanity para producción"
```

---

### Task 10: Eliminar `backend/`

Última tarea, en su propio commit. **No se ejecuta si la tarea 1 no está verificada.**

**Files:**
- Delete: `backend/` completo

- [ ] **Step 1: Confirmar que el respaldo de la tarea 1 sigue siendo legible**

Run: `tar -tzf ~/Backups/portfolio-strapi-2026-11-16/strapi-export.tar.gz | wc -l && ls ~/Backups/portfolio-strapi-2026-11-16/uploads | wc -l`
Expected: ambos distintos de cero; 67 uploads

- [ ] **Step 2: Confirmar que producción vive sin Strapi**

Run: `curl -sS https://vgdeveloper.dev/ | grep -c strapiapp.com || true`
Expected: `0`

- [ ] **Step 3: Etiquetar el último commit con Strapi presente**

```bash
git tag strapi-final
```

- [ ] **Step 4: Eliminar y commitear**

```bash
git rm -r backend/
git commit -m "chore: eliminar el backend de Strapi, sustituido por Sanity"
```

- [ ] **Step 5: Verificación final**

Run: `cd frontend && pnpm tsc -b && pnpm vitest run && pnpm build`
Expected: todo en verde con `backend/` ya fuera del repo
