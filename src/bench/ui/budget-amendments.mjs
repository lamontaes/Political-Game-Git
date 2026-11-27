// Dev mode's Budget amendments panel (src/bench/dev-views/budget-amendments.ts), in the Government
// tab's dev panels row: the room a body has to amend its adopted budget, the arithmetic behind it,
// and each amendment bill's cause.
import { el } from "./dom.mjs";

const money = (minor) => `$${Math.round(minor / 100).toLocaleString("en-US")}`;

export const slots = {
  panels: async ({ labels, send }) => {
    const data = await send("budget-amendments");
    const room = data.room;
    const rows = room
      ? [
          [labels.months, String(room.months)],
          [labels.now, money(room.nowMinor)],
          [labels.pace, money(room.paceMinor)],
          [labels.planned, money(room.plannedMinor)],
          [labels.amended, money(room.amendedMinor)],
          [labels.room, money(room.roomMinor)],
          [labels.cause, labels.causes[room.cause] ?? ""],
        ]
      : [];
    return el(
      "section",
      { className: "dev-only dev-budget-amendments" },
      el("h3", { textContent: labels.title }),
      ...(room
        ? rows.map(([name, value]) =>
            el("div", { textContent: `${name}: ${value}` }),
          )
        : [el("p", { textContent: labels.none })]),
      el("h4", { textContent: labels.bills }),
      ...(data.bills?.length
        ? data.bills.map((bill) => {
            const row = el("div", {
              className: "dev-budget-amendment-bill",
              textContent: `${bill.number} · ${bill.introduced} · ${bill.line} ${money(bill.deltaMinor)} · ${labels.causes[bill.cause] ?? bill.cause}`,
            });
            row.dataset.recordId = bill.id;
            return row;
          })
        : [el("p", { textContent: labels.noBills })]),
    );
  },
};
