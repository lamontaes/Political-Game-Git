import "./tax-work.css";
import { useEffect, useRef, useState } from "react";
import { canonicalJson } from "../simulation/canonical-json";
import {
  effectiveTaxPolicy,
  previewTax,
  publicTaxAccountForJurisdiction,
  taxPowerEvidenceFor,
} from "../simulation/tax-policy";
import { money } from "../simulation/resources";
import { resourcePositionAt } from "../simulation/resource-queries";
import { resolveLegislativeFilingEntry } from "../presentation/legislative-filing-entry";
import { taxActivationReadiness } from "../presentation/tax-policy-transition";
import { resolveLegislativeAssignmentForMeasure } from "../presentation/legislation-world";
import { publishLegislativeTransition } from "../presentation/publish-legislative-transition";
import {
  declarePersonalTaxOccurrence,
  fileTaxProposalFromOffice,
  readPublicTaxReceipts,
} from "../presentation/tax-work";
import { LegislationWorkspace } from "./LegislationWorkspace";
import { RecordedSittingAdmission } from "./RecordedSittingAdmission";
import type { EntityId, World } from "../simulation";
import type { TaxTerms } from "../simulation/tax-types";

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
  `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")} USD`;

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
  const [baseLabel, setBaseLabel] = useState("");
  const [rate, setRate] = useState("");
  const [allowance, setAllowance] = useState("");
  const [lag, setLag] = useState("");
  const [purpose, setPurpose] = useState("");
  const [assumptions, setAssumptions] = useState("");
  const [exempt, setExempt] = useState(false);
  const [occurrence, setOccurrence] = useState("");
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
  const entry = resolveLegislativeFilingEntry(world, personId);
  const power =
    entry.kind === "available"
      ? taxPowerEvidenceFor(entry.seat.jurisdictionKey)
      : null;
  // The normal legislative action boundary: newly enacted supported tax terms
  // become a policy version here, exactly as on the Docket route.
  const onLegislativeChange = (next: World) =>
    onWorldChange(publishLegislativeTransition(world, next));
  function terms(): TaxTerms {
    return {
      seriesKey: "tax:authored-selective-excise",
      baseKey: "tax-base:declared-activity",
      baseLabel,
      rateNumerator: exactDollarInput(rate),
      rateDenominator: 10000,
      allowanceMinorUnits: exactDollarInput(allowance),
      currency: money(0, "USD").currency,
      collectionLagDays: /^\d+$/.test(lag) ? Number(lag) : NaN,
      exemptBaseKeys: exempt ? ["tax-base:declared-activity"] : [],
      publicPurpose: purpose,
      assumptionNote: assumptions,
      legalBaselineAssumption: "carry-forward-acquired-baseline-in-game",
    };
  }
  function act(action: () => void) {
    try {
      action();
      setError(null);
    } catch (caught) {
      setError((caught as Error).message);
    }
    setFeedbackSeq((count) => count + 1);
  }
  function file() {
    act(() => {
      const candidate = terms();
      // Each filing mints a new canonical proposal, so identical pending terms
      // by the same sponsor are refused here rather than filed twice.
      const pending = (world.history.taxProposals ?? []).find(
        (row) =>
          row.sponsorPersonId === personId &&
          canonicalJson(row.terms) === canonicalJson(candidate) &&
          !world.history.legislativeEnactments?.some(
            (enactment) => enactment.measureId === row.measureId,
          ),
      );
      if (pending) {
        setFollowing(pending.id);
        setRevealFollowed(true);
        setMessage(null);
        throw new Error(
          "An identical tax proposal is already filed and not yet enacted. Its procedure is shown below.",
        );
      }
      const result = fileTaxProposalFromOffice(world, {
        personId,
        stableKey: `tax-proposal:ordinary-${world.history.nextSequence}`,
        terms: candidate,
      });
      onWorldChange(result.world);
      setFollowing(result.world.history.taxProposals!.at(-1)!.id);
      setRevealFollowed(true);
      setMessage(
        "Tax proposal filed. It must complete the legislative and executive process before a policy can take effect.",
      );
    });
  }
  function preview() {
    act(() => {
      const result = previewTax(
        terms(),
        "tax-base:declared-activity",
        occurrence.trim() === ""
          ? null
          : money(exactDollarInput(occurrence), "USD"),
      );
      setMessage(
        result.status === "unavailable"
          ? result.reason
          : `Preview only: ${display(result.taxAmount.minorUnits)} on ${display(result.taxableAmount.minorUnits)} of taxable base. No funds moved.`,
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
        These are authored game taxes. Rates, bases, allowances and settlement
        timing are declared assumptions. A declared base creates no income or
        purchase money. Collection uses existing personal funds and the general
        public account; campaign funds are separate.
      </p>
      <div ref={feedbackRef} className="tax-work-feedback">
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </div>
      {power ? (
        /*
         * One readable flow over the same filing mechanics: what the tax is
         * for, then the terms (with a preview), then the commitment to file.
         */
        <details>
          <summary>Prepare an authored tax proposal</summary>
          <p>Your current office has a sourced state tax-power baseline.</p>
          <fieldset className="tax-work-step">
            <legend>1. Objective: what the tax is for</legend>
            <label>
              Public purpose{" "}
              <input
                aria-label="Tax public purpose"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
            </label>
            <label>
              Tax base description{" "}
              <input
                aria-label="Tax base description"
                value={baseLabel}
                onChange={(event) => setBaseLabel(event.target.value)}
              />
            </label>
          </fieldset>
          <fieldset className="tax-work-step">
            <legend>2. Proposal: the terms</legend>
            <label>
              Rate, percent{" "}
              <input
                aria-label="Tax rate percent"
                inputMode="decimal"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </label>
            <label>
              Allowance per occurrence, USD{" "}
              <input
                aria-label="Tax allowance USD"
                inputMode="decimal"
                value={allowance}
                onChange={(event) => setAllowance(event.target.value)}
              />
            </label>
            <label>
              Settlement lag, days{" "}
              <input
                aria-label="Tax settlement lag days"
                inputMode="numeric"
                value={lag}
                onChange={(event) => setLag(event.target.value)}
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={exempt}
                onChange={(event) => setExempt(event.target.checked)}
              />
              Exempt this declared base
            </label>
            <label>
              Model assumptions{" "}
              <textarea
                aria-label="Tax model assumptions"
                value={assumptions}
                onChange={(event) => setAssumptions(event.target.value)}
              />
            </label>
            <label>
              Declared occurrence base, USD{" "}
              <input
                aria-label="Declared occurrence base USD"
                inputMode="decimal"
                value={occurrence}
                onChange={(event) => setOccurrence(event.target.value)}
              />
            </label>
            <button type="button" onClick={preview}>
              Preview tax
            </button>
          </fieldset>
          <fieldset className="tax-work-step">
            <legend>3. Commitment: file it</legend>
            <p>
              This proposal is written against the taxing power as this game
              records it for Alaska.
            </p>
            <p>
              This route uses the ninety-day default after enactment, exact
              half-up cent rounding and general public receipts. It models no
              dedication exception or early effective-date vote.
            </p>
            <button type="button" onClick={file}>
              File tax proposal
            </button>
          </fieldset>
        </details>
      ) : (
        <p data-testid="tax-proposal-withheld">
          {entry.kind === "available"
            ? "This office has no supported tax-power contract, so it cannot propose a tax."
            : entry.reason}
        </p>
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
        const assessments = (world.history.taxAssessments ?? []).filter(
          (row) =>
            world.history.taxBases?.some(
              (base) =>
                base.id === row.baseId &&
                base.payer.kind === "person" &&
                base.payer.personId === personId,
            ) && row.policyId === policy?.id,
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
            <h4>{proposal.terms.baseLabel}</h4>
            <p>
              {policy
                ? `Enacted policy; effective ${policy.effectiveAt}${active?.id === policy.id ? ". Effective for new occurrences today." : ". Not the effective version today."}`
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
            {active?.id === policy?.id && policy ? (
              <>
                <label>
                  Occurrence base, USD{" "}
                  <input
                    aria-label={`Occurrence base USD for ${proposal.terms.baseLabel}`}
                    value={occurrence}
                    inputMode="decimal"
                    onChange={(event) => setOccurrence(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    act(() => {
                      const next = declarePersonalTaxOccurrence(world, {
                        personId,
                        stableKey: `tax-occurrence:ordinary-${world.history.nextSequence}`,
                        proposalId: proposal.id,
                        baseKey: proposal.terms.baseKey,
                        amountMinorUnits: exactDollarInput(occurrence),
                        assumptionNote:
                          "Explicitly declared fictional taxable occurrence; no underlying purchase, income or observed tax return is inferred.",
                      });
                      onWorldChange(next);
                      setMessage(
                        "Assessment recorded. Settlement occurs once through the calendar on its due date.",
                      );
                    })
                  }
                >
                  Declare personal occurrence
                </button>
              </>
            ) : null}
            {assessments.map((assessment) => {
              const collection = world.history.taxCollections?.find(
                (row) => row.assessmentId === assessment.id,
              );
              return (
                <p key={assessment.id}>
                  Assessment: {display(assessment.taxAmount.minorUnits)}, due{" "}
                  {assessment.dueAt}.{" "}
                  {collection
                    ? `${collection.status}: ${display(collection.transferredAmount.minorUnits)} transferred${collection.reason ? ` (${collection.reason})` : ""}.`
                    : "Pending; no collection recorded."}
                </p>
              );
            })}
            <p>
              Recorded general receipts under this jurisdiction:{" "}
              {readPublicTaxReceipts(world, proposal.jurisdictionId).length}{" "}
              settlement(s). Enactment and previews are excluded.
            </p>
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
