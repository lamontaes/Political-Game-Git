// Dev mode's "Petition count" on the Calendar (src/bench/dev-views/petition-count.ts): for each of
// the player's petitions, who signed and how, what paid circulators brought, the gap, the days
// left, the fund and the clerk's check, and what the petition scene was told. Reads only.
import { el } from "./dom.mjs";

export const slots = {
  async calendar({ labels, send }) {
    const rows = await send("petition-count");
    if (!rows.length) return null;
    const line = (row) =>
      [
        `${labels.signed} ${row.signed}/${row.needed}`,
        `${labels.inTown} ${row.inTown}`,
        `${labels.outside} ${row.outsideTown}`,
        `${labels.doors} ${row.byDoor}`,
        `${labels.gap} ${row.gap}`,
        ...(row.daysLeft === null
          ? []
          : [`${labels.daysLeft} ${row.daysLeft}`]),
        ...(row.circulatorFundMinor > 0
          ? [`${labels.fund} $${Math.round(row.circulatorFundMinor / 100)}`]
          : []),
        ...(row.told && row.told.circulators
          ? [
              row.told.money
                ? row.told.coversPart
                  ? labels.part
                  : labels.offered
                : labels.noMoney,
            ]
          : []),
        ...(row.check
          ? [`${labels.checked} ${row.check.valid}/${row.needed}`]
          : []),
      ].join(" · ");
    const box = el(
      "div",
      { className: "dev-panel" },
      el("h3", {}, labels.title),
      ...rows.map((row) => el("p", { className: "dev-line" }, line(row))),
    );
    box.dataset.testid = "dev-petition-count";
    return box;
  },
};
