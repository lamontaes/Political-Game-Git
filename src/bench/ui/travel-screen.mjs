// The Travel screen (owner, Nov 1 and Nov 7: places as pictures; mock pl-travel): the
// places you can go in groups of picture tiles at the left, and the chosen place's
// picture, hours, who is there, what you can do there and Go at the right.
// The screen hands it entries; a place's details load when it is chosen.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { picture } from "./picture.mjs";
import { stripSection } from "./strips.mjs";

const COLUMNS = 3;
// Tile rows a page holds; a group's heading takes a quarter of a row.
const ROWS_PER_PAGE = 3;
const HEADING_ROWS = 0.3;

/** The pages: whole tile rows and group headings, never splitting a heading from its tiles. */
function paginate(entries) {
  const groups = [];
  for (const entry of entries) {
    let group = groups.find((g) => g.title === entry.group);
    if (!group) groups.push((group = { title: entry.group, entries: [] }));
    group.entries.push(entry);
  }
  const pages = [[]];
  let used = 0;
  for (const group of groups) {
    let rest = group.entries;
    let first = true;
    while (rest.length) {
      const room = Math.floor(
        ROWS_PER_PAGE - used - (first ? HEADING_ROWS : 0) + 1e-9,
      );
      if (room < 1) {
        pages.push([]);
        used = 0;
        continue;
      }
      const take = rest.slice(0, room * COLUMNS);
      pages.at(-1).push({
        title: first ? group.title : undefined,
        entries: take,
      });
      used += (first ? HEADING_ROWS : 0) + Math.ceil(take.length / COLUMNS);
      rest = rest.slice(take.length);
      first = false;
    }
  }
  return pages;
}

/**
 * `entries`: [{ group, title, picture, onOpen?, load?, go? }]. An entry with `onOpen`
 * opens its own screen when chosen; otherwise `load()` gives { open, who, does } for the
 * detail side (`who` a node or null, `does` an array of texts) and `go` = { label, onClick }.
 * `labels`: { whoIsThere, whatICanDo }. `words`: the pager's words.
 */
export function travelScreen({ entries, labels, words }) {
  const tiles = el("div", { className: "travel-tiles" });
  const detail = el("div", { className: "travel-detail strip-screen strips" });
  const pages = paginate(entries);
  let page = 0;
  let selected = entries.find((e) => !e.onOpen);
  let request = 0;
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
  const where = el("span", { className: "pager-where" });
  const controls = el(
    "div",
    { className: "pager-controls" },
    previous,
    where,
    next,
  );
  controls.hidden = pages.length < 2;
  const choose = (entry) => {
    if (entry.onOpen) return entry.onOpen();
    selected = entry;
    draw();
  };
  const drawTile = (entry) => {
    const tile = makeButton({ className: "travel-tile" });
    tile.setAttribute("aria-pressed", String(entry === selected));
    if (entry.picture)
      tile.append(picture({ src: entry.picture, className: "travel-art" }));
    tile.append(el("b", { textContent: entry.title }));
    tile.dataset.place = entry.title;
    if (entry.filing) tile.dataset.filing = "true";
    tile.addEventListener("click", () => choose(entry));
    return tile;
  };
  const drawDetail = async () => {
    const mine = ++request;
    const entry = selected;
    detail.replaceChildren();
    if (!entry) return;
    const info = (await entry.load?.()) ?? {};
    if (mine !== request) return;
    const facts = el("div", { className: "travel-facts" });
    if (info.open)
      facts.append(
        el(
          "div",
          {},
          el("span", { textContent: info.openLabel }),
          el("b", { textContent: info.open }),
        ),
      );
    detail.append(
      el(
        "div",
        { className: "travel-hero" },
        ...(entry.picture
          ? [picture({ src: entry.picture, className: "travel-art" })]
          : []),
        el("h2", { textContent: entry.title }),
      ),
      ...(info.open ? [facts] : []),
      ...(info.who ? [stripSection(3, labels.whoIsThere, info.who)] : []),
      ...(info.does?.length
        ? [
            stripSection(
              2,
              labels.whatICanDo,
              el(
                "ul",
                { className: "travel-does" },
                ...info.does.map((text) => el("li", { textContent: text })),
              ),
            ),
          ]
        : []),
    );
    if (entry.go) {
      const go = makeButton({
        className: "travel-go",
        textContent: entry.go.label,
      });
      go.dataset.testid = "place-go";
      go.addEventListener("click", entry.go.onClick);
      detail.append(go);
    }
  };
  const draw = () => {
    tiles.replaceChildren(
      ...pages[page].flatMap((block) => [
        ...(block.title
          ? [el("h3", { className: "travel-group", textContent: block.title })]
          : []),
        el("div", { className: "travel-grid" }, ...block.entries.map(drawTile)),
      ]),
    );
    where.textContent = words.page
      .replace("{page}", String(page + 1))
      .replace("{pages}", String(pages.length));
    previous.disabled = page === 0;
    next.disabled = page >= pages.length - 1;
    drawDetail();
  };
  previous.addEventListener("click", () => {
    page = Math.max(0, page - 1);
    draw();
  });
  next.addEventListener("click", () => {
    page = Math.min(pages.length - 1, page + 1);
    draw();
  });
  draw();
  return [
    el(
      "div",
      { className: "travel-screen" },
      el("div", { className: "travel-left" }, tiles, controls),
      detail,
    ),
  ];
}
