import { useState } from "react";
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

function serviceUnits(value: WorldMetricValue | null) {
  if (!value || value.kind !== "quantity")
    return "No delivered service recorded";
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
/** Plain meanings for the canonical due states; unknown states show as recorded. */
const PERIOD_STATE: Readonly<Record<string, string>> = {
  scheduled: "Scheduled. Payment and delivery are checked on the due date.",
  resolved: "Delivered and paid.",
  blocked: "Not delivered. Nothing was paid.",
  cancelled: "Cancelled before delivery. Nothing was paid.",
};

/** Feature-local Politics leaf. The canonical World remains owned by PlayerGame. */
export function TransitWorkspace({
  world,
  personId,
  onWorldChange,
  onOpenBill,
  onContinue,
  onOpenTaxWork,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenBill: (docketKey: string) => void;
  readonly onContinue: (days: number) => void;
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
      <p className="game-note">
        A service appropriation is a proposed fictional law for an explicitly
        authored standing program. It supplies spending authority after
        enactment and its effective date; payments require collected public
        cash. The authored contract price is $100 per additional vehicle-service
        hour. Reports describe contract service, without inferring ridership or
        effectiveness.
      </p>
      {view.office.kind === "unavailable" ? (
        <p role="status">{view.office.reason}</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!window) {
              setFeedback("Choose the service period before filing.");
              return;
            }
            if (!/^\d+(?:\.\d{1,2})?$/.test(amount)) {
              setFeedback(
                "Enter dollars and cents without an exponent or extra decimal places.",
              );
              return;
            }
            const [dollars, decimal = ""] = amount.split(".");
            const cents =
              Number(dollars) * 100 + Number(decimal.padEnd(2, "0"));
            if (!Number.isSafeInteger(cents)) {
              setFeedback(
                "Enter an exact dollar amount with no more than two decimal places.",
              );
              return;
            }
            try {
              const filed = fileTransitAppropriation(world, {
                personId,
                amountMinorUnits: cents,
                serviceWindow: window,
              });
              onWorldChange(filed.world);
              setFeedback(
                `${filed.bill.designation} was filed. Continue through its ordinary legislative steps.`,
              );
            } catch (error) {
              setFeedback((error as Error).message);
            }
          }}
        >
          <h3>Propose added service</h3>
          <label>
            Total amount provided (USD)
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
          <fieldset>
            <legend>Service period</legend>
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
          <button type="submit">File transit appropriation</button>
        </form>
      )}
      {feedback && <p role="status">{feedback}</p>}
      {view.bills.length === 0 && (
        <p>No transit service appropriation has been filed in this life.</p>
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
                <p role="status">{funding.reason}</p>
              ) : (
                <p>
                  Operative appropriation:{" "}
                  {(funding.mandate.amount.minorUnits / 100).toLocaleString(
                    "en-US",
                    { style: "currency", currency: "USD" },
                  )}
                  . Available through {funding.mandate.endsAt}. Cash is checked
                  at settlement.
                </p>
              )}
              {funding.kind === "available" && (
                <TransitCashSummary snapshot={cashSnapshot} />
              )}
              {cashShort && (
                <div className="transit-cash-guidance" role="note">
                  <p>
                    Public cash comes only from taxes that have actually been
                    collected. A request made now would be refused when its
                    first period comes due.
                  </p>
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
                        Period ending {p.due.dueAt}:{" "}
                        {PERIOD_STATE[p.state.status] ?? p.state.status}
                      </p>
                      <p>
                        Contract units if paid: {serviceUnits(p.forecast)}.
                        Delivered: {serviceUnits(p.delivered)}.
                      </p>
                      {p.state.status !== "resolved" && p.state.context && (
                        <p>{p.state.context}</p>
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
                  aria-label="What this appropriation has done"
                >
                  <h4>What changed</h4>
                  <p>
                    {paidMinorUnits > 0
                      ? `${serviceHoursText(paidMinorUnits)} of added ${funding.kind === "available" ? funding.mandate.serviceWindow : ""} contract service delivered, paid with ${usd(paidMinorUnits)} from the public account.`
                      : "No service has been delivered or paid under this appropriation."}
                  </p>
                  <p>
                    Public account cash now:{" "}
                    {publicCashMinorUnits === null
                      ? "no recorded balance"
                      : usd(publicCashMinorUnits)}
                    .
                  </p>
                  <p>
                    Not modeled: ridership, travel times, access or public
                    approval. This record does not claim them.
                  </p>
                </section>
              )}
            </article>
          );
        },
      )}
      <div className="pg-personal-section">
        <p>
          Continue on the existing clock. Other commitments may stop time before
          a service period ends.
        </p>
        <div className="transit-continue">
          <button onClick={() => onContinue(1)}>Continue one day</button>
          <button onClick={() => onContinue(7)}>Continue one week</button>
        </div>
      </div>
      {view.reports.length > 0 && (
        <div className="transit-reports">
          <h3>Contract records and reports</h3>
          {view.reports.map(({ event, published }) => (
            <article key={event.id}>
              <p>
                {event.occurredAt}: {event.summary}
              </p>
              {published ? (
                <p>Published in Civic Ledger.</p>
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
