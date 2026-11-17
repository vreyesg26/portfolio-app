import {defineField, defineType} from 'sanity'

export const qualification = defineType({
  name: 'qualification',
  title: 'Qualification',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'institution',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'dateInfo',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'qualificationType',
      type: 'reference',
      to: [{type: 'qualificationType'}],
    }),
    defineField({
      name: 'order',
      type: 'number',
      validation: (rule) => rule.required(),
    }),
  ],
  // `title` es `text`: el preview automático solo mira campos `string`.
  preview: {select: {title: 'title'}},
})
