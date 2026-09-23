import { enterLegislativeTermLate } from "./legislative-office-terms";
import { settleStateExecutiveQualification } from "./nationwide-world/state-executive-terms";
import { workRelationshipHistoryForPerson } from "./life-queries";
import type { EntityId, World } from "./types";

/**
 * Seats a winner whose term a since-fixed defect kept them out of, and settles
 * an executive term planned under the old Qualify step. Idempotent and a no-op
 * for anybody with nothing owed, so it is safe to run whenever a life is
 * opened, which is how a save already stuck is repaired when it loads.
 */
export function seatWinnersOwedTheirTerm(
  world: World,
  personId: EntityId,
): World {
  let next = world;
  for (const relationship of workRelationshipHistoryForPerson(
    world,
    personId,
  )) {
    if (relationship.kind === "employment:legislative-member")
      next = enterLegislativeTermLate(next, relationship.id);
  }
  return settleStateExecutiveQualification(next, personId);
}
