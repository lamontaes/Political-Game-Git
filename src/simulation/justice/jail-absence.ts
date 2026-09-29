import { recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";
import {
  PROSECUTION_SENTENCED_EVENT,
  sentencedPersonOf,
  sentencesOf,
} from "./jail-terms";

/**
 * A person in jail cannot come to work. When a jail term begins, every job
 * they hold goes on leave (`temporarily-inactive`), which stops its pay and
 * its hours on the same record every payday and schedule already reads. When
 * the term ends, as handed down or cut short by clemency, the job resumes.
 *
 * PLACEHOLDER (hand-set): the employer holds the job through the term. No
 * employer in the game is a person who decides yet, so whether one lets a
 * worker go while they are away, or takes them back after, is not decided
 * here; the leave is only the fact that they were not there.
 */

export const JAIL_ABSENCE_VERSION = "justice-jail-absence-v1";
export const IN_JAIL_REASON = "Serving a jail term.";

function later(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

/** Puts jobs on leave for jail terms that have begun, and back when they end. */
export function settleJailAbsences(world: World): World {
  const sentenced = new Set<EntityId>();
  for (const event of world.history.events)
    if (event.type === PROSECUTION_SENTENCED_EVENT) {
      const personId = sentencedPersonOf(event);
      if (personId) sentenced.add(personId);
    }
  let next = world;
  for (const personId of [...sentenced].sort()) {
    const terms = sentencesOf(next, personId).filter(
      (sentence) =>
        sentence.kind === "jail" && sentence.from <= next.currentDate,
    );
    if (terms.length === 0) continue;
    const jobs = next.history.workRelationships.filter(
      (work) => work.personId === personId,
    );
    for (const term of terms) {
      for (const work of jobs) {
        const key = `${JAIL_ABSENCE_VERSION}:${term.sentencedEventId}:${work.id}`;
        const status = workStatusAt(next, work.id);
        if (!status) continue;
        const away = next.history.workStatuses.find(
          (row) => row.stableKey === `${key}:away`,
        );
        if (!away) {
          if (term.until <= next.currentDate) continue;
          if (status.status !== "active") continue;
          next = recordWorkStatus(next, {
            stableKey: `${key}:away`,
            workRelationshipId: work.id,
            effectiveAt: later(term.from, status.effectiveAt),
            status: "temporarily-inactive",
            reason: IN_JAIL_REASON,
            provenance: {
              kind: "simulated-event",
              eventId: term.sentencedEventId,
            },
            supersedesStatusId: status.id,
          });
        } else if (term.until <= next.currentDate && status.id === away.id) {
          next = recordWorkStatus(next, {
            stableKey: `${key}:back`,
            workRelationshipId: work.id,
            effectiveAt: later(term.until, away.effectiveAt),
            status: "active",
            reason: null,
            provenance: {
              kind: "simulated-event",
              eventId: term.clemency?.eventId ?? term.sentencedEventId,
            },
            supersedesStatusId: away.id,
          });
        }
      }
    }
  }
  return next;
}
