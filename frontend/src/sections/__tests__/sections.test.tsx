import { describe, expect, test } from "vitest";
import { screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { MainContent } from "../MainContent";
import { Header } from "../Header";
import {
  ContactForm,
  Projects,
  Qualifications,
  Services,
  SkillsSection,
  Testimonial,
} from "../components";
import {
  BIOGRAPHY_QUERY,
  CONTACT_QUERY,
  HEADER_QUERY,
  SECTION_TITLES_QUERY,
  SERVICES_QUERY,
  SKILLS_QUERY,
} from "../../lib/queries";
import type { SectionProps } from "../../types/types";
import {
  renderError,
  renderLoading,
  renderWithData,
} from "../../test/render";

const props = { title: "Section title", subtitle: "Section subtitle" };

const biography = {
  presentation: "Hi",
  photo: { alt: null, asset: null },
  homeLeft: [],
  homeRight: [],
  socialMediaLinks: [],
};

describe("secciones sobre Sanity", () => {
  test("una categoría sin tecnologías renderiza vacía, no rompe", () => {
    renderWithData(<SkillsSection {...props} />, [
      [
        SKILLS_QUERY,
        [{ _id: "c1", title: "Frontend", slug: "frontend", icon: "code", technologies: [] }],
      ],
    ]);
    expect(screen.getByText("Frontend")).toBeInTheDocument();
    expect(document.querySelectorAll(".skills__data")).toHaveLength(0);
  });

  test("una categoría sin icono no genera ri-null ni ri-undefined", () => {
    renderWithData(<SkillsSection {...props} />, [
      [
        SKILLS_QUERY,
        [
          { _id: "c1", title: "NoIcon", slug: "no-icon", icon: null, technologies: [] },
          { _id: "c2", title: "WithIcon", slug: "with-icon", icon: "code-line", technologies: [] },
        ],
      ],
    ]);
    expect(screen.getByText("NoIcon")).toBeInTheDocument();
    expect(document.querySelector(".ri-null")).toBeNull();
    expect(document.querySelector(".ri-undefined")).toBeNull();
    expect(document.querySelector(".ri-code-line")).not.toBeNull();
  });

  test("un sectionTitle.key desconocido se ignora y los conocidos siguen", () => {
    renderWithData(<MainContent />, [
      [BIOGRAPHY_QUERY, biography],
      [
        SECTION_TITLES_QUERY,
        [
          { key: "inexistente", title: "X", subtitle: "Y" },
          { key: "services", title: "Known title", subtitle: "Known sub" },
        ],
      ],
      [SERVICES_QUERY, []],
    ]);
    expect(screen.queryByText("X")).not.toBeInTheDocument();
    expect(screen.queryByText("Y")).not.toBeInTheDocument();
    expect(screen.getByText("Known title")).toBeInTheDocument();
  });

  test("un navLink sin icono no genera la clase ri-undefined ni ri-null", () => {
    renderWithData(<Header />, [
      [
        HEADER_QUERY,
        {
          logoName: "VR",
          navLinks: [
            { _key: "k1", slug: "home", label: "Home", icon: null },
            { _key: "k2", slug: "skills", label: "Skills", icon: "star-line" },
          ],
        },
      ],
    ]);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(document.querySelector(".ri-undefined")).toBeNull();
    expect(document.querySelector(".ri-null")).toBeNull();
    expect(document.querySelector(".ri-star-line")).not.toBeNull();
  });

  test("un contactInfo sin url no renderiza el enlace", () => {
    renderWithData(<ContactForm {...props} />, [
      [
        CONTACT_QUERY,
        {
          buttonLabel: "Send",
          icon: "send",
          talkToMe: {
            icon: "mail",
            title: "Talk to me",
            contactInfo: [
              { _key: "a", label: "Email", value: "a@b.c", url: "mailto:a@b.c" },
              { _key: "b", label: "Phone", value: "+504", url: null },
            ],
          },
          writeMe: { icon: "pen", title: "Write me form", fields: [] },
        },
      ],
    ]);
    // Ambas filas se muestran, pero solo la que tiene url trae el botón.
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getAllByText("Write me")).toHaveLength(1);
  });

  test("ContactForm lee talkToMe y writeMe por nombre y usa inputType", () => {
    renderWithData(<ContactForm {...props} />, [
      [
        CONTACT_QUERY,
        {
          buttonLabel: "Send",
          icon: "send",
          talkToMe: { icon: "mail", title: "Talk to me", contactInfo: [] },
          writeMe: {
            icon: "pen",
            title: "Write me form",
            fields: [
              {
                _key: "f1",
                label: "Mail",
                placeholder: "you@x.com",
                inputType: "email",
                name: "user_email",
                slug: "contact-email",
                longText: false,
              },
            ],
          },
        },
      ],
    ]);
    expect(screen.getByText("Talk to me")).toBeInTheDocument();
    expect(screen.getByText("Write me form")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("you@x.com")).toHaveAttribute("type", "email");
  });

  test.each<[string, ComponentType<SectionProps>]>([
    ["SkillsSection", SkillsSection],
    ["Qualifications", Qualifications],
    ["Services", Services],
    ["Projects", Projects],
    ["Testimonial", Testimonial],
    ["ContactForm", ContactForm],
  ])("%s muestra skeleton al cargar y SectionError al fallar", async (_name, Component) => {
    const loading = renderLoading(<Component {...props} />);
    expect(document.querySelector(".skeleton, .skeleton-lines")).not.toBeNull();
    expect(screen.queryByRole("button", { name: /reintentar/i })).toBeNull();
    loading.unmount();

    renderError(<Component {...props} />);
    expect(
      await screen.findByRole("button", { name: /reintentar/i }),
    ).toBeInTheDocument();
    expect(document.querySelector(".skeleton, .skeleton-lines")).toBeNull();
  });

  test("los saltos de línea del contenido llegan al DOM sin tocar", () => {
    renderWithData(<MainContent />, [
      [
        BIOGRAPHY_QUERY,
        { ...biography, presentation: "Hi, I'm Victor Reyes\nFullstack Developer" },
      ],
      [SECTION_TITLES_QUERY, []],
    ]);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Hi, I'm Victor Reyes\nFullstack Developer",
    );
  });

  test("los saltos de línea de la descripción de un servicio llegan al DOM", () => {
    renderWithData(<Services {...props} />, [
      [
        SERVICES_QUERY,
        [{ _id: "s1", icon: "code", title: "Dev", description: "Line one\nLine two" }],
      ],
    ]);
    expect(document.querySelector(".services__description")?.textContent).toBe(
      "Line one\nLine two",
    );
  });
});
