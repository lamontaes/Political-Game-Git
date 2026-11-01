// The one chamber header: the painting of the room a body or an office works
// in, its name set on the picture, and a line under it (when it meets, its
// next election). The mock's "Latimer Board of Aldermen" card (Oct 14).
import { el } from "./dom.mjs";

/** `picture` is the room's url; `name` and `line` are worded by the screen. */
export function chamberHeader({ picture, name, line }) {
  const card = el(
    "figure",
    { className: "chamber" },
    el(
      "figcaption",
      { className: "chamber-caption" },
      el("span", { className: "chamber-name", textContent: name }),
      ...(line
        ? [el("span", { className: "chamber-line", textContent: line })]
        : []),
    ),
  );
  if (picture) card.style.backgroundImage = `url("${picture}")`;
  return card;
}
