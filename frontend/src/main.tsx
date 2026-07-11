import { App } from "./App.tsx";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PORTFOLIO_QUERIES } from "./utils/constants";
import { getStrapiData } from "./lib/strapi";
import "./index.css";

// Un único QueryClient para toda la app: administra la caché de las peticiones.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // El contenido del portafolio cambia poco: lo consideramos "fresco"
      // durante 5 min, así no se vuelve a pedir en re-montajes/navegación.
      staleTime: 1000 * 60 * 5,
      // No re-pedir al volver a la pestaña (innecesario para contenido estático).
      refetchOnWindowFocus: false,
      // Un reintento ante fallos de red.
      retry: 1,
    },
  },
});

// Prefetch: disparamos TODAS las queries al arrancar, en paralelo. Cuando cada
// sección se monte (tras llegar section-titles) encontrará sus datos ya en la
// caché o en vuelo, eliminando el waterfall de 2 niveles.
PORTFOLIO_QUERIES.forEach((query) => {
  queryClient.prefetchQuery({
    queryKey: ["strapi", query],
    queryFn: ({ signal }) => getStrapiData(query, signal),
  });
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
