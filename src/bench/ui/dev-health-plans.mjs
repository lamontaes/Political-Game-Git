// Dev mode's employer health plans on the Calendar (src/bench/dev-views/health-plans.ts): workers
// with a job, the share who hold their own plan, the plans that share gives, those held and those
// left out for a missed premium, a month's premiums taken from pay and the holders whose last
// paycheck fell short. Record data and control names only.
import { el } from "./dom.mjs";
import { tableRows } from "./dev-view.mjs";

const count = (n) => Math.round(n).toLocaleString("en-US");
const percent = (n) => `${Math.round(n * 100)}%`;
const dollars = (minor) =>
  `$${Math.round(minor / 100).toLocaleString("en-US")}`;

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
            { name: labels.planShare, value: (r) => percent(r.share) },
            { name: labels.plansGiven, value: (r) => count(r.slots) },
            { name: labels.plansHeld, value: (r) => count(r.held) },
            { name: labels.premiumMissed, value: (r) => count(r.lapsed) },
            {
              name: labels.heldShare,
              value: (r) => (r.workers > 0 ? percent(r.held / r.workers) : ""),
            },
            {
              name: labels.premiumsMonthly,
              value: (r) => dollars(r.premiumsMonthlyMinor),
            },
            { name: labels.shortNow, value: (r) => count(r.shortNow) },
          ],
          [plans],
        ),
      ),
    );
  },
};
