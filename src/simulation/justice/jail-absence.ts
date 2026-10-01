import { OFFICE_EMPLOYMENT_KINDS } from "../governing/office-consequence";
import { recordWorkStatus } from "../life";
import { workStatusAt } from "../life-queries";
import type { EntityId, IsoDate, World } from "../types";
import {
  eventsOfType,
  PRETRIAL_HELD_EVENT,
  pretrialHoldsOf,
  PROSECUTION_SENTENCED_EVENT,
  sentencedPersonOf,
  sentencesOf,
} from "./jail-terms";

/**
 * A person in jail cannot come to work. When a jail term begins, or a person
 * is held in jail before trial, every job they hold goes on leave
 * (`temporarily-inactive`), which stops its pay and its hours on the same
 * record every payday and schedule already reads. When the term ends, as
 * handed down or cut short by clemency, or the case ends, the job resumes.
 *
 * A public office is not a job the jailer takes away: whether an officeholder
 * keeps the seat is the law's answer at sentencing (`recordOfficeConsequence`),
 * so an office never goes on leave here.
 *
 * PLACEHOLDER (hand-set): the employer holds the job through the term. No
 * employer in the game is a person who decides yet, so whether one lets a
 * worker go while they are away, or takes them back after, is not decided
 * here; the leave is only the fact that they were not there.
 */

export const JAIL_ABSENCE_VERSION = "justice-jail-absence-v1";
export const IN_JAIL_REASON = "Serving a jail term.";
export const HELD_BEFORE_TRIAL_REASON = "Held in jail before trial.";

/** The person's jobs, leaving out any public office they hold. */
function jobsOf(world: World, personId: EntityId) {
  return world.history.workRelationships.filter(
    (work) =>
      work.personId === personId &&
      !OFFICE_EMPLOYMENT_KINDS.includes(work.kind) &&
      !work.kind.startsWith("office:"),
  );
}

function later(a: IsoDate, b: IsoDate): IsoDate {
  return a > b ? a : b;
}

/**
 * Puts jobs on leave for holds before trial and jail terms that have begun,
 * and back when they end. A hold that ends in a jail term hands the job
 * straight to the term's leave on the same day.
 */
export function settleJailAbsences(world: World): World {
  return settleJailTerms(settlePretrialHolds(world));
}

function settlePretrialHolds(world: World): World {
  const held = new Set<EntityId>();
  for (const event of eventsOfType(world, PRETRIAL_HELD_EVENT)) {
    const personId = sentencedPersonOf(event);
    if (personId) held.add(personId);
  }
  let next = world;
  for (const personId of [...held].sort()) {
    const holds = pretrialHoldsOf(next, personId).filter(
      (hold) => hold.from <= next.currentDate,
    );
    const jobs = jobsOf(next, personId);
    for (const hold of holds) {
      const over = hold.until !== null && hold.until <= next.currentDate;
      for (const work of jobs) {
        const key = `${JAIL_ABSENCE_VERSION}:${hold.heldEventId}:${work.id}`;
        const status = workStatusAt(next, work.id);
        if (!status) continue;
        const away = next.history.workStatuses.find(
          (row) => row.stableKey === `${key}:away`,
        );
        if (!away) {
          if (over || status.status !== "active") continue;
          next = recordWorkStatus(next, {
            stableKey: `${key}:away`,
            workRelationshipId: work.id,
            effectiveAt: later(hold.from, status.effectiveAt),
            status: "temporarily-inactive",
            reason: HELD_BEFORE_TRIAL_REASON,
            provenance: { kind: "simulated-event", eventId: hold.heldEventId },
            supersedesStatusId: status.id,
          });
        } else if (over && status.id === away.id) {
          next = recordWorkStatus(next, {
            stableKey: `${key}:back`,
            workRelationshipId: work.id,
            effectiveAt: later(hold.until!, away.effectiveAt),
            status: "active",
            reason: null,
            provenance: { kind: "simulated-event", eventId: hold.heldEventId },
            supersedesStatusId: away.id,
          });
        }
      }
    }
  }
  return next;
}

function settleJailTerms(world: World): World {
  const sentenced = new Set<EntityId>();
  for (const event of eventsOfType(world, PROSECUTION_SENTENCED_EVENT)) {
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
    const jobs = jobsOf(next, personId);
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
