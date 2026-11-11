// The roster screen: a titled list at the left, grouped under small headings, and the chosen
// entry's page at the right (the People, Guide and Elections look of the Nov 8 play mocks).
// A screen hands it the groups and a `render(entry)` that returns the page's nodes; the
// list pages inside its box, never a scroll.
import { el, viewHeight } from "./dom.mjs";
import { pickGroup, pickHead, pickRow } from "./list-row.mjs";
import { pager } from "./pager.mjs";

/**
 * `groups`: [{ title?, entries: [{ key, label, aside?, onSelect?, data? }] }]; `render(entry)`
 * gives the page nodes (or a promise of them); `className`
 * names the screen for its checks. An entry with `onSelect` runs it instead of opening a page.
 */
export function rosterScreen({
  title,
  groups,
  render,
  className = "",
  chosenKey,
}) {
  const entries = groups.flatMap((g) => g.entries);
  let chosen = entries.find((e) => e.key === chosenKey) ?? entries[0];
  let request = 0;
  const roster = el("nav", { className: "pick-list roster" });
  roster.setAttribute("aria-label", title);
  const page = el("div", { className: "roster-page strip-screen strips" });
  const items = groups.flatMap((g) => [
    ...(g.title ? [{ heading: g.title }] : []),
    ...g.entries.map((entry) => ({ entry })),
  ]);
  const open = async (entry) => {
    chosen = entry;
    const mine = ++request;
    for (const b of roster.querySelectorAll(".roster-row"))
      b.setAttribute("aria-pressed", String(b.dataset.key === entry.key));
    const nodes = await render(entry);
    if (mine === request) page.replaceChildren(...nodes);
  };
  const rowOf = ({ heading, entry }) => {
    if (heading) return pickGroup(heading, "roster-group");
    const row = pickRow({
      label: entry.label,
      aside: entry.aside,
      className: "roster-row",
    });
    row.dataset.key = entry.key;
    for (const [k, v] of Object.entries(entry.data ?? {})) row.dataset[k] = v;
    row.setAttribute("aria-pressed", String(entry === chosen));
    row.addEventListener("click", () =>
      entry.onSelect ? entry.onSelect() : open(entry),
    );
    return row;
  };
  roster.append(
    pickHead(title),
    pager({
      items,
      render: rowOf,
      rows: Math.max(6, Math.min(14, Math.floor((viewHeight() - 330) / 36))),
      columns: 1,
      rowHeight: 34,
      growRows: true,
      gap: 2,
      className: "roster-pages",
    }),
  );
  if (chosen && !chosen.onSelect) open(chosen);
  return [el("div", { className: `roster-screen ${className}` }, roster, page)];
}
