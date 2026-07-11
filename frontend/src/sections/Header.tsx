import { useEffect, useState } from "react";
import {
  DARK_THEME_CLASS,
  getInitialIsDark,
  headerQuery,
  ICON_THEME_CLASS,
} from "../utils/constants";
import type { NavLinksTypes } from "../types/types";
import { useStrapi } from "../hooks/useStrapi";

export const Header = () => {
  const { data: links } = useStrapi<NavLinksTypes>(headerQuery);
  const [activeLink, setActiveLink] = useState("home");
  const [isDark, setIsDark] = useState(getInitialIsDark);
  const [bgHeader, setBgHeader] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle(DARK_THEME_CLASS, isDark);
    localStorage.setItem("selected-theme", isDark ? "dark" : "light");
    localStorage.setItem(
      "selected-icon",
      isDark ? "ri-sun-line" : "ri-moon-line"
    );
  }, [isDark]);

  useEffect(() => {
    const onScroll = () => setBgHeader(window.scrollY >= 50);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll spy: marca como activo el enlace de la sección visible, igual que
  // el portafolio original (assets/js/main.js -> scrollActive). Consultamos las
  // secciones en vivo dentro del handler para que funcione aunque se rendericen
  // de forma asíncrona (datos de Strapi).
  useEffect(() => {
    const scrollActive = () => {
      const scrollY = window.scrollY;
      let current = "";

      document
        .querySelectorAll<HTMLElement>("main section[id]")
        .forEach((section) => {
          const sectionTop = section.offsetTop - 58;
          const sectionHeight = section.offsetHeight;

          if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            current = section.id;
          }
        });

      setActiveLink(current);
    };

    scrollActive();
    window.addEventListener("scroll", scrollActive, { passive: true });
    return () => window.removeEventListener("scroll", scrollActive);
  }, []);

  return (
    <header className={`header ${bgHeader ? "bg-header" : ""}`} id="header">
      <nav className="nav container">
        <a
          href="#home"
          className="nav__logo"
          onClick={() => setIsMenuOpen(false)}
        >
          {links?.logoName}
        </a>

        <div
          className={`nav__menu ${isMenuOpen ? "show-menu" : ""}`}
          id="nav-menu"
        >
          <ul className="nav__list grid">
            {links?.NavLinks?.map((item) => (
              <li className="nav__item" key={item.slug}>
                <a
                  href={`#${item.slug}`}
                  className={`nav__link ${
                    activeLink === item.slug ? "active-link" : ""
                  }`}
                  onClick={() => {
                    setActiveLink(item.slug);
                    setIsMenuOpen(false);
                  }}
                >
                  <i className={`ri-${item.icon}`}></i> {item.label}
                </a>
              </li>
            ))}
          </ul>

          <div
            className="nav__close"
            id="nav-close"
            role="button"
            tabIndex={0}
            onClick={() => setIsMenuOpen(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setIsMenuOpen(false);
            }}
            aria-label="Close menu"
          >
            <i className="ri-close-line"></i>
          </div>
        </div>

        <div className="nav__buttons">
          <i
            id="theme-button"
            className={`change-theme ${
              isDark ? ICON_THEME_CLASS : "ri-moon-line"
            }`}
            onClick={() => setIsDark((v) => !v)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setIsDark((v) => !v);
            }}
            aria-label="Toggle theme"
          ></i>

          <div
            className="nav__toggle"
            id="nav-toggle"
            role="button"
            tabIndex={0}
            onClick={() => setIsMenuOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") setIsMenuOpen(true);
            }}
            aria-label="Open menu"
          >
            <i className="ri-menu-3-line"></i>
          </div>
        </div>
      </nav>
    </header>
  );
};
