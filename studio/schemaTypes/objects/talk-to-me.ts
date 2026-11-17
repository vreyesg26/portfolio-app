import {defineField, defineType} from 'sanity'

export const talkToMe = defineType({
  name: 'talkToMe',
  title: 'Talk to me',
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
      name: 'contactInfo',
      type: 'array',
      of: [{type: 'contactInfo'}],
    }),
  ],
})
