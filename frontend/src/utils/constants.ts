// Strapi endpoints constants
export const headerQuery = "header?fields[0]=logoName&populate[NavLinks]=*";

export const biographyQuery =
  "biography?fields[0]=presentation&populate[HomeLeft]=*&populate[HomeRight]=*&populate[SocialMediaLinks]=*&populate[photo][fields][0]=url";

export const skillsQuery =
  "technology-categories?fields[0]=title&fields[1]=slug&fields[2]=icon&sort[0]=order:asc&populate[technologies][fields][0]=title&populate[technologies][fields][1]=level&populate[technologies][populate][icon][fields][0]=url";

export const qualificationsQuery =
  "qualification-types?fields[0]=title&fields[1]=icon&sort[0]=order:asc&populate[qualifications][fields][0]=title&populate[qualifications][fields][1]=institution&populate[qualifications][fields][2]=dateInfo&populate[qualifications][sort][0]=order:desc";

export const servicesQuery =
  "services?fields[0]=icon&fields[1]=title&fields[2]=description";

export const projectsQuery =
  "projects?fields[0]=name&fields[1]=technologies&fields[2]=url&populate[cover][fields][0]=url";

export const testimonialsQuery =
  "testimonials?fields[0]=description&fields[1]=clientName";

export const contactFormQuery = "contact?fields[0]=buttonLabel&fields[1]=icon&populate[Contact][populate]=*";

export const sectionsQuery =
  "section-titles?fields[0]=key&fields[1]=title&fields[2]=subtitle&sort[0]=order:asc";

export const footerQuery =
  "footer?fields[0]=logoName&fields[1]=description&populate[FooterLinks][fields][0]=slug&populate[FooterLinks][fields][1]=label&populate[SocialMedia][fields][0]=*";

//Dark & Light mode constants
export const DARK_THEME_CLASS = "dark-theme";
export const ICON_THEME_CLASS = "ri-sun-line";

export const getInitialIsDark = () => {
  const selectedTheme = localStorage.getItem("selected-theme");
  return selectedTheme === "dark";
};
