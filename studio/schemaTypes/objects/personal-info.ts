import {defineField, defineType} from 'sanity'

export const personalInfo = defineType({
  name: 'personalInfo',
  title: 'Personal info',
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
