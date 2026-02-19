import { useEffect, useState } from "react";
import { Footer, Header, MainContent } from "./sections";
import ScrollReveal from "scrollreveal";

export function App() {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScroll(window.scrollY >= 350);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sr = ScrollReveal({
      origin: "top",
      distance: "60px",
      duration: 2500,
      delay: 400,
      // reset: true
    });

    sr.reveal(
      `.home__data, .projects__container, .testimonial__container, .footer__container`
    );
    sr.reveal(`.home__info div`, {
      delay: 600,
      origin: "bottom",
      interval: 100,
    });
    sr.reveal(
      `.skills__content:nth-child(1), .skills__content:nth-child(3), .contact__content:nth-child(1)`,
      { origin: "left" }
    );
    sr.reveal(
      `.skills__content:nth-child(2), .skills__content:nth-child(4), .contact__content:nth-child(2)`,
      { origin: "right" }
    );
    sr.reveal(`.qualification__content, .services__card`, { interval: 100 });
  }, []);

  return (
    <>
      <Header />
      <MainContent />
      <Footer />

      <a href="#home" className={`scrollup ${showScroll ? "show-scroll" : ""}`}>
        <i className="ri-arrow-up-line"></i>
      </a>
    </>
  );
}
