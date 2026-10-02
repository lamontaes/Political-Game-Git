import { homePayments } from "../presentation/home-payments";
import { displayMoney } from "../presentation/money-display";
import { proseDate } from "../presentation/prose-dates";
import type { EntityId, World } from "../simulation/types";

export function HomePaymentsPanel({
  world,
  personId,
}: {
  readonly world: World;
  readonly personId: EntityId;
}) {
  const bills = homePayments(world, personId);
  if (!bills.length) return null;
  return (
    <section aria-label="Rent and household bills" data-testid="home-payments">
      <h3>Rent and household bills</h3>
      {bills.map((bill) => (
        <div key={bill.flowId} data-flow-id={bill.flowId}>
          <h4>{bill.label}</h4>
          <p>
            {displayMoney(bill.amount)}
            {bill.monthly ? " a month" : ""}.
          </p>
          {bill.payments.length ? (
            <ul>
              {bill.payments.map((payment) => (
                <li key={payment.id} data-payment-id={payment.id}>
                  Due {proseDate(payment.periodStartsAt)}.{" "}
                  {payment.status === "completed"
                    ? `Paid ${displayMoney(payment.transferredAmount)} on ${proseDate(payment.occurredAt)}.`
                    : payment.status === "partial"
                      ? `Paid ${displayMoney(payment.transferredAmount)} of ${displayMoney(payment.attemptedAmount)} on ${proseDate(payment.occurredAt)}.`
                      : `Not paid; ${displayMoney(payment.attemptedAmount)} was due.`}
                </li>
              ))}
            </ul>
          ) : (
            <p>No payment on record yet.</p>
          )}
        </div>
      ))}
    </section>
  );
}
