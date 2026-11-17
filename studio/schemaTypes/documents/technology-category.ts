import {defineField, defineType} from 'sanity'

export const technologyCategory = defineType({
  name: 'technologyCategory',
  title: 'Technology category',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
    }),
    defineField({
      name: 'slug',
      type: 'slug',
    }),
    defineField({
      name: 'icon',
      type: 'string',
    }),
    defineField({
      name: 'order',
      type: 'number',
      validation: (rule) => rule.required(),
    }),
  ],
})
