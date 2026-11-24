// The one dated list: short rows of a date in gold and what happens then
// (the mock's "Coming up": "Feb 4 Budget amendment for the police
// department"). Every string worded by the screen.
import { el } from "./dom.mjs";

/** `rows`: [{ when, text }]; `empty` is said when there are none. */
export function dateList(rows, empty = "") {
  if (!rows.length)
    return el("p", { className: "date-list-empty", textContent: empty });
  return el(
    "ul",
    { className: "date-list" },
    ...rows.map((row) =>
      el(
        "li",
        {},
        el("span", { className: "date-list-when", textContent: row.when }),
        el("span", { className: "date-list-text", textContent: row.text }),
      ),
    ),
  );
}
