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

export type UseSanityResult<T> = {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
};
