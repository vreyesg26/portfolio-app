import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {projectId: 'qyhogq09', dataset: 'production'},
  typegen: {
    enabled: true,
    path: '../frontend/src/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../frontend/src/sanity.types.ts',
    overloadClientMethods: true,
  },
})
