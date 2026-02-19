import { useState, useEffect } from "react";
import type { SectionTypes, ServicesTypes } from "../../types/types";
import { getStrapiData } from "../../lib/strapi";
import { servicesQuery } from "../../utils/constants";

export const Services = ({ title, subtitle }: SectionTypes) => {
  const [services, setServices] = useState<ServicesTypes[]>([]);

  useEffect(() => {
    async function fetchServices() {
      const data = await getStrapiData(servicesQuery);
      setServices(data);
    }

    fetchServices();
  }, []);

  return (
    <section className="services section" id="services">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="services__container container grid section__border">
        {services?.map((service) => (
          <div className="services__card" key={service?.id}>
            <i className={`ri-${service?.icon}`}></i>

            <h2 className="services__title">{service?.title}</h2>

            <p className="services__description">{service?.description}</p>

            <div className="services__border"></div>
          </div>
        ))}
      </div>
    </section>
  );
};
