// The districts map: the player's state with its counties, their own districts
// and town drawn over it, each district filled with the color of the party
// that holds it, and a legend of the parties (owner, Oct 28: "There was once a
// map with districts; bring it back. Parties illustrated in that same way").
// The screen hands it the map view (/api/map) and the parties with their seat
// counts; nothing here reads a record.
/* global document */
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
  for (const county of view.counties)
    svg.append(path(county.d, "county", county.name));
  for (const [layer, district] of Object.entries(view.yours ?? {})) {
    if (!district?.d) continue;
    const node = path(
      district.d,
      `yours ${layer} ${partyClass(holdingParty(district.holders))}`,
      wordHolders(district),
    );
    node.dataset.layer = layer;
    svg.append(node);
  }
  return svg;
}

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
