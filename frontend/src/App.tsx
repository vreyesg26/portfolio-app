import { useEffect, useState } from "react";
import { Footer, Header, MainContent } from "./sections";

export function App() {
  const [showScroll, setShowScroll] = useState(false);

  useEffect(() => { 
    const handleScroll = () => {
      setShowScroll(window.scrollY >= 350);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
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
