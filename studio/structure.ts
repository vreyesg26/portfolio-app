import type {StructureResolver} from 'sanity/structure'

export const SINGLETONS = ['biography', 'contact', 'footer', 'header'] as const

const COLLECTIONS = [
  'project',
  'qualification',
  'qualificationType',
  'sectionTitle',
  'service',
  'technology',
  'technologyCategory',
  'testimonial',
] as const

const titleOf = (type: string): string =>
  type.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      ...SINGLETONS.map((type) =>
        S.listItem()
          .title(titleOf(type))
          .id(type)
          .child(S.document().schemaType(type).documentId(type).title(titleOf(type))),
      ),
      S.divider(),
      ...COLLECTIONS.map((type) =>
        S.documentTypeListItem(type).title(titleOf(type)),
      ),
    ])
