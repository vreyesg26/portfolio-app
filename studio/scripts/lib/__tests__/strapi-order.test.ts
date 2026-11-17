import {copyFileSync, mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {fileURLToPath} from 'node:url'
import {afterEach, describe, expect, test} from 'vitest'
import {readTechnologyOrder} from '../strapi-order'

// La base de datos real de Strapi. Se resuelve desde este archivo y no desde
// `process.cwd()` para que los tests pasen tanto con `cd studio && pnpm vitest`
// como lanzados desde la raíz del repositorio.
const DB_PATH = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../backend/.tmp/data.db')

describe('readTechnologyOrder', () => {
  test('devuelve el orden curado, no el orden de id', () => {
    const order = readTechnologyOrder(DB_PATH)
    // Verificado en la base real. La tabla puente tiene 68 filas (borrador +
    // publicado), así que hay que FILTRAR a publicadas. Borrador y publicado
    // comparten document_id.
    // Posiciones 10-12 de "Frontend Development", ids publicados 55, 58 y 60:
    expect(order.get('sap51k3w7pqzl60dybv5ya58')).toBe(10) // Material UI
    expect(order.get('s3trc9bhijhiq82ibg9yedpb')).toBe(11) // Typescript
    expect(order.get('aqv4vuva7yekfrjmaxb37xwa')).toBe(12) // Postman
    expect(order.size).toBe(34)
  })

  test('el orden es por categoría, no global', () => {
    const order = readTechnologyOrder(DB_PATH)
    // 5 categorías con 12, 12, 3, 3 y 4 tecnologías: varias comparten la posición 1.
    const ones = [...order.values()].filter((v) => v === 1)
    expect(ones).toHaveLength(5)
  })

  test('está indexado por documentId, no por el id numérico', () => {
    const order = readTechnologyOrder(DB_PATH)
    // Ninguna clave es un número en forma de texto: todas son los documentId de
    // 24 caracteres de Strapi.
    for (const key of order.keys()) {
      expect(key).toMatch(/^[a-z0-9]{24}$/)
    }
    // El id numérico 55 (Material UI) no sirve como clave.
    expect(order.get('55')).toBeUndefined()
  })

  test('cada categoría empieza en 1 y no deja huecos', () => {
    const order = readTechnologyOrder(DB_PATH)
    const counts = new Map<number, number>()
    for (const value of order.values()) counts.set(value, (counts.get(value) ?? 0) + 1)
    // 5 categorías de 12, 12, 4, 3 y 3: dos posiciones las comparten 5 tecnologías,
    // la 4 la comparten 3, y las 5-12 solo las tienen las dos categorías grandes.
    expect(counts.get(1)).toBe(5)
    expect(counts.get(2)).toBe(5)
    expect(counts.get(3)).toBe(5)
    expect(counts.get(4)).toBe(3)
    expect(counts.get(5)).toBe(2)
    expect(counts.get(12)).toBe(2)
    expect(counts.get(13)).toBeUndefined()
  })

  test('falla con un mensaje claro si la base no existe', () => {
    expect(() => readTechnologyOrder('/no/existe/data.db')).toThrow()
  })

  // En la base actual las filas borrador llevan por casualidad el mismo
  // technologie_ord que las publicadas, así que el filtro de publicadas no se
  // nota leyendo la base tal cual. Para comprobar que el filtro existe de
  // verdad se trabaja sobre una copia temporal (la base real no se toca) en la
  // que el borrador tiene otro orden.
  test('ignora las filas borrador aunque lleven otro orden', () => {
    const copy = copyDatabase()
    const db = new DatabaseSync(copy)
    try {
      // Material UI: la fila 54 de technologies es el borrador y la 55 la
      // publicada; las dos comparten el documentId sap51k3w7pqzl60dybv5ya58.
      db.prepare('UPDATE technologies_category_lnk SET technologie_ord = 99 WHERE technologie_id = 54').run()
    } finally {
      db.close()
    }

    const order = readTechnologyOrder(copy)
    expect(order.get('sap51k3w7pqzl60dybv5ya58')).toBe(10)
    expect([...order.values()]).not.toContain(99)
    expect(order.size).toBe(34)
  })

  test('aborta si una tecnología publicada aparece con dos órdenes distintos', () => {
    const copy = copyDatabase()
    const db = new DatabaseSync(copy)
    try {
      // Se enlaza la fila publicada de Material UI a una segunda categoría con
      // otro orden: la base dejaría de poder responder "cuál es el orden de
      // esta tecnología". (La tabla tiene UNIQUE por par, así que la segunda
      // fila va con otra categoría.)
      db.prepare(
        'INSERT INTO technologies_category_lnk (technologie_id, technology_categorie_id, technologie_ord) VALUES (55, 10, 99)',
      ).run()
    } finally {
      db.close()
    }

    expect(() => readTechnologyOrder(copy)).toThrow(/dos órdenes distintos/)
  })
})

let tempDirs: string[] = []

/** Copia la base real a un directorio temporal para poder escribir en ella. */
function copyDatabase(): string {
  const dir = mkdtempSync(join(tmpdir(), 'strapi-order-'))
  tempDirs.push(dir)
  const copy = join(dir, 'data.db')
  copyFileSync(DB_PATH, copy)
  return copy
}

afterEach(() => {
  for (const dir of tempDirs) rmSync(dir, {recursive: true, force: true})
  tempDirs = []
})
