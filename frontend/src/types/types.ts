export interface TechnologyTypes {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  icon: string;
  technologies: Technology[];
}

interface Technology {
  id: number;
  documentId: string;
  title: string;
  level: string;
  icon: Icon;
}

interface Icon {
  id: number;
  documentId: string;
  url: string;
}

export interface BiographyTypes {
  id: number;
  documentId: string;
  presentation: string;
  HomeLeft: Home[];
  HomeRight: Home[];
  SocialMediaLinks: SocialMedia[];
  photo: Icon;
}

export interface Home {
  id: number;
  title: string;
  description: string;
  designProperty: string;
}

export interface HomeTypes {
  homeData: Home[];
}

interface SocialMedia {
  id: number;
  icon: string;
  url: string;
}

export interface QualificationTypes {
  id: number;
  documentId: string;
  icon: string;
  title: string;
  order: number;
  qualifications: Qualification[];
}

interface Qualification {
  order: number;
  id: number;
  documentId: string;
  title: string;
  institution: string;
  dateInfo: string;
}

export interface ServicesTypes {
  id: number;
  documentId: string;
  icon: string;
  title: string;
  description: string;
}

export interface ProjectsTypes {
  id: number;
  documentId: string;
  name: string;
  technologies: string;
  url: string;
  cover: Cover;
}

interface Cover {
  id: number;
  documentId: string;
  url: string;
}

export interface TestimonialsTypes {
  id: number;
  documentId: string;
  description: string;
  clientName: string;
}

export interface SectionTypes {
  title: string;
  subtitle: string;
}

export type SectionKey =
  | "skills"
  | "qualification"
  | "services"
  | "projects"
  | "testimonial"
  | "contact";

export type SectionProps = {
  title: string;
  subtitle: string;
};

export interface SectionTitlesTypes {
  id: number;
  documentId: string;
  key: string;
  title: string;
  subtitle: string;
}

export interface NavLinksTypes {
  id: number;
  documentId: string;
  logoName: string;
  NavLinks: NavLink[];
}

interface NavLink {
  id: number;
  slug: string;
  icon: string;
  label: string;
}

export interface FooterTypes {
  id: number;
  documentId: string;
  logoName: string;
  description: string;
  FooterLinks: FooterLink[];
  SocialMedia: SocialMedia[];
}

interface FooterLink {
  id: number;
  slug: string;
  label: string;
}

export interface ContactTypes {
  id: number;
  documentId: string;
  buttonLabel: string;
  icon: string;
  Contact: Contact[];
}

interface Contact {
  __component: string;
  id: number;
  icon: string;
  title: string;
  ContactInfo?: ContactInfo[];
  ContactForm?: ContactForm[];
}

interface ContactForm {
  id: number;
  label: string;
  placeholder: string;
  type: string;
  name: string;
  slug: string;
  longText: boolean;
}

interface ContactInfo {
  id: number;
  label: string;
  value: string;
  url: null | string;
}

export type UseStrapiResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};

export type FetchState<T> = {
  data: T | null;
  error: Error | null;
  query: string | null;
};