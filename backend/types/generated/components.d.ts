import type { Schema, Struct } from '@strapi/strapi';

export interface ContactContactForm extends Struct.ComponentSchema {
  collectionName: 'components_contact_contact_forms';
  info: {
    displayName: 'ContactForm';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    longText: Schema.Attribute.Boolean &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<false>;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    placeholder: Schema.Attribute.String & Schema.Attribute.Required;
    slug: Schema.Attribute.String & Schema.Attribute.Required;
    type: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ContactContactInfo extends Struct.ComponentSchema {
  collectionName: 'components_contact_contact_infos';
  info: {
    displayName: 'ContactInfo';
  };
  attributes: {
    label: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String;
    value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ContactTalkToMe extends Struct.ComponentSchema {
  collectionName: 'components_contact_talk_to_mes';
  info: {
    displayName: 'TalkToMe';
  };
  attributes: {
    ContactInfo: Schema.Attribute.Component<'contact.contact-info', true>;
    icon: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ContactWriteMe extends Struct.ComponentSchema {
  collectionName: 'components_contact_write_mes';
  info: {
    displayName: 'WriteMe';
  };
  attributes: {
    ContactForm: Schema.Attribute.Component<'contact.contact-form', true>;
    icon: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeAbout extends Struct.ComponentSchema {
  collectionName: 'components_home_abouts';
  info: {
    displayName: 'About';
    icon: 'briefcase';
  };
  attributes: {
    description: Schema.Attribute.String & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomePersonalInfo extends Struct.ComponentSchema {
  collectionName: 'components_home_personal_infos';
  info: {
    displayName: 'PersonalInfo';
    icon: 'house';
  };
  attributes: {
    description: Schema.Attribute.RichText & Schema.Attribute.Required;
    title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomeSocialMedia extends Struct.ComponentSchema {
  collectionName: 'components_home_social_medias';
  info: {
    displayName: 'SocialMedia';
    icon: 'oneToMany';
  };
  attributes: {
    icon: Schema.Attribute.String & Schema.Attribute.Required;
    url: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface LinksNavLinks extends Struct.ComponentSchema {
  collectionName: 'components_links_nav_links';
  info: {
    displayName: 'NavLinks';
    icon: 'link';
  };
  attributes: {
    icon: Schema.Attribute.String;
    label: Schema.Attribute.String & Schema.Attribute.Required;
    slug: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'contact.contact-form': ContactContactForm;
      'contact.contact-info': ContactContactInfo;
      'contact.talk-to-me': ContactTalkToMe;
      'contact.write-me': ContactWriteMe;
      'home.about': HomeAbout;
      'home.personal-info': HomePersonalInfo;
      'home.social-media': HomeSocialMedia;
      'links.nav-links': LinksNavLinks;
    }
  }
}
