// The roster screen: a titled list at the left, grouped under small headings, and the chosen
// entry's page at the right (the People, Guide and Elections look of the Nov 8 play mocks).
// A screen hands it the groups and a `render(entry, show, shows)` that returns the page's nodes; the
// list pages inside its box, never a scroll.
import { el, viewHeight } from "./dom.mjs";
import { pickGroup, pickHead, pickRow } from "./list-row.mjs";
import { pager } from "./pager.mjs";

/**
 * `groups`: [{ title?, entries: [{ key, label, aside?, onSelect?, data? }] }]; `render(entry, show)`
 * gives the page nodes (or a promise of them), or calls `show(...nodes)` itself, now and
 * whenever the page changes, and `shows(key)` when the page moves on to another entry's
 * subject (`null` for one not in the list); `className`
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
  // The key of the entry whose page is on screen or on its way.
  let opened = null;
  const mark = (key) => {
    for (const b of roster.querySelectorAll(".roster-row"))
      b.setAttribute("aria-pressed", String(b.dataset.key === key));
  };
  const open = async (entry) => {
    // The entry already open is not opened twice. A second open would strand
    // the first page's controls: their redraws belong to a draw this list no
    // longer shows, so a vote cast there would never appear on the page.
    if (entry.key === opened) return;
    opened = entry.key;
    chosen = entry;
    const mine = ++request;
    mark(entry.key);
    // A page that redraws itself later (a bill after a vote) is handed `show`
    // and returns nothing; one drawn once returns its nodes.
    // The page names the entry it shows, so a reader (a browser check) can
    // tell the chosen entry's page from the one before it, still on screen
    // while the new one loads.
    const show = (...nodes) => {
      if (mine !== request) return;
      page.dataset.key = entry.key;
      page.replaceChildren(...nodes);
    };
    // A page that moves on to another subject (a name on a person's card)
    // says whose page it now is: that row is marked, or none when the subject
    // is not in the list, and the row left behind opens again on a click.
    const shows = (key) => {
      if (mine !== request) return;
      opened = key ?? null;
      chosen = entries.find((e) => e.key === key);
      page.dataset.key = key ?? "";
      mark(key);
    };
    const nodes = await render(entry, show, shows);
    if (nodes) show(...nodes);
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
