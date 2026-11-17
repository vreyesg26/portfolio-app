/**
 * Migración de contenido de Strapi 5 a Sanity.
 *
 *   cd studio
 *   pnpm sanity exec scripts/migrate-from-strapi.ts            # migra
 *   pnpm sanity exec scripts/migrate-from-strapi.ts -- --dry-run  # ensayo sin escribir
 *
 * Requisitos:
 *
 * - Strapi corriendo en local (`cd backend && pnpm develop`). El contenido se
 *   lee por su API REST, no de la base, porque el orden visible de `service`,
 *   `project` y `testimonial` es justo el que devuelve la API sin `sort`.
 * - `backend/.tmp/data.db` legible: de ahí sale el orden curado de las
 *   tecnologías, que no está en ningún campo de la API.
 * - `SANITY_WRITE_TOKEN` en `studio/.env.local` (solo para escribir; el ensayo
 *   no lo necesita).
 *
 * Orden de operaciones:
 *
 *   1. Pre-vuelo: cuenta lo publicado en Strapi y lo compara con la tabla del
 *      diseño (68 documentos, 45 assets). Si no cuadra, aborta sin escribir.
 *   2. Assets: sube los 45 originales de `backend/public/uploads` y construye
 *      el mapa `URL de Strapi -> _id de asset`.
 *   3. Orden: `readTechnologyOrder` para `technology`; el índice de la
 *      respuesta REST para `service`, `project` y `testimonial`.
 *   4. Transformación de los 68 documentos (si algo falta, aborta aquí, antes
 *      de escribir ningún documento).
 *   5. Escritura en dos pasadas: primero los documentos sin referencias, luego
 *      los que referencian (una referencia fuerte a un documento que no existe
 *      la rechaza el Content Lake).
 *   6. Verificación: recuento por tipo, igualdad campo a campo con lo que se
 *      quiso escribir (ahí se comprueba que los `\n` sobrevivieron), ninguna
 *      referencia colgando y cada imagen devolviendo 200.
 *
 * Es idempotente: los `_id` son deterministas y se escribe con
 * `createOrReplace`, así que re-ejecutarlo reescribe en vez de duplicar.
 */
import {existsSync, readFileSync, readdirSync} from 'node:fs'
import {extname, join, resolve} from 'node:path'
import {getCliClient} from 'sanity/cli'
import {readTechnologyOrder} from './lib/strapi-order'
import {
  isStrapiVariant,
  mapBiography,
  mapContact,
  mapFooter,
  mapHeader,
  mapProject,
  mapQualification,
  mapQualificationType,
  mapSectionTitle,
  mapService,
  mapTechnology,
  mapTechnologyCategory,
  mapTestimonial,
} from './lib/transform'
import type {
  AssetMap,
  MigratedDocument,
  StrapiBiography,
  StrapiContact,
  StrapiFooter,
  StrapiHeader,
  StrapiProject,
  StrapiQualification,
  StrapiQualificationType,
  StrapiSectionTitle,
  StrapiService,
  StrapiTechnology,
  StrapiTechnologyCategory,
  StrapiTestimonial,
} from './lib/transform'

// ---------------------------------------------------------------------------
// Lo que el diseño dice que hay que migrar
// ---------------------------------------------------------------------------

/** Recuento esperado por tipo. Verificado contra `backend/.tmp/data.db`. */
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
const EXPECTED_ASSETS = 45

/** Tamaño de página explícito: el de Strapi es 25 y hay 34 tecnologías. */
const PAGE_SIZE = 100

const API_VERSION = '2025-02-19'

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

// ---------------------------------------------------------------------------
// Rutas y secretos
// ---------------------------------------------------------------------------

// `sanity exec` pone SANITY_BASE_PATH en la raíz del Studio; si el script se
// ejecuta de otra forma, se usa el directorio actual.
const STUDIO_DIR = process.env.SANITY_BASE_PATH ?? process.cwd()
const REPO_ROOT = resolve(STUDIO_DIR, '..')
const UPLOADS_DIR = process.env.STRAPI_UPLOADS_DIR ?? join(REPO_ROOT, 'backend/public/uploads')
const STRAPI_DB_PATH = process.env.STRAPI_DB_PATH ?? join(REPO_ROOT, 'backend/.tmp/data.db')

/**
 * Lee un fichero `.env` sin dependencias. **Nunca se imprime ningún valor.**
 */
function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {}

  const values: Record<string, string> = {}

  for (const rawLine of readFileSync(path, 'utf8').split('\n')) {
    const line = rawLine.trim()
    if (line === '' || line.startsWith('#')) continue

    const separator = line.indexOf('=')
    if (separator === -1) continue

    const key = line.slice(0, separator).trim()
    let value = line.slice(separator + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    values[key] = value
  }

  return values
}

// ---------------------------------------------------------------------------
// Lectura de Strapi
// ---------------------------------------------------------------------------

interface StrapiListResponse<T> {
  data?: T[]
  meta?: {pagination?: {page: number; pageSize: number; pageCount: number; total: number}}
}

interface StrapiSingleResponse<T> {
  data?: T | null
}

interface StrapiReader {
  single<T>(path: string, params?: Record<string, string>): Promise<T>
  all<T>(path: string, params?: Record<string, string>): Promise<T[]>
}

function createStrapiReader(baseUrl: string, token: string | undefined): StrapiReader {
  async function request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`/api/${path}`, baseUrl)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)

    let response: Response
    try {
      response = await fetch(url, {
        headers: token ? {Authorization: `Bearer ${token}`} : {},
      })
    } catch (cause) {
      throw new Error(
        `No se puede hablar con Strapi en ${baseUrl} (${String(cause)}). ` +
          'Arráncalo con `cd backend && pnpm develop`, o define STRAPI_URL.',
      )
    }

    if (!response.ok) {
      const hint =
        response.status === 401 || response.status === 403
          ? ' El rol público de este Strapi no tiene permisos de lectura: define STRAPI_API_TOKEN (o deja que se use VITE_STRAPI_TOKEN de frontend/.env).'
          : ''
      throw new Error(`Strapi respondió ${response.status} ${response.statusText} a /api/${path}.${hint}`)
    }

    return (await response.json()) as T
  }

  return {
    async single<T>(path: string, params: Record<string, string> = {}): Promise<T> {
      const body = await request<StrapiSingleResponse<T>>(path, {status: 'published', ...params})
      if (body.data === null || body.data === undefined) {
        throw new Error(`/api/${path} no devolvió ningún documento publicado`)
      }
      return body.data
    },

    /**
     * Pide todas las páginas y comprueba el total contra `meta.pagination`.
     * Sin `pagination[pageSize]` Strapi devolvería 25 de las 34 tecnologías sin
     * avisar.
     */
    async all<T>(path: string, params: Record<string, string> = {}): Promise<T[]> {
      const items: T[] = []
      let page = 1
      let pageCount = 1
      let total: number | undefined

      do {
        const body = await request<StrapiListResponse<T>>(path, {
          status: 'published',
          ...params,
          'pagination[page]': String(page),
          'pagination[pageSize]': String(PAGE_SIZE),
        })

        if (!Array.isArray(body.data)) {
          throw new Error(`/api/${path} no devolvió un array en data`)
        }

        items.push(...body.data)
        pageCount = body.meta?.pagination?.pageCount ?? 1
        total = body.meta?.pagination?.total
        page += 1
      } while (page <= pageCount)

      if (total !== undefined && items.length !== total) {
        throw new Error(
          `/api/${path}: se recibieron ${items.length} elementos de los ${total} que dice Strapi. La paginación no está completa.`,
        )
      }

      return items
    },
  }
}

interface SourceContent {
  biography: StrapiBiography
  contact: StrapiContact
  footer: StrapiFooter
  header: StrapiHeader
  projects: StrapiProject[]
  qualifications: StrapiQualification[]
  qualificationTypes: StrapiQualificationType[]
  sectionTitles: StrapiSectionTitle[]
  services: StrapiService[]
  technologies: StrapiTechnology[]
  technologyCategories: StrapiTechnologyCategory[]
  testimonials: StrapiTestimonial[]
}

/**
 * `populate=*` llega a un nivel: basta para los medios, los componentes
 * repetibles y las relaciones. La *dynamic zone* de `contact` necesita un nivel
 * más (`populate[Contact][populate]=*`) para traer ContactInfo y ContactForm.
 *
 * `service`, `project` y `testimonial` se piden **sin `sort`**: el orden que
 * devuelve la API sin ordenar es el que se ve hoy en el sitio, y es de donde
 * sale su campo `order`.
 */
async function readSourceContent(strapi: StrapiReader): Promise<SourceContent> {
  return {
    // Solo inglés: el es-HN se descarta.
    biography: await strapi.single<StrapiBiography>('biography', {locale: 'en', populate: '*'}),
    contact: await strapi.single<StrapiContact>('contact', {'populate[Contact][populate]': '*'}),
    footer: await strapi.single<StrapiFooter>('footer', {populate: '*'}),
    header: await strapi.single<StrapiHeader>('header', {populate: '*'}),
    projects: await strapi.all<StrapiProject>('projects', {populate: '*'}),
    qualifications: await strapi.all<StrapiQualification>('qualifications', {populate: '*'}),
    qualificationTypes: await strapi.all<StrapiQualificationType>('qualification-types'),
    sectionTitles: await strapi.all<StrapiSectionTitle>('section-titles'),
    services: await strapi.all<StrapiService>('services'),
    technologies: await strapi.all<StrapiTechnology>('technologies', {populate: '*'}),
    technologyCategories: await strapi.all<StrapiTechnologyCategory>('technology-categories'),
    testimonials: await strapi.all<StrapiTestimonial>('testimonials'),
  }
}

// ---------------------------------------------------------------------------
// 1. Pre-vuelo
// ---------------------------------------------------------------------------

/** Los 45 originales de `backend/public/uploads`, sin las miniaturas. */
function listOriginalUploads(): string[] {
  if (!existsSync(UPLOADS_DIR)) {
    throw new Error(
      `No existe ${UPLOADS_DIR}. Ejecuta el script desde studio/ o define STRAPI_UPLOADS_DIR.`,
    )
  }

  const names: string[] = readdirSync(UPLOADS_DIR)

  return names
    .filter((name) => !name.startsWith('.'))
    .filter((name) => !isStrapiVariant(name))
    .sort()
}

function preflight(source: SourceContent, uploads: string[]): void {
  const received: Record<keyof typeof EXPECTED_COUNTS, number> = {
    biography: source.biography ? 1 : 0,
    contact: source.contact ? 1 : 0,
    footer: source.footer ? 1 : 0,
    header: source.header ? 1 : 0,
    project: source.projects.length,
    qualification: source.qualifications.length,
    qualificationType: source.qualificationTypes.length,
    sectionTitle: source.sectionTitles.length,
    service: source.services.length,
    technology: source.technologies.length,
    technologyCategory: source.technologyCategories.length,
    testimonial: source.testimonials.length,
  }

  const problems: string[] = []

  for (const [type, expected] of Object.entries(EXPECTED_COUNTS)) {
    const count = received[type as keyof typeof EXPECTED_COUNTS]
    const status = count === expected ? 'ok' : 'NO CUADRA'
    console.log(`  ${type.padEnd(19)} esperado ${String(expected).padStart(2)}  recibido ${String(count).padStart(2)}  ${status}`)
    if (count !== expected) problems.push(`${type}: esperados ${expected}, recibidos ${count}`)
  }

  const documents = Object.values(received).reduce((sum, count) => sum + count, 0)
  console.log(`  ${'TOTAL documentos'.padEnd(19)} esperado ${EXPECTED_DOCUMENTS}  recibido ${documents}`)
  console.log(`  ${'assets originales'.padEnd(19)} esperado ${EXPECTED_ASSETS}  recibido ${uploads.length}`)

  if (documents !== EXPECTED_DOCUMENTS) {
    problems.push(`total de documentos: esperados ${EXPECTED_DOCUMENTS}, recibidos ${documents}`)
  }
  if (uploads.length !== EXPECTED_ASSETS) {
    problems.push(`assets originales en ${UPLOADS_DIR}: esperados ${EXPECTED_ASSETS}, encontrados ${uploads.length}`)
  }

  if (problems.length > 0) {
    throw new Error(`El pre-vuelo no cuadra, no se escribe nada:\n  - ${problems.join('\n  - ')}`)
  }
}

// ---------------------------------------------------------------------------
// 2. Assets
// ---------------------------------------------------------------------------

type SanityClient = ReturnType<typeof getCliClient>

async function uploadAssets(client: SanityClient, uploads: string[]): Promise<AssetMap> {
  const assetMap: AssetMap = new Map()

  for (const [index, filename] of uploads.entries()) {
    const contentType = MIME_BY_EXTENSION[extname(filename).toLowerCase()]
    if (!contentType) {
      throw new Error(`No sé con qué content-type subir ${filename}: extensión no contemplada.`)
    }

    const asset = await client.assets.upload('image', readFileSync(join(UPLOADS_DIR, filename)), {
      filename,
      contentType,
    })

    assetMap.set(`/uploads/${filename}`, asset._id)
    console.log(`  [${String(index + 1).padStart(2)}/${uploads.length}] ${filename.padEnd(38)} -> ${asset._id}`)
  }

  const distinct = new Set(assetMap.values()).size
  console.log(`  ${uploads.length} ficheros subidos, ${distinct} assets distintos en el dataset.`)
  if (distinct !== uploads.length) {
    // Sanity deduplica por sha1: dos ficheros idénticos comparten asset.
    console.log('  (Sanity deduplica por sha1: hay ficheros idénticos que comparten un mismo asset.)')
  }

  return assetMap
}

/** Mapa de mentira para el ensayo: permite transformar sin subir nada. */
function placeholderAssetMap(uploads: string[]): AssetMap {
  return new Map(uploads.map((filename) => [`/uploads/${filename}`, `image-ENSAYO-${filename}`]))
}

// ---------------------------------------------------------------------------
// 3 y 4. Orden y transformación
// ---------------------------------------------------------------------------

interface Passes {
  withoutReferences: MigratedDocument[]
  withReferences: MigratedDocument[]
}

function buildDocuments(source: SourceContent, assetMap: AssetMap): Passes {
  if (!existsSync(STRAPI_DB_PATH)) {
    throw new Error(`No existe ${STRAPI_DB_PATH}, de donde sale el orden curado de las tecnologías.`)
  }

  const technologyOrder = readTechnologyOrder(STRAPI_DB_PATH)
  console.log(`  orden curado de tecnologías: ${technologyOrder.size} entradas (por documentId, solo publicadas)`)

  if (technologyOrder.size !== EXPECTED_COUNTS.technology) {
    throw new Error(
      `El orden de tecnologías tiene ${technologyOrder.size} entradas y se esperaban ${EXPECTED_COUNTS.technology}.`,
    )
  }

  for (const technology of source.technologies) {
    if (!technologyOrder.has(technology.documentId ?? '')) {
      throw new Error(
        `La tecnología ${technology.title ?? '?'} (${technology.documentId}) no tiene orden en technologies_category_lnk.`,
      )
    }
  }

  const biography = mapBiography(source.biography, assetMap)
  const contact = mapContact(source.contact)
  const footer = mapFooter(source.footer)
  const header = mapHeader(source.header)

  // Un populate que no trajera los componentes dejaría estos arrays vacíos sin
  // avisar, y se perdería medio sitio en silencio. Aquí es un fallo.
  const componentArrays: [string, number][] = [
    ['biography.homeLeft', biography.homeLeft.length],
    ['biography.homeRight', biography.homeRight.length],
    ['biography.socialMediaLinks', biography.socialMediaLinks.length],
    ['contact.talkToMe.contactInfo', contact.talkToMe.contactInfo.length],
    ['contact.writeMe.fields', contact.writeMe.fields.length],
    ['footer.footerLinks', footer.footerLinks.length],
    ['footer.socialMedia', footer.socialMedia.length],
    ['header.navLinks', header.navLinks.length],
  ]

  for (const [field, length] of componentArrays) {
    if (length === 0) {
      throw new Error(`${field} llegó vacío de Strapi: revisa el populate de la API REST.`)
    }
  }

  console.log(`  componentes: ${componentArrays.map(([field, length]) => `${field} ${length}`).join(', ')}`)

  // `order` de service, project y testimonial: el índice de la respuesta REST
  // sin `sort`, que es el orden visible hoy.
  const withoutReferences: MigratedDocument[] = [
    ...source.technologyCategories.map((entry) => mapTechnologyCategory(entry)),
    ...source.qualificationTypes.map((entry) => mapQualificationType(entry)),
    ...source.sectionTitles.map((entry) => mapSectionTitle(entry)),
    ...source.services.map((entry, index) => mapService(entry, index + 1)),
    ...source.testimonials.map((entry, index) => mapTestimonial(entry, index + 1)),
    ...source.projects.map((entry, index) => mapProject(entry, index + 1, assetMap)),
    biography,
    contact,
    footer,
    header,
  ]

  const withReferences: MigratedDocument[] = [
    ...source.technologies.map((entry) =>
      mapTechnology(entry, technologyOrder.get(entry.documentId ?? ''), assetMap),
    ),
    ...source.qualifications.map((entry) => mapQualification(entry)),
  ]

  const documents = [...withoutReferences, ...withReferences]

  if (documents.length !== EXPECTED_DOCUMENTS) {
    throw new Error(`Se transformaron ${documents.length} documentos y se esperaban ${EXPECTED_DOCUMENTS}.`)
  }

  const ids = new Set(documents.map((doc) => doc._id))
  if (ids.size !== documents.length) {
    throw new Error('Hay _id repetidos entre los documentos transformados.')
  }
  const drafts = documents.filter((doc) => doc._id.startsWith('drafts.'))
  if (drafts.length > 0) {
    throw new Error(`Hay documentos con el prefijo drafts.: ${drafts.map((doc) => doc._id).join(', ')}`)
  }

  // Las dos relaciones tienen que haber sobrevivido al populate.
  const withCategory = withReferences.filter(
    (doc) => doc._type === 'technology' && 'category' in doc && doc.category,
  ).length
  const withType = withReferences.filter(
    (doc) => doc._type === 'qualification' && 'qualificationType' in doc && doc.qualificationType,
  ).length

  if (withCategory !== EXPECTED_COUNTS.technology) {
    throw new Error(
      `Solo ${withCategory} de ${EXPECTED_COUNTS.technology} tecnologías traen categoría: revisa el populate.`,
    )
  }
  if (withType !== EXPECTED_COUNTS.qualification) {
    throw new Error(
      `Solo ${withType} de ${EXPECTED_COUNTS.qualification} titulaciones traen tipo: revisa el populate.`,
    )
  }

  console.log(`  ${documents.length} documentos transformados: ${withoutReferences.length} sin referencias y ${withReferences.length} con referencias`)
  console.log(`  referencias: ${withCategory} technology -> technologyCategory, ${withType} qualification -> qualificationType`)

  return {withoutReferences, withReferences}
}

// ---------------------------------------------------------------------------
// 5. Escritura
// ---------------------------------------------------------------------------

/** Lo que espera `createOrReplace`: un objeto plano con `_id` y `_type`. */
type DocumentStub = {_id: string; _type: string; [field: string]: unknown}

async function writeDocuments(
  client: SanityClient,
  documents: MigratedDocument[],
  label: string,
): Promise<void> {
  const transaction = client.transaction()

  for (const document of documents) {
    // El spread deja un objeto plano, que es lo que espera createOrReplace.
    const stub: DocumentStub = {...document}
    transaction.createOrReplace(stub)
  }

  await transaction.commit()
  console.log(`  ${label}: ${documents.length} documentos publicados`)
}

// ---------------------------------------------------------------------------
// 6. Verificación
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true

  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]))
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    return keysA.length === keysB.length && keysA.every((key) => deepEqual(a[key], b[key]))
  }

  return false
}

/**
 * Cuenta, en profundidad, cuántos valores de texto llevan un `\n`. Los tres
 * campos que se renderizan con `white-space: pre-line` dependen de que esos
 * saltos lleguen intactos, así que la cuenta del dataset tiene que ser la misma
 * que la de lo transformado.
 */
function countNewlineFields(values: unknown): number {
  if (typeof values === 'string') return values.includes('\n') ? 1 : 0

  if (Array.isArray(values)) {
    return values.reduce<number>((sum, item) => sum + countNewlineFields(item), 0)
  }

  if (isPlainObject(values)) {
    return Object.entries(values)
      .filter(([key]) => !key.startsWith('_'))
      .reduce((sum, [, value]) => sum + countNewlineFields(value), 0)
  }

  return 0
}

async function verify(client: SanityClient, documents: MigratedDocument[]): Promise<void> {
  const problems: string[] = []

  // Recuento por tipo.
  const counts = await client.fetch<Record<string, number>>(
    `{${Object.keys(EXPECTED_COUNTS)
      .map((type) => `"${type}": count(*[_type == "${type}" && !(_id in path("drafts.**"))])`)
      .join(', ')}}`,
  )

  for (const [type, expected] of Object.entries(EXPECTED_COUNTS)) {
    const count = counts[type] ?? 0
    console.log(`  ${type.padEnd(19)} ${String(count).padStart(2)}/${expected}`)
    if (count !== expected) problems.push(`${type}: hay ${count} documentos y se esperaban ${expected}`)
  }

  // Informativo: la migración no escribe borradores (se comprueba en
  // buildDocuments y en los recuentos por tipo, que los excluyen). Si aparece
  // alguno es porque alguien ha editado en el Studio, no por el script.
  const drafts = await client.fetch<number>('count(*[_id in path("drafts.**")])')
  console.log(`  borradores en el dataset: ${drafts} (la migración no escribe ninguno)`)

  // Igualdad campo a campo con lo que se quiso escribir. Aquí es donde se
  // comprueba que los `\n` sobrevivieron y que cada _key está en su sitio.
  const ids = documents.map((doc) => doc._id)
  const written = await client.fetch<Record<string, unknown>[]>('*[_id in $ids]', {ids})
  const byId = new Map(written.map((doc) => [doc._id as string, doc]))

  for (const document of documents) {
    const remote = byId.get(document._id)
    if (!remote) {
      problems.push(`${document._id}: no está en el dataset`)
      continue
    }

    for (const [field, value] of Object.entries(document)) {
      if (field === '_id' || field === '_type') continue
      if (!deepEqual(remote[field], value)) {
        problems.push(
          `${document._id}.${field} no coincide: se escribió ${JSON.stringify(value)} y hay ${JSON.stringify(remote[field])}`,
        )
      }
    }
  }
  console.log(`  ${documents.length} documentos comparados campo a campo con lo transformado`)

  // Los saltos de línea, explícitos en el log. Se cuentan sobre lo que ya se
  // ha leído del dataset (no con GROQ: `match` tokeniza y no sirve para buscar
  // un `\n`) y se comparan con lo que se quiso escribir.
  const newlinesWritten = countNewlineFields(documents)
  const newlinesRemote = countNewlineFields(written)
  console.log(
    `  campos con saltos de línea: ${newlinesRemote} en el dataset, ${newlinesWritten} en lo transformado`,
  )
  if (newlinesRemote !== newlinesWritten) {
    problems.push(`se perdieron saltos de línea: ${newlinesWritten} campos los tenían y quedan ${newlinesRemote}`)
  }
  if (newlinesWritten === 0) {
    problems.push('ningún campo tiene saltos de línea, cuando el contenido real los tiene')
  }

  // Referencias que no resuelven.
  const references = await client.fetch<{technology: number; qualification: number}>(
    `{
      "technology": count(*[_type == "technology" && !defined(category->_id)]),
      "qualification": count(*[_type == "qualification" && !defined(qualificationType->_id)])
    }`,
  )
  console.log(
    `  referencias sin resolver: technology.category ${references.technology}, qualification.qualificationType ${references.qualification}`,
  )
  if (references.technology > 0) problems.push(`${references.technology} technology sin categoría que resuelva`)
  if (references.qualification > 0) {
    problems.push(`${references.qualification} qualification sin tipo que resuelva`)
  }

  // Cada imagen tiene que devolver 200.
  const images = await client.fetch<{
    technologyIcons: (string | null)[]
    projectCovers: (string | null)[]
    biographyPhoto: string | null
  }>(
    `{
      "technologyIcons": *[_type == "technology"].icon.asset->url,
      "projectCovers": *[_type == "project"].cover.asset->url,
      "biographyPhoto": *[_id == "biography"][0].photo.asset->url
    }`,
  )

  // Se comprueban las longitudes además de los valores: según la versión de
  // GROQ, un asset que no resuelve puede aparecer como null o desaparecer del
  // array, y las dos cosas son un fallo.
  if (images.technologyIcons.length !== EXPECTED_COUNTS.technology) {
    problems.push(`se esperaban ${EXPECTED_COUNTS.technology} iconos de technology y hay ${images.technologyIcons.length}`)
  }
  if (images.projectCovers.length !== EXPECTED_COUNTS.project) {
    problems.push(`se esperaban ${EXPECTED_COUNTS.project} portadas de project y hay ${images.projectCovers.length}`)
  }
  if (typeof images.biographyPhoto !== 'string') {
    problems.push('biography.photo no resuelve a ningún asset')
  }

  const imageUrls = [...images.technologyIcons, ...images.projectCovers, images.biographyPhoto]
  const urls = [...new Set(imageUrls.filter((url): url is string => typeof url === 'string'))]
  if (imageUrls.some((url) => typeof url !== 'string')) {
    problems.push(`${imageUrls.filter((url) => typeof url !== 'string').length} imágenes no resuelven a un asset`)
  }

  let ok = 0
  for (const url of urls) {
    const response = await fetch(url, {method: 'HEAD'})
    if (response.ok) ok += 1
    else problems.push(`la imagen ${url} devolvió ${response.status}`)
  }
  console.log(`  imágenes que devuelven 200: ${ok}/${urls.length}`)

  if (problems.length > 0) {
    throw new Error(`La verificación encontró problemas:\n  - ${problems.join('\n  - ')}`)
  }
}

// ---------------------------------------------------------------------------
// Ensayo
// ---------------------------------------------------------------------------

function printPlan(passes: Passes): void {
  const documents = [...passes.withoutReferences, ...passes.withReferences]
  const byType = new Map<string, string[]>()

  for (const document of documents) {
    const ids = byType.get(document._type) ?? []
    ids.push(document._id)
    byType.set(document._type, ids)
  }

  for (const [type, ids] of [...byType.entries()].sort()) {
    console.log(`  ${type.padEnd(19)} ${String(ids.length).padStart(2)}  ${ids[0]}${ids.length > 1 ? ', ...' : ''}`)
  }

  const sample = passes.withReferences.find((doc) => doc._type === 'technology')
  console.log('\nEjemplo de documento transformado:')
  console.log(JSON.stringify(sample, null, 2))
  console.log('\nEnsayo terminado: no se ha subido ningún asset ni escrito ningún documento.')
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  const studioEnv = readEnvFile(join(STUDIO_DIR, '.env.local'))
  const frontendEnv = readEnvFile(join(REPO_ROOT, 'frontend/.env'))

  const strapiUrl =
    process.env.STRAPI_URL ?? studioEnv.STRAPI_URL ?? frontendEnv.VITE_STRAPI_HOST ?? 'http://localhost:1337'
  const strapiToken =
    process.env.STRAPI_API_TOKEN ?? studioEnv.STRAPI_API_TOKEN ?? frontendEnv.VITE_STRAPI_TOKEN

  const writeToken = process.env.SANITY_WRITE_TOKEN ?? studioEnv.SANITY_WRITE_TOKEN
  if (!writeToken && !dryRun) {
    throw new Error('Falta SANITY_WRITE_TOKEN en studio/.env.local (modo 600, fuera de git).')
  }

  // projectId y dataset salen de sanity.cli.ts; el token, de .env.local.
  const client = getCliClient({
    apiVersion: API_VERSION,
    token: writeToken,
    useCdn: false,
    perspective: 'published',
  })

  console.log(`Migración de Strapi a Sanity${dryRun ? ' (ENSAYO: no se escribe nada)' : ''}`)
  console.log(`  Strapi:  ${strapiUrl} (token ${strapiToken ? 'sí' : 'no'})`)
  console.log(`  Sanity:  ${client.config().projectId}/${client.config().dataset}`)
  console.log(`  uploads: ${UPLOADS_DIR}`)
  console.log(`  sqlite:  ${STRAPI_DB_PATH}`)

  const strapi = createStrapiReader(strapiUrl, strapiToken)

  console.log('\n1. Pre-vuelo')
  const uploads = listOriginalUploads()
  const source = await readSourceContent(strapi)
  preflight(source, uploads)

  console.log(`\n2. Assets${dryRun ? ' (se omite la subida)' : ''}`)
  const assetMap = dryRun ? placeholderAssetMap(uploads) : await uploadAssets(client, uploads)

  console.log('\n3 y 4. Orden y transformación')
  const passes = buildDocuments(source, assetMap)

  if (dryRun) {
    console.log('\nPlan:')
    printPlan(passes)
    return
  }

  console.log('\n5. Escritura en dos pasadas')
  await writeDocuments(client, passes.withoutReferences, 'sin referencias')
  await writeDocuments(client, passes.withReferences, 'con referencias')

  console.log('\n6. Verificación')
  await verify(client, [...passes.withoutReferences, ...passes.withReferences])

  console.log('\nMigración terminada.')
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
