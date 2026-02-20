import { useState, useEffect } from "react";
import type { ContactTypes, SectionTypes } from "../../types/types";
import { getStrapiData } from "../../lib/strapi";
import { contactFormQuery } from "../../utils/constants";

export const ContactForm = ({ title, subtitle }: SectionTypes) => {
  const [contactFormData, setContactFormData] = useState<ContactTypes | null>(
    null
  );

  useEffect(() => {
    async function fetchContactInfo() {
      const labelForm = await getStrapiData(contactFormQuery);
      setContactFormData(labelForm);
    }

    fetchContactInfo();
  }, []);

  return (
    <section className="contact section" id="contact">
      <h2 className="section__title">{title}</h2>
      <span className="section__subtitle">{subtitle}</span>

      <div className="contact__container container grid section__border">
        <div className="contact__content">
          <h3 className="contact__title">
            <i className={`ri-${contactFormData?.Contact[0]?.icon}`} />
            {contactFormData?.Contact[0]?.title}
          </h3>

          <div className="contact__info">
            {contactFormData?.Contact[0]?.ContactInfo?.map((data) => (
              <div className="contact__data" key={data?.id}>
                <span className="contact__data-title">{data?.label}</span>
                <span className="contact__data-info">{data?.value}</span>
                {data?.url ? (
                  <a
                    href={data?.url}
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
            <i className={`ri-${contactFormData?.Contact[1]?.icon}`} />
            {contactFormData?.Contact[1]?.title}
          </h3>

          <form action="" className="contact__form" id="contact-form">
            {contactFormData?.Contact[1]?.ContactForm?.map((formInputs) => (
              <div
                key={formInputs?.id}
                className={`contact__form-div ${
                  formInputs?.longText ? "contact__form-area" : ""
                }`}
              >
                <label className="contact__form-tag">{formInputs?.label}</label>
                {!formInputs?.longText ? (
                  <input
                    type={formInputs?.type}
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
      </div>
    </section>
  );
};
