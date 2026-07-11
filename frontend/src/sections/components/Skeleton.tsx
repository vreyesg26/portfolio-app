type SkeletonProps = {
  width?: string;
  height?: string;
  radius?: string;
  className?: string;
};

/**
 * Pieza base para construir "skeletons" de carga. Es un bloque con efecto
 * shimmer (ver .skeleton en index.css) cuyas dimensiones se configuran por
 * props, de modo que cada sección compone su propio placeholder con la forma
 * aproximada de su contenido real.
 */
export const Skeleton = ({
  width = "100%",
  height = "1rem",
  radius = "0.5rem",
  className = "",
}: SkeletonProps) => (
  <span
    className={`skeleton ${className}`}
    style={{ width, height, borderRadius: radius }}
    aria-hidden="true"
  />
);
