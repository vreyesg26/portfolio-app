import {defineField, defineType} from 'sanity'

export const about = defineType({
  name: 'about',
  title: 'About',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
  ],
})
