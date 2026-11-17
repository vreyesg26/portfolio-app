import {defineField, defineType} from 'sanity'

export const contact = defineType({
  name: 'contact',
  title: 'Contact',
  type: 'document',
  fields: [
    defineField({
      name: 'icon',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'buttonLabel',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'talkToMe',
      type: 'talkToMe',
    }),
    defineField({
      name: 'writeMe',
      type: 'writeMe',
    }),
  ],
})
