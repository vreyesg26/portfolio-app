import {defineField, defineType} from 'sanity'

export const sectionTitle = defineType({
  name: 'sectionTitle',
  title: 'Section title',
  type: 'document',
  fields: [
    defineField({
      name: 'key',
      type: 'slug',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'subtitle',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      type: 'number',
      validation: (rule) => rule.required(),
    }),
  ],
})
