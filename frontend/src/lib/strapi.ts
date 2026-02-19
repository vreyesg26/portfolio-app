const { VITE_STRAPI_HOST, VITE_STRAPI_TOKEN } = import.meta.env;

async function query(url: string) {
  const res = await fetch(`${VITE_STRAPI_HOST}/api/${url}`, {
    headers: {
      Authorization: `Bearer ${VITE_STRAPI_TOKEN}`,
    },
  });

  if (!res.ok) {
    throw new Error("Error fetching from Strapi");
  }

  return res.json();
}

export async function getStrapiData(strapiQuery: string) {
  const res = await query(strapiQuery);
  return res.data;
}

export function getStrapiImages(url: string | null) {
  return VITE_STRAPI_HOST + url;
}
