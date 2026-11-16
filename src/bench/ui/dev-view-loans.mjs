// Dev mode's Loans view (src/bench/dev-views/loans.ts), under the Metrics board: the player's
// household's loan applications (whose income the lender read, the costs that sized the ask, the
// answer and its reason) and each loan's months (due, the borrower's cash that morning, paid, the
// standing and the payment or missed-payment record). Record data and bare control names; it reads
// only and spends no time.
import { el } from "./dom.mjs";
import { moneyWords } from "../../english/plain-words.mjs";
import { tableRows } from "./dev-view.mjs";

const money = (minor) =>
  minor === null || minor === undefined ? "" : moneyWords(Number(minor));

const table = (columns, rows) => el("table", {}, ...tableRows(columns, rows));

export const slots = {
  async metrics({ labels, send }) {
    const view = await send("loans/household");
    if (!view.householdId) return null;
    const applications = view.applications.length
      ? table(
          [
            { name: labels.date, value: (r) => r.date },
            { name: labels.borrower, value: (r) => r.borrowerId ?? "" },
            { name: labels.kind, value: (r) => r.kind ?? "" },
            { name: labels.income, value: (r) => money(r.monthlyIncomeMinor) },
            { name: labels.costs, value: (r) => money(r.costsMonthlyMinor) },
            { name: labels.asked, value: (r) => money(r.requestedMinor) },
            { name: labels.offered, value: (r) => money(r.limitMinor) },
            {
              name: labels.answer,
              value: (r) => (r.approved ? labels.yes : labels.no),
            },
            { name: labels.reason, value: (r) => r.refusedReasonKey ?? "" },
          ],
          view.applications,
        )
      : el("p", { textContent: labels.none });
    const months = view.loans.flatMap((loan) =>
      loan.months.map((month) => ({ ...month, loanId: loan.id })),
    );
    return el(
      "div",
      { className: "dev-panel dev-view-loans" },
      el("h3", { textContent: labels.title }),
      el("h4", { textContent: labels.applications }),
      applications,
      el("h4", { textContent: labels.months }),
      months.length
        ? table(
            [
              { name: labels.loan, value: (r) => r.loanId },
              { name: labels.date, value: (r) => r.date },
              { name: labels.due, value: (r) => money(r.dueMinor) },
              { name: labels.cash, value: (r) => money(r.cashBeforeMinor) },
              { name: labels.paid, value: (r) => money(r.paidMinor) },
              { name: labels.standing, value: (r) => r.standing ?? "" },
              { name: labels.record, value: (r) => r.recordId ?? "" },
            ],
            months,
          )
        : el("p", { textContent: labels.none }),
    );
  },
};
