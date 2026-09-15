import { electedExecutiveTermForRelationship } from "../executive-work-context";
import { legislativeTermForRelationship } from "../legislative-office-terms";
import type { EntityId, World } from "../types";

/**
 * How many terms in one exact office the World records this person as having
 * held or holding, on or before today. A term counts once it has begun on its
 * recorded date: an elected executive term, a dated legislative term won
 * through a campaign contest for that office, or a fictional opening tenure
 * naming this person. A planned term that has not begun is not a prior term.
 *
 * This is the World's own office record, so a result of 0 means these records
 * name no such term — which is what a term limit is tested against.
 */
export function recordedTermsInOffice(
  world: World,
  personId: EntityId,
  officeKey: string,
): number {
  let count = 0;
  for (const relationship of world.history.workRelationships) {
    if (relationship.personId !== personId) continue;
    if (relationship.kind === "employment:executive-office") {
      const term = electedExecutiveTermForRelationship(world, relationship.id);
      if (
        term &&
        term.contest.office.officeKey === officeKey &&
        term.startsAt <= world.currentDate
      )
        count += 1;
    } else if (relationship.kind === "employment:legislative-member") {
      const term = legislativeTermForRelationship(world, relationship.id);
      if (
        term &&
        term.contest.office.officeKey === officeKey &&
        term.startsAt <= world.currentDate
      )
        count += 1;
    }
  }
  for (const event of world.history.events) {
    if (
      event.type === "world.office-tenure" &&
      event.tags.includes(`office:${officeKey}`) &&
      event.occurredAt <= world.currentDate &&
      event.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === "focus:subject",
      )
    )
      count += 1;
  }
  return count;
}
