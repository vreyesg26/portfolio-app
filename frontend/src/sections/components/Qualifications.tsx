import type { QualificationTypes, SectionTypes } from "../../types/types";
import { qualificationsQuery } from "../../utils/constants";
import { shapeCircle } from "../../assets";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useStrapi } from "../../hooks/useStrapi";
import { Skeleton } from "./Skeleton";
import { SectionError } from "./SectionError";

const QualificationSkeleton = () => (
  <>
    {Array.from({ length: 2 }).map((_, i) => (
      <div className="qualification__content" key={i}>
        <div className="qualification__title">
          <Skeleton width="45%" height="1.1rem" />
        </div>
        <div className="qualification__info">
          {Array.from({ length: 2 }).map((_, j) => (
            <div className="skeleton-lines" key={j}>
              <Skeleton width="80%" height="1rem" />
              <Skeleton width="55%" height="0.8rem" />
              <Skeleton width="45%" height="0.8rem" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </>
);

export const Qualifications = ({ title, subtitle }: SectionTypes) => {
  const { data, loading, error, refetch } =
    useStrapi<QualificationTypes[]>(qualificationsQuery);
  const qualifications = data ?? [];

  useScrollReveal(
    [{ target: ".qualification__content", options: { interval: 100 } }],
    qualifications.length > 0
  );

  return (
    <section className="qualification section" id="qualification">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>

      <div className="qualification__container container grid section__border">
        {error ? (
          <SectionError onRetry={refetch} />
        ) : loading ? (
          <QualificationSkeleton />
        ) : (
          qualifications?.map((item) => (
            <div className="qualification__content" key={item?.id}>
              <h3 className="qualification__title">
                <i className={`ri-${item?.icon}`}></i> {item?.title}
              </h3>

              <div className="qualification__info">
                {item?.qualifications?.map((details) => (
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
          ))
        )}
      </div>
      <img
        src={shapeCircle}
        alt="qualification image"
        className="qualification__img"
      />
    </section>
  );
};
