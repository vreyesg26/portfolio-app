const { VITE_STRAPI_HOST, VITE_STRAPI_TOKEN } = import.meta.env;

async function query(url: string, signal?: AbortSignal) {
  const res = await fetch(`${VITE_STRAPI_HOST}/api/${url}`, {
    headers: {
      Authorization: `Bearer ${VITE_STRAPI_TOKEN}`,
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(
      `Error fetching from Strapi (${res.status} ${res.statusText}): ${url}`
    );
  }

  return res.json();
}

export async function getStrapiData<T>(
  strapiQuery: string,
  signal?: AbortSignal
): Promise<T> {
  const res = await query(strapiQuery, signal);
  return res.data as T;
}

export function getStrapiImages(url: string | null | undefined) {
  // Devolvemos undefined (no "") para que React OMITA el atributo src mientras
  // no haya URL. Un <img src=""> dispara un warning y puede hacer que el
  // navegador vuelva a descargar la página.
  if (!url) return undefined;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${import.meta.env.VITE_STRAPI_HOST}${url}`;
}
