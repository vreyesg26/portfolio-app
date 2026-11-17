import type { SectionProps } from "../../types/types";
import type { SERVICES_QUERY_RESULT } from "../../sanity.types";
import { SERVICES_QUERY } from "../../lib/queries";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useSanity } from "../../hooks/useSanity";
import { SectionError } from "./SectionError";

const ServicesSkeleton = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <div className="services__card skeleton" key={i} />
    ))}
  </>
);

export const Services = ({ title, subtitle }: SectionProps) => {
  const { data, loading, error, refetch } =
    useSanity<SERVICES_QUERY_RESULT>(SERVICES_QUERY);
  const services = data ?? [];

  useScrollReveal(
    [{ target: ".services__card", options: { interval: 100 } }],
    services.length > 0
  );

  return (
    <section className="services section" id="services">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="services__container container grid section__border">
        {error ? (
          <SectionError onRetry={refetch} />
        ) : loading ? (
          <ServicesSkeleton />
        ) : (
          services?.map((service) => (
            <div className="services__card" key={service?._id}>
              <i className={`ri-${service?.icon}`}></i>

              <h2 className="services__title">{service?.title}</h2>

              <p className="services__description">{service?.description}</p>

              <div className="services__border"></div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
