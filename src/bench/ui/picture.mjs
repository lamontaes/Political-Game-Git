// The one picture slot: an image that removes itself when its file is missing, so no
// broken-image box ever shows. No sample person, room or fallback artwork.
import { el } from "./dom.mjs";

export function picture({ src, className = "", alt = "" }) {
  const image = el("img", { src, className, alt });
  image.addEventListener("error", () => image.remove(), { once: true });
  return image;
}

/** A screen's side artwork: its room behind, the person's figure in front. */
export function fillArtwork(into, { portraitUrl, backgroundUrl, name }) {
  into.replaceChildren(
    ...[
      [backgroundUrl, "screen-backdrop", ""],
      [portraitUrl, "screen-portrait", name],
    ]
      .filter(([src]) => src)
      .map(([src, className, alt]) => picture({ src, className, alt })),
  );
}
