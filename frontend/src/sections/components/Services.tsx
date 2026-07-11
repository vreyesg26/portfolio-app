import type { SectionTypes, ServicesTypes } from "../../types/types";
import { servicesQuery } from "../../utils/constants";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useStrapi } from "../../hooks/useStrapi";
import { SectionError } from "./SectionError";

const ServicesSkeleton = () => (
  <>
    {Array.from({ length: 3 }).map((_, i) => (
      <div className="services__card skeleton" key={i} />
    ))}
  </>
);

export const Services = ({ title, subtitle }: SectionTypes) => {
  const { data, loading, error, refetch } =
    useStrapi<ServicesTypes[]>(servicesQuery);
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
            <div className="services__card" key={service?.id}>
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
