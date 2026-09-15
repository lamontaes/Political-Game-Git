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
import { TRANSIT_SERVICE_CHOICES } from "../simulation/legislation-transit-families";
import type { EntityId, World, WorldMetricValue } from "../simulation/types";

function serviceUnits(value: WorldMetricValue | null) {
  if (!value || value.kind !== "quantity")
    return "No delivered service recorded";
  const q = value.quantity;
  return `${q.denominator === 1 ? q.numerator : `${q.numerator}/${q.denominator}`} vehicle-service hours`;
}
/** Feature-local Politics leaf. The canonical World remains owned by PlayerGame. */
export function TransitWorkspace({
  world,
  personId,
  onWorldChange,
  onOpenBill,
  onContinue,
}: {
  readonly world: World;
  readonly personId: EntityId;
  readonly onWorldChange: (world: World) => void;
  readonly onOpenBill: (docketKey: string) => void;
  readonly onContinue: (days: number) => void;
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
      {view.bills.map(({ bill, funding, cashSnapshot, requested, periods }) => (
        <article key={bill.measureId} className="pg-personal-section">
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
              . Available through {funding.mandate.endsAt}. Cash is checked at
              settlement.
            </p>
          )}
          {funding.kind === "available" && (
            <TransitCashSummary snapshot={cashSnapshot} />
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
            <ol>
              {periods.map((p) => (
                <li key={p.due.id}>
                  <p>
                    Period ending {p.due.dueAt} · {p.state.status}
                  </p>
                  <p>
                    Contract units if paid: {serviceUnits(p.forecast)}.
                    Delivered: {serviceUnits(p.delivered)}.
                  </p>
                  {p.state.context && <p>{p.state.context}</p>}
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
        </article>
      ))}
      <div className="pg-personal-section">
        <p>
          Continue one day on the existing clock. Other commitments may stop
          time before a service period ends.
        </p>
        <button onClick={() => onContinue(1)}>Continue one day</button>
      </div>
      {view.reports.length > 0 && (
        <div>
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
