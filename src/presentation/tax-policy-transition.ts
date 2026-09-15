import { addDays } from "../simulation/dates";
import { currentMeasureProvisions } from "../simulation/legislative-politics";
import { adoptEnactedTaxPolicy, taxLevyText } from "../simulation/tax-policy";
import type { World, EntityId } from "../simulation";

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
  const effectiveAt = addDays(enactment.resolvedAt, 90);
  if (enactment.effectiveAt !== null && enactment.effectiveAt !== effectiveAt)
    return {
      kind: "unavailable",
      reason:
        "This route supports only the filed ninety-day default effective date.",
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

/** Called only after an actual legislative action. Unsupported amended text
 * remains enacted canonical law; it does not roll back the action or silently
 * install the old tax effect. Reads and reloads never activate policies.
 */
export function recordNewlyEnactedTaxPolicies(
  before: World,
  after: World,
): World {
  const previous = new Set(
    (before.history.legislativeEnactments ?? []).map((row) => row.id),
  );
  let next = after;
  for (const enactment of after.history.legislativeEnactments ?? []) {
    if (previous.has(enactment.id) || enactment.outcome !== "enacted") continue;
    const proposal = after.history.taxProposals?.find(
      (row) => row.measureId === enactment.measureId,
    );
    if (proposal && taxActivationReadiness(next, proposal.id).kind === "ready")
      next = adoptEnactedTaxPolicy(next, proposal.id);
  }
  return next;
}
