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

const ORDERED = ['service', 'project', 'testimonial', 'technology']

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
      ...COLLECTIONS.map((type) => {
        const item = S.documentTypeListItem(type).title(titleOf(type))
        // Los tipos con orden curado se listan por `order`, no por edición.
        return ORDERED.includes(type)
          ? item.child(
              S.documentTypeList(type)
                .title(titleOf(type))
                .defaultOrdering([{field: 'order', direction: 'asc'}]),
            )
          : item
      }),
    ])
