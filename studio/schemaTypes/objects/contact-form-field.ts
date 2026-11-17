import {defineField, defineType} from 'sanity'

export const contactFormField = defineType({
  name: 'contactFormField',
  title: 'Contact form field',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'placeholder',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'inputType',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'longText',
      type: 'boolean',
      initialValue: false,
      validation: (rule) => rule.required(),
    }),
  ],
})
