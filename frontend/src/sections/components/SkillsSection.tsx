import type { SectionTypes, TechnologyTypes } from "../../types/types";
import { getStrapiImages } from "../../lib/strapi";
import { skillsQuery } from "../../utils/constants";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useStrapi } from "../../hooks/useStrapi";
import { Skeleton } from "./Skeleton";
import { SectionError } from "./SectionError";

const SkillsSkeleton = () => (
  <>
    {Array.from({ length: 2 }).map((_, i) => (
      <div className="skills__content" key={i}>
        <div className="skills__title">
          <Skeleton width="55%" height="1.1rem" />
        </div>
        <div className="skills__info">
          {Array.from({ length: 6 }).map((_, j) => (
            <div className="skills__data skeleton-stack" key={j}>
              <div className="skills__blob skeleton" />
              <Skeleton width="70%" height="0.75rem" />
              <Skeleton width="45%" height="0.65rem" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </>
);

export const SkillsSection = ({ title, subtitle }: SectionTypes) => {
  const { data, loading, error, refetch } =
    useStrapi<TechnologyTypes[]>(skillsQuery);
  const skillsList = data ?? [];

  useScrollReveal(
    [
      // odd/even en vez de posiciones fijas: cubre cualquier número de
      // categorías (el original tenía 4 fijas en HTML). Impares entran desde la
      // izquierda y pares desde la derecha, siguiendo las 2 columnas del grid.
      {
        target: ".skills__content:nth-child(odd)",
        options: { origin: "left" },
      },
      {
        target: ".skills__content:nth-child(even)",
        options: { origin: "right" },
      },
    ],
    skillsList.length > 0,
  );

  return (
    <section className="skills section" id="skills">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="skills__container container grid section__border">
        {error ? (
          <SectionError onRetry={refetch} />
        ) : loading ? (
          <SkillsSkeleton />
        ) : (
          skillsList.map((skills) => (
            <div className="skills__content" key={skills?.id}>
              <h3 className="skills__title">
                <i className={`ri-${skills.icon}`}></i> {skills?.title}
              </h3>
              <div className="skills__info">
                {skills?.technologies?.map((technologies) => (
                  <div className="skills__data" key={technologies?.id}>
                    <div className="skills__blob">
                      <img
                        src={getStrapiImages(technologies?.icon?.url)}
                        alt="skills image"
                      />
                    </div>

                    <h3 className="skills__name">{technologies?.title}</h3>
                    <span className="skills__subtitle">
                      {technologies?.level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
