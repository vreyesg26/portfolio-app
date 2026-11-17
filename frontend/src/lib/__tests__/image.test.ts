import { describe, expect, test } from 'vitest'
import { imageAlt, imageUrl } from '../image'

const svg = {
  asset: {
    _id: 'image-abc-24x24-svg',
    url: 'https://cdn.sanity.io/images/qyhogq09/production/abc-24x24.svg',
    mimeType: 'image/svg+xml',
  },
}
const png = {
  asset: {
    _id: 'image-def-800x800-png',
    url: 'https://cdn.sanity.io/images/qyhogq09/production/def-800x800.png',
    mimeType: 'image/png',
  },
}

describe('imageUrl', () => {
  test('un SVG se sirve crudo, sin parámetros de transformación', () => {
    const url = imageUrl(svg, 48)
    expect(url).toBe(svg.asset.url)
    expect(url).not.toContain('?')
  })

  test('un raster se transforma al ancho pedido', () => {
    const url = imageUrl(png, 800)
    expect(url).toContain('w=800')
    expect(url).toContain('def-800x800.png')
  })

  test('un raster sin ancho se transforma sin w=', () => {
    const url = imageUrl(png)
    expect(url).toContain('def-800x800.png')
    expect(url).not.toContain('w=')
  })

  test('un SVG sin url devuelve undefined', () => {
    expect(imageUrl({ asset: { ...svg.asset, url: null } })).toBeUndefined()
  })

  test('sin imagen devuelve undefined, para que React omita el src', () => {
    expect(imageUrl(null)).toBeUndefined()
    expect(imageUrl(undefined)).toBeUndefined()
    expect(imageUrl({ asset: null })).toBeUndefined()
  })
})

describe('imageAlt', () => {
  test('cae al texto de reserva cuando alt está vacío', () => {
    expect(imageAlt(svg, 'skills image')).toBe('skills image')
    expect(imageAlt({ ...svg, alt: '' }, 'skills image')).toBe('skills image')
    expect(imageAlt(null, 'skills image')).toBe('skills image')
  })

  test('usa alt cuando existe', () => {
    expect(imageAlt({ ...png, alt: 'Victor' }, 'Home profile')).toBe('Victor')
  })
})
