import {defineField, defineType} from 'sanity'

export const contactInfo = defineType({
  name: 'contactInfo',
  title: 'Contact info',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'value',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      type: 'string',
    }),
  ],
})
