import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { stateJurisdictionForKey } from "../life-places";
import type { IsoDate, World } from "../types";
import { scheduleGoverningSeasons } from "../governing/governing-calendar";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./state-executive-candidacy-packs";
import {
  ensureStateJurisdiction,
  stateExecutiveOffice,
} from "./state-executives";
import {
  generalElectionDay,
  isElectionYear,
  stateExecutiveTermRule,
} from "./state-executive-term-rules";

/**
 * GOVERNOR CONTINUITY — the calendar half, which the canonical clock calls.
 * It only ever writes future due items; the handlers that act on them live in
 * `state-executive-turnover.ts`.
 */

export const GOVERNOR_TURNOVER_VERSION = "governor-turnover/v1";

/** PROPOSED balance parameters, pending the director's confirmation. */
export const GOVERNOR_TURNOVER_PROFILE = {
  id: "ocd-governor-turnover-game-profile/v1",
  /** The candidate field closes this many days before the general election. */
  fieldClosesDaysBefore: 60,
  /** An incumbent with this many consecutive recorded terms does not run. */
  incumbentStepsDownAfterTerms: 2,
  /** Incumbents this old or older do not run. */
  retirementAge: 78,
  /** Chance an eligible incumbent runs again, per mille. */
  incumbentRunsPermille: 800,
} as const;

export function fieldClosingDate(electionDay: IsoDate): IsoDate {
  return addDays(electionDay, -GOVERNOR_TURNOVER_PROFILE.fieldClosesDaysBefore);
}

export function turnoverContestKey(officeKey: string, year: number): string {
  return `${GOVERNOR_TURNOVER_VERSION}:${officeKey}:${year}`;
}

function materializedOffices(world: World) {
  return CHIEF_EXECUTIVE_JURISDICTIONS.flatMap((usps) => {
    const office = stateExecutiveOffice(usps);
    if (!office) return [];
    const organization = world.history.organizations.find(
      (candidate) => candidate.stableKey === office.organizationStableKey,
    );
    return organization ? [office] : [];
  });
}

export const GOVERNOR_FIELD_CLOSE = "governing:governor-field-close" as const;
export const GOVERNOR_TERM_PLAN = "governing:governor-term-plan" as const;

function nextFieldClose(
  stateUsps: string,
  after: IsoDate,
): { readonly year: number; readonly electionDay: IsoDate } | null {
  const rule = stateExecutiveTermRule(stateUsps);
  if (!rule) return null;
  for (let year = Number(after.slice(0, 4)); year < 3000; year += 1) {
    if (!isElectionYear(rule.election, year)) continue;
    const electionDay = generalElectionDay(rule.election, year);
    if (fieldClosingDate(electionDay) > after) return { year, electionDay };
  }
  return null;
}

function fieldCloseKey(officeKey: string, year: number): string {
  return `${turnoverContestKey(officeKey, year)}:field-close`;
}

export function scheduleNextFieldClose(
  world: World,
  stateUsps: string,
  after: IsoDate,
): World {
  const office = stateExecutiveOffice(stateUsps);
  const next = nextFieldClose(stateUsps, after);
  if (!office || !next) return world;
  const stableKey = fieldCloseKey(office.officeKey, next.year);
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  const registered = ensureStateJurisdiction(world, stateUsps);
  const stateId = stateJurisdictionForKey(`US-${stateUsps}`)!.id;
  return scheduleFutureDueItem(registered, {
    stableKey,
    dueAt: fieldClosingDate(next.electionDay),
    transitionKey: GOVERNOR_FIELD_CLOSE,
    entityIds: [stateId],
    jurisdictionId: stateId,
    provenance: {
      kind: "authored",
      note: `${GOVERNOR_TURNOVER_PROFILE.id}: the candidate field for ${office.displayName} closes ${GOVERNOR_TURNOVER_PROFILE.fieldClosesDaysBefore} days before the ${next.electionDay} general election.`,
    },
  });
}

/**
 * Called whenever the canonical clock moves. Makes sure every materialized
 * governorship has its next field closing on the calendar, so later advances
 * stop there. Only writes a future due item; never a past record.
 */
export function applyGovernorTurnover(before: IsoDate, world: World): World {
  if (world.currentDate <= before) return world;
  let next = world;
  for (const office of materializedOffices(world)) {
    next = scheduleNextFieldClose(next, office.stateUsps, next.currentDate);
    next = scheduleGoverningSeasons(
      next,
      office.officeKey,
      stateJurisdictionForKey(`US-${office.stateUsps}`)!.id,
    );
  }
  return next;
}

/** The field for this office's election on `electionDay` has closed. */
export function regularFieldClosed(
  world: World,
  electionDay: IsoDate,
): boolean {
  return world.currentDate >= fieldClosingDate(electionDay);
}
