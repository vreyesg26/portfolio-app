import { useEffect, useState } from "react";
import {
  DARK_THEME_CLASS,
  getInitialIsDark,
  headerQuery,
  ICON_THEME_CLASS,
} from "../utils/constants";
import type { NavLinksTypes } from "../types/types";
import { getStrapiData } from "../lib/strapi";

export const Header = () => {
  const [links, setLinks] = useState<NavLinksTypes | null>(null);
  const [activeLink, setActiveLink] = useState("home");
  const [isDark, setIsDark] = useState(getInitialIsDark);
  const [bgHeader, setBgHeader] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    async function fetchLinks() {
      const linksData = await getStrapiData(headerQuery);
      setLinks(linksData);
    }

    fetchLinks();
  }, []);

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

  useEffect(() => {
    const sections = links?.NavLinks?.map((item) =>
      document.getElementById(item.slug)
    ).filter(Boolean) as HTMLElement[];

    if (!sections?.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0)
          )[0];

        if (visible?.target?.id) setActiveLink(visible.target.id);
      },
      {
        root: null,
        rootMargin: "-58px 0px -60% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [links?.NavLinks]);

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
