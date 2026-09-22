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

/**
 * GOVERNOR CONTINUITY — the calendar half, which the canonical clock calls.
 * It only ever writes future due items; the handlers that act on them live in
 * `state-executive-turnover.ts`.
 */

export const GOVERNOR_TURNOVER_VERSION = "governor-turnover/v1";

/**
 * PROVISIONAL, and awaiting SOURCED RULES rather than anyone's sign-off.
 *
 * Whether an incumbent MAY stand again is the state's term limit, read per
 * state through `executive-term-limits.ts` (sourced, enacted in this World, or
 * the disclosed per-state draw), never a number here. What remains here is
 * choice, not law: how old an incumbent is when they stop wanting the job,
 * and how often an eligible one runs. Filed as
 * executive-terms-and-incumbency-turnover.
 */
export const GOVERNOR_TURNOVER_PROFILE = {
  id: "ocd-governor-turnover-game-profile/v2",
  /** The candidate field closes this many days before the general election. */
  fieldClosesDaysBefore: 60,
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
  while (electionDay !== null && fieldClosingDate(electionDay) <= after)
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
      chiefExecutiveJurisdictionId(office.stateUsps)!,
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
  if (electionDay !== null && regularFieldClosed(world, electionDay))
    electionDay = nextRegularElectionInWorld(
      world,
      stateUsps,
      addDays(electionDay, 1),
    );
  if (electionDay === null) return null;
  const term = termDatesAfterElectionInWorld(world, stateUsps, electionDay);
  return term ? { electionDay, ...term } : null;
}
