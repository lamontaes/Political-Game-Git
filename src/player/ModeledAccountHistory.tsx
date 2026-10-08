import type {
  ModeledAccountEntry,
  ModeledAccountHistory as ModeledAccountHistoryModel,
} from "../presentation/modeled-account-history";
import type { MoneyAmount } from "../simulation/types";
import { EconomicGraph } from "./EconomicContextPanel";
import "./modeled-account-history.css";

const usd = (amount: MoneyAmount) =>
  (amount.minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: amount.currency,
  });

const KIND_LABEL: Readonly<Record<ModeledAccountEntry["kind"], string>> = {
  "tax-receipt": "Tax collected",
  "service-payment": "Service payment",
  unclassified: "Other transfer",
};

function entryOutcome(entry: ModeledAccountEntry): string {
  if (entry.transferred.minorUnits === 0)
    return `Attempted: ${usd(entry.attempted)} · Moved: $0 · ${entry.status}`;
  const moved = `${entry.direction === "in" ? "+" : "−"}${usd(entry.transferred)}`;
  return entry.status === "completed"
    ? moved
    : `${moved} · Attempted: ${usd(entry.attempted)} · ${entry.status}`;
}

const period = (entry: ModeledAccountEntry) =>
  entry.periodStartsAt === entry.periodEndsAt
    ? entry.periodStartsAt
    : `${entry.periodStartsAt}–${entry.periodEndsAt}`;

/**
 * A separate Budget block for this life's modeled receipts account. It is
 * kept apart from the government aggregates and reference observations.
 */
export function ModeledAccountHistory({
  history,
}: {
  readonly history: ModeledAccountHistoryModel;
}) {
  return (
    <section
      className="modeled-account-history"
      aria-labelledby="modeled-account-history-title"
      data-testid="modeled-account-history"
      data-status={history.status}
    >
      <h4 id="modeled-account-history-title">Modeled account history</h4>
      {history.status === "no-account" ? (
        <p data-testid="modeled-account-none" data-problem="no-account" />
      ) : (
        <>
          <dl className="modeled-account-totals">
            <div>
              <dt>Opened</dt>
              <dd>
                {history.openedAt} at {usd(history.openingBalance)}
              </dd>
            </div>
            <div>
              <dt>Taxes collected</dt>
              <dd data-testid="modeled-account-receipts">
                {usd(history.receipts)}
              </dd>
            </div>
            <div>
              <dt>Paid for services</dt>
              <dd data-testid="modeled-account-payments">
                {usd(history.payments)}
              </dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd data-testid="modeled-account-balance">
                {history.balance.status === "established"
                  ? `${usd(history.balance.balance)} on ${history.balance.asOf}`
                  : null}
              </dd>
            </div>
          </dl>
          {history.graph ? (
            <EconomicGraph graph={history.graph} />
          ) : (
            <p
              data-testid="modeled-account-no-transfers"
              data-problem="no-transfers"
            />
          )}
          {history.entries.length > 0 ? (
            <div className="modeled-account-records">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Settlement period</th>
                    <th scope="col">Transfer</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Record</th>
                  </tr>
                </thead>
                <tbody>
                  {history.entries.map((entry) => (
                    <tr
                      key={entry.outcomeId}
                      data-testid="modeled-account-entry"
                      data-kind={entry.kind}
                    >
                      <td>{entry.occurredAt}</td>
                      <td>{period(entry)}</td>
                      <td>{KIND_LABEL[entry.kind]}</td>
                      <td>{entryOutcome(entry)}</td>
                      <td>
                        <code>{entry.outcomeId}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}
