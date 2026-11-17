import { createClient } from "@sanity/client";

// Proyecto y dataset son públicos por diseño: el dataset es público y se lee
// sin token. No añadir ningún token aquí: acabaría en el bundle del navegador.
export const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET,
  apiVersion: "2025-01-01",
  useCdn: true,
  perspective: "published",
});
