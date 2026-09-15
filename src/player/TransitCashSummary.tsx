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
        <p role="status">{snapshot.reason}</p>
      ) : (
        <>
          <p>
            First period: {format(snapshot.firstPeriodAmount)}. Second period:{" "}
            {format(snapshot.secondPeriodAmount)}.
          </p>
          {snapshot.kind === "recorded-cash" ? (
            <p>
              Recorded public cash on {snapshot.asOf}:{" "}
              {format(snapshot.recordedLiquidBalance)}.{" "}
              {snapshot.firstPeriodCash === "sufficient"
                ? "Enough cash is recorded for the first period."
                : "The recorded cash does not cover the first period."}
            </p>
          ) : (
            <p role="status">{snapshot.reason}</p>
          )}
          <p>
            Cash is checked again at settlement. This inspection reserves no
            money.
          </p>
        </>
      )}
    </div>
  );
}
