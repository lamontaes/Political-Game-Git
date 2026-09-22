import { makeIsoDate } from "../dates";
import { electedExecutiveTermForRelationship } from "../executive-work-context";
import { legislativeTermForRelationship } from "../legislative-office-terms";
import type { EntityId, IsoDate, World } from "../types";

/** One term the World records a person as having held in an office. */
export interface DatedTermInOffice {
  readonly startsAt: IsoDate;
  /** Exclusive; null where the record does not date the end. */
  readonly endsAt: IsoDate | null;
}

/**
 * Every term in one exact office the World records this person as having held
 * or holding, on or before today, with its dates, earliest first. A term counts
 * once it has begun on its recorded date: an elected executive term, a dated
 * legislative term won through a campaign contest for that office, or a
 * fictional opening tenure naming this person. A planned term that has not
 * begun is not a prior term.
 *
 * This is the World's own office record, so an empty list means these records
 * name no such term, which is what a term limit is tested against.
 */
export function datedTermsInOffice(
  world: World,
  personId: EntityId,
  officeKey: string,
): readonly DatedTermInOffice[] {
  const terms: DatedTermInOffice[] = [];
  for (const relationship of world.history.workRelationships) {
    if (relationship.personId !== personId) continue;
    if (relationship.kind === "employment:executive-office") {
      const term = electedExecutiveTermForRelationship(world, relationship.id);
      if (
        term &&
        term.contest.office.officeKey === officeKey &&
        term.startsAt <= world.currentDate
      )
        terms.push({ startsAt: term.startsAt, endsAt: term.endsAt });
    } else if (relationship.kind === "employment:legislative-member") {
      const term = legislativeTermForRelationship(world, relationship.id);
      if (
        term &&
        term.contest.office.officeKey === officeKey &&
        term.startsAt <= world.currentDate
      )
        terms.push({ startsAt: term.startsAt, endsAt: term.endsAt });
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
    ) {
      const endTag = event.tags.find((tag) => tag.startsWith("term-end:"));
      terms.push({
        startsAt: event.occurredAt,
        endsAt: endTag ? makeIsoDate(endTag.slice("term-end:".length)) : null,
      });
    }
  }
  return terms.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

/**
 * How many terms in one exact office the World records this person as having
 * held or holding, on or before today. See `datedTermsInOffice`.
 */
export function recordedTermsInOffice(
  world: World,
  personId: EntityId,
  officeKey: string,
): number {
  return datedTermsInOffice(world, personId, officeKey).length;
}
