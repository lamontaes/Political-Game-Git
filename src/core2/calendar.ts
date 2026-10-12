import { daysBetween, makeIsoDate } from "../simulation/dates";
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
  const days = daysBetween(makeIsoDate(actor.lastActDate), makeIsoDate(date));
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

function hasDailyFocus(core: CoreState, actor: Readonly<PersonState>): boolean {
  return (
    core.observer ||
    actor.id === core.playerId ||
    core.focusPersonIds.has(actor.id) ||
    core.focusPlaceIds.has(actor.placeId) ||
    (actor.countyId !== undefined && core.focusPlaceIds.has(actor.countyId))
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
