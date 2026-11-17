import {defineField, defineType} from 'sanity'

export const footer = defineType({
  name: 'footer',
  title: 'Footer',
  type: 'document',
  fields: [
    defineField({
      name: 'logoName',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'footerLinks',
      type: 'array',
      of: [{type: 'navLink'}],
    }),
    defineField({
      name: 'socialMedia',
      type: 'array',
      of: [{type: 'socialMediaLink'}],
    }),
  ],
})
