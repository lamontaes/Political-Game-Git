// The one list row part. A row is a `.row` line in play.css: a label and its value, a
// record's line, a narrative paragraph. `variant` is the extra class that says which kind
// (`campaign`, `narrative`, `race`, `elect`, `map`). Screens call this and never write
// `el("div", { className: "row ..." })`.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

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

/**
 * The one row a player picks in a list that sits beside its page (People, the
 * Guide, Elections, Parties, Issues, Bills): the name, and a short aside at
 * the right when there is one. Its look is `.pick` in play.css; `className`
 * is the screen's own hook for its checks, never a second look.
 */
export function pickRow({ label, aside, className = "" }) {
  const row = makeButton(
    { className: className ? `pick ${className}` : "pick" },
    el("b", { textContent: label }),
  );
  if (aside) row.append(el("span", { textContent: aside }));
  row.setAttribute("aria-pressed", "false");
  return row;
}

/** The small heading over a group of pick rows. */
export function pickGroup(text, className = "") {
  return el("div", {
    className: className ? `pick-group ${className}` : "pick-group",
    textContent: text,
  });
}

/** The heading strip at the top of a pick list. */
export function pickHead(text) {
  return el("h3", { className: "sechead pick-head", textContent: text });
}
