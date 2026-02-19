import type { ComponentType } from "react";
import type { SectionKey, SectionProps } from "../types/types";

import {
  ContactForm,
  Projects,
  Qualifications,
  Services,
  SkillsSection,
  Testimonial,
} from "./components";

export const SECTION_COMPONENTS: Record<
  SectionKey,
  ComponentType<SectionProps>
> = {
  skills: SkillsSection,
  qualification: Qualifications,
  services: Services,
  projects: Projects,
  testimonial: Testimonial,
  contact: ContactForm,
};
