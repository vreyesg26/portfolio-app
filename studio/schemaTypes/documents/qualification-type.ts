import {defineField, defineType} from 'sanity'

export const qualificationType = defineType({
  name: 'qualificationType',
  title: 'Qualification type',
  type: 'document',
  fields: [
    defineField({
      name: 'icon',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
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
