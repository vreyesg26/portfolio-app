import {defineField, defineType} from 'sanity'

export const navLink = defineType({
  name: 'navLink',
  title: 'Nav link',
  type: 'object',
  fields: [
    defineField({
      name: 'slug',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'icon',
      type: 'string',
    }),
  ],
})
