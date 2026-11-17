import { createClient } from "@sanity/client";

// Proyecto y dataset son públicos por diseño: el dataset es público y se lee
// sin token. No añadir ningún token aquí: acabaría en el bundle del navegador.
//
// createClient valida al construirse y lanzaría al importar el módulo, lo que
// dejaría la página en blanco. Con valores centinela el fallo queda dentro de
// la petición y cada sección muestra su SectionError.
const projectId = import.meta.env.VITE_SANITY_PROJECT_ID;
const dataset = import.meta.env.VITE_SANITY_DATASET;
if (!projectId || !dataset) {
  console.error(
    "Falta VITE_SANITY_PROJECT_ID / VITE_SANITY_DATASET — ver .env.example",
  );
}

export const client = createClient({
  projectId: projectId || "missing-project-id",
  dataset: dataset || "missing-dataset",
  apiVersion: "2025-01-01",
  useCdn: true,
  perspective: "published",
});
