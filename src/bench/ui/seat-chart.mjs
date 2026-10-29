// The one seat chart: a chamber's seats as a half circle of dots in their
// parties' colors, the way a legislature is drawn (owner, Oct 29: big
// chambers show a seat chart). Your own members' seats are ringed.
/* global document */
import { el } from "./dom.mjs";
import { partyClass } from "./map.mjs";

const SVG = "http://www.w3.org/2000/svg";
const WIDTH = 360;
const HEIGHT = 190;
/**
 * Rows of seats from the inner arc out, each row's share by its length. The
 * rows and the inner arc are chosen so the gap between rows matches the gap
 * between seats along a row, for a 17-member delegation and a 118-seat House
 * alike.
 */
function layout(total) {
  const rows = Math.max(1, Math.round(Math.sqrt(0.3 * total)));
  const k = Math.PI * rows * (rows - 1);
  const inner =
    rows === 1
      ? 1
      : Math.min(0.75, Math.max(0.3, (2 * total - k) / (2 * total + k)));
  const radii = Array.from({ length: rows }, (_, i) =>
    rows === 1 ? 1 : inner + ((1 - inner) * i) / (rows - 1),
  );
  const length = radii.reduce((sum, r) => sum + r, 0);
  const counts = radii.map((r) => Math.floor((total * r) / length));
  for (
    let left = total - counts.reduce((a, b) => a + b, 0), i = rows - 1;
    left > 0;
    left--, i = (i + rows - 1) % rows
  )
    counts[i] += 1;
  const seats = [];
  radii.forEach((r, row) => {
    const n = counts[row];
    for (let j = 0; j < n; j++) {
      const angle = Math.PI - (n === 1 ? Math.PI / 2 : (Math.PI * j) / (n - 1));
      seats.push({ r, angle });
    }
  });
  // Seats fill left to right across every row, so a party is a wedge.
  const spacing =
    rows === 1 ? Math.PI / Math.max(1, total - 1) : (1 - inner) / (rows - 1);
  return {
    spacing,
    seats: seats.sort((a, b) => b.angle - a.angle || a.r - b.r),
  };
}

/**
 * `seats`: [{ party, own, label }] in the order to fill, left to right
 * (the screen sorts them by party); `title` words the chart.
 */
export function seatChart(seats, title) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", title);
  svg.classList.add("seat-chart-svg");
  const { spacing, seats: spots } = layout(seats.length);
  const cx = WIDTH / 2;
  const cy = HEIGHT - 8;
  const R = WIDTH / 2 - 10;
  // A dot fills a little under half the room between neighbors.
  const dot = Math.max(2.2, Math.min(10, 0.42 * spacing * R));
  spots.forEach((spot, i) => {
    const seat = seats[i];
    const c = document.createElementNS(SVG, "circle");
    c.setAttribute("cx", String(cx + R * spot.r * Math.cos(spot.angle)));
    c.setAttribute("cy", String(cy - R * spot.r * Math.sin(spot.angle)));
    c.setAttribute("r", String(dot));
    c.setAttribute(
      "class",
      `seat ${partyClass(seat.party)}${seat.own ? " own" : ""}`,
    );
    const t = document.createElementNS(SVG, "title");
    t.textContent = seat.label;
    c.append(t);
    svg.append(c);
  });
  return el("div", { className: "seat-chart" }, svg);
}
