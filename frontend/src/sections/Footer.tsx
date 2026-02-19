import { useEffect, useState } from "react";
import type { FooterTypes } from "../types/types";
import { getStrapiData } from "../lib/strapi";
import { footerQuery } from "../utils/constants";

export const Footer = () => {
  const date = new Date();
  const [footer, setFooter] = useState<FooterTypes | null>(null);

  useEffect(() => {
    async function fetchFooter() {
      const footerData = await getStrapiData(footerQuery);
      setFooter(footerData);
    }

    fetchFooter();
  }, []);

  return (
    <footer className="footer">
      <div className="footer__container container">
        <h1 className="footer__title">{footer?.logoName}</h1>
        <p>{footer?.description}</p>

        <ul className="footer__list">
          {footer?.FooterLinks?.map((link) => (
            <li key={link?.id}>
              <a href={`#${link?.slug}`} className="footer__link">
                {link?.label}
              </a>
            </li>
          ))}
        </ul>

        <ul className="footer__social">
          {footer?.SocialMedia?.map((social) => (
            <a
              key={social?.id}
              href={social?.url}
              target="_blank"
              className="footer__social-link"
            >
              <i className={`ri-${social?.icon}`}></i>
            </a>
          ))}
        </ul>

        <span className="footer__copy" id="currentYear">
          &#169; Copyright Victor Reyes. All rights reserved{" "}
          {date.getFullYear()}.
        </span>
      </div>
    </footer>
  );
};
