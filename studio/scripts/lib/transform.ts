/**
 * Transformaciones puras de Strapi 5 a Sanity.
 *
 * Aquí no hay red ni disco: cada función recibe la respuesta de la API REST de
 * Strapi (ya deserializada) y devuelve el documento de Sanity listo para
 * escribir. La subida de assets y la escritura viven en
 * `scripts/migrate-from-strapi.ts`.
 *
 * Reglas que cumple todo lo de este archivo:
 *
 * - Los `_id` son deterministas (`tipo-documentId`), para que el script sea
 *   idempotente. Los 4 singletons usan su nombre de tipo como `_id`.
 * - Nunca se escribe el prefijo `drafts.`: todo se migra publicado.
 * - Todo miembro de un array lleva `_key` además de `_type`.
 * - Los `uid` de Strapi pasan a `{_type: 'slug', current}`.
 * - Las relaciones pasan a `{_type: 'reference', _ref}`; las relaciones
 *   inversas de Strapi (`qualificationType.qualifications`,
 *   `technologyCategory.technologies`) **no se escriben**: no existen en Sanity
 *   y se resuelven en GROQ.
 * - El texto se copia literalmente: los `\n` de `biography.presentation`,
 *   `service.title`, `personalInfo.description` y `about.description` se
 *   renderizan con `white-space: pre-line` y tienen que sobrevivir intactos.
 *   Por eso aquí no se recorta, ni se normaliza, ni se toca ninguna cadena.
 * - Un campo requerido ausente o un asset que falta abortan con un error: en
 *   una migración son fallos, no casos válidos.
 */

// ---------------------------------------------------------------------------
// Formas de entrada: lo que devuelve la API REST de Strapi 5
// ---------------------------------------------------------------------------

export interface StrapiEntry {
  id?: number | string | null
  documentId?: string | null
}

export interface StrapiMedia {
  id?: number | string | null
  url?: string | null
  alternativeText?: string | null
  mime?: string | null
}

export interface StrapiComponent {
  id?: number | string | null
}

export interface StrapiPersonalInfo extends StrapiComponent {
  title?: string | null
  description?: string | null
}

export interface StrapiAbout extends StrapiComponent {
  title?: string | null
  description?: string | null
}

export interface StrapiSocialMedia extends StrapiComponent {
  icon?: string | null
  url?: string | null
}

export interface StrapiNavLink extends StrapiComponent {
  slug?: string | null
  label?: string | null
  icon?: string | null
}

export interface StrapiContactInfo extends StrapiComponent {
  label?: string | null
  value?: string | null
  url?: string | null
}

export interface StrapiContactForm extends StrapiComponent {
  label?: string | null
  placeholder?: string | null
  /** En Sanity pasa a llamarse `inputType`. */
  type?: string | null
  name?: string | null
  slug?: string | null
  longText?: boolean | null
}

/**
 * Una entrada de la *dynamic zone* `contact.Contact`. Strapi admite
 * `contact.talk-to-me` y `contact.write-me`; una sola forma cubre las dos.
 */
export interface StrapiZoneEntry extends StrapiComponent {
  __component?: string | null
  icon?: string | null
  title?: string | null
  ContactInfo?: StrapiContactInfo[] | null
  ContactForm?: StrapiContactForm[] | null
}

export interface StrapiBiography extends StrapiEntry {
  locale?: string | null
  presentation?: string | null
  photo?: StrapiMedia | null
  HomeLeft?: StrapiPersonalInfo[] | null
  HomeRight?: StrapiAbout[] | null
  SocialMediaLinks?: StrapiSocialMedia[] | null
}

export interface StrapiContact extends StrapiEntry {
  icon?: string | null
  buttonLabel?: string | null
  Contact?: StrapiZoneEntry[] | null
}

export interface StrapiFooter extends StrapiEntry {
  logoName?: string | null
  description?: string | null
  FooterLinks?: StrapiNavLink[] | null
  SocialMedia?: StrapiSocialMedia[] | null
}

export interface StrapiHeader extends StrapiEntry {
  logoName?: string | null
  NavLinks?: StrapiNavLink[] | null
}

export interface StrapiProject extends StrapiEntry {
  name?: string | null
  technologies?: string | null
  url?: string | null
  cover?: StrapiMedia | null
}

export interface StrapiQualificationType extends StrapiEntry {
  icon?: string | null
  title?: string | null
  order?: number | null
  /** Relación inversa de Strapi. No se migra. */
  qualifications?: StrapiEntry[] | null
}

export interface StrapiQualification extends StrapiEntry {
  title?: string | null
  institution?: string | null
  dateInfo?: string | null
  order?: number | null
  qualificationType?: StrapiQualificationType | null
}

export interface StrapiSectionTitle extends StrapiEntry {
  key?: string | null
  title?: string | null
  subtitle?: string | null
  order?: number | null
}

export interface StrapiService extends StrapiEntry {
  icon?: string | null
  title?: string | null
  description?: string | null
}

export interface StrapiTechnologyCategory extends StrapiEntry {
  title?: string | null
  slug?: string | null
  icon?: string | null
  order?: number | null
  /** Relación inversa de Strapi. No se migra. */
  technologies?: StrapiEntry[] | null
}

export interface StrapiTechnology extends StrapiEntry {
  title?: string | null
  level?: string | null
  icon?: StrapiMedia | null
  category?: StrapiTechnologyCategory | null
}

export interface StrapiTestimonial extends StrapiEntry {
  description?: string | null
  clientName?: string | null
}

// ---------------------------------------------------------------------------
// Formas de salida: lo que se escribe en Sanity
// ---------------------------------------------------------------------------

export interface SanityReference {
  _type: 'reference'
  _ref: string
}

export interface SanityImage {
  _type: 'image'
  asset: SanityReference
  alt?: string
}

export interface SanitySlug {
  _type: 'slug'
  current: string
}

export type Keyed<T> = T & {_key: string}

export interface PersonalInfoObject {
  _type: 'personalInfo'
  title: string
  description: string
}

export interface AboutObject {
  _type: 'about'
  title: string
  description: string
}

export interface SocialMediaLinkObject {
  _type: 'socialMediaLink'
  icon: string
  url: string
}

export interface NavLinkObject {
  _type: 'navLink'
  slug: string
  label: string
  icon?: string
}

export interface ContactInfoObject {
  _type: 'contactInfo'
  label: string
  value: string
  url?: string
}

export interface ContactFormFieldObject {
  _type: 'contactFormField'
  label: string
  placeholder: string
  inputType: string
  name: string
  slug: string
  longText: boolean
}

export interface TalkToMeObject {
  _type: 'talkToMe'
  icon: string
  title: string
  contactInfo: Keyed<ContactInfoObject>[]
}

export interface WriteMeObject {
  _type: 'writeMe'
  icon: string
  title: string
  fields: Keyed<ContactFormFieldObject>[]
}

export interface BiographyDoc {
  _id: string
  _type: 'biography'
  presentation: string
  photo: SanityImage
  homeLeft: Keyed<PersonalInfoObject>[]
  homeRight: Keyed<AboutObject>[]
  socialMediaLinks: Keyed<SocialMediaLinkObject>[]
}

export interface ContactDoc {
  _id: string
  _type: 'contact'
  icon: string
  buttonLabel: string
  talkToMe: TalkToMeObject
  writeMe: WriteMeObject
}

export interface FooterDoc {
  _id: string
  _type: 'footer'
  logoName: string
  description: string
  footerLinks: Keyed<NavLinkObject>[]
  socialMedia: Keyed<SocialMediaLinkObject>[]
}

export interface HeaderDoc {
  _id: string
  _type: 'header'
  /** Opcional en el esquema, a diferencia de `footer.logoName`. */
  logoName?: string
  navLinks: Keyed<NavLinkObject>[]
}

export interface ProjectDoc {
  _id: string
  _type: 'project'
  name: string
  technologies: string
  url: string
  cover: SanityImage
  order: number
}

export interface QualificationDoc {
  _id: string
  _type: 'qualification'
  title: string
  institution: string
  dateInfo: string
  qualificationType?: SanityReference
  order: number
}

export interface QualificationTypeDoc {
  _id: string
  _type: 'qualificationType'
  icon: string
  title: string
  order: number
}

export interface SectionTitleDoc {
  _id: string
  _type: 'sectionTitle'
  key: SanitySlug
  title: string
  subtitle: string
  order: number
}

export interface ServiceDoc {
  _id: string
  _type: 'service'
  icon: string
  title: string
  description: string
  order: number
}

export interface TechnologyCategoryDoc {
  _id: string
  _type: 'technologyCategory'
  title?: string
  slug?: SanitySlug
  icon?: string
  order: number
}

export interface TechnologyDoc {
  _id: string
  _type: 'technology'
  icon: SanityImage
  title: string
  level: TechnologyLevel
  category?: SanityReference
  order: number
}

export interface TestimonialDoc {
  _id: string
  _type: 'testimonial'
  description: string
  clientName: string
  order: number
}

export type MigratedDocument =
  | BiographyDoc
  | ContactDoc
  | FooterDoc
  | HeaderDoc
  | ProjectDoc
  | QualificationDoc
  | QualificationTypeDoc
  | SectionTitleDoc
  | ServiceDoc
  | TechnologyCategoryDoc
  | TechnologyDoc
  | TestimonialDoc

/** `URL de Strapi -> _id del asset de Sanity`. */
export type AssetMap = Map<string, string>

// ---------------------------------------------------------------------------
// _id deterministas
// ---------------------------------------------------------------------------

/** Los 4 singletons usan su nombre de tipo como `_id`. */
export const SINGLETON_IDS = {
  biography: 'biography',
  contact: 'contact',
  footer: 'footer',
  header: 'header',
} as const

/**
 * `_id` determinista y legible para los tipos de colección, derivado del
 * `documentId` de Strapi (que borrador y publicado comparten). Re-ejecutar la
 * migración reescribe los mismos documentos en vez de duplicarlos.
 */
export function toSanityId(type: string, strapiDocumentId: string): string {
  if (typeof strapiDocumentId !== 'string' || strapiDocumentId.length === 0) {
    throw new Error(`No se puede construir un _id de ${type} sin documentId (${JSON.stringify(strapiDocumentId)})`)
  }
  return `${type}-${strapiDocumentId}`
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

/**
 * Prefijos de las miniaturas que genera Strapi al subir una imagen raster.
 * Solo se migran los originales. `medium_` cuenta: en
 * `backend/public/uploads` hay 9 `thumbnail_`, 9 `small_`, 2 `medium_` y 2
 * `large_`, y son justo los 22 que sobran para dejar los 45 originales.
 */
export const STRAPI_VARIANT_PREFIXES = ['thumbnail_', 'small_', 'medium_', 'large_'] as const

/** `true` si el fichero es una miniatura generada por Strapi y no un original. */
export function isStrapiVariant(filename: string): boolean {
  return STRAPI_VARIANT_PREFIXES.some((prefix) => filename.startsWith(prefix))
}

/**
 * Referencia de imagen de Sanity a partir de la URL que trae Strapi.
 *
 * Lanza si la URL no está en el mapa: un asset ausente es un fallo de
 * migración, no un caso válido. `alternativeText` se arrastra a `alt` cuando
 * existe (las 9 imágenes raster) y se omite cuando no (los 36 SVG).
 */
export function mapAssetReference(
  strapiUrl: string,
  assetMap: AssetMap,
  alternativeText?: string | null,
): SanityImage {
  const assetId = assetMap.get(strapiUrl) ?? assetMap.get(assetPath(strapiUrl))

  if (assetId === undefined) {
    throw new Error(
      `El asset ${strapiUrl} no está en el mapa de assets subidos (${assetMap.size} entradas). ` +
        'Un asset ausente es un fallo de migración: revisa la subida de backend/public/uploads.',
    )
  }

  const image: SanityImage = {_type: 'image', asset: {_type: 'reference', _ref: assetId}}
  const alt = optionalString(alternativeText)
  if (alt !== undefined) image.alt = alt

  return image
}

/**
 * `_key` de un miembro de array. Se deriva del `id` del componente de Strapi,
 * que es estable entre ejecuciones; si no viene, se cae al índice.
 */
export function toKey(component: StrapiComponent | null | undefined, index: number): string {
  const id = component?.id

  if (typeof id === 'number' && Number.isFinite(id)) return String(id)
  if (typeof id === 'string' && id.length > 0) return id

  return String(index)
}

// ---------------------------------------------------------------------------
// Objetos de array
// ---------------------------------------------------------------------------

export function mapPersonalInfos(
  items: StrapiPersonalInfo[] | null | undefined,
): Keyed<PersonalInfoObject>[] {
  return (items ?? []).map((item, index) => ({
    _type: 'personalInfo',
    _key: toKey(item, index),
    title: requireString(item.title, 'personalInfo.title'),
    description: requireString(item.description, 'personalInfo.description'),
  }))
}

export function mapAbouts(items: StrapiAbout[] | null | undefined): Keyed<AboutObject>[] {
  return (items ?? []).map((item, index) => ({
    _type: 'about',
    _key: toKey(item, index),
    title: requireString(item.title, 'about.title'),
    description: requireString(item.description, 'about.description'),
  }))
}

export function mapSocialMediaLinks(
  items: StrapiSocialMedia[] | null | undefined,
): Keyed<SocialMediaLinkObject>[] {
  return (items ?? []).map((item, index) => ({
    _type: 'socialMediaLink',
    _key: toKey(item, index),
    icon: requireString(item.icon, 'socialMediaLink.icon'),
    url: requireString(item.url, 'socialMediaLink.url'),
  }))
}

export function mapNavLinks(items: StrapiNavLink[] | null | undefined): Keyed<NavLinkObject>[] {
  return (items ?? []).map((item, index) => {
    const navLink: Keyed<NavLinkObject> = {
      _type: 'navLink',
      _key: toKey(item, index),
      slug: requireString(item.slug, 'navLink.slug'),
      label: requireString(item.label, 'navLink.label'),
    }

    // `icon` es opcional: los 3 enlaces del footer lo tienen a null.
    const icon = optionalString(item.icon)
    if (icon !== undefined) navLink.icon = icon

    return navLink
  })
}

export function mapContactInfos(
  items: StrapiContactInfo[] | null | undefined,
): Keyed<ContactInfoObject>[] {
  return (items ?? []).map((item, index) => {
    const contactInfo: Keyed<ContactInfoObject> = {
      _type: 'contactInfo',
      _key: toKey(item, index),
      label: requireString(item.label, 'contactInfo.label'),
      value: requireString(item.value, 'contactInfo.value'),
    }

    // `url` es opcional: el correo no la tiene.
    const url = optionalString(item.url)
    if (url !== undefined) contactInfo.url = url

    return contactInfo
  })
}

export function mapContactFormFields(
  items: StrapiContactForm[] | null | undefined,
): Keyed<ContactFormFieldObject>[] {
  return (items ?? []).map((item, index) => ({
    _type: 'contactFormField',
    _key: toKey(item, index),
    label: requireString(item.label, 'contactFormField.label'),
    placeholder: requireString(item.placeholder, 'contactFormField.placeholder'),
    // Strapi lo llama `type`; junto al `_type` de Sanity confunde.
    inputType: requireString(item.type, 'contactFormField.inputType'),
    name: requireString(item.name, 'contactFormField.name'),
    slug: requireString(item.slug, 'contactFormField.slug'),
    longText: requireBoolean(item.longText, 'contactFormField.longText'),
  }))
}

// ---------------------------------------------------------------------------
// Singletons
// ---------------------------------------------------------------------------

export function mapBiography(entry: StrapiBiography, assetMap: AssetMap): BiographyDoc {
  return {
    _id: SINGLETON_IDS.biography,
    _type: 'biography',
    presentation: requireString(entry.presentation, 'biography.presentation'),
    photo: mapAssetReference(
      requireString(entry.photo?.url, 'biography.photo.url'),
      assetMap,
      entry.photo?.alternativeText,
    ),
    homeLeft: mapPersonalInfos(entry.HomeLeft),
    homeRight: mapAbouts(entry.HomeRight),
    socialMediaLinks: mapSocialMediaLinks(entry.SocialMediaLinks),
  }
}

/** Discriminadores de la *dynamic zone* `contact.Contact`. */
export const ZONE_COMPONENTS = {
  talkToMe: 'contact.talk-to-me',
  writeMe: 'contact.write-me',
} as const

/**
 * La *dynamic zone* desaparece: se parte en dos campos con nombre, repartiendo
 * por el discriminador `__component` y no por la posición (que es como lo lee
 * hoy el frontend y lo que se rompería si alguien los reordenara).
 */
export function mapContact(entry: StrapiContact): ContactDoc {
  const zone = entry.Contact ?? []
  const talk = zone.find((item) => item.__component === ZONE_COMPONENTS.talkToMe)
  const write = zone.find((item) => item.__component === ZONE_COMPONENTS.writeMe)

  if (!talk) {
    throw new Error(
      `La dynamic zone contact.Contact no trae ninguna entrada ${ZONE_COMPONENTS.talkToMe} ` +
        `(componentes recibidos: ${JSON.stringify(zone.map((item) => item.__component))})`,
    )
  }
  if (!write) {
    throw new Error(
      `La dynamic zone contact.Contact no trae ninguna entrada ${ZONE_COMPONENTS.writeMe} ` +
        `(componentes recibidos: ${JSON.stringify(zone.map((item) => item.__component))})`,
    )
  }

  return {
    _id: SINGLETON_IDS.contact,
    _type: 'contact',
    icon: requireString(entry.icon, 'contact.icon'),
    buttonLabel: requireString(entry.buttonLabel, 'contact.buttonLabel'),
    talkToMe: {
      _type: 'talkToMe',
      icon: requireString(talk.icon, 'talkToMe.icon'),
      title: requireString(talk.title, 'talkToMe.title'),
      contactInfo: mapContactInfos(talk.ContactInfo),
    },
    writeMe: {
      _type: 'writeMe',
      icon: requireString(write.icon, 'writeMe.icon'),
      title: requireString(write.title, 'writeMe.title'),
      fields: mapContactFormFields(write.ContactForm),
    },
  }
}

export function mapFooter(entry: StrapiFooter): FooterDoc {
  return {
    _id: SINGLETON_IDS.footer,
    _type: 'footer',
    logoName: requireString(entry.logoName, 'footer.logoName'),
    description: requireString(entry.description, 'footer.description'),
    footerLinks: mapNavLinks(entry.FooterLinks),
    socialMedia: mapSocialMediaLinks(entry.SocialMedia),
  }
}

export function mapHeader(entry: StrapiHeader): HeaderDoc {
  const doc: HeaderDoc = {
    _id: SINGLETON_IDS.header,
    _type: 'header',
    navLinks: mapNavLinks(entry.NavLinks),
  }

  // `header.logoName` es opcional en el esquema (el del footer no lo es).
  const logoName = optionalString(entry.logoName)
  if (logoName !== undefined) doc.logoName = logoName

  return doc
}

// ---------------------------------------------------------------------------
// Colecciones
// ---------------------------------------------------------------------------

/**
 * `order` no existe en Strapi para `project`: lo pone el script a partir del
 * índice en la respuesta REST sin `sort`, que es el orden visible hoy.
 */
export function mapProject(
  entry: StrapiProject,
  order: number | undefined,
  assetMap: AssetMap,
): ProjectDoc {
  return {
    _id: toSanityId('project', requireString(entry.documentId, 'project.documentId')),
    _type: 'project',
    name: requireString(entry.name, 'project.name'),
    technologies: requireString(entry.technologies, 'project.technologies'),
    url: requireString(entry.url, 'project.url'),
    cover: mapAssetReference(
      requireString(entry.cover?.url, 'project.cover.url'),
      assetMap,
      entry.cover?.alternativeText,
    ),
    order: requireNumber(order, 'project.order'),
  }
}

export function mapQualification(entry: StrapiQualification): QualificationDoc {
  const doc: QualificationDoc = {
    _id: toSanityId('qualification', requireString(entry.documentId, 'qualification.documentId')),
    _type: 'qualification',
    title: requireString(entry.title, 'qualification.title'),
    institution: requireString(entry.institution, 'qualification.institution'),
    dateInfo: requireString(entry.dateInfo, 'qualification.dateInfo'),
    order: requireNumber(entry.order, 'qualification.order'),
  }

  if (entry.qualificationType) {
    doc.qualificationType = {
      _type: 'reference',
      _ref: toSanityId(
        'qualificationType',
        requireString(entry.qualificationType.documentId, 'qualification.qualificationType.documentId'),
      ),
    }
  }

  return doc
}

/** La relación inversa `qualifications` no se escribe: se resuelve en GROQ. */
export function mapQualificationType(entry: StrapiQualificationType): QualificationTypeDoc {
  return {
    _id: toSanityId('qualificationType', requireString(entry.documentId, 'qualificationType.documentId')),
    _type: 'qualificationType',
    icon: requireString(entry.icon, 'qualificationType.icon'),
    title: requireString(entry.title, 'qualificationType.title'),
    order: requireNumber(entry.order, 'qualificationType.order'),
  }
}

export function mapSectionTitle(entry: StrapiSectionTitle): SectionTitleDoc {
  return {
    _id: toSanityId('sectionTitle', requireString(entry.documentId, 'sectionTitle.documentId')),
    _type: 'sectionTitle',
    key: {_type: 'slug', current: requireString(entry.key, 'sectionTitle.key')},
    title: requireString(entry.title, 'sectionTitle.title'),
    subtitle: requireString(entry.subtitle, 'sectionTitle.subtitle'),
    order: requireNumber(entry.order, 'sectionTitle.order'),
  }
}

/**
 * `order` no existe en Strapi para `service`: lo pone el script a partir del
 * índice en la respuesta REST sin `sort`.
 */
export function mapService(entry: StrapiService, order: number | undefined): ServiceDoc {
  return {
    _id: toSanityId('service', requireString(entry.documentId, 'service.documentId')),
    _type: 'service',
    icon: requireString(entry.icon, 'service.icon'),
    // Lleva un `\n` real ("UI/UX\nDesign") y se renderiza con pre-line.
    title: requireString(entry.title, 'service.title'),
    description: requireString(entry.description, 'service.description'),
    order: requireNumber(order, 'service.order'),
  }
}

/** La relación inversa `technologies` no se escribe: se resuelve en GROQ. */
export function mapTechnologyCategory(entry: StrapiTechnologyCategory): TechnologyCategoryDoc {
  const doc: TechnologyCategoryDoc = {
    _id: toSanityId('technologyCategory', requireString(entry.documentId, 'technologyCategory.documentId')),
    _type: 'technologyCategory',
    order: requireNumber(entry.order, 'technologyCategory.order'),
  }

  const title = optionalString(entry.title)
  if (title !== undefined) doc.title = title

  const slug = optionalString(entry.slug)
  if (slug !== undefined) doc.slug = {_type: 'slug', current: slug}

  const icon = optionalString(entry.icon)
  if (icon !== undefined) doc.icon = icon

  return doc
}

export const TECHNOLOGY_LEVELS = ['Basic', 'Intermediate', 'Advanced'] as const
export type TechnologyLevel = (typeof TECHNOLOGY_LEVELS)[number]

/**
 * `order` viene del orden curado de `technologies_category_lnk`, que lee
 * `readTechnologyOrder`. Es por categoría, así que hay órdenes repetidos entre
 * categorías distintas.
 */
export function mapTechnology(
  entry: StrapiTechnology,
  order: number | undefined,
  assetMap: AssetMap,
): TechnologyDoc {
  const doc: TechnologyDoc = {
    _id: toSanityId('technology', requireString(entry.documentId, 'technology.documentId')),
    _type: 'technology',
    icon: mapAssetReference(
      requireString(entry.icon?.url, 'technology.icon.url'),
      assetMap,
      entry.icon?.alternativeText,
    ),
    title: requireString(entry.title, 'technology.title'),
    level: requireTechnologyLevel(entry.level, 'technology.level'),
    order: requireNumber(order, 'technology.order'),
  }

  if (entry.category) {
    doc.category = {
      _type: 'reference',
      _ref: toSanityId(
        'technologyCategory',
        requireString(entry.category.documentId, 'technology.category.documentId'),
      ),
    }
  }

  return doc
}

/**
 * `order` no existe en Strapi para `testimonial`: lo pone el script a partir
 * del índice en la respuesta REST sin `sort`.
 */
export function mapTestimonial(entry: StrapiTestimonial, order: number | undefined): TestimonialDoc {
  return {
    _id: toSanityId('testimonial', requireString(entry.documentId, 'testimonial.documentId')),
    _type: 'testimonial',
    description: requireString(entry.description, 'testimonial.description'),
    clientName: requireString(entry.clientName, 'testimonial.clientName'),
    order: requireNumber(order, 'testimonial.order'),
  }
}

// ---------------------------------------------------------------------------
// Validación de campos
// ---------------------------------------------------------------------------

/** Quita el origen de una URL absoluta: `http://host/uploads/x.svg` -> `/uploads/x.svg`. */
function assetPath(url: string): string {
  if (typeof url !== 'string') return ''
  if (!/^https?:\/\//i.test(url)) return url

  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/**
 * El esquema tiene `--enforce-required-fields`: un requerido ausente no se
 * puede escribir, así que aborta aquí con el nombre del campo.
 */
function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Falta el campo requerido ${field} (valor recibido: ${JSON.stringify(value)})`)
  }
  return value
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Falta el campo requerido ${field} (valor recibido: ${JSON.stringify(value)})`)
  }
  return value
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Falta el campo requerido ${field} (valor recibido: ${JSON.stringify(value)})`)
  }
  return value
}

function requireTechnologyLevel(value: unknown, field: string): TechnologyLevel {
  const level = requireString(value, field)

  if (!(TECHNOLOGY_LEVELS as readonly string[]).includes(level)) {
    throw new Error(
      `${field} tiene un valor fuera de la lista del esquema: ${JSON.stringify(level)} ` +
        `(permitidos: ${TECHNOLOGY_LEVELS.join(', ')})`,
    )
  }

  return level as TechnologyLevel
}

/** Un opcional vacío o nulo no se escribe, para no crear campos a medias. */
function optionalString(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined
  return value
}
