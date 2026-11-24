/* global requestAnimationFrame */
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
  /** The box is sized to whole rows (growing rows only): the last row shown is never cut at its foot. */
  wholeRows = false,
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
  // With whole rows, once the box is on screen its height is cut back to the
  // last row that fits the allowance, so no row is shown half and the rest is a
  // scroll away.
  const fitWholeRows = (tries = 0) => {
    if (!wholeRows || !growRows) return;
    // A box built before its screen is on the page waits for its place.
    if (!box.isConnected) {
      if (tries < 60) requestAnimationFrame(() => fitWholeRows(tries + 1));
      return;
    }
    const limit = rows * rowHeight + Math.max(0, rows - 1) * gap;
    const top = grid.getBoundingClientRect().top;
    let height = 0;
    for (const child of grid.children) {
      const bottom = child.getBoundingClientRect().bottom - top;
      if (bottom > limit) break;
      height = bottom;
    }
    if (height > 0) box.style.maxHeight = `${Math.ceil(height)}px`;
  };
  sizeBox();
  if (wholeRows) requestAnimationFrame(() => fitWholeRows());
  // A screen that finds its box too tall for the room asks for fewer rows (never fewer than one).
  box.rowCount = () => rows;
  box.setRows = (next) => {
    rows = Math.max(1, next);
    sizeBox();
    if (wholeRows) requestAnimationFrame(() => fitWholeRows());
  };
  return box;
}
