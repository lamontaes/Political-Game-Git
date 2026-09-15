import { recordTaxDraftIdentity } from "../simulation/legislation-tax-identity";
import { createWorkItem } from "../simulation/time-work";
import { introduceMeasure } from "../simulation/legislation";
import { money } from "../simulation/resources";
import { canonicalJson } from "../simulation/canonical-json";
import { recordWorldEvent, assertWorldIntegrity } from "../simulation/world";
import {
  attachTaxProposal,
  assessTaxBase,
  effectiveTaxPolicy,
  recordTaxBase,
  taxPowerEvidenceFor,
  TAX_MODEL_NOTE,
} from "../simulation/tax-policy";
import { resolveLegislativeFilingEntry } from "./legislative-filing-entry";
import type { EntityId, World } from "../simulation";
import type { TaxTerms } from "../simulation/tax-types";

/** The current office is re-resolved at the action boundary; a cached panel
 * context, staff title or selected place never grants introduction authority.
 * S opens the returned canonical measure ID using its shared assignment reader.
 */
export function fileTaxProposalFromOffice(
  world: World,
  input: { personId: EntityId; stableKey: string; terms: TaxTerms },
): { world: World; measureId: EntityId } {
  const entry = resolveLegislativeFilingEntry(world, input.personId);
  if (entry.kind !== "available") throw new Error(entry.reason);
  const power = taxPowerEvidenceFor(entry.seat.jurisdictionKey);
  if (!power)
    throw new Error(
      "No acquired tax-power contract supports this office and instrument.",
    );
  const prior = world.history.taxProposals?.find(
    (row) => row.stableKey === input.stableKey,
  );
  if (prior) {
    if (
      prior.sponsorPersonId !== input.personId ||
      prior.jurisdictionId !== entry.jurisdictionId ||
      canonicalJson(prior.terms) !== canonicalJson(input.terms)
    )
      throw new Error("An existing tax proposal cannot be overwritten.");
    return { world, measureId: prior.measureId };
  }
  const sequence = (world.history.taxProposals ?? []).length + 1;
  let next = introduceMeasure(world, {
    stableKey: `${input.stableKey}:measure`,
    jurisdictionId: entry.jurisdictionId,
    rulePackId: entry.seat.legislativeRulePackId,
    designation: `${entry.seat.chamberKey === "senate" ? "SB" : "HB"} Tax ${sequence} (authored)`,
    shortTitle: `Authored tax on ${input.terms.baseLabel}`,
    summary: `Proposed tax terms for ${input.terms.publicPurpose}. ${TAX_MODEL_NOTE}`,
    origin: "member-introduction",
    originChamberKey: entry.seat.chamberKey,
    subjectClass: "revenue",
    sponsorPersonId: input.personId,
  });
  const measureId = next.history.legislativeMeasures!.at(-1)!.id;
  next = attachTaxProposal(next, {
    stableKey: input.stableKey,
    measureId,
    sponsorPersonId: input.personId,
    power,
    terms: input.terms,
  });
  next = recordTaxDraftIdentity(next, next.history.taxProposals!.at(-1)!.id);
  next = createWorkItem(next, {
    stableKey: `${input.stableKey}:work`,
    title: `Consider ${next.history.legislativeMeasures!.at(-1)!.designation}`,
    summary: `Filed tax proposal; no policy is effective and no receipt has occurred. ${TAX_MODEL_NOTE}`,
    jurisdictionId: entry.jurisdictionId,
    sourceEntityIds: [measureId, entry.seat.outcomeEventId],
    focus: {
      kind: "legislative-material",
      targetKey: input.stableKey,
      sourceEntityId: measureId,
    },
    effort: null,
    access: { kind: "office" },
    assignedPersonIds: [input.personId],
    playerRequirement: "decision",
    waitingOnPersonIds: [],
    blocker: null,
    scheduledActivityId: null,
  });
  assertWorldIntegrity(next);
  return { world: next, measureId };
}

/** An explicit personal occurrence uses the person's existing financial
 * position. The base is declared separately from their cash; it creates no
 * purchase, income or money. Only the scheduled tax transfer changes funds.
 */
export function declarePersonalTaxOccurrence(
  world: World,
  input: {
    personId: EntityId;
    stableKey: string;
    proposalId: EntityId;
    baseKey: string;
    amountMinorUnits: number;
    assumptionNote: string;
  },
): World {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== input.personId
  )
    throw new Error(
      "Only the current character may declare this personal occurrence.",
    );
  const proposal = world.history.taxProposals?.find(
    (row) => row.id === input.proposalId,
  );
  if (!proposal) throw new Error("No recorded tax proposal.");
  const active = effectiveTaxPolicy(
    world,
    proposal.jurisdictionId,
    proposal.terms.seriesKey,
    world.currentDate,
  );
  if (!active || active.proposalId !== proposal.id)
    throw new Error(
      "This tax version is not effective for a new occurrence today.",
    );
  const prior = world.history.taxBases?.find(
    (row) => row.stableKey === input.stableKey,
  );
  if (prior) {
    if (
      prior.payer.kind !== "person" ||
      prior.payer.personId !== input.personId ||
      prior.baseKey !== input.baseKey ||
      prior.amount.minorUnits !== input.amountMinorUnits ||
      prior.assumptionNote !== input.assumptionNote
    )
      throw new Error("An existing taxable occurrence cannot be overwritten.");
    return assessTaxBase(world, prior.id, proposal.terms.seriesKey);
  }
  let next = recordWorldEvent(world, {
    stableKey: `event:${input.stableKey}`,
    type: "tax.declared-occurrence",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: proposal.jurisdictionId,
    involvedEntityIds: [input.personId],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["tax"],
    summary: `The character explicitly declared one fictional taxable occurrence. ${input.assumptionNote} ${TAX_MODEL_NOTE}`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: "Declare a modeled taxable occurrence.",
      motivation: null,
      immediateReaction: null,
    },
  });
  next = recordTaxBase(next, {
    stableKey: input.stableKey,
    jurisdictionId: proposal.jurisdictionId,
    payer: { kind: "person", personId: input.personId },
    baseKey: input.baseKey,
    occurredAt: world.currentDate,
    amount: money(input.amountMinorUnits, proposal.terms.currency),
    assumptionNote: input.assumptionNote,
    sourceEventId: next.history.events.at(-1)!.id,
  });
  return assessTaxBase(
    next,
    next.history.taxBases!.at(-1)!.id,
    proposal.terms.seriesKey,
  );
}

/** Public readers see only actual published general receipts. No payer/base
 * or campaign balance is exposed, and policy enactment is never revenue.
 */
export function readPublicTaxReceipts(world: World, jurisdictionId: EntityId) {
  return (world.history.taxCollections ?? [])
    .filter(
      (row) =>
        row.status === "collected" &&
        world.history.events.some(
          (event) =>
            event.id === row.outcomeEventId &&
            event.visibility === "public" &&
            event.jurisdictionId === jurisdictionId,
        ),
    )
    .map((row) => {
      const assessment = world.history.taxAssessments!.find(
        (item) => item.id === row.assessmentId,
      )!;
      const policy = world.history.taxPolicies!.find(
        (item) => item.id === assessment.policyId,
      )!;
      const proposal = world.history.taxProposals!.find(
        (item) => item.id === policy.proposalId,
      )!;
      return {
        date: row.recordedAt,
        measureId: proposal.measureId,
        publicOrganizationId: proposal.publicOrganizationId,
        amount: row.transferredAmount,
        sourceEventId: row.outcomeEventId,
      };
    });
}
