import {describe, expect, test} from 'vitest'
import {schemaTypes} from '../index'

type FieldLike = {
  name: string
  type: string
  options?: {hotspot?: boolean; list?: string[]}
  initialValue?: unknown
  fields?: FieldLike[]
  to?: {type: string}[]
  validation?: (rule: {required: () => unknown}) => unknown
}
type DocLike = {name: string; fields: FieldLike[]}

const byName = (n: string): DocLike | undefined =>
  schemaTypes.find((t) => t.name === n) as unknown as DocLike | undefined

const need = (n: string): DocLike => {
  const t = byName(n)
  if (!t) throw new Error(`Tipo no registrado: ${n}`)
  return t
}

const field = (doc: string, fld: string): FieldLike => {
  const f = need(doc).fields.find((x) => x.name === fld)
  if (!f) throw new Error(`Campo inexistente: ${doc}.${fld}`)
  return f
}

const isRequired = (f: FieldLike): boolean => {
  if (typeof f.validation !== 'function') return false
  let required = false
  const rule = {required: () => ((required = true), rule)}
  f.validation(rule)
  return required
}

describe('tipos de documento', () => {
  test('los 12 tipos de documento están registrados', () => {
    for (const n of ['biography','contact','footer','header','project','qualification',
                     'qualificationType','sectionTitle','service','technology',
                     'technologyCategory','testimonial']) {
      expect(byName(n)).toBeDefined()
    }
  })

  test('los 4 tipos con order nuevo lo tienen como number', () => {
    for (const n of ['service','project','testimonial','technology']) {
      expect(field(n, 'order').type).toBe('number')
    }
  })

  test('presentation y service.title son text, no string', () => {
    expect(field('biography','presentation').type).toBe('text')
    expect(field('service','title').type).toBe('text')
  })

  test('contact expone talkToMe y writeMe como campos, no como array', () => {
    const names = need('contact').fields.map((f) => f.name)
    expect(names).toEqual(expect.arrayContaining(['talkToMe','writeMe']))
    expect(need('contact').fields.find((f) => f.type === 'array')).toBeUndefined()
  })

  test('las tres imágenes llevan hotspot y alt opcional', () => {
    for (const [doc, fld] of [['biography','photo'],['project','cover'],['technology','icon']]) {
      const f = field(doc, fld)
      expect(f.type).toBe('image')
      expect(f.options?.hotspot).toBe(true)
      const alt = f.fields?.find((x) => x.name === 'alt')
      expect(alt).toBeDefined()
      expect(isRequired(alt as FieldLike)).toBe(false)
    }
  })

  test('las dos referencias apuntan al tipo correcto', () => {
    expect(field('qualification','qualificationType').to?.[0].type).toBe('qualificationType')
    expect(field('technology','category').to?.[0].type).toBe('technologyCategory')
  })

  test('no existen relaciones inversas', () => {
    expect(need('qualificationType').fields.map((f) => f.name)).not.toContain('qualifications')
    expect(need('technologyCategory').fields.map((f) => f.name)).not.toContain('technologies')
  })

  test('technology.level es lista con initialValue Basic', () => {
    const f = field('technology','level')
    expect(f.options?.list).toEqual(['Basic','Intermediate','Advanced'])
    expect(f.initialValue).toBe('Basic')
  })

  test('requeridos y opcionales coinciden con la tabla', () => {
    const expected: Record<string, {required: string[]; optional: string[]}> = {
      biography: {required: ['presentation','photo'], optional: ['homeLeft','homeRight','socialMediaLinks']},
      contact: {required: ['icon','buttonLabel'], optional: ['talkToMe','writeMe']},
      footer: {required: ['logoName','description'], optional: ['footerLinks','socialMedia']},
      header: {required: [], optional: ['logoName','navLinks']},
      project: {required: ['name','technologies','url','cover','order'], optional: []},
      qualification: {required: ['title','institution','dateInfo','order'], optional: ['qualificationType']},
      qualificationType: {required: ['icon','title','order'], optional: []},
      sectionTitle: {required: ['key','title','subtitle','order'], optional: []},
      service: {required: ['icon','title','description','order'], optional: []},
      technology: {required: ['icon','title','level','order'], optional: ['category']},
      technologyCategory: {required: ['order'], optional: ['title','slug','icon']},
      testimonial: {required: ['description','clientName','order'], optional: []},
    }
    for (const [n, {required, optional}] of Object.entries(expected)) {
      const fields = need(n).fields
      expect(fields.map((f) => f.name).sort()).toEqual([...required, ...optional].sort())
      for (const f of fields) expect(isRequired(f), `${n}.${f.name}`).toBe(required.includes(f.name))
    }
  })
})
