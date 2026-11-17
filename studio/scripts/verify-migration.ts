/**
 * Verificación de la migración contra el dataset real.
 *
 *   cd studio
 *   pnpm sanity exec scripts/verify-migration.ts
 *
 * Es solo lectura: no escribe nada en el dataset. El dataset `production` es
 * público, así que las consultas GROQ no necesitan token; `SANITY_WRITE_TOKEN`
 * se usa si está, pero no es obligatorio.
 *
 * Comprueba, contra el dataset y no contra lo que el script de migración creía
 * haber escrito:
 *
 *   1. El recuento por tipo, contra la tabla del diseño (68 documentos), que no
 *      hay tipos de contenido de más y que no hay borradores.
 *   2. Que las dos referencias resuelven en los 40 documentos que las usan
 *      (34 `technology -> technologyCategory` y 6 `qualification -> qualificationType`).
 *   3. Que las 34 tecnologías tienen `order` y que coincide con la columna
 *      `technologie_ord` de `technologies_category_lnk` en la base de Strapi.
 *   4. Que los saltos de línea reales sobrevivieron: se renderizan con
 *      `white-space: pre-line` y un `\n` perdido se nota en pantalla.
 *   5. Que los 45 originales de `backend/public/uploads` están en el dataset
 *      (localizados por sha1, no por nombre), que son 44 documentos
 *      `sanity.imageAsset` distintos y que cada URL devuelve HTTP 200.
 *
 * Las comprobaciones 3 y 5 leen `backend/`, igual que el script de migración:
 * el orden curado y los sha1 de origen no viven en ninguna otra parte. Cuando
 * `backend/` ya no exista, estas dos dejarán de poder ejecutarse; las otras
 * tres siguen valiendo.
 *
 * Sale con código distinto de cero si algo no cuadra.
 */
import {createHash} from 'node:crypto'
import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {join, resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

import {readTechnologyOrder} from './lib/strapi-order'
import {isStrapiVariant, toSanityId} from './lib/transform'

// ---------------------------------------------------------------------------
// Lo que el diseño dice que tiene que haber
// ---------------------------------------------------------------------------

/** Recuento esperado por tipo, el mismo que usa el script de migración. */
const EXPECTED_COUNTS = {
  biography: 1,
  contact: 1,
  footer: 1,
  header: 1,
  project: 4,
  qualification: 6,
  qualificationType: 2,
  sectionTitle: 6,
  service: 4,
  technology: 34,
  technologyCategory: 5,
  testimonial: 3,
} as const

const EXPECTED_DOCUMENTS = 68

/** Los 4 singletons usan su nombre de tipo como `_id`. */
const SINGLETON_IDS = ['biography', 'contact', 'footer', 'header'] as const

/** Ficheros originales en `backend/public/uploads`, sin las miniaturas. */
const EXPECTED_UPLOADS = 45

/**
 * `project1_1b9650e9c9.jpg` y `project1_f2b31920e8.jpg` son byte a byte el
 * mismo fichero (sha1 `db6182b0...`), y Sanity deduplica por sha1: 45 subidas
 * dejan 44 documentos `sanity.imageAsset`.
 */
const EXPECTED_ASSET_DOCUMENTS = 44

/**
 * Campos con un `\n` real. Son los que se renderizan con `white-space:
 * pre-line` en `frontend/src/index.css` (`.home__title`, `.services__title`,
 * `.home__info-description`) más las dos descripciones de `service`.
 *
 * El recuento viene de recorrer el contenido publicado en inglés de Strapi, no
 * de la memoria de nadie:
 *
 *   biography.presentation                  "Hi, I'm Victor Reyes\nFullstack Developer"
 *   biography.homeLeft[1].description       "Tegucigalpa, Honduras\nvicalregu@gmail.com\n+504 97380822"
 *   biography.homeLeft[2].description       "UI/UX Design\nFullstack Development\nMobile Development"
 *   service "UI/UX\nDesign" .title          el único título con salto de línea
 *   service "UI/UX\nDesign" .description
 *   service "Fullstack Development" .description
 *
 * OJO: la tarea 6 hablaba de «los 2 `service.title` afectados». En el Strapi
 * real hay **1** `service.title` con `\n` y **2** `service.description`. Lo que
 * se verifica aquí es el contenido real.
 */
const EXPECTED_NEWLINE_FIELDS = 6
const EXPECTED_SERVICE_TITLES_WITH_NEWLINE = 1

const API_VERSION = '2025-02-19'

// `sanity exec` pone SANITY_BASE_PATH en la raíz del Studio.
const STUDIO_DIR = process.env.SANITY_BASE_PATH ?? process.cwd()
const REPO_ROOT = resolve(STUDIO_DIR, '..')
const UPLOADS_DIR = process.env.STRAPI_UPLOADS_DIR ?? join(REPO_ROOT, 'backend/public/uploads')
const STRAPI_DB_PATH = process.env.STRAPI_DB_PATH ?? join(REPO_ROOT, 'backend/.tmp/data.db')

// ---------------------------------------------------------------------------
// Acumulador de fallos
// ---------------------------------------------------------------------------

const problems: string[] = []

function check(condition: boolean, label: string, detail: string): void {
  console.log(`  ${condition ? 'ok   ' : 'FALLA'} ${label}`)
  if (!condition) problems.push(detail)
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

/** Lee `SANITY_WRITE_TOKEN` de `.env.local` si está. **Nunca imprime el valor.** */
function readWriteToken(): string | undefined {
  if (process.env.SANITY_WRITE_TOKEN) return process.env.SANITY_WRITE_TOKEN

  const path = join(STUDIO_DIR, '.env.local')
  if (!existsSync(path)) return undefined

  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (!line.startsWith('SANITY_WRITE_TOKEN=')) continue
    let value = line.slice('SANITY_WRITE_TOKEN='.length).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    return value.length > 0 ? value : undefined
  }

  return undefined
}

/**
 * Recorre un documento y devuelve la ruta de cada cadena que lleva un `\n`.
 * Se ignoran las claves internas (`_id`, `_key`, `_type`...): ninguna de ellas
 * es contenido.
 */
function newlinePaths(value: unknown, path: string): string[] {
  if (typeof value === 'string') return value.includes('\n') ? [path] : []

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => newlinePaths(item, `${path}[${index}]`))
  }

  if (typeof value === 'object' && value !== null) {
    return Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !key.startsWith('_'))
      .flatMap(([key, item]) => newlinePaths(item, `${path}.${key}`))
  }

  return []
}

/** Los 45 originales, con su sha1. */
function readOriginalUploads(): {filename: string; sha1: string}[] {
  if (!existsSync(UPLOADS_DIR)) {
    throw new Error(`No existe ${UPLOADS_DIR}: define STRAPI_UPLOADS_DIR o ejecuta desde studio/.`)
  }

  return readdirSync(UPLOADS_DIR)
    .filter((name) => !name.startsWith('.'))
    .filter((name) => !isStrapiVariant(name))
    .sort()
    .map((filename) => ({
      filename,
      sha1: createHash('sha1').update(readFileSync(join(UPLOADS_DIR, filename))).digest('hex'),
    }))
}

// ---------------------------------------------------------------------------
// 1. Recuento por tipo
// ---------------------------------------------------------------------------

interface SanityDocument {
  _id: string
  _type: string
  [field: string]: unknown
}

type Client = ReturnType<typeof getCliClient>

async function verifyCounts(client: Client): Promise<SanityDocument[]> {
  console.log('\n1. Recuento por tipo')

  // Se lee todo el contenido una sola vez: hace falta entero para los saltos
  // de línea, y así los recuentos salen del mismo retrato del dataset.
  const documents = await client.fetch<SanityDocument[]>(
    `*[!(_type match "sanity.*") && !(_type match "system.*") && !(_id in path("drafts.**"))]`,
  )

  const byType = new Map<string, number>()
  for (const document of documents) {
    byType.set(document._type, (byType.get(document._type) ?? 0) + 1)
  }

  for (const [type, expected] of Object.entries(EXPECTED_COUNTS)) {
    const count = byType.get(type) ?? 0
    console.log(`  ${type.padEnd(19)} ${String(count).padStart(2)}/${expected}`)
    if (count !== expected) problems.push(`${type}: hay ${count} documentos y se esperaban ${expected}`)
  }

  const unexpected = [...byType.keys()].filter((type) => !(type in EXPECTED_COUNTS))

  check(
    documents.length === EXPECTED_DOCUMENTS,
    `total de documentos de contenido: ${documents.length}/${EXPECTED_DOCUMENTS}`,
    `el dataset tiene ${documents.length} documentos de contenido y se esperaban ${EXPECTED_DOCUMENTS}`,
  )
  check(
    unexpected.length === 0,
    `tipos de contenido inesperados: ${unexpected.length}`,
    `hay tipos que no están en el diseño: ${unexpected.join(', ')}`,
  )

  const missingSingletons = SINGLETON_IDS.filter(
    (id) => !documents.some((document) => document._id === id),
  )
  check(
    missingSingletons.length === 0,
    `singletons con _id fijo: ${SINGLETON_IDS.length - missingSingletons.length}/${SINGLETON_IDS.length}`,
    `faltan singletons con su _id fijo: ${missingSingletons.join(', ')}`,
  )

  const drafts = await client.fetch<number>('count(*[_id in path("drafts.**")])')
  check(
    drafts === 0,
    `borradores en el dataset: ${drafts}`,
    `hay ${drafts} borradores y la migración no escribe ninguno`,
  )

  return documents
}

// ---------------------------------------------------------------------------
// 2. Referencias
// ---------------------------------------------------------------------------

async function verifyReferences(client: Client): Promise<void> {
  console.log('\n2. Referencias')

  const result = await client.fetch<{
    technologyResolved: number
    technologyBroken: number
    qualificationResolved: number
    qualificationBroken: number
  }>(
    `{
      "technologyResolved": count(*[_type == "technology" && !(_id in path("drafts.**")) && defined(category->_id)]),
      "technologyBroken": count(*[_type == "technology" && !(_id in path("drafts.**")) && !defined(category->_id)]),
      "qualificationResolved": count(*[_type == "qualification" && !(_id in path("drafts.**")) && defined(qualificationType->_id)]),
      "qualificationBroken": count(*[_type == "qualification" && !(_id in path("drafts.**")) && !defined(qualificationType->_id)])
    }`,
  )

  const resolved = result.technologyResolved + result.qualificationResolved
  const broken = result.technologyBroken + result.qualificationBroken

  check(
    result.technologyResolved === EXPECTED_COUNTS.technology && result.technologyBroken === 0,
    `technology -> technologyCategory: ${result.technologyResolved}/${EXPECTED_COUNTS.technology} resuelven, ${result.technologyBroken} colgando`,
    `technology.category: ${result.technologyResolved} resuelven de ${EXPECTED_COUNTS.technology} y ${result.technologyBroken} están colgando`,
  )
  check(
    result.qualificationResolved === EXPECTED_COUNTS.qualification && result.qualificationBroken === 0,
    `qualification -> qualificationType: ${result.qualificationResolved}/${EXPECTED_COUNTS.qualification} resuelven, ${result.qualificationBroken} colgando`,
    `qualification.qualificationType: ${result.qualificationResolved} resuelven de ${EXPECTED_COUNTS.qualification} y ${result.qualificationBroken} están colgando`,
  )
  check(
    resolved === 40 && broken === 0,
    `los 40 documentos que usan una referencia: ${resolved}/40 resuelven`,
    `de los 40 documentos con referencia, ${resolved} resuelven y ${broken} no`,
  )
}

// ---------------------------------------------------------------------------
// 3. Orden de las tecnologías
// ---------------------------------------------------------------------------

async function verifyTechnologyOrder(client: Client): Promise<void> {
  console.log('\n3. Orden curado de las tecnologías')

  if (!existsSync(STRAPI_DB_PATH)) {
    throw new Error(
      `No existe ${STRAPI_DB_PATH}, de donde sale el orden curado (columna technologie_ord).`,
    )
  }

  const expectedOrder = readTechnologyOrder(STRAPI_DB_PATH)
  check(
    expectedOrder.size === EXPECTED_COUNTS.technology,
    `entradas en technologies_category_lnk (publicadas): ${expectedOrder.size}/${EXPECTED_COUNTS.technology}`,
    `el orden de Strapi tiene ${expectedOrder.size} entradas y se esperaban ${EXPECTED_COUNTS.technology}`,
  )

  const technologies = await client.fetch<
    {_id: string; title: string | null; order: number | null; category: string | null}[]
  >(
    `*[_type == "technology" && !(_id in path("drafts.**"))]
      | order(category->order asc, order asc)
      {_id, title, order, "category": category->title}`,
  )

  let matched = 0
  const mismatches: string[] = []

  for (const [documentId, ord] of expectedOrder) {
    const id = toSanityId('technology', documentId)
    const technology = technologies.find((candidate) => candidate._id === id)

    if (!technology) {
      mismatches.push(`${id} no está en el dataset`)
      continue
    }
    if (typeof technology.order !== 'number') {
      mismatches.push(`${id} (${technology.title ?? '?'}) no tiene order`)
      continue
    }
    if (technology.order !== ord) {
      mismatches.push(
        `${id} (${technology.title ?? '?'}) tiene order ${technology.order} y technologie_ord dice ${ord}`,
      )
      continue
    }

    matched += 1
  }

  check(
    matched === EXPECTED_COUNTS.technology,
    `order == technologie_ord: ${matched}/${EXPECTED_COUNTS.technology}`,
    `solo ${matched} de ${EXPECTED_COUNTS.technology} tecnologías tienen el orden curado:\n      ${mismatches.join('\n      ')}`,
  )

  // El orden es por categoría: cinco categorías hacen que haya cinco
  // tecnologías con order 1. Se imprime para poder mirarlo a ojo.
  console.log('  orden curado, agrupado por categoría:')
  let current: string | null = null
  for (const technology of technologies) {
    if (technology.category !== current) {
      current = technology.category
      console.log(`    ${current ?? '(sin categoría)'}`)
    }
    console.log(`      ${String(technology.order).padStart(2)}  ${technology.title ?? '?'}`)
  }
}

// ---------------------------------------------------------------------------
// 4. Saltos de línea
// ---------------------------------------------------------------------------

function verifyNewlines(documents: SanityDocument[]): void {
  console.log('\n4. Saltos de línea (se renderizan con white-space: pre-line)')

  const found = documents
    .flatMap((document) => newlinePaths(document, document._id))
    .sort()

  for (const path of found) console.log(`    ${path}`)

  const biography = documents.find((document) => document._id === 'biography')
  const presentation = biography?.presentation

  check(
    typeof presentation === 'string' && presentation.includes('\n'),
    `biography.presentation lleva \\n: ${JSON.stringify(presentation)}`,
    `biography.presentation no lleva ningún \\n (valor: ${JSON.stringify(presentation)})`,
  )

  const serviceTitles = documents
    .filter((document) => document._type === 'service')
    .map((document) => document.title)
    .filter((title): title is string => typeof title === 'string')

  const titlesWithNewline = serviceTitles.filter((title) => title.includes('\n'))

  check(
    titlesWithNewline.length === EXPECTED_SERVICE_TITLES_WITH_NEWLINE,
    `service.title con \\n: ${titlesWithNewline.length}/${EXPECTED_SERVICE_TITLES_WITH_NEWLINE} ${JSON.stringify(titlesWithNewline)}`,
    `hay ${titlesWithNewline.length} service.title con \\n y se esperaban ${EXPECTED_SERVICE_TITLES_WITH_NEWLINE} (títulos: ${JSON.stringify(serviceTitles)})`,
  )

  check(
    found.length === EXPECTED_NEWLINE_FIELDS,
    `campos con \\n en todo el dataset: ${found.length}/${EXPECTED_NEWLINE_FIELDS}`,
    `hay ${found.length} campos con \\n y se esperaban ${EXPECTED_NEWLINE_FIELDS}: ${found.join(', ')}`,
  )
}

// ---------------------------------------------------------------------------
// 5. Assets
// ---------------------------------------------------------------------------

async function verifyAssets(client: Client): Promise<void> {
  console.log('\n5. Assets')

  const uploads = readOriginalUploads()
  check(
    uploads.length === EXPECTED_UPLOADS,
    `originales en backend/public/uploads: ${uploads.length}/${EXPECTED_UPLOADS}`,
    `hay ${uploads.length} originales en ${UPLOADS_DIR} y se esperaban ${EXPECTED_UPLOADS}`,
  )

  const sha1s = [...new Set(uploads.map((upload) => upload.sha1))]
  const assets = await client.fetch<{_id: string; sha1hash: string; url: string}[]>(
    `*[_type == "sanity.imageAsset" && sha1hash in $sha1s]{_id, sha1hash, url}`,
    {sha1s},
  )

  const byHash = new Map(assets.map((asset) => [asset.sha1hash, asset]))

  // El mapa que construye la migración: una entrada por fichero (45), aunque
  // dos apunten al mismo asset.
  const assetMap: {filename: string; assetId: string; url: string}[] = []
  const missing: string[] = []

  for (const upload of uploads) {
    const asset = byHash.get(upload.sha1)
    if (!asset) {
      missing.push(`${upload.filename} (sha1 ${upload.sha1})`)
      continue
    }
    assetMap.push({filename: upload.filename, assetId: asset._id, url: asset.url})
  }

  check(
    missing.length === 0,
    `originales localizados en el dataset por sha1: ${assetMap.length}/${uploads.length}`,
    `no están en el dataset: ${missing.join(', ')}`,
  )

  const distinctIds = new Set(assetMap.map((entry) => entry.assetId))
  check(
    distinctIds.size === EXPECTED_ASSET_DOCUMENTS,
    `documentos sanity.imageAsset distintos tras la deduplicación por sha1: ${distinctIds.size}/${EXPECTED_ASSET_DOCUMENTS}`,
    `los ${uploads.length} originales apuntan a ${distinctIds.size} assets y se esperaban ${EXPECTED_ASSET_DOCUMENTS}`,
  )

  const filenamesByAsset = new Map<string, string[]>()
  for (const entry of assetMap) {
    const filenames = filenamesByAsset.get(entry.assetId) ?? []
    filenames.push(entry.filename)
    filenamesByAsset.set(entry.assetId, filenames)
  }

  for (const [assetId, filenames] of filenamesByAsset) {
    if (filenames.length > 1) console.log(`  deduplicado: ${filenames.join(' == ')} -> ${assetId}`)
  }

  const totalAssets = await client.fetch<number>('count(*[_type == "sanity.imageAsset"])')
  check(
    totalAssets === EXPECTED_ASSET_DOCUMENTS,
    `sanity.imageAsset en el dataset: ${totalAssets}/${EXPECTED_ASSET_DOCUMENTS}`,
    `el dataset tiene ${totalAssets} documentos sanity.imageAsset y se esperaban ${EXPECTED_ASSET_DOCUMENTS}`,
  )

  // HTTP 200 por cada URL del mapa. Se piden las URLs distintas (44 para los
  // 45 ficheros) y se cuenta sobre las 45 entradas del mapa.
  const urls = [...new Set(assetMap.map((entry) => entry.url))]
  const statusByUrl = new Map<string, number>()

  for (const url of urls) {
    try {
      const response = await fetch(url, {method: 'HEAD'})
      statusByUrl.set(url, response.status)
    } catch (cause) {
      statusByUrl.set(url, 0)
      problems.push(`la imagen ${url} no se pudo pedir (${String(cause)})`)
    }
  }

  const okUrls = urls.filter((url) => statusByUrl.get(url) === 200)
  const okEntries = assetMap.filter((entry) => statusByUrl.get(entry.url) === 200)

  for (const url of urls) {
    const status = statusByUrl.get(url)
    if (status !== 200) problems.push(`la imagen ${url} devolvió ${status}`)
  }

  check(
    okUrls.length === urls.length,
    `URLs distintas con HTTP 200: ${okUrls.length}/${urls.length}`,
    `${urls.length - okUrls.length} URLs de asset no devolvieron 200`,
  )
  check(
    okEntries.length === uploads.length,
    `entradas del mapa de assets con HTTP 200: ${okEntries.length}/${uploads.length}`,
    `${uploads.length - okEntries.length} entradas del mapa de assets no devolvieron 200`,
  )

  // Las imágenes que el contenido referencia de verdad: 34 iconos de
  // technology, 4 portadas de project y la foto de biography.
  const referenced = await client.fetch<{
    technologyIcons: (string | null)[]
    projectCovers: (string | null)[]
    biographyPhoto: string | null
  }>(
    `{
      "technologyIcons": *[_type == "technology" && !(_id in path("drafts.**"))].icon.asset->url,
      "projectCovers": *[_type == "project" && !(_id in path("drafts.**"))].cover.asset->url,
      "biographyPhoto": *[_id == "biography"][0].photo.asset->url
    }`,
  )

  const referencedUrls = [
    ...referenced.technologyIcons,
    ...referenced.projectCovers,
    referenced.biographyPhoto,
  ]
  const resolvedUrls = referencedUrls.filter((url): url is string => typeof url === 'string')
  const expectedReferenced = EXPECTED_COUNTS.technology + EXPECTED_COUNTS.project + 1

  check(
    referenced.technologyIcons.length === EXPECTED_COUNTS.technology,
    `technology.icon resueltos: ${referenced.technologyIcons.length}/${EXPECTED_COUNTS.technology}`,
    `hay ${referenced.technologyIcons.length} iconos de technology y se esperaban ${EXPECTED_COUNTS.technology}`,
  )
  check(
    referenced.projectCovers.length === EXPECTED_COUNTS.project,
    `project.cover resueltos: ${referenced.projectCovers.length}/${EXPECTED_COUNTS.project}`,
    `hay ${referenced.projectCovers.length} portadas de project y se esperaban ${EXPECTED_COUNTS.project}`,
  )
  check(
    resolvedUrls.length === expectedReferenced,
    `imágenes referenciadas que resuelven a un asset: ${resolvedUrls.length}/${expectedReferenced}`,
    `${expectedReferenced - resolvedUrls.length} imágenes referenciadas no resuelven a ningún asset`,
  )

  const unknown = resolvedUrls.filter((url) => !statusByUrl.has(url))
  check(
    unknown.length === 0,
    `imágenes referenciadas que están en el mapa de assets: ${resolvedUrls.length - unknown.length}/${resolvedUrls.length}`,
    `${unknown.length} imágenes referenciadas no salen de backend/public/uploads: ${unknown.join(', ')}`,
  )
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const client = getCliClient({
    apiVersion: API_VERSION,
    token: readWriteToken(),
    useCdn: false,
    // `raw` para poder contar borradores: los recuentos de contenido excluyen
    // `drafts.**` de forma explícita en cada consulta.
    perspective: 'raw',
  })

  console.log('Verificación de la migración')
  console.log(`  Sanity:  ${client.config().projectId}/${client.config().dataset}`)
  console.log(`  uploads: ${UPLOADS_DIR}`)
  console.log(`  sqlite:  ${STRAPI_DB_PATH}`)

  const documents = await verifyCounts(client)
  await verifyReferences(client)
  await verifyTechnologyOrder(client)
  verifyNewlines(documents)
  await verifyAssets(client)

  if (problems.length > 0) {
    throw new Error(`La verificación encontró ${problems.length} problemas:\n  - ${problems.join('\n  - ')}`)
  }

  console.log('\nTodo cuadra.')
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
