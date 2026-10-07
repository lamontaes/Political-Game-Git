import type { TransitCashSnapshot } from "../presentation/transit-cash-snapshot";
import type { MoneyAmount } from "../simulation/types";

function format(amount: MoneyAmount) {
  return (amount.minorUnits / 100).toLocaleString("en-US", {
    style: "currency",
    currency: amount.currency,
  });
}

export function TransitCashSummary({
  snapshot,
}: {
  readonly snapshot: TransitCashSnapshot;
}) {
  if (snapshot.kind === "already-requested") return null;
  return (
    <div data-testid="transit-cash-snapshot" data-state={snapshot.kind}>
      {snapshot.kind === "authority-unavailable" ? (
        <p role="status" data-problem="authority-unavailable" />
      ) : (
        <>
          <p data-testid="transit-cash-periods">
            {format(snapshot.firstPeriodAmount)} ·{" "}
            {format(snapshot.secondPeriodAmount)}
          </p>
          {snapshot.kind === "recorded-cash" ? (
            <p
              data-testid="transit-cash-recorded"
              data-as-of={snapshot.asOf}
              data-first-period={snapshot.firstPeriodCash}
            >
              {format(snapshot.recordedLiquidBalance)}
            </p>
          ) : (
            <p role="status" data-problem={snapshot.kind} />
          )}
        </>
      )}
    </div>
  );
}
