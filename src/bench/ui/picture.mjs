// The one picture slot: an image that removes itself when its file is missing, so no
// broken-image box ever shows. No sample person, room or fallback artwork.
import { el } from "./dom.mjs";

export function picture({ src, className = "", alt = "" }) {
  const image = el("img", { src, className, alt });
  image.addEventListener("error", () => image.remove(), { once: true });
  return image;
}
