import qs from "qs";

// Construye la query string de Strapi a partir de un objeto.
// `encodeValuesOnly` deja los corchetes de las claves sin codificar (Strapi los
// necesita literales) y solo codifica los valores.
const buildQuery = (endpoint: string, params: object) =>
  `${endpoint}?${qs.stringify(params, { encodeValuesOnly: true })}`;

// Strapi endpoints constants
export const headerQuery = buildQuery("header", {
  fields: ["logoName"],
  populate: { NavLinks: "*" },
});

export const biographyQuery = buildQuery("biography", {
  fields: ["presentation"],
  populate: {
    HomeLeft: "*",
    HomeRight: "*",
    SocialMediaLinks: "*",
    photo: { fields: ["url"] },
  },
});

export const skillsQuery = buildQuery("technology-categories", {
  fields: ["title", "slug", "icon"],
  sort: ["order:asc"],
  populate: {
    technologies: {
      fields: ["title", "level"],
      populate: { icon: { fields: ["url"] } },
    },
  },
});

export const qualificationsQuery = buildQuery("qualification-types", {
  fields: ["title", "icon"],
  sort: ["order:asc"],
  populate: {
    qualifications: {
      fields: ["title", "institution", "dateInfo"],
      sort: ["order:desc"],
    },
  },
});

export const servicesQuery = buildQuery("services", {
  fields: ["icon", "title", "description"],
});

export const projectsQuery = buildQuery("projects", {
  fields: ["name", "technologies", "url"],
  populate: { cover: { fields: ["url"] } },
});

export const testimonialsQuery = buildQuery("testimonials", {
  fields: ["description", "clientName"],
});

export const contactFormQuery = buildQuery("contact", {
  fields: ["buttonLabel", "icon"],
  populate: { Contact: { populate: "*" } },
});

export const sectionsQuery = buildQuery("section-titles", {
  fields: ["key", "title", "subtitle"],
  sort: ["order:asc"],
});

export const footerQuery = buildQuery("footer", {
  fields: ["logoName", "description"],
  populate: {
    FooterLinks: { fields: ["slug", "label"] },
    SocialMedia: { fields: ["*"] },
  },
});

// Todas las queries del portafolio, para precargarlas al arrancar (prefetch)
// y evitar el waterfall de las secciones que dependen de section-titles.
export const PORTFOLIO_QUERIES = [
  headerQuery,
  biographyQuery,
  sectionsQuery,
  skillsQuery,
  qualificationsQuery,
  servicesQuery,
  projectsQuery,
  testimonialsQuery,
  contactFormQuery,
  footerQuery,
];

//Dark & Light mode constants
export const DARK_THEME_CLASS = "dark-theme";
export const ICON_THEME_CLASS = "ri-sun-line";

export const getInitialIsDark = () => {
  const selectedTheme = localStorage.getItem("selected-theme");
  return selectedTheme === "dark";
};
