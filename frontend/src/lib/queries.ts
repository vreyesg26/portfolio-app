import { defineQuery } from "groq";

// Queries GROQ del portafolio. Traducen una a una las que antes vivían en
// utils/constants.ts contra Strapi. Reglas:
// - Cada query se asigna a una variable con defineQuery() y un nombre único en
//   todo el proyecto: typegen sobrescribe en silencio los duplicados.
// - Las imágenes se proyectan como {alt, "asset": asset->{_id, url, mimeType}}:
//   `mimeType` permite a imageUrl() detectar los SVG y `_id` transformar los
//   raster con @sanity/image-url.
// - Los slug se proyectan planos (`key.current`, `slug.current`).
// - Los textos no se procesan: sus saltos de línea se pintan con pre-line.

export const HEADER_QUERY = defineQuery(`
  *[_type == "header" && _id == "header"][0]{
    logoName,
    navLinks[]{_key, slug, label, icon}
  }
`);

export const BIOGRAPHY_QUERY = defineQuery(`
  *[_type == "biography" && _id == "biography"][0]{
    presentation,
    photo{alt, "asset": asset->{_id, url, mimeType}},
    homeLeft[]{_key, title, description},
    homeRight[]{_key, title, description},
    socialMediaLinks[]{_key, icon, url}
  }
`);

export const SECTION_TITLES_QUERY = defineQuery(`
  *[_type == "sectionTitle"] | order(order asc){
    "key": key.current,
    title,
    subtitle
  }
`);

// Las tecnologías anidadas se ordenan de forma explícita: en Strapi dependían
// del orden de la tabla de unión y la migración lo movió al campo `order`.
export const SKILLS_QUERY = defineQuery(`
  *[_type == "technologyCategory"] | order(order asc){
    _id,
    title,
    "slug": slug.current,
    icon,
    "technologies": *[_type == "technology" && references(^._id)] | order(order asc){
      _id,
      title,
      level,
      icon{alt, "asset": asset->{_id, url, mimeType}}
    }
  }
`);

// Tipos ascendente, titulaciones anidadas DESCENDENTE (como en Strapi).
export const QUALIFICATIONS_QUERY = defineQuery(`
  *[_type == "qualificationType"] | order(order asc){
    _id,
    title,
    icon,
    "qualifications": *[_type == "qualification" && references(^._id)] | order(order desc){
      _id,
      title,
      institution,
      dateInfo
    }
  }
`);

export const SERVICES_QUERY = defineQuery(`
  *[_type == "service"] | order(order asc){
    _id,
    icon,
    title,
    description
  }
`);

export const PROJECTS_QUERY = defineQuery(`
  *[_type == "project"] | order(order asc){
    _id,
    name,
    technologies,
    url,
    cover{alt, "asset": asset->{_id, url, mimeType}}
  }
`);

export const TESTIMONIALS_QUERY = defineQuery(`
  *[_type == "testimonial"] | order(order asc){
    _id,
    description,
    clientName
  }
`);

export const CONTACT_QUERY = defineQuery(`
  *[_type == "contact" && _id == "contact"][0]{
    buttonLabel,
    icon,
    talkToMe{
      icon,
      title,
      contactInfo[]{_key, label, value, url}
    },
    writeMe{
      icon,
      title,
      fields[]{_key, label, placeholder, inputType, name, slug, longText}
    }
  }
`);

export const FOOTER_QUERY = defineQuery(`
  *[_type == "footer" && _id == "footer"][0]{
    logoName,
    description,
    footerLinks[]{_key, slug, label},
    socialMedia[]{_key, icon, url}
  }
`);

// Todas las queries del portafolio, para precargarlas al arrancar (prefetch)
// y evitar el waterfall de las secciones que dependen de section-titles.
export const PORTFOLIO_QUERIES: string[] = [
  HEADER_QUERY,
  BIOGRAPHY_QUERY,
  SECTION_TITLES_QUERY,
  SKILLS_QUERY,
  QUALIFICATIONS_QUERY,
  SERVICES_QUERY,
  PROJECTS_QUERY,
  TESTIMONIALS_QUERY,
  CONTACT_QUERY,
  FOOTER_QUERY,
];
