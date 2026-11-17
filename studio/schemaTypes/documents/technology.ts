import {defineField, defineType} from 'sanity'

export const technology = defineType({
  name: 'technology',
  title: 'Technology',
  type: 'document',
  fields: [
    defineField({
      name: 'icon',
      type: 'image',
      options: {hotspot: true},
      fields: [defineField({name: 'alt', type: 'string'})],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'level',
      type: 'string',
      options: {list: ['Basic', 'Intermediate', 'Advanced']},
      initialValue: 'Basic',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      type: 'reference',
      to: [{type: 'technologyCategory'}],
    }),
    defineField({
      name: 'order',
      type: 'number',
      validation: (rule) => rule.required(),
    }),
  ],
})
