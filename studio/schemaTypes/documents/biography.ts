import {defineField, defineType} from 'sanity'

export const biography = defineType({
  name: 'biography',
  title: 'Biography',
  type: 'document',
  fields: [
    defineField({
      name: 'presentation',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'photo',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string'})],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'homeLeft',
      type: 'array',
      of: [{type: 'personalInfo'}],
    }),
    defineField({
      name: 'homeRight',
      type: 'array',
      of: [{type: 'about'}],
    }),
    defineField({
      name: 'socialMediaLinks',
      type: 'array',
      of: [{type: 'socialMediaLink'}],
    }),
  ],
})
