import {defineField, defineType} from 'sanity'

export const socialMediaLink = defineType({
  name: 'socialMediaLink',
  title: 'Social media link',
  type: 'object',
  fields: [
    defineField({
      name: 'icon',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
  ],
})
