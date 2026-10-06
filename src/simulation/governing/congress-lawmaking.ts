import { makeIsoDate } from "../dates";
import { fileMemberAgendaBills } from "./member-agenda";
import { MEMBER_AGENDA_LEVEL_SETTINGS } from "./member-agenda-settings";
import { currentPresidentOf } from "../crisis/offices";
import { scheduleFutureDueItem } from "../future-transitions";
import { measurePosition } from "../legislation";
import { livingWorldEstablished } from "../living-world/opening";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  LegislativeMeasureRecord,
  World,
} from "../types";
import {
  CONGRESS_SITTING_TRANSITION,
  isCongressMeasure,
  scheduleCongressSitting,
  withSittingSeating,
} from "./congress-chambers";
import {
  applyInstitutionStep,
  recordGovernorDecisionOnMeasure,
  scheduleInstitutionStep,
} from "./legislative-clock";
import { hasStableKey } from "../history-index";
import { ensureOfficeholderPrinciples } from "./officeholder-principles";
import { openPresidentBillMatter } from "./state-governing";
import { recordDurableDecisionTrace } from "../decisions";
import {
  BILL_SIGN,
  BILL_RETURN,
  evaluateGovernorBill,
  executiveBillActionWindow,
} from "./governor-bill-decision";

/**
 * CONGRESS MAKES LAW — members of Congress file bills on the questions their
 * own principles press hardest, colleagues who lean the same way sign on, and the bill moves through
 * both Houses and to the President on the same clock that moves a state bill.
 *
 * The shared member-agenda filer reads Congress's level settings, records
 * cosponsors and schedules the legislative clock. This module schedules
 * Congress's intake and sittings and resolves the President's desk.
 *
 * A Congress bill answers one federal question in the policy catalog, yes
 * or no. A question with a mapped operative configuration is filed with it
 * (see automatic-legislation.ts). A question without one is still filed, as a
 * bill that says only its yes or no answer, so mapping coverage never narrows
 * what Congress takes up.
 *
 * Recorded implementation boundary: an enacted bill on an unmapped question
 * is federal law (law-in-force.ts) but changes nothing else in the world yet.
 */

export const CONGRESS_LAWMAKING_VERSION =
  MEMBER_AGENDA_LEVEL_SETTINGS.federal.intakeVersion;
export const CONGRESS_INTAKE_TRANSITION = "congress:intake" as const;
export const SPONSOR_MOTIVE_EVENT = "legislation.sponsor-motive" as const;

/**
 * The numbers below are the recorded congressional workflow calibration.
 *
 * - One bill is filed in each House on the first day of every month. The
 *   real Congress files more than ten thousand bills in two years and enacts
 *   a few hundred; a save cannot carry ten thousand, so this is a trickle of
 *   the bills that get a hearing.
 * - A member files on the federal question their own principles press
 *   hardest, once the summed weight reaches the filing threshold: the same
 *   recorded threshold a state legislator files at (member-agenda.ts).
 * - Every other member of the sponsor's party whose principles lean the same
 *   way that hard signs on. A member of the other party who leans that way
 *   signs on from the same recorded principles.
 */
export const CONGRESS_LAWMAKING_PROFILE = {
  id: "ocd-congress-lawmaking/v1",
  intakeDayOfMonth: 1,
  filingThreshold: MEMBER_AGENDA_LEVEL_SETTINGS.federal.filingThreshold,
} as const;

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

/* ------------------------------------------------------------------ *
 * The President's desk
 * ------------------------------------------------------------------ */

/**
 * A Congress bill on the President's desk. A non-player President decides it
 * on the day it arrives. A player President receives the existing bound
 * governing matter. With no President recorded, the bill remains pending.
 */
export function presidentDesk(
  world: World,
  measure: LegislativeMeasureRecord,
): World {
  if (measurePosition(world, measure.id).phase !== "awaiting-executive")
    return world;
  const president = currentPresidentOf(world);
  if (!president) return world;
  const window = executiveBillActionWindow(world, measure);
  if (window && world.currentDate > window.lastActionDate)
    return openPresidentBillMatter(world, measure);
  if (president.personId === controlledPersonId(world))
    return openPresidentBillMatter(world, measure);
  const principled = ensureOfficeholderPrinciples(world, [president.personId]);
  const evaluation = evaluateGovernorBill(principled, {
    stableKey: `${measure.stableKey}:president-desk`,
    governorId: president.personId,
    executiveTitle: "President",
    measure,
    staff: null,
  });
  const traced = recordDurableDecisionTrace(principled, evaluation);
  if (
    evaluation.selectedOptionKey !== BILL_SIGN &&
    evaluation.selectedOptionKey !== BILL_RETURN
  )
    return traced;
  const action =
    evaluation.selectedOptionKey === BILL_SIGN ? "signed" : "vetoed";
  const rationale = evaluation.context.considerations
    .filter((reason) => reason.optionKey === evaluation.selectedOptionKey)
    .map((reason) => reason.explanation)
    .join(" ");
  return scheduleInstitutionStep(
    recordGovernorDecisionOnMeasure(
      traced,
      measure.id,
      action,
      rationale,
      president.personId,
    ),
    measure.id,
  );
}

/* ------------------------------------------------------------------ *
 * Calendar
 * ------------------------------------------------------------------ */

function nextIntakeDate(after: IsoDate): IsoDate {
  const year = Number(after.slice(0, 4));
  const month = Number(after.slice(5, 7));
  const day = String(CONGRESS_LAWMAKING_PROFILE.intakeDayOfMonth).padStart(
    2,
    "0",
  );
  const thisMonth = makeIsoDate(
    `${year}-${String(month).padStart(2, "0")}-${day}`,
  );
  if (thisMonth > after) return thisMonth;
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return makeIsoDate(
    `${nextYear}-${String(nextMonth).padStart(2, "0")}-${day}`,
  );
}

function scheduleNextIntake(world: World): World {
  const dueAt = nextIntakeDate(world.currentDate);
  const stableKey = `${CONGRESS_LAWMAKING_VERSION}:intake:${dueAt}`;
  if (hasStableKey(world.history.futureDueItems, stableKey)) return world;
  const next = ensureNationalElectionJurisdiction(world);
  return scheduleFutureDueItem(next, {
    stableKey,
    dueAt,
    transitionKey: CONGRESS_INTAKE_TRANSITION,
    entityIds: [NATIONAL_ELECTION_JURISDICTION.id],
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    provenance: {
      kind: "authored",
      note: `${CONGRESS_LAWMAKING_PROFILE.id}: members of Congress file bills on the first of the month. The game's calendar, not Congress's.`,
    },
  });
}

/**
 * Called whenever the canonical clock moves. Keeps Congress's next filing day
 * on the calendar once the save has a seated Congress. Only writes a future
 * due item.
 */
export function applyCongressLawmaking(before: IsoDate, world: World): World {
  if (world.currentDate <= before) return world;
  if (!livingWorldEstablished(world)) return world;
  return scheduleNextIntake(world);
}

export function congressIntakeHandler(
  world: World,
  due: FutureDueItem,
): FutureTransitionHandlerResult {
  let next = world;
  for (const chamberKey of ["house", "senate"] as const)
    next = fileMemberAgendaBills(next, {
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      chamberKey,
      intakeKey: due.dueAt,
    });
  next = scheduleNextIntake(next);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: "Members of Congress filed their bills.",
    outcomeEventId: null,
  };
}

/**
 * A sitting of Congress: every open federal bill takes its next step, in the
 * order it was filed, and the next sitting goes on the calendar while any bill
 * is still open.
 */
export function congressSittingHandler(
  world: World,
): FutureTransitionHandlerResult {
  let next = world;
  let steps = 0;
  const open = (next.history.legislativeMeasures ?? []).filter(
    (measure) =>
      isCongressMeasure(measure) && !measurePosition(next, measure.id).terminal,
  );
  withSittingSeating(world, () => {
    for (const measure of open) {
      const result = applyInstitutionStep(next, measure.id, (w, m) =>
        presidentDesk(w, m),
      );
      if (result.kind === "applied" || result.kind === "executive") {
        next = result.world;
        steps += 1;
      } else if (result.kind === "wait-until" && result.world) {
        next = result.world;
      }
    }
  });
  const stillOpen = (next.history.legislativeMeasures ?? []).some(
    (measure) =>
      isCongressMeasure(measure) && !measurePosition(next, measure.id).terminal,
  );
  if (stillOpen) next = scheduleCongressSitting(next);
  return {
    world: next,
    status: "resolved",
    reasonKey: null,
    context: `Congress sat and took ${steps} step${steps === 1 ? "" : "s"} on its bills.`,
    outcomeEventId: null,
  };
}

/**
 * Congress's handlers, built when a registry asks for them rather than when
 * this module loads: the sitting key comes from congress-chambers, which is
 * still loading when an import cycle reaches this module first.
 */
export function congressLawmakingHandlers() {
  return [
    [CONGRESS_INTAKE_TRANSITION, congressIntakeHandler],
    [CONGRESS_SITTING_TRANSITION, congressSittingHandler],
  ] as const;
}
