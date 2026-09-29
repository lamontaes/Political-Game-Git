import {
  enactedRuleChanges,
  ruleChangeInForce,
  type EnactedRuleChange,
} from "../enacted-rule-changes";
import {
  changeJudicialCourtRules,
  courtById,
  seatHolderAt,
  seatsForCourt,
} from "../judiciary/courts";
import { currentPresidentOf } from "../crisis/offices";
import type { World } from "../types";
import { recordWorldEvent } from "../world";
import {
  ASSOCIATE_JUSTICE_NOMINATION,
  SUPREME_COURT_ID,
  scheduleAssociateNomination,
} from "./supreme-court-appointments";

/**
 * A LAW CHANGES THE SIZE OF A COURT. Congress sets the number of federal
 * judges by ordinary statute (it has set the Supreme Court at 6, 5, 7, 9, 10,
 * 7 and 9 seats), and a state sets its own courts' sizes by statute or by
 * amending its constitution (Arizona and Georgia enlarged their supreme courts
 * in 2016, Utah in February 2026).
 *
 * A `court.seats` change enacted through `enacted-rule-changes.ts` reaches the
 * court here on the day it becomes operative:
 *
 * 1. A larger court gets new, empty seats. On the Supreme Court the sitting
 *    President then nominates for each one, and the Senate votes.
 * 2. A smaller court loses only empty seats. A sitting judge keeps the seat
 *    until leaving it, and that seat is retired instead of refilled, as in
 *    1866, when Congress shrank the Court by leaving vacancies unfilled.
 * 3. Where two laws speak to the same court, the one in force governs
 *    (`ruleChangeInForce`): a constitutional amendment fixing the size
 *    outranks a later statute.
 *
 * NOT MODELED: who fills a new seat on a federal court below the Supreme
 * Court or on a state court. The seat opens and stays empty, and a public
 * record says so.
 */

const VERSION = "governing-court-size-law-v1";
const COURT_SIZE_EVENT = "governing.court-size-changed" as const;

const CONTEXT = {
  location: null,
  socialContext: null,
  pressure: null,
  choice: null,
  motivation: null,
  immediateReaction: null,
} as const;

function governingChanges(world: World): readonly EnactedRuleChange[] {
  const byCourt = new Map<string, EnactedRuleChange[]>();
  for (const change of enactedRuleChanges(world)) {
    if (change.field !== "court.seats") continue;
    if (change.operativeAt > world.currentDate) continue;
    const key = `${change.stateUsps}|${change.officeKey}`;
    byCourt.set(key, [...(byCourt.get(key) ?? []), change]);
  }
  return [...byCourt.values()].flatMap((changes) => {
    const governing = ruleChangeInForce(changes);
    return governing ? [governing] : [];
  });
}

/** Applies every court-size law in force that its court does not yet reflect. */
export function applyEnactedCourtSizes(world: World): World {
  // Cheap guard: most worlds never pass a court-size law.
  if (
    !world.judiciary ||
    (!(world.history.ruleChangeProvisions ?? []).some(
      (row) => row.field === "court.seats",
    ) &&
      !(world.history.constitutionalMeasures ?? []).some(
        (measure) =>
          measure.ruleDelta.kind === "rule-field" &&
          measure.ruleDelta.field === "court.seats",
      ))
  )
    return world;
  let next = world;
  for (const change of governingChanges(world)) {
    const court = courtById(next, change.officeKey);
    if (!court || typeof change.value !== "number") continue;
    const recordId = `judicial-rule:${change.measureId}:${court.courtId}`;
    if (
      next.judiciary!.courtRuleVersions.some(
        (version) => version.recordId === recordId,
      )
    )
      continue;
    const before = seatsForCourt(next, court.courtId).filter(
      (seat) => !seat.allocationRecordId,
    ).length;
    next = changeJudicialCourtRules(next, {
      courtId: court.courtId,
      effectiveAt: change.operativeAt,
      provisionId: change.measureId,
      rules: {
        ...court.rules,
        authorizedSeats: {
          state: "known",
          value: change.value,
          basis: "enacted-rule",
          referenceId: change.designation,
        },
        amendmentRoute:
          change.instrument === "constitutional-amendment"
            ? {
                state: "known",
                value: "constitution",
                basis: "enacted-rule",
                referenceId: change.designation,
              }
            : court.rules.amendmentRoute,
      },
    });
    const active = seatsForCourt(next, court.courtId).filter(
      (seat) => !seat.allocationRecordId,
    );
    const occupiedOver = Math.max(0, active.length - change.value);
    next = recordWorldEvent(next, {
      stableKey: `${VERSION}:${recordId}`,
      type: COURT_SIZE_EVENT,
      occurredAt: change.operativeAt,
      recordedAt: next.currentDate,
      jurisdictionId: court.jurisdictionId,
      involvedEntityIds: [change.measureId],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        VERSION,
        `court:${court.courtId}`,
        `seats-before:${before}`,
        `seats-after:${change.value}`,
        `instrument:${change.instrument}`,
      ],
      summary:
        change.value > before
          ? `${change.designation} took effect: the ${court.name} grows from ${before} to ${change.value} seats.`
          : occupiedOver > 0
            ? `${change.designation} took effect: the ${court.name} is to have ${change.value} seats. ${occupiedOver} sitting ${occupiedOver === 1 ? "judge keeps a seat" : "judges keep their seats"} until leaving, and ${occupiedOver === 1 ? "that seat is" : "those seats are"} not refilled.`
            : `${change.designation} took effect: the ${court.name} now has ${change.value} seats.`,
      context: CONTEXT,
    });
    if (court.courtId === SUPREME_COURT_ID) {
      const president = currentPresidentOf(next);
      if (!president) continue;
      for (const seat of active) {
        if (seat.linkedOfficeId || seatHolderAt(next, seat.seatId)) continue;
        const pending = next.history.futureDueItems.some(
          (due) =>
            due.transitionKey === ASSOCIATE_JUSTICE_NOMINATION &&
            due.stableKey.includes(`:associate-nomination:${seat.ordinal}:`),
        );
        if (pending) continue;
        next = scheduleAssociateNomination(
          next,
          seat.ordinal,
          seat.createdAt,
          president.personId,
        );
      }
    }
  }
  return next;
}
