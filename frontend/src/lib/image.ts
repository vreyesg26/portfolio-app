import createImageUrlBuilder from "@sanity/image-url";
import { client } from "./sanity";

const builder = createImageUrlBuilder(client);

// Forma que proyectan las queries: {alt, "asset": asset->{_id, url, mimeType}}
export type SanityImageField =
  | {
      alt?: string | null;
      asset?: {
        _id: string;
        url: string | null;
        mimeType: string | null;
      } | null;
    }
  | null
  | undefined;

export function imageUrl(image: SanityImageField, width?: number) {
  const asset = image?.asset;
  // Devolvemos undefined (no "") para que React OMITA el atributo src mientras
  // no haya URL. Un <img src=""> dispara un warning y puede hacer que el
  // navegador vuelva a descargar la página.
  if (!asset) return undefined;

  // El pipeline de imágenes de Sanity no transforma los SVG (la mayoría de los
  // assets lo son): se sirven tal cual, sin parámetros.
  if (asset.mimeType === "image/svg+xml") return asset.url ?? undefined;

  let b = builder.image(asset._id);
  if (width) b = b.width(width);
  return b.auto("format").url();
}

export function imageAlt(image: SanityImageField, fallback: string) {
  return image?.alt || fallback;
}
