import {
  daysBetween,
  isoDateFromParts,
  makeIsoDate,
  daysBetweenText,
} from "./kernel/dates";
import { knownThroughRecords, lastTogether } from "./closeness";
import { parameter } from "./parameters";
import type { CoreState, IsoDate, PersonState, TierDefinition } from "./types";

export interface DuePerson {
  personId: string;
  days: number;
}

interface CadenceContext {
  core: CoreState;
  actor: Readonly<PersonState>;
  tier: TierDefinition;
  date: IsoDate;
  days: number;
}

function admittedDate(core: CoreState, date: IsoDate): IsoDate {
  const target = makeIsoDate(date);
  const current = makeIsoDate(core.date);
  if (target < current) throw new Error("Core date cannot move backward.");
  return target;
}

function elapsedDays(
  core: CoreState,
  actor: Readonly<PersonState>,
  date: IsoDate,
): number {
  const days = daysBetweenText(actor.lastActDate, date);
  if (days < parameter("zero", core.data.parameters))
    throw new Error(`Actor has a future last act date: ${actor.id}`);
  return days;
}

function interval(core: CoreState, tier: TierDefinition): number {
  if (!tier.intervalParameter)
    throw new Error(`Tier requires an interval parameter: ${tier.id}`);
  const value = parameter(tier.intervalParameter, core.data.parameters);
  if (
    !Number.isSafeInteger(value) ||
    value <= parameter("zero", core.data.parameters)
  )
    throw new Error(
      `Tier interval must be a positive safe integer: ${tier.id}`,
    );
  return value;
}

function monthlyDue({ core, actor, tier, date }: CadenceContext): boolean {
  const zero = parameter("zero", core.data.parameters);
  const one = parameter("one", core.data.parameters);
  const anniversary = new Date(makeIsoDate(actor.lastActDate));
  const originalDay = anniversary.getUTCDate();
  anniversary.setUTCDate(one);
  anniversary.setUTCMonth(anniversary.getUTCMonth() + interval(core, tier));
  const monthEnd = new Date(anniversary.getTime());
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + one, zero);
  anniversary.setUTCDate(Math.min(originalDay, monthEnd.getUTCDate()));
  if (!Number.isFinite(anniversary.getTime()))
    throw new Error(
      `Tier month interval exceeds the supported calendar: ${tier.id}`,
    );
  return anniversary.getTime() <= new Date(date).getTime();
}

/** Cadence names identify operations; actor tier identities come from data rows. */
const cadenceOperations = new Map<string, (context: CadenceContext) => boolean>(
  [
    ["days", ({ core, tier, days }) => days >= interval(core, tier)],
    ["months", monthlyDue],
    ["calendar", ({ core, date }) => core.calendarDates.has(date)],
    ["inactive", () => false],
  ],
);

/** A tier that never acts (a husk until filled in) stays still under any focus. */
function inactive(core: CoreState, actor: Readonly<PersonState>): boolean {
  return (
    core.data.tiers.find((row) => row.id === actor.tier)?.cadence === "inactive"
  );
}

function hasDailyFocus(core: CoreState, actor: Readonly<PersonState>): boolean {
  return dailyFocusReason(core, actor) !== null;
}

/** Why a person chooses every day, the first reason that holds. */
export type DailyFocusReason =
  "player" | "focus-person" | "player-circle" | "focus-place" | "focus-county";

/**
 * The one daily-focus rule: why `actor` chooses every day, or null when they
 * choose at their tier's cadence. Dev mode's Focus view reads it to say why.
 */
export function dailyFocusReason(
  core: CoreState,
  actor: Readonly<PersonState>,
): DailyFocusReason | null {
  if (inactive(core, actor)) return null;
  // The debug observer keeps more of the record and never sets who chooses
  // when (core-observer-changes-choices).
  if (actor.id === core.playerId) return "player";
  const focus = core.focusPersonIds.has(actor.id);
  if ((focus || knowsThePlayer(core, actor.id)) && seenLately(core, actor))
    return focus ? "focus-person" : "player-circle";
  if (core.focusPlaceIds.has(actor.placeId)) return "focus-place";
  if (actor.countyId !== undefined && core.focusPlaceIds.has(actor.countyId))
    return "focus-county";
  return null;
}

/**
 * The people a record says the player knows without a tie row: colleagues on
 * a body the player sits on, from the sitting reader (closeness.ts
 * `knownThroughRecords`). They are in the player's circle as surely as
 * someone the player's own act touched. Read once a day.
 */
const knownToPlayer = new WeakMap<
  CoreState,
  { date: IsoDate; player: string; ids: ReadonlySet<string> }
>();
export function knowsThePlayer(core: CoreState, id: string): boolean {
  const player = core.playerId;
  if (!player) return false;
  let kept = knownToPlayer.get(core);
  if (kept?.date !== core.date || kept.player !== player) {
    kept = { date: core.date, player, ids: knownThroughRecords(core, player) };
    knownToPlayer.set(core, kept);
  }
  return kept.ids.has(id);
}

/**
 * A focus person chooses daily while the player sees them: the player's
 * family and household always, anyone else while they and the player were
 * last together within `focusDailyContactDays` days by any record, their tie
 * or a sitting both sat (closeness.ts `lastTogether`). Out of touch, they
 * choose at their tier's cadence until the two meet again. Someone in
 * focus who has never been with the player (a coworker, or a person a caller
 * put in focus) keeps choosing daily.
 */
function seenLately(core: CoreState, actor: Readonly<PersonState>): boolean {
  const player = core.playerId ? core.people.get(core.playerId) : undefined;
  if (
    !player ||
    player.familyIds.has(actor.id) ||
    player.householdId === actor.householdId
  )
    return true;
  const last = lastTogether(core, player.id, actor.id);
  return (
    !last ||
    daysBetweenText(last, core.date) <=
      parameter("focusDailyContactDays", core.data.parameters)
  );
}

/** Pure scheduling query. The life loop records lastActDate after handling an actor. */
export function duePeople(
  core: CoreState,
  date: IsoDate,
): readonly DuePerson[] {
  const target = admittedDate(core, date);
  const zero = parameter("zero", core.data.parameters);
  const one = parameter("one", core.data.parameters);
  const tiers = new Map(core.data.tiers.map((tier) => [tier.id, tier]));
  const due: DuePerson[] = [];
  for (const [tierId, ids] of core.peopleByTier) {
    const tier = tiers.get(tierId);
    if (!tier) throw new Error(`Unregistered indexed tier: ${tierId}`);
    if (tier.cadence === "inactive") continue;
    for (const personId of ids) {
      const actor = core.people.get(personId);
      if (!actor || actor.tier !== tierId)
        throw new Error(`Inconsistent person tier index: ${personId}`);
      if (!actor.alive) continue;
      const days = elapsedDays(core, actor, target);
      if (days === zero) continue;
      if (hasDailyFocus(core, actor)) {
        if (days >= one) due.push({ personId, days });
        continue;
      }
      const operation = cadenceOperations.get(tier.cadence);
      if (!operation)
        throw new Error(`Unregistered cadence operation: ${tier.cadence}`);
      if (operation({ core, actor, tier, date: target, days }))
        due.push({ personId, days });
    }
  }
  return due;
}

/** Move the date only; no decisions, callbacks, knowledge, or actor dates are changed. */
export function advanceDate(core: CoreState, date: IsoDate): void {
  core.date = admittedDate(core, date);
}

/** Explicit looks can ask about elapsed time without creating facts or performing acts. */
export function catchUpPerson(
  core: CoreState,
  personId: string,
  date: IsoDate,
): DuePerson {
  const target = admittedDate(core, date);
  const actor = core.people.get(personId);
  if (!actor) throw new Error(`Absent full person: ${personId}`);
  return { personId, days: elapsedDays(core, actor, target) };
}

/**
 * P15 part 2b: days from today until the person's next activation, the span
 * one activation plans their free time over. Calendar and inactive cadences
 * plan only today.
 */
export function planningDays(
  core: CoreState,
  actor: Readonly<PersonState>,
): number {
  const one = parameter("one", core.data.parameters);
  if (hasDailyFocus(core, actor)) return one;
  const tier = core.data.tiers.find((row) => row.id === actor.tier);
  if (tier?.cadence === "days") return interval(core, tier);
  if (tier?.cadence === "months") {
    const next = new Date(makeIsoDate(core.date));
    next.setUTCMonth(next.getUTCMonth() + interval(core, tier));
    return daysBetween(
      makeIsoDate(core.date),
      isoDateFromParts(
        next.getUTCFullYear(),
        next.getUTCMonth() + one,
        next.getUTCDate(),
      ),
    );
  }
  return one;
}
