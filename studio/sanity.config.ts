import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {SINGLETONS, structure} from './structure'

const singletons = new Set<string>(SINGLETONS)

export default defineConfig({
  name: 'default',
  title: 'Portfolio',
  projectId: 'qyhogq09',
  dataset: 'production',
  plugins: [structureTool({structure}), visionTool()],
  schema: {
    types: schemaTypes,
    // Singletons cannot be created from the "New document" menu.
    templates: (templates) => templates.filter(({schemaType}) => !singletons.has(schemaType)),
  },
  document: {
    // Singletons cannot be duplicated, deleted or unpublished.
    actions: (input, {schemaType}) =>
      singletons.has(schemaType)
        ? input.filter(({action}) => action && !['delete', 'duplicate', 'unpublish'].includes(action))
        : input,
  },
})
