// The one pager: a box that shows a set number of rows and pages the rest
// with arrows, never a scroll (owner, Oct 29: "I don't want you to have
// to... just scroll infinitely... The main menu shouldn't really be
// scrolling. It should be things inside"). The box keeps its full height on
// a short last page, so paging never moves the screen.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/**
 * `items`: anything `render` turns into a node. `rows` of `columns` show at
 * once, each `rowHeight` tall with `gap` between, in pixels; `words` = {
 * page: "{page} of {pages}", previous, next } for the arrows. `where`, when
 * given, names a page from the items on it (a timeline's years) instead.
 */
export function pager({
  items,
  render,
  rows = 3,
  columns = 2,
  rowHeight = 64,
  gap = 8,
  words,
  className = "",
  where: name,
}) {
  const grid = el("div", { className: "pager-grid" });
  grid.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
  grid.style.gridAutoRows = `${rowHeight}px`;
  grid.style.gap = `${gap}px`;
  const perPage = rows * columns;
  const pages = Math.max(1, Math.ceil(items.length / perPage));
  // A box with more than one page keeps every page as tall as the first.
  const shown = Math.min(rows, Math.ceil(items.length / columns));
  grid.style.minHeight = `${shown * rowHeight + Math.max(0, shown - 1) * gap}px`;
  const where = el("span", { className: "pager-where" });
  const previous = makeButton({
    className: "pager-arrow",
    textContent: "‹",
    title: words.previous,
  });
  const next = makeButton({
    className: "pager-arrow",
    textContent: "›",
    title: words.next,
  });
  previous.setAttribute("aria-label", words.previous);
  next.setAttribute("aria-label", words.next);
  const controls = el(
    "div",
    { className: "pager-controls" },
    previous,
    where,
    next,
  );
  controls.hidden = pages < 2;
  const box = el("div", { className: `pager ${className}` }, grid, controls);
  let page = 0;
  const draw = () => {
    const shown = items.slice(page * perPage, (page + 1) * perPage);
    grid.replaceChildren(...shown.map(render));
    where.textContent = name
      ? name(shown)
      : words.page
          .replace("{page}", String(page + 1))
          .replace("{pages}", String(pages));
    previous.disabled = page === 0;
    next.disabled = page >= pages - 1;
  };
  previous.addEventListener("click", () => {
    page = Math.max(0, page - 1);
    draw();
  });
  next.addEventListener("click", () => {
    page = Math.min(pages - 1, page + 1);
    draw();
  });
  draw();
  return box;
}
