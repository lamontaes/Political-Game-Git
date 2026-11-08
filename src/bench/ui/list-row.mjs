// The one list row part. A row is a `.row` line in play.css: a label and its value, a
// record's line, a narrative paragraph. `variant` is the extra class that says which kind
// (`campaign`, `narrative`, `race`, `elect`, `map`). Screens call this and never write
// `el("div", { className: "row ..." })`.
import { el } from "./dom.mjs";

export function listRow(variant, props = {}, ...children) {
  const { as = "div", ...rest } = props;
  return el(
    as,
    { ...rest, className: variant ? `row ${variant}` : "row" },
    ...children,
  );
}

/** One labeled line: the label (a term word) and its value; a value the screen could not
 * word (null) hides the line, so nothing half-printed shows. */
export function factRow(label, value) {
  const line = listRow(
    "",
    {},
    label,
    el("span", { className: "record-value", textContent: value ?? "" }),
  );
  if (value === null) line.hidden = true;
  return line;
}

/** A short note in a list in the label style (nothing found, nothing yet). */
export function noteLine(text) {
  return el("p", { className: "label", textContent: text });
}
