import type { FOOTER_QUERY_RESULT } from "../sanity.types";
import { FOOTER_QUERY } from "../lib/queries";
import { useScrollReveal } from "../hooks/useScrollReveal";
import { useSanity } from "../hooks/useSanity";

export const Footer = () => {
  const date = new Date();
  const { data: footer } = useSanity<FOOTER_QUERY_RESULT>(FOOTER_QUERY);

  useScrollReveal([{ target: ".footer__container" }], !!footer);

  return (
    <footer className="footer">
      <div className="footer__container container">
        <h1 className="footer__title">{footer?.logoName}</h1>
        <p>{footer?.description}</p>

        <ul className="footer__list">
          {footer?.footerLinks?.map((link) => (
            <li key={link?._key}>
              <a href={`#${link?.slug}`} className="footer__link">
                {link?.label}
              </a>
            </li>
          ))}
        </ul>

        <ul className="footer__social">
          {footer?.socialMedia?.map((social) => (
            <a
              key={social?._key}
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
