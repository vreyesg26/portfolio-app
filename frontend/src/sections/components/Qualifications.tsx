import { useEffect, useState } from "react";
import type { QualificationTypes, SectionTypes } from "../../types/types";
import { getStrapiData } from "../../lib/strapi";
import { qualificationsQuery } from "../../utils/constants";
import { shapeCircle } from "../../assets";

export const Qualifications = ({ title, subtitle }: SectionTypes) => {
  const [qualifications, setQualifications] = useState<QualificationTypes[]>(
    []
  );

  useEffect(() => {
    async function fetchQualifications() {
      const data = await getStrapiData(qualificationsQuery);
      setQualifications(data);
    }

    fetchQualifications();
  }, []);

  return (
    <section className="qualification section" id="qualification">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>

      <div className="qualification__container container grid section__border">
        {qualifications?.map((data) => (
          <div className="qualification__content" key={data?.id}>
            <h3 className="qualification__title">
              <i className={`ri-${data?.icon}`}></i> {data?.title}
            </h3>

            <div className="qualification__info">
              {data?.qualifications?.map((details) => (
                <div key={details?.id}>
                  <h3 className="qualification__name">{details?.title}</h3>

                  <span className="qualification__country">
                    {details?.institution}
                  </span>
                  <span className="qualification__year">
                    {details?.dateInfo}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <img
        src={shapeCircle}
        alt="qualification image"
        className="qualification__img"
      />
    </section>
  );
};
