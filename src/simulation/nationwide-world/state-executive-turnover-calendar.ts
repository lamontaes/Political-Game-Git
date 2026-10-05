import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { chiefExecutiveJurisdictionId } from "./government-jurisdiction";
import type { IsoDate, World } from "../types";
import { scheduleGoverningSeasons } from "../governing/governing-calendar";
import { CHIEF_EXECUTIVE_JURISDICTIONS } from "./state-executive-candidacy-packs";
import {
  ensureStateJurisdiction,
  stateExecutiveOffice,
} from "./state-executives";
import {
  nextRegularElectionInWorld,
  termDatesAfterElectionInWorld,
} from "./executive-term-rules-in-world";
import type { StateExecutiveTermRuleInWorld } from "./executive-term-rules-in-world";
import { nominationPlan } from "../nominations/nomination-rules";

/**
 * GOVERNOR CONTINUITY — the calendar half, which the canonical clock calls.
 * It only ever writes future due items; the handlers that act on them live in
 * `state-executive-turnover.ts`.
 */

export const GOVERNOR_TURNOVER_VERSION = "governor-turnover/v1";

/** Retained identity for existing intent and outcome records. */
export const GOVERNOR_TURNOVER_PROFILE = {
  id: "ocd-governor-turnover-game-profile/v2",
} as const;

/** Office-specific filing deadline from the same reader used for nominations. */
export function fieldClosingDate(
  world: World,
  stateUsps: string,
  electionDay: IsoDate,
): IsoDate {
  const plan = nominationPlan(world, {
    stateUsps,
    family: "governor",
    year: Number(electionDay.slice(0, 4)),
    onDate: world.currentDate,
    generalDay: electionDay,
  });
  if (!plan.known) throw new Error(plan.reason);
  return plan.filingDeadline;
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

/**
 * The next regular election whose field closes after `after`, on the calendar
 * this World's law sets: a law that changes the term length changes which
 * years hold an election, from the first term it reaches.
 */
function nextFieldClose(
  world: World,
  stateUsps: string,
  after: IsoDate,
): { readonly year: number; readonly electionDay: IsoDate } | null {
  let electionDay = nextRegularElectionInWorld(world, stateUsps, after);
  while (
    electionDay !== null &&
    fieldClosingDate(world, stateUsps, electionDay) <= after
  )
    electionDay = nextRegularElectionInWorld(
      world,
      stateUsps,
      addDays(electionDay, 1),
    );
  return electionDay === null
    ? null
    : { year: Number(electionDay.slice(0, 4)), electionDay };
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
  const next = nextFieldClose(world, stateUsps, after);
  if (!office || !next) return world;
  const stableKey = fieldCloseKey(office.officeKey, next.year);
  if (world.history.futureDueItems.some((due) => due.stableKey === stableKey))
    return world;
  const registered = ensureStateJurisdiction(world, stateUsps);
  const stateId = chiefExecutiveJurisdictionId(stateUsps)!;
  return scheduleFutureDueItem(registered, {
    stableKey,
    dueAt: fieldClosingDate(world, stateUsps, next.electionDay),
    transitionKey: GOVERNOR_FIELD_CLOSE,
    entityIds: [stateId],
    jurisdictionId: stateId,
    provenance: {
      kind: "authored",
      note: `Shared governor nomination calendar: candidate filing deadline for ${office.displayName}, general election ${next.electionDay}.`,
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
  // Every governor and every state legislature is seated when a new game
  // opens (opening-life.ts), so the clock no longer asks on each move whether
  // all 50 exist. Saves from before that preparation are not supported
  // (owner, 2026-09-26: old saves need not stay compatible yet).
  const offices = materializedOffices(next);
  for (const office of offices) {
    next = scheduleNextFieldClose(next, office.stateUsps, next.currentDate);
    next = scheduleGoverningSeasons(
      next,
      office.officeKey,
      chiefExecutiveJurisdictionId(office.stateUsps)!,
    );
  }
  return next;
}

/** The field for this office's election on `electionDay` has closed. */
export function regularFieldClosed(
  world: World,
  stateUsps: string,
  electionDay: IsoDate,
): boolean {
  return world.currentDate > fieldClosingDate(world, stateUsps, electionDay);
}

/** The regular election a filing made today would stand in, and the term it wins. */
export interface FilableStateExecutiveTerm {
  readonly electionDay: IsoDate;
  readonly startsAt: IsoDate;
  readonly endsAt: IsoDate;
  readonly rule: StateExecutiveTermRuleInWorld;
}

/**
 * The next regular election whose candidate field is still open, under this
 * World's law, and the term it would win. Once a field closes, the office's
 * next cycle is the one.
 */
export function nextFilableStateExecutiveTerm(
  world: World,
  stateUsps: string,
): FilableStateExecutiveTerm | null {
  let electionDay = nextRegularElectionInWorld(
    world,
    stateUsps,
    addDays(world.currentDate, 1),
  );
  if (electionDay !== null && regularFieldClosed(world, stateUsps, electionDay))
    electionDay = nextRegularElectionInWorld(
      world,
      stateUsps,
      addDays(electionDay, 1),
    );
  if (electionDay === null) return null;
  const term = termDatesAfterElectionInWorld(world, stateUsps, electionDay);
  return term ? { electionDay, ...term } : null;
}
