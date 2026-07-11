import { useQuery } from "@tanstack/react-query";
import { getStrapiData } from "../lib/strapi";
import type { UseStrapiResult } from "../types/types";

/**
 * Consume un endpoint de Strapi apoyándose en TanStack Query (React Query).
 *
 * React Query se encarga por debajo de:
 * - Caché por `queryKey` (["strapi", query]) → los datos se reutilizan durante
 *   `staleTime` (configurado en main.tsx) sin volver a pedirlos.
 * - Deduplicación: si el mismo endpoint se pide dos veces a la vez (p. ej. el
 *   doble montaje de StrictMode), se hace UNA sola petición HTTP.
 * - Cancelación: React Query pasa un `signal` a la queryFn, que reenviamos a
 *   getStrapiData para abortar la petición si el componente se desmonta.
 * - Estados de carga y error (`isPending` / `error`).
 *
 * Mantenemos la misma firma de salida ({ data, loading, error }) para que los
 * componentes que ya usan el hook no cambien nada.
 */
export function useStrapi<T>(query: string): UseStrapiResult<T> {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["strapi", query],
    queryFn: ({ signal }) => getStrapiData<T>(query, signal),
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
