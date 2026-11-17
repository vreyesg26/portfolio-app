import {defineField, defineType} from 'sanity'

export const writeMe = defineType({
  name: 'writeMe',
  title: 'Write me',
  type: 'object',
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
      name: 'fields',
      type: 'array',
      of: [{type: 'contactFormField'}],
    }),
  ],
})
