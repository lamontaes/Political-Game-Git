// The districts map: the player's state with its counties, their own districts
// and town drawn over it, each district filled with the color of the party
// that holds it, and a legend of the parties (owner, Oct 28: "There was once a
// map with districts; bring it back. Parties illustrated in that same way").
// The screen hands it the map view (/api/map) and the parties with their seat
// counts; nothing here reads a record.
/* global document, requestAnimationFrame */
import { el } from "./dom.mjs";

const NS = "http://www.w3.org/2000/svg";

/** A party's name as a class the stylesheet colors ("Democratic" → "party-democratic"). */
export function partyClass(party) {
  const slug = String(party ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return slug ? `party-${slug}` : "party-none";
}

/** The party that holds a district: the one most of its holders belong to. */
function holdingParty(holders) {
  const counts = new Map();
  for (const holder of holders ?? [])
    if (holder.party)
      counts.set(holder.party, (counts.get(holder.party) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function path(d, className, title) {
  const node = document.createElementNS(NS, "path");
  node.setAttribute("d", d);
  node.setAttribute("class", className);
  if (title) {
    const t = document.createElementNS(NS, "title");
    t.textContent = title;
    node.append(t);
  }
  return node;
}

/**
 * The map as an SVG: `view` is /api/map's answer (bbox, state, counties, yours
 * by layer with holders), `wordHolders` words a district's holders for its
 * hover title ("Congressional District 1: Jane Doe, Democratic").
 */
export function districtMap(view, { wordHolders }) {
  const svg = document.createElementNS(NS, "svg");
  const [x0, y0, x1, y1] = view.bbox;
  svg.setAttribute("viewBox", `${x0} ${y0} ${x1 - x0} ${y1 - y0}`);
  svg.setAttribute("class", "gov-map");
  svg.setAttribute("role", "img");
  if (view.state)
    svg.append(
      path(
        view.state.d,
        `state ${partyClass(holdingParty(view.state.holders))}`,
        view.state.name,
      ),
    );
  const named = [];
  for (const county of view.counties) {
    const node = path(county.d, "county", county.name);
    svg.append(node);
    named.push([node, county.name]);
  }
  for (const [layer, district] of Object.entries(view.yours ?? {})) {
    if (!district?.d) continue;
    const node = path(
      district.d,
      `yours ${layer} ${partyClass(holdingParty(district.holders))}`,
      wordHolders(district),
    );
    node.dataset.layer = layer;
    svg.append(node);
    named.push([node, district.name]);
  }
  // Every named place is labeled on the map (owner, Nov 1: "I don't know what
  // this is supposed to be"), drawn once the map is on screen and its shapes
  // have a size. A state's many counties are named by hover alone.
  const labeled =
    view.counties.length <= MAP_LABELS_MOST
      ? named
      : named.slice(view.counties.length);
  const drawLabels = () => {
    if (!svg.isConnected) return requestAnimationFrame(drawLabels);
    const size = (y1 - y0) * 0.04;
    const placed = [];
    const overlaps = (a, b) =>
      a.x < b.x + b.width &&
      b.x < a.x + a.width &&
      a.y < b.y + b.height &&
      b.y < a.y + a.height;
    for (const [node, name] of labeled) {
      if (!name) continue;
      const box = node.getBBox();
      if (!box.width) continue;
      const text = document.createElementNS(NS, "text");
      text.setAttribute("class", "map-label");
      text.setAttribute("x", String(box.x + box.width / 2));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", String(size));
      text.textContent = name;
      svg.append(text);
      // Under the shape; kept inside the map; moved off any label already
      // there (a small island beside a bigger one).
      let y = Math.min(box.y + box.height + size * 1.1, y1 - size * 0.3);
      const up = y >= y1 - size * 0.4;
      for (let tries = 0; tries < 8; tries += 1) {
        text.setAttribute("y", String(y));
        const at = text.getBBox();
        if (!placed.some((other) => overlaps(at, other))) break;
        y += up ? -size * 1.05 : size * 1.05;
      }
      placed.push(text.getBBox());
    }
  };
  requestAnimationFrame(drawLabels);
  return svg;
}
/** The most counties a map names on itself; more are named by hover. */
const MAP_LABELS_MOST = 8;

/** The legend under the map: a swatch per party and its seats, in the party's color. */
export function partyLegend(parties, wordSeats) {
  return el(
    "ul",
    { className: "map-legend" },
    ...parties.map(({ party, seats }) =>
      el(
        "li",
        { className: partyClass(party) },
        el("span", { className: "map-swatch" }),
        el("span", { textContent: `${party} · ${wordSeats(seats)}` }),
      ),
    ),
  );
}

/** The box under the map that holds one party's officeholders, redrawn as the party changes. */
export function partyRoster() {
  return el("div", { className: "party-roster" });
}
