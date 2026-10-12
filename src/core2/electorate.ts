/**
 * The town's counted residents as voters (two-level population): each counted
 * adult votes from their own record (age, traits, work hours) without being
 * filled in as a full person. Filled-in residents are full people and vote
 * through the named route.
 */
import { registerCountedPeople } from "./campaign-views";
import { residentsRuntime } from "./modules/residents";
import type { CoreState, PersonInput } from "./types";

export interface CountedVoter {
  readonly id: string;
  readonly birthDate: string;
  readonly placeId: string;
  readonly traits: Readonly<Record<string, number>>;
  /** Scheduled weekly work, from their recorded commitments. */
  readonly weeklyMinutes: number;
}

const cache = new WeakMap<CoreState, { date: string; rows: CountedVoter[] }>();

/** Every counted resident still counted (not filled in), with their record's facts. */
export function countedResidents(core: CoreState): readonly CountedVoter[] {
  const hit = cache.get(core);
  if (hit && hit.date === core.date) return hit.rows;
  const rt = residentsRuntime(core);
  const rows: CountedVoter[] = [];
  if (rt)
    for (const record of rt.households.values()) {
      if (rt.filledIn.has(record.household.id)) continue;
      const minutes = new Map<string, number>();
      for (const c of record.workCommitments)
        if (c.endsAt === undefined || c.endsAt > core.date)
          minutes.set(
            c.personId,
            (minutes.get(c.personId) ?? 0) + c.expectedWeeklyMinutes,
          );
      for (const person of record.people as readonly PersonInput[]) {
        if (core.people.has(person.id)) continue;
        rows.push({
          id: person.id,
          birthDate: person.birthDate,
          placeId: person.placeId,
          traits: person.traits,
          weeklyMinutes: minutes.get(person.id) ?? 0,
        });
      }
    }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  cache.set(core, { date: core.date, rows });
  return rows;
}

/** Let the counted residents rank with the full people for lean. */
export function registerElectorate(core: CoreState): void {
  registerCountedPeople(core.people, () => countedResidents(core));
}
