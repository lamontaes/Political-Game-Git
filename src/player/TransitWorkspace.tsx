import { useState } from "react";
import { proseDate } from "../presentation/prose-dates";
import "./TransitWorkspace.css";
import { TransitCashSummary } from "./TransitCashSummary";
import {
  projectTransitWork,
  fileTransitAppropriation,
  requestTransitFromOffice,
  cancelTransitImplementation,
  publishTransitReport,
} from "../presentation/transit-work";
import {
  TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR,
  TRANSIT_SERVICE_CHOICES,
} from "../simulation/legislation-transit-families";
import { dollarsText, serviceHoursText } from "../simulation/transit-service";
import { money } from "../simulation/resources";
import type { EntityId, World, WorldMetricValue } from "../simulation/types";

function serviceUnits(value: WorldMetricValue | null): string | null {
  if (!value || value.kind !== "quantity") return null;
  const q = value.quantity;
  // Recorded hours are paid cents over the contract price, so they convert
  // back exactly; the shared wording then gets "1 hour" and partial hours right.
  const cents =
    (q.numerator * TRANSIT_CONTRACT_PRICE_MINOR_UNITS_PER_HOUR) / q.denominator;
  return Number.isSafeInteger(cents)
    ? serviceHoursText(cents)
    : `${q.numerator}/${q.denominator} vehicle-service hours`;
}
const usd = (minorUnits: number) => dollarsText(money(minorUnits, "USD"));

/** Feature-local Politics leaf. The canonical World remains owned by PlayerGame. */
export function TransitWorkspace({
  world,
  personId,
  onWorldChange,
  onOpenBill,
  onOpenTaxWork,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenBill: (docketKey: string) => void;
  /** Optional root route to the tax surface, the only producer of public cash. */
  readonly onOpenTaxWork?: () => void;
}) {
  const view = projectTransitWork(world, personId);
  const [amount, setAmount] = useState("");
  const [window, setWindow] = useState<"weekday" | "weekend" | "">("");
  const [feedback, setFeedback] = useState<string | null>(null);
  function act(callback: () => World) {
    try {
      onWorldChange(callback());
      setFeedback(null);
    } catch (e) {
      setFeedback((e as Error).message);
    }
  }
  return (
    <section className="transit-workspace">
      {view.office.kind === "unavailable" ? (
        <p role="status" data-reason={view.office.reason} />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!window) {
              setFeedback("choose-service-period");
              return;
            }
            if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
              setFeedback("invalid-amount");
              return;
            }
            const [dollars, decimal = ""] = amount.split(".");
            const cents =
              Number(dollars) * 100 + Number(decimal.padEnd(2, "0"));
            if (!Number.isSafeInteger(cents)) {
              setFeedback("invalid-amount");
              return;
            }
            try {
              const filed = fileTransitAppropriation(world, {
                personId,
                amountMinorUnits: cents,
                serviceWindow: window,
              });
              onWorldChange(filed.world);
              setFeedback(`filed:${filed.bill.designation}`);
            } catch (error) {
              setFeedback((error as Error).message);
            }
          }}
        >
          <fieldset>
            {TRANSIT_SERVICE_CHOICES.map((c) => (
              <label key={c.value} className="transit-service-choice">
                <input
                  type="radio"
                  name="transit-service-period"
                  required
                  value={c.value}
                  checked={window === c.value}
                  onChange={() => setWindow(c.value)}
                />
                {c.label}
              </label>
            ))}
          </fieldset>
          <label>
            <input
              type="number"
              required
              step="0.01"
              min="200"
              max="40000000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button type="submit">File transit appropriation</button>
        </form>
      )}
      {feedback && (
        <p
          role="status"
          data-testid="transit-feedback"
          data-reason={feedback}
        />
      )}
      {view.bills.length === 0 && (
        <p data-testid="transit-none" data-problem="none-filed" />
      )}
      {view.bills.map(
        ({
          bill,
          funding,
          cashSnapshot,
          requested,
          periods,
          paidMinorUnits,
          publicCashMinorUnits,
        }) => {
          const cashShort =
            funding.kind === "available" &&
            !requested &&
            (cashSnapshot.kind === "account-missing" ||
              cashSnapshot.kind === "balance-missing" ||
              (cashSnapshot.kind === "recorded-cash" &&
                cashSnapshot.firstPeriodCash === "insufficient"));
          return (
            <article
              key={bill.measureId}
              className="pg-personal-section"
              data-testid="transit-bill"
            >
              <h3>
                {bill.designation} — {bill.shortTitle}
              </h3>
              <p>
                {world.jurisdictions[bill.jurisdictionId]?.name} · {bill.stage}
              </p>
              <button onClick={() => onOpenBill(bill.docketKey)}>
                Open legislative record
              </button>
              {funding.kind === "unavailable" ? (
                <p role="status" data-reason={funding.reason} />
              ) : (
                <p data-testid="transit-appropriation">
                  {(funding.mandate.amount.minorUnits / 100).toLocaleString(
                    "en-US",
                    { style: "currency", currency: "USD" },
                  )}{" "}
                  <time dateTime={funding.mandate.endsAt}>
                    {proseDate(funding.mandate.endsAt)}
                  </time>
                </p>
              )}
              {funding.kind === "available" && (
                <TransitCashSummary snapshot={cashSnapshot} />
              )}
              {cashShort && (
                <div className="transit-cash-guidance" role="note">
                  <p data-problem="cash-short" />
                  {onOpenTaxWork && (
                    <button type="button" onClick={onOpenTaxWork}>
                      Open taxes and public receipts
                    </button>
                  )}
                </div>
              )}
              {!requested &&
                funding.kind === "available" &&
                view.office.kind === "available" && (
                  <button
                    onClick={() =>
                      act(() =>
                        requestTransitFromOffice(world, {
                          personId,
                          measureId: bill.measureId,
                        }),
                      )
                    }
                  >
                    Request two service periods
                  </button>
                )}
              {periods.length > 0 && (
                <ol className="transit-periods">
                  {periods.map((p) => (
                    <li key={p.due.id} data-state={p.state.status}>
                      <p>
                        <time dateTime={p.due.dueAt}>
                          {proseDate(p.due.dueAt)}
                        </time>{" "}
                        <span data-testid="transit-period-state">
                          {p.state.status}
                        </span>
                      </p>
                      {serviceUnits(p.forecast) !== null ? (
                        <p>{serviceUnits(p.forecast)}</p>
                      ) : null}
                      {serviceUnits(p.delivered) !== null ? (
                        <p>{serviceUnits(p.delivered)}</p>
                      ) : null}
                      {p.state.status !== "resolved" && p.state.context && (
                        <p data-reason={p.state.context} />
                      )}
                    </li>
                  ))}
                </ol>
              )}
              {periods.some((p) => p.state.status === "scheduled") && (
                <button
                  onClick={() =>
                    act(() =>
                      cancelTransitImplementation(world, {
                        personId,
                        measureId: bill.measureId,
                      }),
                    )
                  }
                >
                  Cancel undelivered periods
                </button>
              )}
              {requested && (
                <section
                  className="transit-outcome"
                  data-testid="transit-outcome"
                >
                  <dl>
                    <dd>{serviceHoursText(paidMinorUnits)}</dd>
                    <dd>{usd(paidMinorUnits)}</dd>
                    {publicCashMinorUnits !== null ? (
                      <dd>{usd(publicCashMinorUnits)}</dd>
                    ) : null}
                  </dl>
                </section>
              )}
            </article>
          );
        },
      )}
      {view.reports.length > 0 && (
        <div className="transit-reports">
          {view.reports.map(({ event, published }) => (
            <article key={event.id}>
              <p>
                {event.occurredAt}: {event.summary}
              </p>
              {published ? (
                <p data-published="true" />
              ) : (
                <button
                  onClick={() =>
                    act(() =>
                      publishTransitReport(world, {
                        personId,
                        eventId: event.id,
                      }),
                    )
                  }
                >
                  Publish dated service report
                </button>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
