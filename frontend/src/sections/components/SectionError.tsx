type SectionErrorProps = {
  onRetry: () => void;
  message?: string;
};

/**
 * Mensaje de error inline para cuando falla la carga de una sección. Incluye un
 * botón "Reintentar" que dispara el refetch de React Query (expuesto por
 * useStrapi).
 */
export const SectionError = ({
  onRetry,
  message = "No se pudo cargar esta sección.",
}: SectionErrorProps) => (
  <div className="section__error" role="alert">
    <p className="section__error-text">{message}</p>
    <button type="button" className="section__error-btn" onClick={onRetry}>
      Reintentar <i className="ri-refresh-line"></i>
    </button>
  </div>
);
