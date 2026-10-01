import { childhoodRecordEntries } from "./childhood-record";
import { healthCoverageRecords } from "./crisis/health-coverage";
import { addDays, ageOnDate, dateAtAge, daysBetween } from "./dates";
import type { ChildhoodRecordEntry, EntityId, IsoDate, World } from "./types";

/** A person's childhood record: the span the World witnessed, and its entries. */
export interface ChildhoodRecord {
  readonly personId: EntityId;
  /** The first day of childhood the World's history holds. */
  readonly witnessedFrom: IsoDate;
  /** The last day it holds: today, or the day before they turned 18. */
  readonly witnessedThrough: IsoDate;
  /** Whole years from `witnessedFrom` to `witnessedThrough`; 0 when none. */
  readonly yearsWitnessed: number;
  /**
   * Days of that span the coverage records model the child as eligible for
   * public health coverage. Eligibility, not enrollment or care.
   */
  readonly daysEligibleForCoverage: number;
  /** The same, in years to one decimal place. */
  readonly yearsEligibleForCoverage: number;
  readonly entries: readonly ChildhoodRecordEntry[];
}

export function childhoodRecord(
  world: World,
  personId: EntityId,
): ChildhoodRecord | null {
  const person = world.people[personId];
  if (!person) return null;
  const witnessedFrom =
    person.birthDate > world.startedAt ? person.birthDate : world.startedAt;
  const lastDay = addDays(dateAtAge(person.birthDate, 18), -1);
  const witnessedThrough =
    world.currentDate < lastDay ? world.currentDate : lastDay;
  const empty = witnessedThrough < witnessedFrom;
  const days = empty
    ? 0
    : daysEligible(
        world,
        personId,
        witnessedFrom,
        addDays(witnessedThrough, 1),
      );
  return {
    personId,
    witnessedFrom,
    witnessedThrough,
    yearsWitnessed: empty ? 0 : ageOnDate(witnessedFrom, witnessedThrough),
    daysEligibleForCoverage: days,
    yearsEligibleForCoverage: Math.round((days / 365.25) * 10) / 10,
    entries: childhoodRecordEntries(world).filter(
      (entry) => entry.personId === personId,
    ),
  };
}

/**
 * Days in [from, until) inside an eligibility spell: a `covered` row starts
 * one on its effective date and the next not-covered row ends it on its own.
 * A spell with no recorded end runs to `until`.
 */
function daysEligible(
  world: World,
  personId: EntityId,
  from: IsoDate,
  until: IsoDate,
): number {
  const rows = healthCoverageRecords(world)
    .filter(
      (row) =>
        row.personId === personId && row.effectiveAt <= world.currentDate,
    )
    .slice()
    .sort(
      (a, b) =>
        a.effectiveAt.localeCompare(b.effectiveAt) || a.sequence - b.sequence,
    );
  let total = 0;
  let open: IsoDate | null = null;
  const close = (start: IsoDate, end: IsoDate) => {
    const s = start > from ? start : from;
    const e = end < until ? end : until;
    if (e > s) total += daysBetween(s, e);
  };
  for (const row of rows) {
    if (row.covered && open === null) open = row.effectiveAt;
    else if (!row.covered && open !== null) {
      close(open, row.effectiveAt);
      open = null;
    }
  }
  if (open !== null) close(open, until);
  return total;
}
