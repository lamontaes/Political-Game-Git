// The Travel screen (owner, Nov 1 and Nov 7: places as pictures; mock pl-travel): the
// places you can go in groups of picture tiles at the left, and the chosen place's
// picture, hours, who is there, what you can do there and Go at the right.
// The screen hands it entries; a place's details load when it is chosen.
import { el } from "./dom.mjs";
import { makeButton } from "./button.mjs";
import { picture } from "./picture.mjs";
import { stripSection } from "./strips.mjs";

/** The groups, each with its heading and its tiles. */
function grouped(entries) {
  const groups = [];
  for (const entry of entries) {
    let group = groups.find((g) => g.title === entry.group);
    if (!group) groups.push((group = { title: entry.group, entries: [] }));
    group.entries.push(entry);
  }
  return groups;
}

/**
 * `entries`: [{ group, title, picture, onOpen?, load?, go?, home? }]. An entry with `onOpen`
 * opens its own screen when chosen; otherwise `load()` gives { open, who, does } for the
 * detail side (`who` a node or null, `does` an array of texts) and `go` = { label, onClick }.
 * `labels`: { whoIsThere, whatICanDo }.
 */
export function travelScreen({ entries, labels }) {
  const tiles = el("div", { className: "travel-tiles" });
  const detail = el("div", { className: "travel-detail strip-screen strips" });
  const groups = grouped(entries);
  // The way home is listed first while you are out, and the first place is
  // still the one chosen: Travel opens on somewhere to go.
  let selected =
    entries.find((e) => !e.onOpen && !e.home) ?? entries.find((e) => !e.onOpen);
  let request = 0;
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
    // Labeled facts under the picture (Open now; how long; who is coming).
    const facts = el("div", { className: "travel-facts" });
    const list =
      info.facts ??
      (info.open ? [{ label: info.openLabel, value: info.open }] : []);
    for (const fact of list)
      facts.append(
        el(
          "div",
          {},
          el("span", { textContent: fact.label }),
          el("b", { textContent: fact.value }),
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
      ...(list.length ? [facts] : []),
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
    for (const node of info.nodes ?? []) detail.append(node);
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
      ...groups.flatMap((block) => [
        ...(block.title
          ? [el("h3", { className: "travel-group", textContent: block.title })]
          : []),
        el("div", { className: "travel-grid" }, ...block.entries.map(drawTile)),
      ]),
    );
    drawDetail();
  };
  draw();
  return [
    el(
      "div",
      { className: "travel-screen" },
      el("div", { className: "travel-left" }, tiles),
      detail,
    ),
  ];
}
