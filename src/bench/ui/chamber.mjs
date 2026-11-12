// The one chamber header: the painting of the room a body or an office works
// in, and its name set on the picture, with no line under it (owner, Nov 7: no
// subtitles on menus).
import { el } from "./dom.mjs";

/** `picture` is the room's url; `name` is worded by the screen. */
export function chamberHeader({ picture, name }) {
  const card = el(
    "figure",
    { className: "chamber" },
    el(
      "figcaption",
      { className: "chamber-caption" },
      el("span", { className: "chamber-name", textContent: name }),
    ),
  );
  if (picture) card.style.backgroundImage = `url("${picture}")`;
  return card;
}
