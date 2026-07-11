import { testimonialsQuery } from "../../utils/constants";
import type { SectionTypes, TestimonialsTypes } from "../../types/types";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { shapeWaves } from "../../assets";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useStrapi } from "../../hooks/useStrapi";
import { Skeleton } from "./Skeleton";
import { SectionError } from "./SectionError";

const TestimonialSkeleton = () => (
  <div
    className="skeleton-stack"
    style={{ maxWidth: "566px", marginInline: "auto" }}
  >
    <Skeleton width="90%" height="1rem" />
    <Skeleton width="85%" height="1rem" />
    <Skeleton width="70%" height="1rem" />
    <Skeleton width="45%" height="0.9rem" />
    <Skeleton width="25%" height="0.7rem" />
  </div>
);

export const Testimonial = ({ title, subtitle }: SectionTypes) => {
  const { data, loading, error, refetch } =
    useStrapi<TestimonialsTypes[]>(testimonialsQuery);
  const testimonials = data ?? [];

  useScrollReveal(
    [{ target: ".testimonial__container" }],
    testimonials.length > 0
  );

  return (
    <section className="testimonial section" id="testimonial">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>
      <div className="container section__border">
        {error ? (
          <SectionError onRetry={refetch} />
        ) : loading ? (
          <TestimonialSkeleton />
        ) : (
          <div className="testimonial__container swiper">
            <Swiper
              modules={[Navigation]}
              loop={false}
              grabCursor={true}
              navigation={{
                nextEl: ".testimonial__container .swiper-button-next",
                prevEl: ".testimonial__container .swiper-button-prev",
                addIcons: false,
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
        )}
      </div>
      <img
        src={shapeWaves}
        alt="testimonial image"
        className="testimonial__img"
      />
    </section>
  );
};
