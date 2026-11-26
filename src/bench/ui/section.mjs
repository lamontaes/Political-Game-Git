// The one section part: a group of a screen's rows, under its title when it has one, on a
// framed plate, never on the bare panel. Layout only; the title
// and content come from the screen's definition.
import { el } from "./dom.mjs";

export function section(title, ...content) {
  return el(
    "section",
    { className: "record-section plate" },
    ...(title ? [el("h3", { className: "label", textContent: title })] : []),
    ...content,
  );
}
