/**
 * Dev mode's Loans view (pool item dev-mode-shows-a-loans-monthly-bills; the owner, Nov 16: what a
 * session traces by script, dev mode traces in the game). For one household, the player's unless
 * `person` names another member: each loan application the credit engine wrote (whose income it
 * read, the costs that sized it, the answer and, once the lenders pair records it, the reason for a
 * no), and each loan's months as its payments table holds them (the amount due, the borrower's own
 * cash that morning, what was paid, the standing, and the payment or missed-payment record). It
 * reads the credit engine's own rows and the durable log; it computes nothing of its own and spends
 * no time.
 */
import { coreAPI } from "../../core2/state";
import type { DevView } from "../dev-views";

type Row = Readonly<Record<string, unknown>>;

const text = (value: unknown) => (value === undefined ? null : value);

const view: DevView = {
  name: "loans",
  client: "dev-view-loans.mjs",
  labels: {
    title: "Loans",
    applications: "Applications",
    months: "Months",
    date: "Date",
    borrower: "Borrower",
    kind: "Kind",
    income: "Income read",
    costs: "Costs read",
    asked: "Asked",
    offered: "Offered",
    answer: "Answer",
    reason: "Reason",
    loan: "Loan",
    due: "Due",
    cash: "Cash that morning",
    paid: "Paid",
    standing: "Standing",
    record: "Record",
    yes: "yes",
    no: "no",
    none: "none",
  },
  routes: {
    "GET loans/household": ({ mode, q }) => {
      const core = mode.core;
      const personId = q("person") || core.playerId || "";
      const householdId = core.people.get(personId as never)?.householdId;
      if (!householdId || !core.modules.has("credit"))
        return { householdId: null, applications: [], loans: [] };
      const credit = coreAPI(core).moduleState("credit");
      const applications = [
        ...(credit.table("applications").rows() as readonly Row[]),
      ]
        .filter((row) => row.householdId === householdId)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((row) => ({
          id: String(row.id),
          date: String(row.date),
          borrowerId: text(row.borrowerId),
          kind: text(row.kind),
          monthlyIncomeMinor: text(row.monthlyIncomeMinor),
          costsMonthlyMinor: text(row.costsMonthlyMinor),
          requestedMinor: text(row.requestedMinor),
          limitMinor: text(row.limitMinor),
          approved: Boolean(row.approved),
          refusedReasonKey: text(row.refusedReasonKey),
        }));
      const loans = [...(credit.table("loans").rows() as readonly Row[])]
        .filter((row) => row.householdId === householdId)
        .sort((a, b) => String(a.id).localeCompare(String(b.id)))
        .map((loan) => ({
          id: String(loan.id),
          kind: text(loan.kind),
          borrowerId: text(loan.borrowerId),
          months: [
            ...(credit
              .table("payments")
              .query("byLoan", [String(loan.id)]) as readonly Row[]),
          ]
            .sort((a, b) => String(a.date).localeCompare(String(b.date)))
            .map((month) => {
              const missed = `event:credit.payment-missed:${String(loan.id)}:${String(month.date)}`;
              const paidId = `loan-payment:${String(loan.id)}:${String(month.date)}`;
              return {
                date: String(month.date),
                dueMinor: text(month.dueMinor),
                cashBeforeMinor: text(month.cashBeforeMinor),
                paidMinor: text(month.paidMinor),
                standing: text(month.standing),
                recordId: core.durableLog.has(missed)
                  ? missed
                  : Number(month.paidMinor) > 0
                    ? paidId
                    : null,
              };
            }),
        }));
      return { householdId, applications, loans };
    },
  },
};

export default view;
