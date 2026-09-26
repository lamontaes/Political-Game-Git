import "./tax-work.css";
import { useEffect, useRef, useState } from "react";
import {
  effectiveTaxPolicy,
  publicTaxAccountForJurisdiction,
  taxRatePercentText,
} from "../simulation/tax-policy";
import { resourcePositionAt } from "../simulation/resource-queries";
import { taxActivationReadiness } from "../simulation/tax-policy-activation";
import { resolveLegislativeAssignmentForMeasure } from "../presentation/legislation-world";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import {
  fileStateWageTaxRateFromOffice,
  stateWageTaxForOffice,
} from "../presentation/tax-work";
import { proseDate } from "../presentation/prose-dates";
import { LegislationWorkspace } from "./LegislationWorkspace";
import { RecordedSittingAdmission } from "./RecordedSittingAdmission";
import type { EntityId, World } from "../simulation";

export function exactDollarInput(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error(
      "Enter a nonnegative amount with at most two decimal places.",
    );
  const [whole, fraction = ""] = value.trim().split(".");
  const result = BigInt(whole!) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (result > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error("The amount is too large for exact cents.");
  return Number(result);
}
const display = (amount: number) =>
  `$${Math.floor(amount / 100).toLocaleString("en-US")}.${String(amount % 100).padStart(2, "0")}`;

/** Feature-local mount for A's ordinary Work surface. S's shared measure reader
 * receives onOpenMeasure; this component owns neither legislation nor storage.
 * A filed tax is not a docket bill, so its procedure is followed here through
 * the same assignment reader and legislative workspace the Docket uses.
 */
export function TaxWorkWorkspace({
  world,
  personId,
  onWorldChange,
  onOpenMeasure,
}: {
  world: World;
  personId: EntityId;
  onWorldChange: (world: World) => void;
  onOpenMeasure: (measureId: EntityId) => void;
}) {
  const [rate, setRate] = useState("");
  const [following, setFollowing] = useState<EntityId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A filed or already-pending proposal is where the player's next step is, so
  // it is brought into view and focused instead of appearing out of sight.
  const [revealFollowed, setRevealFollowed] = useState(false);
  const followedRef = useRef<HTMLElement | null>(null);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  // Declared before the reveal so a filing ends on its proposal, while any
  // other refusal or status is never left above the scrolled form.
  // Every action outcome counts, so a repeated identical refusal still shows.
  const [feedbackSeq, setFeedbackSeq] = useState(0);
  useEffect(() => {
    if (feedbackSeq === 0) return;
    const frame = requestAnimationFrame(() =>
      feedbackRef.current?.scrollIntoView({ block: "nearest" }),
    );
    return () => cancelAnimationFrame(frame);
  }, [feedbackSeq]);
  useEffect(() => {
    if (!revealFollowed) return;
    // Scheduled after the feedback frame, so a filing ends on its proposal.
    const frame = requestAnimationFrame(() => {
      followedRef.current?.scrollIntoView({ block: "start" });
      followedRef.current?.focus();
      setRevealFollowed(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [revealFollowed, following]);
  // Every state's legislature holds the same tax law route: the state's own
  // tax on wages, whose rate a bill may change.
  const office = stateWageTaxForOffice(world, personId);
  // The normal legislative action boundary: newly enacted supported tax terms
  // become a policy version here, exactly as on the Docket route.
  const onLegislativeChange = (next: World) =>
    onWorldChange(publishLegislativeTransition(world, next));
  function act(action: () => void) {
    try {
      action();
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
    setFeedbackSeq((count) => count + 1);
  }
  function rateBasisPoints(): number {
    return exactDollarInput(rate);
  }
  function file() {
    act(() => {
      const basisPoints = rateBasisPoints();
      // Each filing mints a new canonical proposal, so an identical pending
      // rate by the same sponsor is refused here rather than filed twice.
      const pending = (world.history.taxProposals ?? []).find(
        (row) =>
          row.sponsorPersonId === personId &&
          row.terms.rateNumerator === basisPoints &&
          row.terms.rateDenominator === 10_000 &&
          !world.history.legislativeEnactments?.some(
            (enactment) => enactment.measureId === row.measureId,
          ),
      );
      if (pending) {
        setFollowing(pending.id);
        setRevealFollowed(true);
        setMessage(null);
        throw new Error(
          "An identical tax bill is already filed and not yet law. Its procedure is shown below.",
        );
      }
      const result = fileStateWageTaxRateFromOffice(world, {
        personId,
        stableKey: `tax-proposal:ordinary-${world.history.nextSequence}`,
        rateBasisPoints: basisPoints,
      });
      onWorldChange(result.world);
      setFollowing(result.world.history.taxProposals!.at(-1)!.id);
      setRevealFollowed(true);
      setMessage(
        "Tax bill filed. It must pass the legislature and the governor before the new rate takes effect.",
      );
    });
  }
  function preview() {
    act(() => {
      const basisPoints = rateBasisPoints();
      const tax = Math.round((100_000 * basisPoints) / 10_000);
      setMessage(
        `At this rate, $1,000.00 of wages would have ${display(tax)} withheld for the state. Nothing is filed yet.`,
      );
    });
  }
  const proposals = (world.history.taxProposals ?? []).filter(
    (row) =>
      row.sponsorPersonId === personId ||
      world.history.taxPolicies?.some((policy) => policy.proposalId === row.id),
  );
  return (
    <section
      className="tax-work"
      data-testid="tax-work"
      data-history-sequence={world.history.nextSequence}
    >
      <h3>Tax work and receipts</h3>
      <p>
        Your state taxes the wages it pays its residents. Employers withhold the
        tax from each paycheck and it goes to the state's public account. A tax
        bill changes the rate once it becomes law and takes effect.
      </p>
      <div ref={feedbackRef} className="tax-work-feedback">
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </div>
      {office.kind === "available" ? (
        <details>
          <summary>Propose a new state tax rate on wages</summary>
          <p data-testid="tax-rate-in-force">
            Employers in this state withhold{" "}
            {taxRatePercentText(office.inForce)} of each resident's wages for
            the state today.
          </p>
          <fieldset className="tax-work-step">
            <legend>The rate your bill would set</legend>
            <label>
              Rate, percent{" "}
              <input
                aria-label="Tax rate percent"
                inputMode="decimal"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </label>
            <button type="button" onClick={preview}>
              Preview tax
            </button>
            <button type="button" onClick={file}>
              File tax bill
            </button>
          </fieldset>
        </details>
      ) : (
        <p data-testid="tax-proposal-withheld">{office.reason}</p>
      )}
      {proposals.map((proposal) => {
        const policy = world.history.taxPolicies?.find(
          (row) => row.proposalId === proposal.id,
        );
        const active = effectiveTaxPolicy(
          world,
          proposal.jurisdictionId,
          proposal.terms.seriesKey,
          world.currentDate,
        );
        const account = publicTaxAccountForJurisdiction(
          world,
          proposal.jurisdictionId,
        );
        const publicCash = account
          ? resourcePositionAt(
              world,
              { kind: "organization", organizationId: account.organizationId },
              proposal.terms.currency,
            )?.liquidBalance.minorUnits
          : undefined;
        const assignment =
          following === proposal.id
            ? resolveLegislativeAssignmentForMeasure(world, {
                measureId: proposal.measureId,
                playerPersonId: personId,
              })
            : null;
        return (
          <article
            key={proposal.id}
            data-testid="tax-proposal"
            ref={following === proposal.id ? followedRef : undefined}
            tabIndex={-1}
          >
            <h4>
              Tax on {proposal.terms.baseLabel} at{" "}
              {taxRatePercentText(proposal.terms)}
            </h4>
            <p>
              {policy
                ? `Law; the rate took or takes effect on ${proseDate(policy.effectiveAt)}${active?.id === policy.id ? ", and it is the rate withheld from pay today." : ", and it is not the rate in force today."}`
                : taxActivationReadiness(world, proposal.id).reason}
            </p>
            <div className="tax-work-actions">
              <button
                type="button"
                data-testid="tax-follow-procedure"
                onClick={() =>
                  setFollowing(following === proposal.id ? null : proposal.id)
                }
              >
                {following === proposal.id
                  ? "Close procedure"
                  : "Follow this tax bill through the legislature"}
              </button>
              <button
                type="button"
                onClick={() => onOpenMeasure(proposal.measureId)}
              >
                Open tax measure
              </button>
            </div>
            {assignment ? (
              <div className="tax-work-procedure">
                {assignment.kind === "available" &&
                !assignment.assignment.procedure.recordedSittingEventId ? (
                  <RecordedSittingAdmission
                    world={world}
                    measureId={proposal.measureId}
                    playerPersonId={personId}
                    name={`tax-recorded-ballot-${proposal.id}`}
                    testIdPrefix="tax"
                    onWorldChange={onLegislativeChange}
                    onAdmitted={() => setError(null)}
                    onError={(refusal) => {
                      setError(refusal);
                      setFeedbackSeq((count) => count + 1);
                    }}
                  />
                ) : null}
                {assignment.kind === "available" ? (
                  <LegislationWorkspace
                    world={world}
                    assignment={assignment.assignment}
                    onWorldChange={onLegislativeChange}
                  />
                ) : (
                  <p role="status">{assignment.reason}</p>
                )}
              </div>
            ) : null}
            <p data-testid="tax-public-cash">
              Public account cash now:{" "}
              {publicCash === undefined
                ? "no recorded balance"
                : display(publicCash)}
              .
            </p>
          </article>
        );
      })}
    </section>
  );
}
