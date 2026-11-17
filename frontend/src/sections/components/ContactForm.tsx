import type { SectionProps } from "../../types/types";
import type { CONTACT_QUERY_RESULT } from "../../sanity.types";
import { CONTACT_QUERY } from "../../lib/queries";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { useSanity } from "../../hooks/useSanity";
import { Skeleton } from "./Skeleton";
import { SectionError } from "./SectionError";

const ContactSkeleton = () => (
  <>
    <div className="contact__content skeleton-lines">
      <Skeleton width="40%" height="1.1rem" />
      <Skeleton width="70%" height="0.9rem" />
      <Skeleton width="55%" height="0.9rem" />
      <Skeleton width="60%" height="0.9rem" />
    </div>
    <div className="contact__content skeleton-lines">
      <Skeleton width="55%" height="1.1rem" />
      <Skeleton width="100%" height="3.5rem" radius="2rem" />
      <Skeleton width="100%" height="3.5rem" radius="2rem" />
      <Skeleton width="100%" height="8rem" radius="2rem" />
      <Skeleton width="120px" height="1.6rem" />
    </div>
  </>
);

export const ContactForm = ({ title, subtitle }: SectionProps) => {
  const { data: contactFormData, loading, error, refetch } =
    useSanity<CONTACT_QUERY_RESULT>(CONTACT_QUERY);

  useScrollReveal(
    [
      { target: ".contact__content:nth-child(1)", options: { origin: "left" } },
      { target: ".contact__content:nth-child(2)", options: { origin: "right" } },
    ],
    !!contactFormData
  );

  return (
    <section className="contact section" id="contact">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>

      <div className="contact__container container grid section__border">
        {error ? (
          <SectionError onRetry={refetch} />
        ) : loading ? (
          <ContactSkeleton />
        ) : (
          <>
            <div className="contact__content">
              <h3 className="contact__title">
                <i className={`ri-${contactFormData?.talkToMe?.icon}`} />
                {contactFormData?.talkToMe?.title}
              </h3>

              <div className="contact__info">
                {contactFormData?.talkToMe?.contactInfo?.map((item) => (
                  <div className="contact__data" key={item?._key}>
                    <span className="contact__data-title">{item?.label}</span>
                    <span className="contact__data-info">{item?.value}</span>
                    {item?.url ? (
                      <a
                        href={item?.url}
                        target="_blank"
                        className="contact__button"
                      >
                        Write me <i className="ri-arrow-right-line"></i>
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="contact__content">
              <h3 className="contact__title">
                <i className={`ri-${contactFormData?.writeMe?.icon}`} />
                {contactFormData?.writeMe?.title}
              </h3>

              <form action="" className="contact__form" id="contact-form">
                {contactFormData?.writeMe?.fields?.map((formInputs) => (
                  <div
                    key={formInputs?._key}
                    className={`contact__form-div ${
                      formInputs?.longText ? "contact__form-area" : ""
                    }`}
                  >
                    <label className="contact__form-tag">
                      {formInputs?.label}
                    </label>
                    {!formInputs?.longText ? (
                      <input
                        type={formInputs?.inputType}
                        name={formInputs?.name}
                        required
                        placeholder={formInputs?.placeholder}
                        className="contact__form-input"
                        id={formInputs?.slug}
                      />
                    ) : (
                      <textarea
                        typeof="text"
                        name="user_project"
                        placeholder="Write your project"
                        className="contact__form-input"
                        id="contact-project"
                      />
                    )}
                  </div>
                ))}

                <p className="contact__message" id="contact-message"></p>

                <button type="submit" className="contact__button">
                  {contactFormData?.buttonLabel}
                  <i className={`ri-${contactFormData?.icon}`} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </section>
  );
};
