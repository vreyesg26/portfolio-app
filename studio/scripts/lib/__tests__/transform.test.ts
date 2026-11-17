import {describe, expect, test} from 'vitest'
import {
  SINGLETON_IDS,
  STRAPI_VARIANT_PREFIXES,
  isStrapiVariant,
  mapAbouts,
  mapAssetReference,
  mapBiography,
  mapContact,
  mapContactFormFields,
  mapContactInfos,
  mapFooter,
  mapHeader,
  mapNavLinks,
  mapPersonalInfos,
  mapProject,
  mapQualification,
  mapQualificationType,
  mapSectionTitle,
  mapService,
  mapSocialMediaLinks,
  mapTechnology,
  mapTechnologyCategory,
  mapTestimonial,
  toKey,
  toSanityId,
} from '../transform'

// Todos los datos de este archivo son los datos reales de `backend/.tmp/data.db`,
// con la forma que les da la API REST de Strapi 5.

const PHOTO_URL = '/uploads/me_6a3d08c4ac.png'
const PHOTO_ALT = 'Smiling young man in a dark suit with a white shirt and tie.'
const ICON_URL = '/uploads/material_ui_7e7f5135d3.svg'
const COVER_URL = '/uploads/project1_f2b31920e8.jpg'

const assetMap = new Map<string, string>([
  [PHOTO_URL, 'image-aaa111-1000x1000-png'],
  [ICON_URL, 'image-bbb222-svg'],
  [COVER_URL, 'image-ccc333-1200x800-jpg'],
])

describe('_id deterministas', () => {
  test('toSanityId es determinista y legible', () => {
    expect(toSanityId('technology', 'abc123')).toBe('technology-abc123')
    expect(toSanityId('technology', 'abc123')).toBe(toSanityId('technology', 'abc123'))
  })

  test('los singletons tienen _id fijo', () => {
    expect(SINGLETON_IDS.biography).toBe('biography')
    expect(SINGLETON_IDS.contact).toBe('contact')
    expect(SINGLETON_IDS.footer).toBe('footer')
    expect(SINGLETON_IDS.header).toBe('header')
  })

  test('ningún _id lleva el prefijo drafts.', () => {
    expect(toSanityId('project', 'wr01e0kbkgi62k7es9dwg5cz')).not.toMatch(/^drafts\./)
    expect(Object.values(SINGLETON_IDS).some((id) => id.startsWith('drafts.'))).toBe(false)
  })

  test('exige un documentId no vacío', () => {
    expect(() => toSanityId('technology', '')).toThrow()
  })
})

describe('mapAssetReference', () => {
  test('falla fuerte si el asset no está en el mapa', () => {
    expect(() => mapAssetReference('/uploads/x.svg', new Map())).toThrow()
  })

  test('el mensaje de error nombra la URL que falta', () => {
    expect(() => mapAssetReference('/uploads/x.svg', new Map())).toThrow(/\/uploads\/x\.svg/)
  })

  test('devuelve una imagen con referencia al asset', () => {
    expect(mapAssetReference(ICON_URL, assetMap)).toEqual({
      _type: 'image',
      asset: {_type: 'reference', _ref: 'image-bbb222-svg'},
    })
  })

  test('arrastra alternativeText a alt', () => {
    expect(mapAssetReference(PHOTO_URL, assetMap, PHOTO_ALT)).toEqual({
      _type: 'image',
      asset: {_type: 'reference', _ref: 'image-aaa111-1000x1000-png'},
      alt: PHOTO_ALT,
    })
  })

  test('omite alt cuando Strapi no tiene alternativeText (los 36 SVG)', () => {
    // El esquema lleva `alt` opcional: un alt vacío o nulo no se escribe.
    expect(mapAssetReference(ICON_URL, assetMap, null)).not.toHaveProperty('alt')
    expect(mapAssetReference(ICON_URL, assetMap, '')).not.toHaveProperty('alt')
    expect(mapAssetReference(ICON_URL, assetMap, undefined)).not.toHaveProperty('alt')
  })

  test('acepta la URL absoluta que devolvería un Strapi remoto', () => {
    expect(mapAssetReference(`http://localhost:1337${ICON_URL}`, assetMap).asset._ref).toBe(
      'image-bbb222-svg',
    )
  })
})

describe('variantes generadas por Strapi', () => {
  test('incluye medium_, que Strapi genera igual que las otras tres', () => {
    // Verificado en backend/public/uploads: 9 thumbnail_, 9 small_, 2 medium_ y
    // 2 large_. Sin medium_ se subirían 47 ficheros en vez de 45.
    expect([...STRAPI_VARIANT_PREFIXES]).toEqual(['thumbnail_', 'small_', 'medium_', 'large_'])
  })

  test('reconoce las variantes y deja pasar los originales', () => {
    expect(isStrapiVariant('thumbnail_project1_f2b31920e8.jpg')).toBe(true)
    expect(isStrapiVariant('small_me_6a3d08c4ac.png')).toBe(true)
    expect(isStrapiVariant('medium_me_6a3d08c4ac.png')).toBe(true)
    expect(isStrapiVariant('large_me_6a3d08c4ac.png')).toBe(true)
    expect(isStrapiVariant('me_6a3d08c4ac.png')).toBe(false)
    expect(isStrapiVariant('material_ui_7e7f5135d3.svg')).toBe(false)
    // No se confunde con un original cuyo nombre contenga el prefijo por dentro.
    expect(isStrapiVariant('logo_small_thing_abc.svg')).toBe(false)
  })
})

describe('toKey', () => {
  test('usa el id del componente de Strapi, que es estable', () => {
    expect(toKey({id: 115}, 0)).toBe('115')
    expect(toKey({id: 115}, 7)).toBe('115')
  })

  test('cae al índice cuando el componente no trae id', () => {
    expect(toKey({}, 2)).toBe('2')
    expect(toKey(undefined, 3)).toBe('3')
  })
})

describe('objetos de array', () => {
  test('personalInfo conserva los saltos de línea literales', () => {
    const items = mapPersonalInfos([
      {id: 115, title: 'BIOGRAPHY', description: 'I am a software developer.'},
      {id: 116, title: 'CONTACT', description: 'Tegucigalpa, Honduras\nvicalregu@gmail.com\n+504 97380822'},
    ])
    expect(items).toEqual([
      {_type: 'personalInfo', _key: '115', title: 'BIOGRAPHY', description: 'I am a software developer.'},
      {
        _type: 'personalInfo',
        _key: '116',
        title: 'CONTACT',
        description: 'Tegucigalpa, Honduras\nvicalregu@gmail.com\n+504 97380822',
      },
    ])
    expect(items[1].description.split('\n')).toHaveLength(3)
  })

  test('cada miembro de un array lleva _key y _type', () => {
    for (const item of mapAbouts([{id: 115, title: 'YEARS OF EXPERIENCE', description: '04+'}])) {
      expect(item._key).toBeTruthy()
      expect(item._type).toBe('about')
    }
    for (const item of mapSocialMediaLinks([
      {id: 140, icon: 'instagram-line', url: 'https://www.instagram.com/vreyesg26'},
    ])) {
      expect(item._key).toBeTruthy()
      expect(item._type).toBe('socialMediaLink')
    }
  })

  test('los _key de un array son únicos', () => {
    const keys = mapNavLinks([
      {id: 25, slug: 'home', icon: 'home-5-line', label: 'Home'},
      {id: 26, slug: 'skills', icon: 'trophy-line', label: 'Skills'},
      {id: 27, slug: 'qualification', icon: 'book-open-line', label: 'Qualification'},
    ]).map((l) => l._key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  test('navLink omite icon cuando Strapi lo tiene a null (los 3 del footer)', () => {
    expect(mapNavLinks([{id: 16, slug: 'home', icon: null, label: 'Home'}])).toEqual([
      {_type: 'navLink', _key: '16', slug: 'home', label: 'Home'},
    ])
  })

  test('contactInfo omite url cuando no la hay (Email)', () => {
    expect(
      mapContactInfos([
        {id: 28, label: 'Email', value: 'vicalregu@gmail.com', url: null},
        {id: 29, label: 'WhatsApp', value: '+504 97380822', url: 'https://api.whatsapp.com/send?phone=50497380822'},
      ]),
    ).toEqual([
      {_type: 'contactInfo', _key: '28', label: 'Email', value: 'vicalregu@gmail.com'},
      {
        _type: 'contactInfo',
        _key: '29',
        label: 'WhatsApp',
        value: '+504 97380822',
        url: 'https://api.whatsapp.com/send?phone=50497380822',
      },
    ])
  })

  test('contactFormField renombra type a inputType y conserva longText', () => {
    expect(
      mapContactFormFields([
        {id: 22, label: 'Name', placeholder: 'Write your names', type: 'text', name: 'user_name', slug: 'contact-name', longText: false},
        {id: 24, label: 'Project', placeholder: 'Write your project', type: 'text', name: 'user_project', slug: 'contact-project', longText: true},
      ]),
    ).toEqual([
      {
        _type: 'contactFormField',
        _key: '22',
        label: 'Name',
        placeholder: 'Write your names',
        inputType: 'text',
        name: 'user_name',
        slug: 'contact-name',
        longText: false,
      },
      {
        _type: 'contactFormField',
        _key: '24',
        label: 'Project',
        placeholder: 'Write your project',
        inputType: 'text',
        name: 'user_project',
        slug: 'contact-project',
        longText: true,
      },
    ])
  })

  test('un array vacío o ausente se convierte en array vacío', () => {
    expect(mapPersonalInfos(undefined)).toEqual([])
    expect(mapNavLinks(null)).toEqual([])
    expect(mapContactInfos([])).toEqual([])
  })
})

describe('biography', () => {
  const entry = {
    id: 39,
    documentId: 'qiff8vikfo2xa9qyvlbr77jy',
    locale: 'en',
    presentation: "Hi, I'm Victor Reyes\nFullstack Developer",
    photo: {id: 44, url: PHOTO_URL, alternativeText: PHOTO_ALT, mime: 'image/png'},
    HomeLeft: [
      {id: 115, title: 'BIOGRAPHY', description: 'I am a software developer with a lot of creativity.'},
      {id: 116, title: 'CONTACT', description: 'Tegucigalpa, Honduras\nvicalregu@gmail.com\n+504 97380822'},
      {id: 117, title: 'SERVICES', description: 'UI/UX Design\nFullstack Development\nMobile Development'},
    ],
    HomeRight: [
      {id: 115, title: 'YEARS OF EXPERIENCE', description: '04+'},
      {id: 116, title: 'COMPLETED PROJECTS', description: '25+'},
      {id: 117, title: 'COMPANIES WORKED', description: '05'},
    ],
    SocialMediaLinks: [
      {id: 140, icon: 'instagram-line', url: 'https://www.instagram.com/vreyesg26'},
      {id: 141, icon: 'linkedin-box-line', url: 'https://www.linkedin.com/in/victor-reyes-6340751bb/'},
      {id: 142, icon: 'github-line', url: 'https://www.github.com/vreyesg26'},
      {id: 143, icon: 'facebook-box-line', url: 'https://www.facebook.com/victor.reyesgudiel/'},
    ],
  }

  test('renombra HomeLeft/HomeRight/SocialMediaLinks a camelCase', () => {
    const doc = mapBiography(entry, assetMap)
    expect(Object.keys(doc).sort()).toEqual(
      ['_id', '_type', 'homeLeft', 'homeRight', 'photo', 'presentation', 'socialMediaLinks'].sort(),
    )
    expect(doc.homeLeft).toHaveLength(3)
    expect(doc.homeRight).toHaveLength(3)
    expect(doc.socialMediaLinks).toHaveLength(4)
  })

  test('es el singleton publicado, con foto y alt', () => {
    const doc = mapBiography(entry, assetMap)
    expect(doc._id).toBe('biography')
    expect(doc._type).toBe('biography')
    expect(doc.photo).toEqual({
      _type: 'image',
      asset: {_type: 'reference', _ref: 'image-aaa111-1000x1000-png'},
      alt: PHOTO_ALT,
    })
  })

  test('el salto de línea de presentation sobrevive intacto', () => {
    const doc = mapBiography(entry, assetMap)
    expect(doc.presentation).toBe("Hi, I'm Victor Reyes\nFullstack Developer")
    expect(doc.presentation).toContain('\n')
    expect(doc.homeLeft[2].description).toBe('UI/UX Design\nFullstack Development\nMobile Development')
  })

  test('falla si falta la foto, que es requerida', () => {
    expect(() => mapBiography({...entry, photo: null}, assetMap)).toThrow()
  })
})

describe('contact', () => {
  const entry = {
    id: 11,
    documentId: 'kvsam1p1pooi35ivex1xocje',
    icon: 'arrow-right-up-line',
    buttonLabel: 'Submit',
    Contact: [
      {
        id: 10,
        __component: 'contact.talk-to-me',
        icon: 'chat-3-line',
        title: 'Talk to me',
        ContactInfo: [
          {id: 28, label: 'Email', value: 'vicalregu@gmail.com', url: null},
          {id: 29, label: 'WhatsApp', value: '+504 97380822', url: 'https://api.whatsapp.com/send?phone=50497380822'},
          {id: 30, label: 'Messenger', value: '@victor.reyesgudiel', url: 'https://m.me/victor.reyesgudiel'},
        ],
      },
      {
        id: 8,
        __component: 'contact.write-me',
        icon: 'send-plane-line',
        title: 'Write me your project',
        ContactForm: [
          {id: 22, label: 'Name', placeholder: 'Write your names', type: 'text', name: 'user_name', slug: 'contact-name', longText: false},
          {id: 23, label: 'Mail', placeholder: 'Write your email', type: 'email', name: 'user_email', slug: 'contact-email', longText: false},
          {id: 24, label: 'Project', placeholder: 'Write your project', type: 'text', name: 'user_project', slug: 'contact-project', longText: true},
        ],
      },
    ],
  }

  test('parte la dynamic zone en dos campos con nombre', () => {
    const doc = mapContact(entry)
    expect(doc._id).toBe('contact')
    expect(doc).not.toHaveProperty('Contact')
    expect(doc.talkToMe._type).toBe('talkToMe')
    expect(doc.talkToMe.title).toBe('Talk to me')
    expect(doc.talkToMe.contactInfo).toHaveLength(3)
    expect(doc.writeMe._type).toBe('writeMe')
    expect(doc.writeMe.title).toBe('Write me your project')
    expect(doc.writeMe.fields).toHaveLength(3)
  })

  test('la lista del formulario pasa a llamarse fields', () => {
    const doc = mapContact(entry)
    expect(doc.writeMe).not.toHaveProperty('ContactForm')
    expect(doc.writeMe.fields[2]).toEqual({
      _type: 'contactFormField',
      _key: '24',
      label: 'Project',
      placeholder: 'Write your project',
      inputType: 'text',
      name: 'user_project',
      slug: 'contact-project',
      longText: true,
    })
  })

  test('reparte por __component, no por posición', () => {
    const reversed = {...entry, Contact: [entry.Contact[1], entry.Contact[0]]}
    expect(mapContact(reversed)).toEqual(mapContact(entry))
  })

  test('falla si la dynamic zone no trae los dos componentes', () => {
    expect(() => mapContact({...entry, Contact: [entry.Contact[0]]})).toThrow(/write-me/)
    expect(() => mapContact({...entry, Contact: [entry.Contact[1]]})).toThrow(/talk-to-me/)
    expect(() => mapContact({...entry, Contact: []})).toThrow()
  })
})

describe('footer y header', () => {
  test('footer renombra FooterLinks y SocialMedia', () => {
    const doc = mapFooter({
      id: 2,
      documentId: 'gqf5r1v0q0gdratlkx5xcjy0',
      logoName: 'Victor',
      description: 'Fullstack Developer & Software Engineer',
      FooterLinks: [
        {id: 16, slug: 'home', icon: null, label: 'Home'},
        {id: 17, slug: 'skills', icon: null, label: 'Skills'},
        {id: 18, slug: 'projects', icon: null, label: 'Projects'},
      ],
      SocialMedia: [
        {id: 20, icon: 'instagram-line', url: 'https://www.instagram.com/vreyesg26'},
        {id: 21, icon: 'linkedin-box-line', url: 'https://www.linkedin.com/in/victor-reyes-6340751bb/'},
      ],
    })
    expect(doc).toEqual({
      _id: 'footer',
      _type: 'footer',
      logoName: 'Victor',
      description: 'Fullstack Developer & Software Engineer',
      footerLinks: [
        {_type: 'navLink', _key: '16', slug: 'home', label: 'Home'},
        {_type: 'navLink', _key: '17', slug: 'skills', label: 'Skills'},
        {_type: 'navLink', _key: '18', slug: 'projects', label: 'Projects'},
      ],
      socialMedia: [
        {_type: 'socialMediaLink', _key: '20', icon: 'instagram-line', url: 'https://www.instagram.com/vreyesg26'},
        {
          _type: 'socialMediaLink',
          _key: '21',
          icon: 'linkedin-box-line',
          url: 'https://www.linkedin.com/in/victor-reyes-6340751bb/',
        },
      ],
    })
  })

  test('header renombra NavLinks y conserva los iconos', () => {
    const doc = mapHeader({
      id: 4,
      documentId: 'igtagxpcsr1smhba4ve6qif9',
      logoName: 'Victor',
      NavLinks: [{id: 25, slug: 'home', icon: 'home-5-line', label: 'Home'}],
    })
    expect(doc).toEqual({
      _id: 'header',
      _type: 'header',
      logoName: 'Victor',
      navLinks: [{_type: 'navLink', _key: '25', slug: 'home', icon: 'home-5-line', label: 'Home'}],
    })
  })

  test('header.logoName es opcional en el esquema, a diferencia del del footer', () => {
    expect(mapHeader({id: 4, documentId: 'igtagxpcsr1smhba4ve6qif9', NavLinks: []})).toEqual({
      _id: 'header',
      _type: 'header',
      navLinks: [],
    })
    expect(() =>
      mapFooter({id: 2, documentId: 'gqf5r1v0q0gdratlkx5xcjy0', description: 'x', FooterLinks: []}),
    ).toThrow(/footer\.logoName/)
  })
})

describe('colecciones', () => {
  test('technology referencia su categoría y toma el orden curado', () => {
    const doc = mapTechnology(
      {
        id: 55,
        documentId: 'sap51k3w7pqzl60dybv5ya58',
        title: 'Material UI',
        level: 'Intermediate',
        icon: {id: 35, url: ICON_URL, alternativeText: null, mime: 'image/svg+xml'},
        category: {id: 11, documentId: 'ob59t6axq6t2150ff8bt0t8f', title: 'Frontend Development'},
      },
      10,
      assetMap,
    )
    expect(doc).toEqual({
      _id: 'technology-sap51k3w7pqzl60dybv5ya58',
      _type: 'technology',
      title: 'Material UI',
      level: 'Intermediate',
      icon: {_type: 'image', asset: {_type: 'reference', _ref: 'image-bbb222-svg'}},
      category: {_type: 'reference', _ref: 'technologyCategory-ob59t6axq6t2150ff8bt0t8f'},
      order: 10,
    })
  })

  test('technology rechaza un level fuera de la lista del esquema', () => {
    const base = {
      id: 55,
      documentId: 'sap51k3w7pqzl60dybv5ya58',
      title: 'Material UI',
      icon: {url: ICON_URL, alternativeText: null},
      category: {documentId: 'ob59t6axq6t2150ff8bt0t8f'},
    }
    expect(() => mapTechnology({...base, level: 'Expert'}, 10, assetMap)).toThrow()
    expect(() => mapTechnology({...base, level: 'basic'}, 10, assetMap)).toThrow()
    expect(mapTechnology({...base, level: 'Advanced'}, 10, assetMap).level).toBe('Advanced')
  })

  test('technologyCategory escribe el uid de Strapi como slug de Sanity', () => {
    expect(
      mapTechnologyCategory({
        id: 11,
        documentId: 'ob59t6axq6t2150ff8bt0t8f',
        title: 'Frontend Development',
        slug: 'frontend',
        icon: 'code-line',
        order: 1,
      }),
    ).toEqual({
      _id: 'technologyCategory-ob59t6axq6t2150ff8bt0t8f',
      _type: 'technologyCategory',
      title: 'Frontend Development',
      slug: {_type: 'slug', current: 'frontend'},
      icon: 'code-line',
      order: 1,
    })
  })

  test('sectionTitle escribe key como slug', () => {
    expect(
      mapSectionTitle({
        id: 20,
        documentId: 'yq2fre7xlpxccyq4emedvxhl',
        key: 'skills',
        title: 'Skills',
        subtitle: 'My main skills',
        order: 1,
      }),
    ).toEqual({
      _id: 'sectionTitle-yq2fre7xlpxccyq4emedvxhl',
      _type: 'sectionTitle',
      key: {_type: 'slug', current: 'skills'},
      title: 'Skills',
      subtitle: 'My main skills',
      order: 1,
    })
  })

  test('service conserva el salto de línea del título y recibe el orden de la respuesta', () => {
    const doc = mapService(
      {
        id: 7,
        documentId: 'xsp4jcid52zjr6jad4pqt590',
        icon: 'layout-4-line',
        title: 'UI/UX\nDesign',
        description: 'Design of clean and clear interfaces for a good user experience\nmeeting customer requirements.',
      },
      1,
    )
    expect(doc).toEqual({
      _id: 'service-xsp4jcid52zjr6jad4pqt590',
      _type: 'service',
      icon: 'layout-4-line',
      title: 'UI/UX\nDesign',
      description: 'Design of clean and clear interfaces for a good user experience\nmeeting customer requirements.',
      order: 1,
    })
    expect(doc.title).toContain('\n')
  })

  test('project lleva cover con alt y el orden de la respuesta', () => {
    expect(
      mapProject(
        {
          id: 10,
          documentId: 'qyf7s4qdt1nrprfe31ricz35',
          name: 'Movie Filter App',
          technologies: 'React.js - Tailwind - API',
          url: 'https://movies-filter-vrdev.netlify.app/',
          cover: {id: 1, url: COVER_URL, alternativeText: "White film reel icon next to 'Movies' in cursive on a red gradient background.", mime: 'image/jpeg'},
        },
        4,
      assetMap,
      ),
    ).toEqual({
      _id: 'project-qyf7s4qdt1nrprfe31ricz35',
      _type: 'project',
      name: 'Movie Filter App',
      technologies: 'React.js - Tailwind - API',
      url: 'https://movies-filter-vrdev.netlify.app/',
      cover: {
        _type: 'image',
        asset: {_type: 'reference', _ref: 'image-ccc333-1200x800-jpg'},
        alt: "White film reel icon next to 'Movies' in cursive on a red gradient background.",
      },
      order: 4,
    })
  })

  test('testimonial recibe el orden de la respuesta y conserva el texto tal cual', () => {
    expect(
      mapTestimonial(
        {
          id: 6,
          documentId: 'w11h2d6lv0j5fca7i52127do',
          clientName: 'Annelle Hurtado',
          description: 'I would have no hesitation in working with Victor again. ',
        },
        3,
      ),
    ).toEqual({
      _id: 'testimonial-w11h2d6lv0j5fca7i52127do',
      _type: 'testimonial',
      clientName: 'Annelle Hurtado',
      description: 'I would have no hesitation in working with Victor again. ',
      order: 3,
    })
  })

  test('qualification referencia su tipo y conserva el order de Strapi', () => {
    expect(
      mapQualification({
        id: 14,
        documentId: 'nqbywgzbeq19lk6c8chbj7vd',
        title: 'Technical Programmer (Professional internship)',
        institution: 'Central Bank of Honduras (BCH)',
        dateInfo: 'May 2022 - August 2022',
        order: 1,
        qualificationType: {id: 9, documentId: 'z11ns4ku7v6npsrciwi5liyn', title: 'Work'},
      }),
    ).toEqual({
      _id: 'qualification-nqbywgzbeq19lk6c8chbj7vd',
      _type: 'qualification',
      title: 'Technical Programmer (Professional internship)',
      institution: 'Central Bank of Honduras (BCH)',
      dateInfo: 'May 2022 - August 2022',
      qualificationType: {_type: 'reference', _ref: 'qualificationType-z11ns4ku7v6npsrciwi5liyn'},
      order: 1,
    })
  })

  test('qualificationType no escribe la relación inversa qualifications', () => {
    const doc = mapQualificationType({
      id: 8,
      documentId: 'b58d2yx72k2lpny5mnvqd7mi',
      title: 'Education',
      icon: 'pencil-ruler-2-line',
      order: 1,
      qualifications: [{id: 5, documentId: 'sklotwfofs3jjx7j3xxa9cj8'}],
    })
    expect(doc).toEqual({
      _id: 'qualificationType-b58d2yx72k2lpny5mnvqd7mi',
      _type: 'qualificationType',
      title: 'Education',
      icon: 'pencil-ruler-2-line',
      order: 1,
    })
    expect(doc).not.toHaveProperty('qualifications')
  })

  test('technology no escribe nada si el icono no está en el mapa de assets', () => {
    expect(() =>
      mapTechnology(
        {
          id: 55,
          documentId: 'sap51k3w7pqzl60dybv5ya58',
          title: 'Material UI',
          level: 'Basic',
          icon: {url: '/uploads/no-subido.svg', alternativeText: null},
          category: {documentId: 'ob59t6axq6t2150ff8bt0t8f'},
        },
        10,
        assetMap,
      ),
    ).toThrow(/no-subido\.svg/)
  })

  test('un campo requerido ausente aborta con el nombre del campo', () => {
    expect(() =>
      mapService({id: 7, documentId: 'xsp4jcid52zjr6jad4pqt590', icon: 'layout-4-line', title: 'DevOps', description: null}, 1),
    ).toThrow(/service\.description/)
    expect(() =>
      mapSectionTitle({id: 20, documentId: 'yq2fre7xlpxccyq4emedvxhl', key: null, title: 'Skills', subtitle: 'My main skills', order: 1}),
    ).toThrow(/sectionTitle\.key/)
    expect(() =>
      mapTestimonial({id: 6, documentId: 'w11h2d6lv0j5fca7i52127do', clientName: 'Annelle', description: 'x'}, undefined),
    ).toThrow(/testimonial\.order/)
  })
})
