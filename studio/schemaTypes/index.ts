import type {SchemaTypeDefinition} from 'sanity'
import {biography} from './documents/biography'
import {contact} from './documents/contact'
import {footer} from './documents/footer'
import {header} from './documents/header'
import {project} from './documents/project'
import {qualification} from './documents/qualification'
import {qualificationType} from './documents/qualification-type'
import {sectionTitle} from './documents/section-title'
import {service} from './documents/service'
import {technology} from './documents/technology'
import {technologyCategory} from './documents/technology-category'
import {testimonial} from './documents/testimonial'
import {about} from './objects/about'
import {contactFormField} from './objects/contact-form-field'
import {contactInfo} from './objects/contact-info'
import {navLink} from './objects/nav-link'
import {personalInfo} from './objects/personal-info'
import {socialMediaLink} from './objects/social-media-link'
import {talkToMe} from './objects/talk-to-me'
import {writeMe} from './objects/write-me'

export const schemaTypes: SchemaTypeDefinition[] = [
  personalInfo,
  about,
  socialMediaLink,
  navLink,
  contactInfo,
  contactFormField,
  talkToMe,
  writeMe,
  biography,
  contact,
  footer,
  header,
  project,
  qualification,
  qualificationType,
  sectionTitle,
  service,
  technology,
  technologyCategory,
  testimonial,
]
