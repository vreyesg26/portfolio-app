import { describe, expect, test } from 'vitest'
import {
  BIOGRAPHY_QUERY,
  CONTACT_QUERY,
  FOOTER_QUERY,
  HEADER_QUERY,
  PORTFOLIO_QUERIES,
  PROJECTS_QUERY,
  QUALIFICATIONS_QUERY,
  SECTION_TITLES_QUERY,
  SERVICES_QUERY,
  SKILLS_QUERY,
  TESTIMONIALS_QUERY,
} from '../queries'

describe('queries', () => {
  test('las 10 queries son distintas y PORTFOLIO_QUERIES las contiene todas', () => {
    expect(PORTFOLIO_QUERIES).toHaveLength(10)
    expect(new Set(PORTFOLIO_QUERIES).size).toBe(10)
    for (const q of [
      HEADER_QUERY, BIOGRAPHY_QUERY, SECTION_TITLES_QUERY, SKILLS_QUERY,
      QUALIFICATIONS_QUERY, SERVICES_QUERY, PROJECTS_QUERY, TESTIMONIALS_QUERY,
      CONTACT_QUERY, FOOTER_QUERY,
    ]) {
      expect(PORTFOLIO_QUERIES).toContain(q)
    }
  })

  test('las imágenes proyectan _id, url y mimeType del asset', () => {
    for (const q of [BIOGRAPHY_QUERY, PROJECTS_QUERY, SKILLS_QUERY]) {
      expect(q).toContain('asset->{_id, url, mimeType}')
    }
  })

  test('las cuatro queries con order nuevo ordenan por él', () => {
    for (const q of [SECTION_TITLES_QUERY, SERVICES_QUERY, PROJECTS_QUERY, TESTIMONIALS_QUERY]) {
      expect(q).toContain('order(order asc)')
    }
    // las tecnologías anidadas ordenan explícitamente (antes: orden del join de Strapi)
    expect(SKILLS_QUERY.match(/order\(order asc\)/g)).toHaveLength(2)
  })

  test('las titulaciones anidadas van en orden descendente, como en Strapi', () => {
    expect(QUALIFICATIONS_QUERY).toContain('order(order desc)')
    expect(QUALIFICATIONS_QUERY).toContain('order(order asc)')
    expect(QUALIFICATIONS_QUERY.indexOf('order(order asc)')).toBeLessThan(
      QUALIFICATIONS_QUERY.indexOf('order(order desc)'),
    )
  })

  test('los slugs se proyectan planos', () => {
    expect(SECTION_TITLES_QUERY).toContain('"key": key.current')
    expect(SKILLS_QUERY).toContain('"slug": slug.current')
  })

  test('cada nivel de lista proyecta _id del documento para las key de React', () => {
    expect(SKILLS_QUERY.match(/\n\s+_id,/g)).toHaveLength(2)
    expect(QUALIFICATIONS_QUERY.match(/\n\s+_id,/g)).toHaveLength(2)
    for (const q of [SERVICES_QUERY, PROJECTS_QUERY, TESTIMONIALS_QUERY]) {
      expect(q).toMatch(/\n\s+_id,/)
    }
  })

  test('los singletons filtran por tipo e _id', () => {
    for (const [q, t] of [[HEADER_QUERY, 'header'], [BIOGRAPHY_QUERY, 'biography'], [CONTACT_QUERY, 'contact'], [FOOTER_QUERY, 'footer']]) {
      expect(q).toContain(`*[_type == "${t}" && _id == "${t}"][0]`)
    }
  })
})
