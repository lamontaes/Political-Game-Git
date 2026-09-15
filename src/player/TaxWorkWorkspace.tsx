import "./tax-work.css";
import { useState } from "react";
import {
  effectiveTaxPolicy,
  previewTax,
  taxPowerEvidenceFor,
} from "../simulation/tax-policy";
import { money } from "../simulation/resources";
import { resolveLegislativeFilingEntry } from "../presentation/legislative-filing-entry";
import { taxActivationReadiness } from "../presentation/tax-policy-transition";
import {
  declarePersonalTaxOccurrence,
  fileTaxProposalFromOffice,
  readPublicTaxReceipts,
} from "../presentation/tax-work";
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
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const entry = resolveLegislativeFilingEntry(world, personId);
  const power =
    entry.kind === "available"
      ? taxPowerEvidenceFor(entry.seat.jurisdictionKey)
      : null;
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
  }
  function file() {
    act(() => {
      const result = fileTaxProposalFromOffice(world, {
        personId,
        stableKey: `tax-proposal:ordinary-${world.history.nextSequence}`,
        terms: terms(),
      });
      onWorldChange(result.world);
      setMessage(
        "Tax proposal filed. It must complete the legislative and executive process before a policy can take effect.",
      );
      onOpenMeasure(result.measureId);
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
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <details>
        <summary>Prepare an authored tax proposal</summary>
        <p>
          {entry.kind === "available"
            ? power
              ? "Your current office has a sourced state tax-power baseline."
              : "This office has no supported tax-power contract."
            : entry.reason}
        </p>
        {power ? (
          <p>
            Legal wording acquired {power.asOf}.{" "}
            <a href={power.sourceUrl}>Alaska Constitution</a>. This proposal
            carries that wording forward as a game assumption; it does not
            verify future real law.
          </p>
        ) : null}
        <label>
          Tax base description{" "}
          <input
            aria-label="Tax base description"
            value={baseLabel}
            onChange={(event) => setBaseLabel(event.target.value)}
          />
        </label>
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
          Public purpose{" "}
          <input
            aria-label="Tax public purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
        </label>
        <label>
          Model assumptions{" "}
          <textarea
            aria-label="Tax model assumptions"
            value={assumptions}
            onChange={(event) => setAssumptions(event.target.value)}
          />
        </label>
        <p>
          This route uses the ninety-day default after enactment, exact half-up
          cent rounding and general public receipts. It models no dedication
          exception or early effective-date vote.
        </p>
        <button type="button" disabled={!power} onClick={file}>
          File tax proposal
        </button>
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
      </details>
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
        return (
          <article key={proposal.id}>
            <h4>{proposal.terms.baseLabel}</h4>
            <p>
              {policy
                ? `Enacted policy; effective ${policy.effectiveAt}${active?.id === policy.id ? ". Effective for new occurrences today." : ". Not the effective version today."}`
                : taxActivationReadiness(world, proposal.id).reason}
            </p>
            <button
              type="button"
              onClick={() => onOpenMeasure(proposal.measureId)}
            >
              Open tax measure
            </button>
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
          </article>
        );
      })}
    </section>
  );
}
