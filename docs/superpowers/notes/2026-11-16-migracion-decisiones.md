# Migración Strapi → Sanity — decisiones y trabajo pendiente

Registro de la ejecución del plan `2026-11-16-sanity-migration.md`.
El historial de git tiene el *qué*; esto tiene el *por qué* y lo que quedó fuera.

## Trabajo pendiente conocido

Hallazgos menores que las revisiones levantaron y se difirieron de forma deliberada.
Ninguno bloquea nada; están aquí para que no se pierdan.

- **T2** — studio/package.json:52 — script start no pedido por el brief.
- **T2** — studio/package.json:49 — "main": "package.json" es residuo de plantilla.
- **T2** — studio/tsconfig.json y .sanity en .gitignore son extras no pedidos; verificados como necesarios/inofensivos.
- **T3** — studio/package.json no tiene script "test"; los comandos del plan usan "pnpm vitest run <ruta>", que resuelve el binario local, así que no bloquea.
- **T3** — schema.test.ts no comprueba el tipo de los campos que no son las dos descripciones, ni que los "of" de los arrays apunten a contactInfo/contactFormField. typegen lo destaparia.
- **T3** — la regla grabadora del test solo implementa required(); un .min() o .uri() futuro lanzaria TypeError. Fallo ruidoso, no falso positivo.
- **T4** — documents.test.ts — nombre de test engañoso "los 4 tipos con order nuevo"; la tabla posterior cubre los 12.
- **T4** — documents.test.ts:557-561 sin formato prettier.
- **T4** — structure.ts — titleOf() deriva titulos con regex y puede divergir del title del esquema; documentTypeListItem ya lo deriva, el override es redundante.
- **T4** — sanity.config.ts — el filtro "action && ..." conserva acciones sin clave action. Inofensivo.
- **T5** — migrate-from-strapi.ts:595 — el diagnostico de borradores nunca puede disparar, porque el cliente usa perspective:'published' y el count siempre da 0. Lee como verificacion y no verifica nada. La garantia real es el check de 'drafts.' en :476.
- **T5** — migrate-from-strapi.ts:763 vs :396 — las 45 subidas ocurren antes de que el transform valide. MITIGADO en el plan con el ensayo en seco (commit 46f8425).
- **T5** — migrate-from-strapi.ts:358 — MIME_BY_EXTENSION se consulta dentro del bucle de subida, no en el pre-vuelo; y listOriginalUploads no excluye directorios (un folder suelto daria EISDIR en vez de un mensaje claro).
- **T5** — migrate-from-strapi.ts:784 — el catch de nivel superior imprime solo error.message; con el stack se localizaria antes el documento culpable.
- **T5** — transform.ts:458 — el fallback por indice de toKey podria colisionar teoricamente con una clave derivada de id en el mismo array. Inerte en estos datos.
- **T5** — strapi-order.ts:58 — el guard de duplicados solo lanza si los ordenes DIFIEREN; dos categorias con el mismo ord se aceptan en silencio. Cubierto en la practica por size===34.
- **T5** — transform.ts — de sus 868 lineas, 32-389 son interfaces; moverlas a transform.types.ts lo partiria por la mitad sin cortar por los mappers.
- **T5** — falta un test que recorra los esquemas y asserte que cada campo required aparece en la salida del mapper; hoy esa correspondencia la garantiza la revision a mano.
- **T6** — verify-migration.ts fija el NUMERO de campos con \n (6), no el conjunto de rutas; un \n perdido mas uno espurio seguiria dando 6.
- **T6** — technology->category solo se comprueba que resuelva, no a QUE categoria apunta; una asignacion a categoria equivocada pasaria. Comparable contra technology_categorie_id en la misma consulta sqlite.
- **T6** — una URL mala genera 3+ lineas de problema duplicadas; el exit code es correcto pero el ruido confunde.
- **T6** — el literal 40 en :297 no se deriva de EXPECTED_COUNTS.technology + .qualification.
- **T6** — la exclusion de drafts.** no cubre versions.** (releases). No relevante hoy.
- **T6** — 5 de los 44 assets no estan referenciados por nada; fiel a la mediateca de Strapi, que ya los tenia huerfanos.
- **T6** — un run con SALTADA sale con exit 0; el texto y el docstring lo dicen, pero el exit code no distingue parcial de completo.
- **T7** — los tests de queries son aserciones de subcadena sobre el texto; un _type mal escrito, un [0] perdido o un references() invertido pasarian. Es el diseño del brief; el revisor los verifico a mano. La comparacion a ojo de la tarea 8 paso 7 sigue siendo la puerta real.
- **T7** — @testing-library/react, jest-dom y environment jsdom instalados y configurados pero sin usar (ambos tests son unitarios puros). Plan-mandated; se ganan el sitio en la tarea 8.
- **T7** — tsconfig.node.json solo incluye vite.config.ts, asi que vitest.config.ts no lo typechequea tsc -b.
- **T7** — sanity.ts no guarda las env vars; si falta VITE_SANITY_PROJECT_ID, createClient lanza al evaluar el modulo y deja la app en blanco. Es paridad exacta con strapi.ts, no regresion.
- **T7** — PORTFOLIO_QUERIES anotado string[] borra los tipos branded de defineQuery. Brief-mandated e inocuo: el prefetch descarta el tipo.
- **T7** — el script test de studio/package.json queda fuera de la lista de archivos del brief. Util y benigno.
- **T8** — queries.test.ts:43 — el titulo de test "como en el CMS anterior" es el ultimo resto del grep burdo; el criterio narrow solo excluye lineas // y *, no literales de string. Restaurar "como en Strapi" y excluir archivos de test del gate.
- **T8** — test/render.tsx registra los matchers de jest-dom y un afterEach global como efectos de import; deberia ir en setupFiles de vitest.config.ts.
- **T8** — renderWithData siembra la cache pero no stubea client.fetch; una siembra olvidada dispararia una peticion real al dataset en vivo durante un test.
- **T8** — encadenamiento opcional heredado ahora provablemente muerto (SkillsSection mezcla skills?._id con skills.icon; HomeLeft/HomeRight hacen homeData?.map sobre un NonNullable).
- **T8** — MainContent.tsx:57 rompe el estilo de wrap del archivo. Cosmetico.
- **T8** — HomeLeft y HomeRight duplican la misma forma de props NonNullable<...>. Defendible.

### Recomendaciones de la revisión final que no se aplicaron

- **Respaldo periódico del dataset de Sanity.** La tarea 0 protegió los datos de Strapi;
  nada protege todavía los de Sanity, y ahora son la única copia. Un `sanity dataset export`
  periódico a `~/Backups/` cerraría el hueco.
- **Anchos explícitos en `imageUrl`.** Las tres llamadas omiten el ancho, así que cada raster
  se sirve a tamaño original. Se excluyó de la oleada final porque cambiaría el render ya
  verificado visualmente.
- **`hotspot: true` es inerte.** Las queries proyectan `asset->{_id,url,mimeType}`, así que el
  recorte nunca llega a la URL: un editor que fije un hotspot no verá cambio. O se proyecta el
  objeto completo, o se quita la opción para no prometer lo que no hace.
- **Revocar credenciales que ya no hacen falta:** el `readToken` que devolvió `create_project`
  (no se persistió) y el token de escritura en `studio/.env.local`, que solo servía para la
  migración de un solo uso.
- **Sin CI**: ninguna de las dos suites se ejecuta automáticamente.

# Rulings tomados por el controlador (14)

Decisiones que tomé en nombre de Victor durante la ejecución, en orden.

## 1

**Ruling:** la tarea 1 no produce diff, así que no se despachó revisor de diff — habría recibido un diff vacío y solo podría haber dado el visto bueno sin mirar nada. La sustituí por verificación directa del entregable, que para estado de sistema de archivos es más fiable. Coste si me equivoco: ninguna revisión independiente del respaldo; mitigado porque las comprobaciones son deterministas y las ejecuté yo, y porque la tarea 10 las repite antes de borrar nada.

## 2

**Ruling:** las tareas 2 pasos 1-3 (aprovisionar proyecto, dataset y CORS en Sanity) las ejecuto yo, no un implementador: son recursos externos en la cuenta de Victor, no producen diff revisable, y requieren el contexto de autorización que él me dio. El implementador de la tarea 2 recibe el `projectId` ya creado y hace solo el andamiaje de `studio/`, que sí es código revisable. Coste si me equivoco: 3 llamadas MCP en mi contexto en vez de en el suyo.

## 3

**Ruling (hueco del plan):** el plan solo listaba los dos orígenes del frontend, ambos sin credenciales. Faltaba `http://localhost:3333` **con** credenciales: sin él, `sanity dev` no puede autenticar al editor y el paso 5 de la tarea 6 ("revisar el contenido a ojo en el Studio") habría fallado. Añadido. Coste si me equivoco: un origen de más en una lista que solo acepta orígenes que yo registro; inofensivo y borrable.

## 4

**Ruling (paso manual eliminado):** `create_project` devuelve tokens de API, así que el token de escritura ya existe y **Victor no tiene que crearlo a mano**. Escrito en `studio/.env.local` con modo 600, fuera de git (reglas `.env.local` y `.env*.local` añadidas al `.gitignore` raíz y commiteadas ANTES de escribir el secreto; `git status` confirma que no lo ve). Probado contra la API real: HTTP 200. Queda un solo paso manual para Victor, `npx sanity login` en la tarea 9. Coste si me equivoco: ninguno; si el token fallara, crear uno a mano sigue disponible.

## 5

**Ruling:** fijar `typescript` a `~5.9.3` en `studio/`. Razón: el único artefacto que cruza la frontera studio↔frontend es el `frontend/src/sanity.types.ts` generado, y tiene que compilar bajo el TypeScript 5.9.3 del frontend; alinear el generador con el consumidor es la opción conservadora, y en un repo de una sola persona la consistencia vale más que estar en el major más nuevo. Coste si me equivoco: el studio se queda un major por detrás en una carpeta que solo ejecuta `sanity build`.

## 6

**Ruling (verificación adelantada):** pedí ejecutar `pnpm typegen` ya, con el esquema vacío, aunque el implementador lo había omitido por considerarlo inútil. Un esquema vacío sigue ejercitando lo que importa: que `sanity schemas extract` sea el subcomando correcto en esta versión y que `generates: '../frontend/src/sanity.types.ts'` resuelva a la ruta pretendida. Descubrirlo ahora cuesta un minuto; en la tarea 4 habría costado una tarea. Los artefactos generados se borran después para no tocar `frontend/` en esta tarea.

## 7

**Ruling (re-revisión degenerada):** la corrección es solo del mensaje de commit, con el árbol byte a byte idéntico, así que `review-package 0a93b24..<nuevo>` produciría un diff **vacío** por construcción y un re-revisor no podría juzgar nada (el mensaje de commit no aparece en un diff). Verifico el trailer yo con `git log -1 --format=%B`, que es determinista. Mismo patrón que el ruling de la tarea 1 para entregables sin diff. Coste si me equivoco: ninguna revisión independiente de un cambio de una línea de texto que yo mismo puedo leer.

## 8

**Ruling (`schemas` vs `schema`):** el revisor lo marcó como desviación literal del brief. El brief viene de mi plan, y mi plan decía `schema` en singular por memoria desactualizada. La forma correcta en sanity 6.23.0 es `schemas`, verificada por `--help` y por una ejecución real de typegen. **El código tiene razón y el plan estaba mal**; corregido el plan. Coste si me equivoco: ninguno, hay evidencia de ejecución.

## 9

**Ruling (obligatorios de los documentos):** se refleja Strapi exactamente, con **dos endurecimientos deliberados**: 1. **Todos los campos `order` son obligatorios**, incluidos `qualificationType.order` y `technologyCategory.order`, que en Strapi eran opcionales. Razón: el Objetivo 1 exige orden visible garantizado, y `order()` de GROQ con nulos tiene colocación no especificada. Los datos lo soportan (0 nulos). 2. **`sectionTitle.key` es obligatorio** (en Strapi era un `uid` sin obligatoriedad). Razón: es la clave con la que `MainContent` resuelve `SECTION_COMPONENTS`; sin ella la sección no renderiza en silencio. Los 6 valores existen.

## 10

**Ruling:** `readTechnologyOrder(dbPath): Map<string, number>` indexado por `document_id`, filtrando a publicadas, leyendo con `node:sqlite` (nativo en el Node 22 de esta máquina, así que sin dependencias nuevas ni compilación nativa). Plan corregido en `6f1f4ca`. Coste si me equivoco: ninguno, los valores están verificados contra la base real.

## 11

**Ruling de modelo:** subida de nivel deliberada. Es el código de mayor riesgo del plan — la tarea 6 lo ejecuta contra el dataset real y mueve los 68 documentos y 45 assets de Victor. El mapeo es denso (12 tipos, renombres PascalCase→camelCase, split de dynamic zone, dos referencias, slugs, imágenes, `_key` por miembro de array) y un error sutil se paga en datos. Coste si me equivoco: un modelo más caro en la tarea donde el error cuesta más.

## 12

**Ruling (revisión visual del Studio):** el implementador no tiene navegador y no pudo hacerla. La aplazo a la tarea 9, donde el Studio se despliega y la comprobación es natural. Los hechos estructurales ya están verificados por código y por mi consulta: los 4 singletons existen con el `_id` que `structure.ts` busca. Coste si me equivoco: una comprobación visual se hace dos tareas más tarde de lo que decía el plan.

## 13

**Ruling:** la tarea 9 se parte. Lo que sí cabe ahora: fijar las variables de entorno (el build viejo no las lee hasta reconstruir) y desplegar el Studio. El redespliegue de producción y su verificación se mueven al cierre de rama. Coste si me equivoco: ninguno; forzar un deploy de producción desde una rama sin revisión final sería peor.

## 14

**Ruling (reordenar la tarea 10):** la tarea 10 tiene como puerta propia "confirmar que producción vive sin Strapi" (`curl … | grep -c strapiapp.com` → 0), y esa puerta **no puede pasar antes de fundir la rama**, porque producción sigue sirviendo el bundle viejo construido desde `main`. Borrar `backend/` ahora sería hacerlo sin su propia verificación. Nuevo orden: **revisión final de rama → fundir → verificar producción → y entonces borrar `backend/`**. Misma intención que el plan ("no borrar hasta tenerlo todo probado"), con un orden que sí la consigue. Coste si me equivoco: `backend/` sobrevive unos commits más de lo previsto, lo cual es la dirección segura del error.

