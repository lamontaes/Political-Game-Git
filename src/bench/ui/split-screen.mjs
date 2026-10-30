// The one two-column menu layout: a row of controls across the top, a main
// column and a side column of labeled sections, the whole fitting its panel
// (owner, Oct 29: a menu is a fixed panel; what does not fit pages inside
// its box, it never scrolls as a page). Politics → Government is the first
// screen on it.
import { el } from "./dom.mjs";
import { section } from "./section.mjs";

/**
 * `controls`: nodes for the top row (tab bars, a dropdown); `main`: nodes for
 * the main column, top to bottom, the last one taking the room left;
 * `side`: [{ title, nodes }] sections for the side column.
 */
export function splitScreen({
  controls = [],
  main = [],
  side = [],
  className = "",
}) {
  return el(
    "div",
    { className: `split-screen ${className}` },
    el("div", { className: "split-controls" }, ...controls),
    el(
      "div",
      { className: "split-body" },
      el("div", { className: "split-main" }, ...main),
      el(
        "aside",
        { className: "split-side" },
        ...side.map((s) => section(s.title, ...s.nodes)),
      ),
    ),
  );
}
