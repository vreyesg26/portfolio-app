import { useEffect } from "react";
import { sr, type RevealOptions } from "../lib/scrollReveal";

type RevealItem = {
  target: string;
  options?: RevealOptions;
  /**
   * Escalonado por elemento. Si se define, en vez de un único `sr.reveal` con
   * `interval` (que ScrollReveal maneja como una "secuencia" con timers de JS y
   * que se rompe cuando los elementos están en el viewport inicial y otra
   * sección dispara un re-sync al terminar su fetch), se revela CADA elemento
   * del selector con un delay incremental. Reproduce el mismo efecto escalonado
   * pero cada elemento anima de forma independiente (transition-delay de CSS),
   * inmune al re-sync.
   */
  stagger?: { base: number; step: number };
};

/**
 * Aplica las animaciones de aparición de ScrollReveal cuando `ready` es true,
 * es decir, cuando los elementos objetivo ya existen en el DOM (los datos de
 * Strapi ya se renderizaron).
 *
 * En el portafolio original todo el HTML existe al cargar, por lo que un único
 * `sr.reveal(...)` bastaba. Aquí el contenido llega de forma asíncrona, así que
 * cada sección llama a este hook cuando SUS datos están listos; de ese modo
 * ScrollReveal alcanza a ocultar los elementos antes de que entren al viewport
 * y se reproduce el mismo efecto de aparición al hacer scroll.
 */
export const useScrollReveal = (items: RevealItem[], ready: boolean = true) => {
  useEffect(() => {
    if (!ready) return;

    for (const { target, options, stagger } of items) {
      if (stagger) {
        document
          .querySelectorAll<HTMLElement>(target)
          .forEach((el, i) => {
            sr.reveal(el, { ...options, delay: stagger.base + i * stagger.step });
          });
      } else {
        sr.reveal(target, options ?? {});
      }
    }
    // `items` es un literal estable por render; solo dependemos de `ready`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);
};
