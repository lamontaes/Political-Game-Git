// The one section part: a titled group of a screen's rows. Layout only; the title and
// content come from the screen's definition.
import { el } from "./dom.mjs";

export function section(title, ...content) {
  return el(
    "section",
    { className: "record-section" },
    el("h3", { className: "label", textContent: title }),
    ...content,
  );
}
