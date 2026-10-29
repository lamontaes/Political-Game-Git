/* global requestAnimationFrame, getComputedStyle, MutationObserver, ResizeObserver */
// The pagers every screen pages with: a box that pages itself to fit (`pageWhenChanged`),
// a list cut into pages of a set size (`menuPages`), and pages stepped one at a time
// (`stepPages`). Their Back and Next words come from src/bench/data/controls.json, set
// once by `pagerWords`; a screen never builds its own Back and Next.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";

/**
 * A pager keeps its page when only the measure changes (paging itself resizes the box,
 * which must not throw the player back to the first page); new content starts at page 0.
 */
const pagerPage = new WeakMap();
export function pageIn(box, pager, keepPage = false) {
  box.scrollTo(0, 0);
  const [back, next] = pager.querySelectorAll("button");
  // Measure with every row showing; a page then hides the rows that are not its own.
  for (const hidden of box.querySelectorAll(".paged-out"))
    hidden.classList.remove("paged-out");
  // A block taller than the box (a grid of cards, a long screen) would be one page of its own
  // and hide behind a Continue; its children are the rows instead, so page 0 shows the first of them.
  const rowsIn = (parent) =>
    [...parent.children].flatMap((kid) =>
      kid.classList.contains("flow") ||
      (kid.offsetHeight > box.clientHeight && kid.children.length > 1)
        ? rowsIn(kid)
        : [kid],
    );
  const rows = rowsIn(box);
  const tops = rows.map((row) => row.offsetTop);
  const stops = [0];
  let sideways = false;
  if (box.clientHeight > 0) {
    if (box.scrollWidth > box.clientWidth + 2) {
      sideways = true;
      const step =
        box.clientWidth + (parseFloat(getComputedStyle(box).columnGap) || 0);
      for (let x = step; x < box.scrollWidth - 2; x += step) stops.push(x);
    } else if (box.scrollHeight > box.clientHeight + 2) {
      let top = 0;
      rows.forEach((kid, index) => {
        // A row taller than the box starts no page of its own at the top: a second stop at
        // 0 would make page 0 empty and hide every row.
        if (
          tops[index] > top &&
          tops[index] + kid.offsetHeight - top > box.clientHeight
        ) {
          top = tops[index];
          stops.push(top);
        }
      });
    }
  }
  let at = keepPage ? (pagerPage.get(pager) ?? 0) : 0;
  const go = (index) => {
    at = index;
    pagerPage.set(pager, at);
    if (sideways) box.scrollTo(stops[at], 0);
    else {
      // A plain list shows one page of rows: the rest are out of the box, not scrolled past.
      const from = stops[at];
      const to = stops[at + 1] ?? Infinity;
      rows.forEach((row, index) =>
        row.classList.toggle(
          "paged-out",
          stops.length > 1 && (tops[index] < from || tops[index] >= to),
        ),
      );
      box.scrollTo(0, 0);
    }
    back.hidden = at === 0;
    next.hidden = at === stops.length - 1;
  };
  back.onclick = () => go(at - 1);
  next.onclick = () => go(at + 1);
  pager.hidden = stops.length === 1;
  go(Math.min(at, stops.length - 1));
}

/** Pages again whenever the box's contents change (a search narrowing a list, a redrawn ballot). */
export function pageWhenChanged(box, pager) {
  new MutationObserver(() =>
    requestAnimationFrame(() => pageIn(box, pager)),
  ).observe(box, { childList: true, subtree: true });
  new ResizeObserver(() =>
    requestAnimationFrame(() => pageIn(box, pager, true)),
  ).observe(box);
}

let words = { back: "", next: "" };
/** The Back and Next words every list pager shows (the controls file's). */
export function pagerWords({ back, next }) {
  words = { back, next };
}

/** The Back and Next pair under a paged list. */
function pagerNav(atStart, atEnd, step) {
  const { back, next } = words;
  const backButton = makeButton({ textContent: back, disabled: atStart });
  const nextButton = makeButton({ textContent: next, disabled: atEnd });
  backButton.onclick = () => step(-1);
  nextButton.onclick = () => step(1);
  return el("nav", { className: "record-pager" }, backButton, nextButton);
}

/**
 * A list cut into pages of `size` items, so every record is reachable without
 * scrolling a menu.
 */
export function menuPages(items, size = 5, start = 0) {
  let at = Math.floor(Math.max(0, start) / size);
  const box = el("div", { className: "record-pages" });
  const draw = () =>
    box.replaceChildren(
      ...items.slice(at * size, at * size + size),
      ...(items.length > size
        ? [
            pagerNav(at === 0, (at + 1) * size >= items.length, (d) => {
              at += d;
              draw();
            }),
          ]
        : []),
    );
  draw();
  return box;
}

/** Whole pages shown one at a time with Back and Next under them. */
export function stepPages(pages, className = "") {
  let at = 0;
  const box = el("div", { className });
  const draw = () =>
    box.replaceChildren(
      pages[at],
      pagerNav(at === 0, at === pages.length - 1, (d) => {
        at += d;
        draw();
      }),
    );
  draw();
  return box;
}
