import { useState, useEffect } from "react";
import type { SectionTypes, TechnologyTypes } from "../../types/types";
import { getStrapiData, getStrapiImages } from "../../lib/strapi";
import { skillsQuery } from "../../utils/constants";

export const SkillsSection = ({ title, subtitle }: SectionTypes) => {
  const [skillsList, setSkillsList] = useState<TechnologyTypes[]>([]);

  useEffect(() => {
    async function fetchSkills() {
      const data = await getStrapiData(skillsQuery);
      setSkillsList(data);
    }

    fetchSkills();
  }, []);

  return (
    <section className="skills section" id="skills">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="skills__container container grid section__border">
        {skillsList.map((skills) => (
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
        ))}
      </div>
    </section>
  );
};
