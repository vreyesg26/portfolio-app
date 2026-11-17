import type {SchemaTypeDefinition} from 'sanity'
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
]
