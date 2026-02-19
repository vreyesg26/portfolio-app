import { useState, useEffect } from "react";
import { shapeCircle, shapeWaves } from "../assets";
import { HomeLeft, HomeRight } from "./components";
import type {
  BiographyTypes,
  SectionKey,
  SectionTitlesTypes,
} from "../types/types";
import { getStrapiData, getStrapiImages } from "../lib/strapi";
import { biographyQuery, sectionsQuery } from "../utils/constants";
import { SECTION_COMPONENTS } from "./sectionRegistry";

export const MainContent = () => {
  const [sections, setSections] = useState<SectionTitlesTypes[]>([]);
  const [biography, setBiography] = useState<BiographyTypes | null>(null);

  useEffect(() => {
    async function fetchInfo() {
      const sectionData = await getStrapiData(sectionsQuery);
      const biographyData = await getStrapiData(biographyQuery);
      setSections(sectionData);
      setBiography(biographyData);
    }

    fetchInfo();
  }, []);

  return (
    <main className="main">
      <section className="home section" id="home">
        <div className="home__container container grid section__border">
          <div className="home__data grid">
            <h1 className="home__title">{biography?.presentation}</h1>

            <div className="home__blob grid">
              <div className="home__perfil">
                <img
                  src={getStrapiImages(biography?.photo?.url ?? null)}
                  alt="Home profile"
                />
              </div>

              <img src={shapeWaves} alt="" className="home__shape-waves" />
              <img src={shapeCircle} alt="" className="home__shape-circle" />
            </div>

            <ul className="home__social">
              {biography?.SocialMediaLinks?.map((link) => (
                <a
                  key={link?.id}
                  href={link?.url}
                  target="_blank"
                  className="home__social-link"
                >
                  <i className={`ri-${link?.icon}`}></i>
                </a>
              ))}
            </ul>
          </div>
          <HomeLeft homeData={biography?.HomeLeft ?? []} />
          <HomeRight homeData={biography?.HomeRight ?? []} />
        </div>
      </section>

      {/* Portfolio sections mapping */}
      {sections?.map((section) => {
        const Component = SECTION_COMPONENTS[section?.key as SectionKey];
        if (!Component) return null;

        return (
          <Component
            key={section.key}
            title={section.title}
            subtitle={section.subtitle}
          />
        );
      })}
    </main>
  );
};
