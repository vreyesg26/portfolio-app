import { useState, useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import type { ProjectsTypes, SectionTypes } from "../../types/types";
import { getStrapiData, getStrapiImages } from "../../lib/strapi";
import { projectsQuery } from "../../utils/constants";

export const Projects = ({ title, subtitle }: SectionTypes) => {
  const [projects, setProjects] = useState<ProjectsTypes[]>([]);

  useEffect(() => {
    async function fetchProjects() {
      const data = await getStrapiData(projectsQuery);
      setProjects(data);
    }

    fetchProjects();
  }, []);

  return (
    <section className="projects section" id="projects">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="container section__border">
        <Swiper
          className="projects__container swiper"
          modules={[Navigation, Pagination]}
          loop={false}
          spaceBetween={24}
          navigation={{
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
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
      </div>
    </section>
  );
};
