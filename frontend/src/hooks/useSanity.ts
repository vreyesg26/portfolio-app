import { useQuery } from "@tanstack/react-query";
import { client } from "../lib/sanity";
import type { UseSanityResult } from "../types/types";

/**
 * Consume una query GROQ de Sanity apoyándose en TanStack Query (React Query).
 *
 * React Query se encarga por debajo de:
 * - Caché por `queryKey` (["sanity", query]) → los datos se reutilizan durante
 *   `staleTime` (configurado en main.tsx) sin volver a pedirlos.
 * - Deduplicación: si la misma query se pide dos veces a la vez (p. ej. el
 *   doble montaje de StrictMode), se hace UNA sola petición HTTP.
 * - Cancelación: React Query pasa un `signal` a la queryFn, que reenviamos al
 *   cliente para abortar la petición si el componente se desmonta.
 * - Estados de carga y error (`isPending` / `error`).
 *
 */
export function useSanity<T>(query: string): UseSanityResult<T> {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["sanity", query],
    queryFn: ({ signal }) => client.fetch<T>(query, {}, { signal }),
  });

  return {
    data: data ?? null,
    loading: isPending,
    error: error ?? null,
    refetch: () => {
      refetch();
    },
  };
}
