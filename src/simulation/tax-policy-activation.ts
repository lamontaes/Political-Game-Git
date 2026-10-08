import type { ActStatedTiming } from "./legislative-effective-date";
import { readFiledTaxContentIdentity } from "./legislation-tax-identity";
import { draftLineageForMeasure } from "./legislation-draft-lineage";
import { currentMeasureProvisions } from "./legislative-politics";
import { levyEffectiveDate, taxLevyText, taxStatedTiming } from "./tax-policy";
import type { TaxProposalRecord } from "./tax-types";
import type { World, EntityId } from "./types";

/**
 * Why an enacted act no longer carries the levy filed with it, or null where
 * it carries it unchanged. A pinned typed draft loses its supported effect if
 * any adopted section differs, including an added section beside an
 * unchanged levy; a legacy proposal without a compiler identity keeps its
 * levy-level check.
 */
function filedLevyChanged(
  world: World,
  proposal: TaxProposalRecord,
): string | null {
  if (draftLineageForMeasure(world, proposal.measureId)) {
    const identity = readFiledTaxContentIdentity(world, proposal.measureId);
    if (identity.kind === "unavailable") return identity.reason;
  }
  const provision = currentMeasureProvisions(world, proposal.measureId).find(
    (row) => row.provisionKey === "tax-levy",
  );
  return provision?.id !== proposal.levyProvisionId ||
    provision.text !== taxLevyText(proposal.terms)
    ? "Enacted text changed; supported typed tax effects have not been authored for the revision."
    : null;
}

/**
 * The timing an act states for itself through the levy filed with it, read by
 * the enactment writer on every route (the player's, the institution's and a
 * council's). An act that no longer carries its filed levy unchanged states
 * none and keeps its body's own date; no route may adopt the old proposal's
 * timing from changed text.
 */
export function filedLevyTiming(
  world: World,
  measureId: EntityId,
): ActStatedTiming | null {
  const proposal = world.history.taxProposals?.find(
    (row) => row.measureId === measureId,
  );
  return proposal && !filedLevyChanged(world, proposal)
    ? taxStatedTiming(proposal.terms)
    : null;
}

export function taxActivationReadiness(
  world: World,
  proposalId: EntityId,
): { kind: "recorded" | "ready" | "unavailable"; reason: string } {
  const proposal = world.history.taxProposals?.find(
    (row) => row.id === proposalId,
  );
  if (!proposal)
    return { kind: "unavailable", reason: "No tax proposal is recorded." };
  if (world.history.taxPolicies?.some((row) => row.proposalId === proposalId))
    return {
      kind: "recorded",
      reason: "An enacted policy version is recorded; collection is separate.",
    };
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.measureId === proposal.measureId && row.outcome === "enacted",
  );
  if (!enactment)
    return {
      kind: "unavailable",
      reason: "This proposal has not completed enactment.",
    };
  const changed = filedLevyChanged(world, proposal);
  if (changed) return { kind: "unavailable", reason: changed };
  const effectiveAt = levyEffectiveDate(enactment, proposal.terms);
  if (
    proposal.terms.legalBaselineAssumption !== "authored-state-game-profile" &&
    enactment.effectiveAt !== null &&
    enactment.effectiveAt !== effectiveAt
  )
    return {
      kind: "unavailable",
      reason:
        "The enacted date does not match this filed tax provision's effective-date delay.",
    };
  if (effectiveAt < world.currentDate)
    return {
      kind: "unavailable",
      reason:
        "Late activation would backdate a new policy; no collection is manufactured.",
    };
  const prior = (world.history.taxPolicies ?? [])
    .filter((row) => {
      const other = world.history.taxProposals?.find(
        (item) => item.id === row.proposalId,
      );
      return (
        other?.jurisdictionId === proposal.jurisdictionId &&
        other.terms.seriesKey === proposal.terms.seriesKey
      );
    })
    .at(-1);
  if (prior && prior.effectiveAt >= effectiveAt)
    return {
      kind: "unavailable",
      reason: "A replacement policy must follow the previous effective date.",
    };
  return {
    kind: "ready",
    reason: "Enacted adopted tax terms support a prospective policy version.",
  };
}
