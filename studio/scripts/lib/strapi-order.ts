/**
 * Lectura del orden curado de las tecnologías desde la base de datos de Strapi.
 *
 * `technology` no tiene campo de orden en Strapi: el orden visible vive en la
 * columna `technologie_ord` de la tabla puente `technologies_category_lnk` y se
 * curó a mano. No se puede derivar de ninguna otra cosa, así que se lee de la
 * base directamente, con `node:sqlite` (nativo en Node 22, sin dependencias).
 *
 * Dos trampas verificadas en la base real:
 *
 * 1. La tabla puente tiene 68 filas, no 34: cada entrada de Strapi tiene una
 *    fila borrador y una publicada. Hay que filtrar a publicadas.
 * 2. El orden es **por categoría**, no global: cinco categorías con 12, 12, 4,
 *    3 y 3 tecnologías hacen que cinco tecnologías distintas tengan el orden 1.
 */
import {DatabaseSync} from 'node:sqlite'

interface OrderRow {
  documentId: string
  ord: number
}

/**
 * Devuelve el orden curado de cada tecnología publicada.
 *
 * Indexado por `documentId` (no por el `id` numérico) porque `documentId` es lo
 * que devuelve la API REST de Strapi 5, y porque borrador y publicado comparten
 * `documentId` pero no `id`.
 *
 * @param dbPath ruta a `backend/.tmp/data.db`
 * @returns mapa `documentId -> orden`, con 34 entradas en la base actual
 */
export function readTechnologyOrder(dbPath: string): Map<string, number> {
  const db = new DatabaseSync(dbPath, {readOnly: true})

  try {
    const rows = db
      .prepare(
        `SELECT t.document_id AS documentId, l.technologie_ord AS ord
           FROM technologies_category_lnk l
           JOIN technologies t ON t.id = l.technologie_id
          WHERE t.published_at IS NOT NULL
          ORDER BY l.technology_categorie_id, l.technologie_ord`,
      )
      .all() as unknown as OrderRow[]

    const order = new Map<string, number>()

    for (const row of rows) {
      if (typeof row.documentId !== 'string' || row.documentId.length === 0) {
        throw new Error(`technologies_category_lnk: fila publicada sin document_id (${JSON.stringify(row)})`)
      }
      if (typeof row.ord !== 'number' || !Number.isInteger(row.ord)) {
        throw new Error(`technologies_category_lnk: technologie_ord no es un entero en ${row.documentId} (${JSON.stringify(row.ord)})`)
      }

      const previous = order.get(row.documentId)
      if (previous !== undefined && previous !== row.ord) {
        throw new Error(
          `technologies_category_lnk: ${row.documentId} aparece con dos órdenes distintos (${previous} y ${row.ord}); ` +
            'el filtro de publicadas no está funcionando',
        )
      }

      order.set(row.documentId, row.ord)
    }

    return order
  } finally {
    db.close()
  }
}
