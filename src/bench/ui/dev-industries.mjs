/* global fetch */
// Dev mode's Industries panel: every industry in the town (its businesses open and closed, staff,
// sales, payroll, profit and cash since the opening); pick one for its businesses by name; pick a
// business for its months (sales, payroll, costs, law duties, people hired and let go), each record
// opening in Trace. It reads one tally (src/bench/dev-industries.ts); it writes nothing and spends
// no time. Words are control names and record data only.
import { el } from "./dom.mjs";
import { tableRows, idLink } from "./dev-view.mjs";
import { traceBox } from "./dev-trace-box.mjs";
import { stripSection } from "./strips.mjs";
import { moneyWords, dateWords } from "../../english/plain-words.mjs";

async function get(path) {
  const response = await fetch(`/api/dev/${path}`);
  const value = await response.json();
  if (!response.ok) throw new Error(value.error);
  return value;
}

const money = (minor) => moneyWords(minor, { rounded: true });
const count = (value) => Math.round(value).toLocaleString("en-US");

/** The panel. `labels` is controls.devIndustries. */
export async function devIndustriesPanel({ labels }) {
  const tally = await get("industries");
  const { node: trace, open } = traceBox(labels.trace);
  const businesses = el("table", { className: "dev-industry-businesses" });
  const months = el("table", { className: "dev-industry-months" });
  const records = el("div", { className: "dev-industry-records" });
  const kindName = (kindId) => labels.kinds[kindId] ?? kindId;

  const showBusiness = async (row) => {
    const view = await get(
      `industry-business?id=${encodeURIComponent(row.organizationId)}`,
    );
    months.replaceChildren(
      ...tableRows(
        [
          {
            name: labels.month,
            value: (m) => dateWords(m.date, { month: "short" }),
          },
          { name: labels.sales, value: (m) => money(m.salesMinor) },
          { name: labels.payroll, value: (m) => money(m.payrollMinor) },
          { name: labels.allCosts, value: (m) => money(m.costsMinor) },
          { name: labels.duties, value: (m) => money(m.complianceMinor) },
          { name: labels.hired, value: (m) => count(m.hired) },
          { name: labels.letGo, value: (m) => count(m.letGo) },
          { name: labels.left, value: (m) => count(m.left) },
          {
            name: labels.records,
            value: (m) =>
              el(
                "span",
                {},
                idLink(m.id, open, labels.monthRecord),
                ...m.changeIds.map((id) =>
                  idLink(id, open, ` ${labels.jobRecord}`),
                ),
              ),
          },
        ],
        view.months,
      ),
    );
    records.replaceChildren(
      el(
        "div",
        { className: "kv" },
        idLink(view.organizationId, open, view.name),
      ),
      ...view.recordIds.map((id) =>
        el("div", { className: "kv" }, idLink(id, open)),
      ),
    );
  };

  const showIndustry = (industry) => {
    months.replaceChildren();
    records.replaceChildren();
    businesses.replaceChildren(
      ...tableRows(
        [
          { name: labels.business, value: (b) => b.name },
          { name: labels.staff, value: (b) => count(b.staff) },
          { name: labels.sales, value: (b) => money(b.salesMinor) },
          { name: labels.payroll, value: (b) => money(b.wagesPaidMinor) },
          {
            name: labels.costs,
            value: (b) => money(b.operatingCostsMinor + b.outsideCostsMinor),
          },
          { name: labels.profit, value: (b) => money(b.profitMinor) },
          { name: labels.cash, value: (b) => money(b.cashMinor) },
          {
            name: labels.closed,
            value: (b) => (b.closedAt ? dateWords(b.closedAt) : ""),
          },
        ],
        industry.businesses,
        showBusiness,
      ),
    );
  };

  const industries = el(
    "table",
    { className: "dev-industries" },
    ...tableRows(
      [
        { name: labels.industry, value: (r) => kindName(r.kindId) },
        { name: labels.open, value: (r) => count(r.open) },
        { name: labels.closedCount, value: (r) => count(r.closed) },
        { name: labels.staff, value: (r) => count(r.staff) },
        { name: labels.sales, value: (r) => money(r.salesMinor) },
        { name: labels.payroll, value: (r) => money(r.wagesPaidMinor) },
        { name: labels.profit, value: (r) => money(r.profitMinor) },
        { name: labels.cash, value: (r) => money(r.cashMinor) },
      ],
      tally.industries,
      showIndustry,
    ),
  );
  industries.dataset.testid = "dev-industries";
  return stripSection(
    8,
    labels.title,
    industries,
    businesses,
    months,
    records,
    trace,
  );
}
