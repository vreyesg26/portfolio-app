import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {projectId: 'qyhogq09', dataset: 'production'},
  // appId fijo: evita que `sanity deploy` pregunte por la aplicacion y hace
  // el despliegue reproducible. Lo recomendo la CLI tras el primer deploy correcto.
  deployment: {
    appId: 'af858da36c0cr01kn85ndz6t',
  },
  typegen: {
    enabled: true,
    path: '../frontend/src/**/*.{ts,tsx}',
    schema: 'schema.json',
    generates: '../frontend/src/sanity.types.ts',
    overloadClientMethods: true,
  },
})
