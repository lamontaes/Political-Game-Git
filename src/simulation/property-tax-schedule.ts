import { scheduleFutureDueItem } from "./future-transitions";
import type { TaxProposalRecord } from "./tax-types";
import type { EntityId, IsoDate, World } from "./types";

export const PROPERTY_ASSESSMENT_TRANSITION_KEY =
  "tax:property-assessment-day" as const;
export const PROPERTY_ASSESSMENT_PREFIX = "property-assessment:" as const;

/** One assessment day for a local property tax, on its effective date and then
 * once a year while the law stays in force. The day does the work; nothing
 * scans the world on any other day. */
export function schedulePropertyAssessmentDay(
  world: World,
  proposalId: EntityId,
  dueAt: IsoDate,
  jurisdictionId: EntityId,
): World {
  const stableKey = `${PROPERTY_ASSESSMENT_PREFIX}${proposalId}:${dueAt}`;
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt,
    transitionKey: PROPERTY_ASSESSMENT_TRANSITION_KEY,
    entityIds: [proposalId],
    jurisdictionId,
    provenance: { kind: "simulated", sourceEntityIds: [proposalId] },
  });
}

/** A typed property tax this module assesses: a local government's or a state's. */
export function isTypedPropertyTax(proposal: TaxProposalRecord): boolean {
  return (
    proposal.terms.instrument === "property" &&
    (proposal.publicGovernmentIdentity?.kind === "local-government" ||
      proposal.power?.level === "STATE")
  );
}
