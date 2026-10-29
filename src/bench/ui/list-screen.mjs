// The list screen: the menu type of every screen that is a searchable list of entries
// (the Guide, Issues, Travel). A screen is a definition and this renderer draws it;
// change the type here and every list screen changes.
//
// A definition: { search?: { placeholder, value }, entries(query) -> entries (or a
// promise of them), size?, layout?, labelOf? }. `labelOf` draws a fact's label (a Guide
// term word); a plain bold label by default. `size` cuts the list into pages; `layout` is
// "cards" (a grid of cards) or "rows" (the default). An entry:
//   { title, value?, lede?, lines?: [text], note?, facts?: [[label, value]], picture?,
//     nodes?: [node], opens?, open?, onSelect?, label?, data? }
// `note` is the line set apart in the accent color (why a place is listed).
// `opens` makes the entry fold open to its lines and facts; `onSelect` makes the whole
// entry a control (with `label` as its spoken name); `data` is kept on the entry for
// the browser checks, never shown.
import { el } from "./dom.mjs";
import { searchBox } from "./fields.mjs";
import { picture } from "./picture.mjs";
import { factRow } from "./list-row.mjs";

const boldLabel = (text) => el("b", { textContent: text });

function entry(e, labelOf) {
  const head = [
    el("h3", { textContent: e.title }),
    ...(e.value !== undefined
      ? [el("strong", { className: "entry-value", textContent: e.value })]
      : []),
    ...(e.lede ? [el("span", { textContent: ` ${e.lede}` })] : []),
  ];
  const body = [
    ...(e.lines ?? [])
      .filter(Boolean)
      .map((text) => el("p", { className: "entry-line", textContent: text })),
    ...(e.note
      ? [el("p", { className: "entry-note", textContent: e.note })]
      : []),
    ...(e.facts ?? []).map(([label, value]) => factRow(labelOf(label), value)),
    // Nodes other kit parts drew for the entry (person rows, a button row).
    ...(e.nodes ?? []),
  ];
  const art = e.picture
    ? [picture({ src: e.picture, className: "entry-picture" })]
    : [];
  let node;
  if (e.opens)
    node = el(
      "details",
      { className: "entry", open: Boolean(e.open) },
      el("summary", {}, ...head),
      ...body,
    );
  else if (e.onSelect) {
    node = el(
      "button",
      { type: "button", className: "entry entry-go", ariaLabel: e.label ?? "" },
      ...art,
      el("div", { className: "entry-info" }, ...head, ...body),
    );
    node.addEventListener("click", e.onSelect);
  } else node = el("div", { className: "entry" }, ...art, ...head, ...body);
  for (const [key, value] of Object.entries(e.data ?? {}))
    node.dataset[key] = value;
  return node;
}

/** The nodes of a list screen, for the sheet's body. */
export async function listScreen({
  search,
  entries,
  layout = "rows",
  labelOf = boldLabel,
}) {
  // Rows flow into the sheet, which scrolls; cards keep their grid.
  const list = el("div", {
    className: `entries entries-${layout}${layout === "rows" ? " flow" : ""}`,
  });
  let query = search?.value ?? "";
  const draw = async () => {
    const at = query;
    const drawn = (await entries(query)).map((e) => entry(e, labelOf));
    // A slower answer to an older query never replaces a newer one.
    if (at !== query) return;
    list.replaceChildren(...drawn);
  };
  await draw();
  if (!search) return [list];
  const box = searchBox({
    value: query,
    placeholder: search.placeholder,
    onInput: (text) => {
      query = text;
      search.onQuery?.(text);
      void draw();
    },
  });
  box.setAttribute("aria-label", search.placeholder ?? "");
  return [box, list];
}
