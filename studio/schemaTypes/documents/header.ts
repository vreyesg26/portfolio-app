import {defineField, defineType} from 'sanity'

export const header = defineType({
  name: 'header',
  title: 'Header',
  type: 'document',
  fields: [
    defineField({
      name: 'logoName',
      type: 'string',
    }),
    defineField({
      name: 'navLinks',
      type: 'array',
      of: [{type: 'navLink'}],
    }),
  ],
})
