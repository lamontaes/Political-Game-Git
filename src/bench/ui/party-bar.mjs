// The one party split bar: a body's seats as one bar, each party's share in
// its color with its count worded inside, empty seats last. Used wherever a
// body's split shows (Politics → Government; the mock's "3 Democrats | 2
// Republicans | 1").
import { el } from "./dom.mjs";
import { partyClass } from "./map.mjs";

/**
 * `parts`: [{ party, seats, label }] in the order to draw, `label` worded by
 * the screen ("3 Democrats"); `total` the body's seats (vacant seats are the
 * rest); `title` words the whole bar for a reader.
 */
export function partyBar(parts, total, title, vacantLabel = "") {
  const held = parts.reduce((sum, p) => sum + p.seats, 0);
  const segment = (className, seats, label) => {
    const piece = el(
      "span",
      { className: `party-bar-part ${className}`, title: label },
      el("span", { className: "party-bar-label", textContent: label }),
    );
    piece.style.flexGrow = String(seats);
    return piece;
  };
  return el(
    "div",
    { className: "party-bar", role: "img", ariaLabel: title },
    ...parts.map((p) => segment(partyClass(p.party), p.seats, p.label)),
    ...(total > held
      ? [segment("party-none vacant", total - held, vacantLabel)]
      : []),
  );
}
