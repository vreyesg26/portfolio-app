import { shapeCircle, shapeWaves } from "../assets";
import { HomeLeft, HomeRight, Skeleton, SectionError } from "./components";
import type { SectionKey } from "../types/types";
import type {
  BIOGRAPHY_QUERY_RESULT,
  SECTION_TITLES_QUERY_RESULT,
} from "../sanity.types";
import { imageAlt, imageUrl } from "../lib/image";
import { BIOGRAPHY_QUERY, SECTION_TITLES_QUERY } from "../lib/queries";
import { SECTION_COMPONENTS } from "./sectionRegistry";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useSanity } from "../hooks/useSanity";

const HomeSkeleton = () => (
  <div className="home__container container grid section__border">
    {/* Mismo orden en el DOM que el contenido real: home__data PRIMERO. Así en
        móvil se apila igual (foto arriba, info debajo) y en desktop las reglas
        de `order` del CSS lo recolocan en las 3 columnas. */}
    <div className="home__data grid">
      <div className="skeleton-stack">
        <Skeleton width="70%" height="1.8rem" />
        <Skeleton width="55%" height="1.8rem" />
      </div>

      <div className="home__blob grid">
        <div className="home__perfil skeleton" />
      </div>

      <div className="home__social">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} width="1.4rem" height="1.4rem" radius="50%" />
        ))}
      </div>
    </div>

    <div className="home__info">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="skeleton-lines" key={i}>
          <Skeleton width="55%" height="0.7rem" />
          <Skeleton width="85%" height="1rem" />
        </div>
      ))}
    </div>

    <div className="home__info">
      {Array.from({ length: 3 }).map((_, i) => (
        <div className="skeleton-lines" key={i}>
          <Skeleton width="60%" height="0.7rem" />
          <Skeleton width="35%" height="1.6rem" />
        </div>
      ))}
    </div>
  </div>
);

export const MainContent = () => {
  const { data: sections } = useSanity<SECTION_TITLES_QUERY_RESULT>(SECTION_TITLES_QUERY);
  const {
    data: biography,
    loading: biographyLoading,
    error: biographyError,
    refetch: refetchBiography,
  } = useSanity<BIOGRAPHY_QUERY_RESULT>(BIOGRAPHY_QUERY);

  useScrollReveal(
    [
      { target: ".home__data" },
      {
        target: ".home__info div",
        options: { origin: "bottom" },
        stagger: { base: 600, step: 100 },
      },
    ],
    !!biography
  );

  return (
    <main className="main">
      <section className="home section" id="home">
        {biographyError ? (
          <div className="home__container container grid section__border">
            <SectionError onRetry={refetchBiography} />
          </div>
        ) : biographyLoading ? (
          <HomeSkeleton />
        ) : (
          <div className="home__container container grid section__border">
            <div className="home__data grid">
              <h1 className="home__title">{biography?.presentation}</h1>

              <div className="home__blob grid">
                <div className="home__perfil">
                  <img
                    src={imageUrl(biography?.photo)}
                    alt={imageAlt(biography?.photo, "Home profile")}
                  />
                </div>

                <img src={shapeWaves} alt="" className="home__shape-waves" />
                <img src={shapeCircle} alt="" className="home__shape-circle" />
              </div>

              <ul className="home__social">
                {biography?.socialMediaLinks?.map((link) => (
                  <a
                    key={link?._key}
                    href={link?.url}
                    target="_blank"
                    className="home__social-link"
                  >
                    <i className={`ri-${link?.icon}`}></i>
                  </a>
                ))}
              </ul>
            </div>
            <HomeLeft homeData={biography?.homeLeft ?? []} />
            <HomeRight homeData={biography?.homeRight ?? []} />
          </div>
        )}
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
