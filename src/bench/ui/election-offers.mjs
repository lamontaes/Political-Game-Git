// Dev mode's Election offers panel (src/bench/dev-views/election-offers.ts), in the Government
// tab's dev panels row: each office on the Elections page, offered or not, and the one reason.
import { el } from "./dom.mjs";

export const slots = {
  panels: async ({ labels, send }) => {
    const { offers } = await send("election-offers");
    return el(
      "section",
      { className: "dev-only dev-election-offers" },
      el("h3", { textContent: labels.title }),
      ...(offers.length
        ? offers.map((offer) => {
            const row = el("div", {
              className: "dev-election-offer",
              textContent: [
                offer.title,
                offer.offered
                  ? labels.offered
                  : `${labels.bar}: ${labels.bars[offer.bar] ?? offer.rule ?? ""}`,
                ...(offer.metOn ? [`${labels.turnsOn} ${offer.metOn}`] : []),
                ...(offer.opens ? [`${labels.opens} ${offer.opens}`] : []),
                `${labels.closes} ${offer.closes}`,
              ].join(" · "),
            });
            row.dataset.recordId = offer.id;
            return row;
          })
        : [el("p", { textContent: labels.empty })]),
    );
  },
};
