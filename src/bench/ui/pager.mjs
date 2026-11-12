// The one long-list box: a bounded box that shows `rows` rows and scrolls
// inside itself for the rest. No arrows and no "1 of N" (owner, Nov 8: "like
// those shitty survey sites"); the menu panel itself still never scrolls (Oct
// 29), only this box. The box keeps its height, so a short list never moves
// the screen. A list this long sits beside its detail (patch notes, the
// journal's chapters): choosing a row shows its detail, it never turns a page.
import { el } from "./dom.mjs";

/**
 * `items`: anything `render` turns into a node. `rows` of `columns` show at
 * once, each `rowHeight` tall with `gap` between, in pixels.
 */
export function pager({
  items,
  render,
  rows = 3,
  columns = 2,
  rowHeight = 64,
  gap = 8,
  className = "",
  /** A row grows past `rowHeight` when its text wraps (the box scrolls), never clips or overlaps. */
  growRows = false,
}) {
  const grid = el("div", { className: "pager-grid" });
  grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  grid.style.gridAutoRows = growRows
    ? `minmax(${rowHeight}px, auto)`
    : `${rowHeight}px`;
  grid.style.gap = `${gap}px`;
  const box = el("div", { className: `pager ${className}` }, grid);
  grid.replaceChildren(...items.map(render));
  const sizeBox = () => {
    // Rows that grow when their text wraps get the whole allowance, so a
    // short list of long names shows whole before the box scrolls.
    const shown = growRows
      ? rows
      : Math.min(rows, Math.ceil(items.length / columns));
    box.style.maxHeight = `${shown * rowHeight + Math.max(0, shown - 1) * gap}px`;
  };
  sizeBox();
  // A screen that finds its box too tall for the room asks for fewer rows (never fewer than one).
  box.rowCount = () => rows;
  box.setRows = (next) => {
    rows = Math.max(1, next);
    sizeBox();
  };
  return box;
}
