// The one two-column menu layout: a row of controls across the top, a main
// column and a side column of labeled sections, the whole fitting its panel
// (owner, Oct 29: a menu is a fixed panel; what does not fit pages inside
// its box, it never scrolls as a page). Politics → Government is the first
// screen on it.
import { el } from "./dom.mjs";
import { section } from "./section.mjs";

/**
 * `controls`: nodes for the top row (tab bars, a dropdown); `header`: a node
 * across both columns under them (Government's room, the approved gov-local
 * mock); `main`: nodes for the main column, top to bottom, the last one
 * taking the room left;
 * `side`: [{ title, nodes }] sections for the side column, if any.
 */
export function splitScreen({
  controls = [],
  header = null,
  main = [],
  side = [],
  className = "",
}) {
  // No side sections, and the main column takes the whole width.
  return el(
    "div",
    { className: `split-screen ${side.length ? "" : "single "}${className}` },
    el("div", { className: "split-controls" }, ...controls),
    ...(header ? [header] : []),
    el(
      "div",
      { className: "split-body" },
      el("div", { className: "split-main" }, ...main),
      ...(side.length
        ? [
            el(
              "aside",
              { className: "split-side" },
              ...side.map((s) => section(s.title, ...s.nodes)),
            ),
          ]
        : []),
    ),
  );
}
