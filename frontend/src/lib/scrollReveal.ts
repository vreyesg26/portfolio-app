import ScrollReveal from "scrollreveal";

/**
 * Subconjunto de opciones de ScrollReveal que usamos en el portafolio.
 */
export type RevealOptions = {
  origin?: "top" | "right" | "bottom" | "left";
  distance?: string;
  duration?: number;
  delay?: number;
  interval?: number;
  reset?: boolean;
};

/**
 * Instancia única de ScrollReveal con la MISMA configuración base del
 * portafolio original (Personal Portfolio -> assets/js/main.js):
 * origin "top", distance 60px, duration 2500ms, delay 400ms.
 *
 * Cada sección revela sus propios elementos (ver useScrollReveal) una vez
 * que sus datos de Strapi ya se renderizaron en el DOM.
 */
export const sr = ScrollReveal({
  origin: "top",
  distance: "60px",
  duration: 2500,
  delay: 400,
});
