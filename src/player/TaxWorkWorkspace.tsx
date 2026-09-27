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
import {
  draftStateWageTaxFiscalNote,
  filedStateWageTaxFiscalNote,
  type TaxWorkFiscalNote,
} from "../presentation/tax-work-fiscal-note";
import {
  STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS,
  stateWageTaxTerms,
} from "../simulation/world-setup/state-tax-service-profiles";
import { proseDate } from "../presentation/prose-dates";
import { LegislationWorkspace } from "./LegislationWorkspace";
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

function TaxFiscalNoteView({ note }: { note: TaxWorkFiscalNote }) {
  const section = note.fiscal.parts[0]!;
  return (
    <aside
      data-testid="tax-fiscal-note"
      data-fiscal-status={note.fiscal.status}
    >
      <h5>Fiscal note — {note.fiscal.designation}</h5>
      <p>
        Section {section.sectionNumber}, {section.heading}:{" "}
        {note.fiscal.status === "draft"
          ? "the proposed bill would set"
          : "the saved levy states"}{" "}
        a rate of {note.rateLabel} on {note.baseLabel}.
      </p>
      {note.lawfulZero ? (
        <p>
          {note.fiscal.status === "draft"
            ? "If enacted at 0%, this bill would assess $0 on each covered wage amount."
            : "At 0%, this levy assesses $0 on each covered wage amount once it is operative."}
        </p>
      ) : null}
      <p>
        Future taxable wage base: UNKNOWN. No measured future taxable wage
        series is available to this note.
      </p>
      <p>
        Aggregate cash change from current law: UNKNOWN. This note has no future
        taxable wages or comparable receipts baseline.
      </p>
      <p>
        Operative date:{" "}
        {note.fiscal.operativeAt
          ? proseDate(note.fiscal.operativeAt)
          : "UNKNOWN until an operative tax policy is recorded"}
        .
      </p>
    </aside>
  );
}

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
  const [previewNote, setPreviewNote] = useState<TaxWorkFiscalNote | null>(
    null,
  );
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
      setPreviewNote(null);
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
      if (office.kind !== "available") throw new Error(office.reason);
      if (
        basisPoints < 0 ||
        basisPoints > STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS
      )
        throw new Error(
          `A state tax rate must be between 0% and ${STATE_WAGE_TAX_BILL_CEILING_BASIS_POINTS / 100}%.`,
        );
      const stateName =
        world.jurisdictions[office.profile.jurisdictionId]?.name ??
        office.profile.jurisdictionKey;
      setPreviewNote(
        draftStateWageTaxFiscalNote(
          stateWageTaxTerms(
            office.profile.jurisdictionKey,
            stateName,
            basisPoints,
          ),
        ),
      );
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
        Your jurisdiction taxes residents&rsquo; wages. Employers withhold the
        tax from each paycheck and it goes to the public account. A tax bill
        changes the rate once it becomes law and takes effect.
      </p>
      <div ref={feedbackRef} className="tax-work-feedback">
        {error ? <p role="alert">{error}</p> : null}
        {message ? <p role="status">{message}</p> : null}
      </div>
      {office.kind === "available" ? (
        <details>
          <summary>Propose a new state tax rate on wages</summary>
          <p data-testid="tax-rate-in-force">
            Employers here withhold {taxRatePercentText(office.inForce)} of each
            resident's wages for the state today.
          </p>
          <fieldset className="tax-work-step">
            <legend>The rate your bill would set</legend>
            <label>
              Rate, percent{" "}
              <input
                aria-label="Tax rate percent"
                inputMode="decimal"
                value={rate}
                onChange={(event) => {
                  setRate(event.target.value);
                  setPreviewNote(null);
                }}
              />
            </label>
            <button type="button" onClick={preview}>
              Preview tax
            </button>
            <button type="button" onClick={file}>
              File tax bill
            </button>
          </fieldset>
          {previewNote ? <TaxFiscalNoteView note={previewNote} /> : null}
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
        const fiscalNote = filedStateWageTaxFiscalNote(world, proposal);
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
            {fiscalNote.kind === "available" ? (
              <TaxFiscalNoteView note={fiscalNote.note} />
            ) : (
              <p data-testid="tax-fiscal-note-unavailable">
                Fiscal note unavailable: {fiscalNote.reason}
              </p>
            )}
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
