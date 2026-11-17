import "@testing-library/jest-dom/vitest";
import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import { client } from "../lib/sanity";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// Un QueryClient por render: sin reintentos y sin refetch automático, para que
// los datos sembrados en la caché sean los que ve el componente.
const newClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

const wrap = (queryClient: QueryClient, ui: ReactElement) => (
  <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
);

export type Seed = readonly [query: string, data: unknown];

/** Renderiza `ui` con la caché de React Query ya sembrada: sin red. */
export function renderWithData(ui: ReactElement, seeds: Seed[]) {
  const queryClient = newClient();
  for (const [query, data] of seeds) {
    queryClient.setQueryData(["sanity", query], data);
  }
  return render(wrap(queryClient, ui));
}

/** Renderiza `ui` con una petición que nunca resuelve: estado de carga. */
export function renderLoading(ui: ReactElement) {
  vi.spyOn(client, "fetch").mockReturnValue(new Promise(() => {}) as never);
  return render(wrap(newClient(), ui));
}

/** Renderiza `ui` con una petición que falla: estado de error. */
export function renderError(ui: ReactElement) {
  vi.spyOn(client, "fetch").mockRejectedValue(new Error("boom"));
  return render(wrap(newClient(), ui));
}
