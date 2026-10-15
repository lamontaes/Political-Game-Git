import { resolveLegislativeEffectiveDate } from "./legislative-effective-date";
import { legislativeRulePackForWorld } from "./legislative-procedure-world";
import { readFiledTaxContentIdentity } from "./legislation-tax-identity";
import { draftLineageForMeasure } from "./legislation-draft-lineage";
import { currentMeasureProvisions } from "./legislative-politics";
import { taxLevyText, taxPolicyEffectiveDate } from "./tax-policy";
import type { World, EntityId, IsoDate } from "./types";

/** An unchanged typed levy states its own date in the filed act. Both the
 * player and institutional enactment routes must record that date before tax
 * activation checks it. An amended or untyped act keeps its ordinary default;
 * neither route may adopt the old proposal's tax effect from changed text.
 */
export function typedTaxEnactmentDate(
  world: World,
  measureId: EntityId,
): IsoDate | null {
  if (readFiledTaxContentIdentity(world, measureId).kind !== "available")
    return null;
  const proposal = world.history.taxProposals?.find(
    (row) => row.measureId === measureId,
  );
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (!proposal || !measure) return null;
  const defaultDate = resolveLegislativeEffectiveDate(
    legislativeRulePackForWorld(world, measure.rulePackId),
    world.currentDate,
  );
  // This one date function already implements the filed source delay and the
  // fictional profile's later-of rule. No timing assumption is duplicated.
  return taxPolicyEffectiveDate(
    { resolvedAt: world.currentDate, effectiveAt: defaultDate.effectiveAt },
    proposal.terms,
  );
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
  // A pinned typed draft loses its supported effect if any adopted section
  // differs, including an added section beside an unchanged levy. Legacy tax
  // saves without a compiler identity keep their existing levy-level check.
  if (draftLineageForMeasure(world, proposal.measureId)) {
    const identity = readFiledTaxContentIdentity(world, proposal.measureId);
    if (identity.kind === "unavailable") return identity;
  }
  const provision = currentMeasureProvisions(world, proposal.measureId).find(
    (row) => row.provisionKey === "tax-levy",
  );
  if (
    provision?.id !== proposal.levyProvisionId ||
    provision.text !== taxLevyText(proposal.terms)
  )
    return {
      kind: "unavailable",
      reason:
        "Enacted text changed; supported typed tax effects have not been authored for the revision.",
    };
  const effectiveAt = taxPolicyEffectiveDate(enactment, proposal.terms);
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
