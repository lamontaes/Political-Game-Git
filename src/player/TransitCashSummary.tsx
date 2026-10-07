import type { TransitCashSnapshot } from "../presentation/transit-cash-snapshot";
import type { MoneyAmount } from "../simulation/types";

function format(amount: MoneyAmount) {
  return (amount.minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: amount.currency,
  });
}

/** Read-only contract/account facts. Due-time settlement remains authoritative. */
export function TransitCashSummary({
  snapshot,
}: {
  readonly snapshot: TransitCashSnapshot;
}) {
  if (snapshot.kind === "already-requested") return null;
  return (
    <div data-testid="transit-cash-snapshot" data-state={snapshot.kind}>
      {snapshot.kind === "authority-unavailable" ? (
        <p role="status" data-reason={snapshot.reason} />
      ) : (
        <>
          <dl data-testid="transit-cash-periods">
            <dt>First period</dt>
            <dd>{format(snapshot.firstPeriodAmount)}</dd>
            <dt>Second period</dt>
            <dd>{format(snapshot.secondPeriodAmount)}</dd>
          </dl>
          {snapshot.kind === "recorded-cash" ? (
            <p
              data-testid="transit-recorded-cash"
              data-first-period-cash={snapshot.firstPeriodCash}
            >
              <time dateTime={snapshot.asOf}>{snapshot.asOf}</time>{" "}
              {format(snapshot.recordedLiquidBalance)}
            </p>
          ) : (
            <p role="status" data-reason={snapshot.reason} />
          )}
        </>
      )}
    </div>
  );
}
