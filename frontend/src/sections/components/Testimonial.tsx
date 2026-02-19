import { useEffect, useState } from "react";
import { getStrapiData } from "../../lib/strapi";
import { testimonialsQuery } from "../../utils/constants";
import type { SectionTypes, TestimonialsTypes } from "../../types/types";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { shapeWaves } from "../../assets";

export const Testimonial = ({ title, subtitle }: SectionTypes) => {
  const [testimonials, setTestimonials] = useState<TestimonialsTypes[]>([]);

  useEffect(() => {
    async function fetchTestimonials() {
      const data = await getStrapiData(testimonialsQuery);
      setTestimonials(data);
    }

    fetchTestimonials();
  }, []);

  return (
    <section className="testimonial section" id="testimonial">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="container section__border">
        <div className="testimonial__container swiper">
          <Swiper
            modules={[Navigation]}
            loop={false}
            navigation={{
              nextEl: ".testimonial__container .swiper-button-next",
              prevEl: ".testimonial__container .swiper-button-prev",
            }}
          >
            {testimonials?.map((testimonial) => (
              <SwiperSlide
                className="testimonial__content"
                key={testimonial?.id}
              >
                <p className="testimonial__description">
                  "{testimonial?.description}"
                </p>

                <div>
                  <h3 className="testimonial__name">
                    {testimonial?.clientName}
                  </h3>
                  <span className="testimonial__subtitle">Client</span>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="swiper-button-prev">
            <i className="ri-arrow-left-s-line" />
          </div>

          <div className="swiper-button-next">
            <i className="ri-arrow-right-s-line" />
          </div>
        </div>
      </div>
      <img
        src={shapeWaves}
        alt="testimonial image"
        className="testimonial__img"
      />
    </section>
  );
};