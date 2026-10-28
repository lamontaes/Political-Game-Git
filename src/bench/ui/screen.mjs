// The record screen: the menu type of every screen that reads one person's or one
// place's records (Who you are, Jobs and study, the Politics guide). A screen is a
// definition and this renderer draws it; change the type here and every record screen
// changes (owner, Oct 27: "one for every menu, and then a menu type, and then just
// insert it").
//
// A definition: { controls?: [node], heading?: { name, meta }, lede?, grid?, paged?,
// sections: [{ title, items, wide? }] }. `controls` (a select, a picker) sit above the
// rest; `grid` lays the sections two across, a `wide` one across both; `paged` shows
// one section at a time with Back and Next. An item is one of:
//   { text, tone? }            a line: tone "feature", "narrative", "small", "empty" or "title"
//   { fact: [label, value] }   a label and its value on one line
//   { people: [{ name, note, onOpen }] }   names that open their card
//   { figure: [label, value] } a label and a large value
//   { stats: [[label, value], ...] }       figures side by side
//   { picture }                a picture slot (removes itself when the file is missing)
//   { views: [{ label?, text }] }          short paragraphs side by side
//   { total: [value, label] }  a large count and what it counts
//   { pages: [item, ...], size, start? }   items in pages of `size`, from `start`
//   { actions: [{ label, onClick, className?, testid? }] }   buttons in a row
//   { section: { title, items } }          a section inside a section's pages
//   { node }                   a node another kit part drew (a chart, a select, a pager)
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { section } from "./section.mjs";
import { picture } from "./picture.mjs";
import { stepPages, menuPages } from "./pager.mjs";

const TONES = {
  plain: ["p", ""],
  feature: ["p", "record-feature"],
  narrative: ["p", "narrative"],
  small: ["p", "small"],
  empty: ["p", "record-empty"],
  warning: ["p", "record-warning"],
  title: ["h2", "record-title"],
  subhead: ["h4", "record-subhead"],
  place: ["p", "record-place"],
};

const pair = (className, [label, value]) =>
  el(
    "div",
    { className },
    el("span", { className: "label", textContent: label }),
    el("strong", { textContent: value }),
  );

function item(part) {
  if (part.node) return part.node;
  if (part.total)
    return el(
      "div",
      { className: "record-count" },
      el("strong", { className: "record-total", textContent: part.total[0] }),
      el("span", { className: "label", textContent: part.total[1] }),
    );
  if (part.section)
    return section(
      part.section.title,
      ...part.section.items.filter(Boolean).map(item),
    );
  if (part.pages) return menuPages(part.pages.map(item), part.size, part.start);
  if (part.actions)
    return el(
      "div",
      { className: "acts record-actions" },
      ...part.actions.map((action) => {
        const b = makeButton({
          className: action.className ?? "",
          textContent: action.label,
        });
        if (action.testid) b.dataset.testid = action.testid;
        b.addEventListener("click", action.onClick);
        return b;
      }),
    );
  if (part.fact) return pair("record-fact", part.fact);
  if (part.figure) return pair("record-figure", part.figure);
  if (part.stats)
    return el(
      "div",
      { className: "record-stats" },
      ...part.stats.map((stat) => pair("", stat)),
    );
  if (part.picture)
    return picture({ src: part.picture, className: "record-picture" });
  if (part.people)
    return el(
      "ul",
      { className: "record-people" },
      ...part.people.map((person) => {
        const open = makeButton({
          className: "record-person",
          textContent: person.name,
        });
        if (person.onOpen) open.addEventListener("click", person.onOpen);
        return el(
          "li",
          {},
          open,
          el("span", {
            className: "record-note",
            textContent: person.note ?? "",
          }),
        );
      }),
    );
  if (part.views)
    return el(
      "div",
      { className: "record-views" },
      ...part.views.map((view) =>
        el(
          "article",
          {},
          ...(view.label ? [el("h4", { textContent: view.label })] : []),
          el("p", { className: "narrative", textContent: view.text }),
        ),
      ),
    );
  const [tag, className] = TONES[part.tone ?? "plain"];
  return el(tag, { className, textContent: part.text ?? "" });
}

/** The nodes of a record screen, for the sheet's body. */
export function recordScreen({
  controls = [],
  heading,
  lede,
  grid,
  paged,
  sections,
}) {
  const top = [...controls];
  if (heading)
    top.push(
      el(
        "header",
        { className: "screen-heading" },
        el("h2", { className: "name", textContent: heading.name }),
        ...(heading.meta
          ? [el("p", { className: "screen-meta", textContent: heading.meta })]
          : []),
      ),
    );
  if (lede)
    top.push(
      el("p", { className: "screen-lede narrative", textContent: lede }),
    );
  const drawn = sections.map((s) => {
    const node = section(s.title, ...s.items.filter(Boolean).map(item));
    if (s.wide) node.classList.add("wide");
    return node;
  });
  if (paged) return [...top, stepPages(drawn, "record-pages-one")];
  if (grid) return [...top, el("div", { className: "screen-grid" }, ...drawn)];
  return [...top, ...drawn];
}
