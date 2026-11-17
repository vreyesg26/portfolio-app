import {describe, expect, test} from 'vitest'
import {schemaTypes} from '../index'

type FieldLike = {name: string; type: string; initialValue?: unknown; validation?: (rule: {required: () => unknown}) => unknown}
type ObjectLike = {name: string; fields: FieldLike[]}

const byName = (n: string): ObjectLike | undefined =>
  schemaTypes.find((t) => t.name === n) as unknown as ObjectLike | undefined

const need = (n: string): ObjectLike => {
  const t = byName(n)
  if (!t) throw new Error(`Tipo no registrado: ${n}`)
  return t
}

describe('tipos de objeto', () => {
  test('los 8 tipos de objeto están registrados', () => {
    for (const n of ['personalInfo','about','socialMediaLink','navLink',
                     'contactInfo','contactFormField','talkToMe','writeMe']) {
      expect(byName(n)).toBeDefined()
    }
  })

  test('las descripciones con saltos de línea son text, no string', () => {
    for (const n of ['personalInfo','about']) {
      const f = need(n).fields.find((f) => f.name === 'description')
      expect(f?.type).toBe('text')
    }
  })

  test('contactFormField usa inputType, no type', () => {
    const names = need('contactFormField').fields.map((f) => f.name)
    expect(names).toContain('inputType')
    expect(names).not.toContain('type')
  })

  test('requeridos y opcionales reflejan el esquema original de Strapi', () => {
    const expected: Record<string, {required: string[]; optional: string[]}> = {
      personalInfo: {required: ['title', 'description'], optional: []},
      about: {required: ['title', 'description'], optional: []},
      socialMediaLink: {required: ['icon', 'url'], optional: []},
      navLink: {required: ['slug', 'label'], optional: ['icon']},
      contactInfo: {required: ['label', 'value'], optional: ['url']},
      contactFormField: {
        required: ['label', 'placeholder', 'inputType', 'name', 'slug', 'longText'],
        optional: [],
      },
      talkToMe: {required: ['icon', 'title'], optional: ['contactInfo']},
      writeMe: {required: ['icon', 'title'], optional: ['fields']},
    }
    const isRequired = (f: FieldLike): boolean => {
      if (typeof f.validation !== 'function') return false
      let required = false
      const rule = {required: () => ((required = true), rule)}
      f.validation(rule)
      return required
    }
    for (const [n, {required, optional}] of Object.entries(expected)) {
      const fields = need(n).fields
      expect(fields.map((f) => f.name).sort()).toEqual([...required, ...optional].sort())
      for (const f of fields) expect(isRequired(f), `${n}.${f.name}`).toBe(required.includes(f.name))
    }
  })

  test('longText arranca en false', () => {
    const f = need('contactFormField').fields.find((f) => f.name === 'longText')
    expect(f?.type).toBe('boolean')
    expect(f?.initialValue).toBe(false)
  })
})
