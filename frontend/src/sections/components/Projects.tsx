import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { ProjectsTypes, SectionTypes } from "../../types/types";
import { getStrapiImages } from "../../lib/strapi";
import { projectsQuery } from "../../utils/constants";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useStrapi } from "../../hooks/useStrapi";
import { Skeleton } from "./Skeleton";
import { SectionError } from "./SectionError";

const ProjectsSkeleton = () => (
  <div style={{ display: "flex", justifyContent: "center" }}>
    <div className="skeleton-stack">
      <Skeleton width="min(320px, 78vw)" height="200px" radius="0.75rem" />
      <Skeleton width="200px" height="0.8rem" />
      <Skeleton width="240px" height="1.4rem" />
      <Skeleton width="120px" height="2.2rem" radius="0.5rem" />
    </div>
  </div>
);

export const Projects = ({ title, subtitle }: SectionTypes) => {
  const { data, loading, error, refetch } =
    useStrapi<ProjectsTypes[]>(projectsQuery);
  const projects = data ?? [];

  useScrollReveal([{ target: ".projects__container" }], projects.length > 0);

  return (
    <section className="projects section" id="projects">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="container section__border">
        {error ? (
          <SectionError onRetry={refetch} />
        ) : loading ? (
          <ProjectsSkeleton />
        ) : (
          <Swiper
            className="projects__container swiper"
            modules={[Navigation, Pagination]}
            loop={true}
            spaceBetween={24}
            navigation={{
              nextEl: ".swiper-button-next",
              prevEl: ".swiper-button-prev",
              addIcons: false,
            }}
            pagination={{
              el: ".swiper-pagination",
              clickable: true,
            }}
            breakpoints={{
              1200: {
                slidesPerView: 2,
                spaceBetween: -56,
              },
            }}
          >
            {projects?.map((project) => (
              <SwiperSlide className="projects__content" key={project?.id}>
                <img
                  src={getStrapiImages(project?.cover?.url)}
                  alt={project?.name}
                  className="projects__img"
                />
                <div>
                  <span className="projects__subtitle">
                    {project?.technologies}
                  </span>
                  <h1 className="projects__title">{project?.name}</h1>
                  <a
                    href={project?.url}
                    className="projects__button"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View demo <i className="ri-arrow-right-line"></i>
                  </a>
                </div>
              </SwiperSlide>
            ))}

            <div className="swiper-button-next">
              <i className="ri-arrow-right-s-line"></i>
            </div>

            <div className="swiper-button-prev">
              <i className="ri-arrow-left-s-line"></i>
            </div>

            <div className="swiper-pagination"></div>
          </Swiper>
        )}
      </div>
    </section>
  );
};
