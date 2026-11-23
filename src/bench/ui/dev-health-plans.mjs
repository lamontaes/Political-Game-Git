// Dev mode's employer health plans on the Calendar (src/bench/dev-views/health-plans.ts): workers
// with a job, the plans their employers offer, the plans their own shares add up to, those held and
// those left out for a missed premium, and the year's rate with the claims it was set from. Record
// data and control names only.
import { el } from "./dom.mjs";
import { tableRows } from "./dev-view.mjs";

const count = (n) => Math.round(n).toLocaleString("en-US");
const percent = (n) => `${Math.round(n * 100)}%`;
const dollars = (minor) =>
  Math.round(minor / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export const slots = {
  async calendar({ labels, send }) {
    const plans = await send("health-plans");
    if (!plans) return null;
    return el(
      "section",
      { className: "dev-health-plans" },
      el("h3", { textContent: labels.title }),
      el(
        "table",
        {},
        ...tableRows(
          [
            { name: labels.date, value: (r) => r.date },
            { name: labels.workers, value: (r) => count(r.workers) },
            { name: labels.offered, value: (r) => count(r.offered) },
            { name: labels.plansGiven, value: (r) => count(r.plans) },
            { name: labels.plansHeld, value: (r) => count(r.held) },
            { name: labels.premiumMissed, value: (r) => count(r.lapsed) },
            {
              name: labels.heldShare,
              value: (r) => (r.workers > 0 ? percent(r.held / r.workers) : ""),
            },
            { name: labels.rateYear, value: (r) => String(r.rateYear) },
            { name: labels.rate, value: (r) => dollars(r.rateMonthlyMinor) },
            {
              name: labels.claims,
              value: (r) => dollars(r.claimsMonthlyMinor),
            },
            { name: labels.claimMonths, value: (r) => count(r.claimMonths) },
          ],
          [plans],
        ),
      ),
    );
  },
};
