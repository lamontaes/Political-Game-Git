/**
 * A counted person's death is preceded by a serious illness, from the same
 * rule as a full person's (the health engine: an illness begins, a course of
 * `remainingDaysAfterOnset` days runs, then the death). The counted flows pick
 * who falls ill the month the group's deaths come owed, by the same life-table
 * share they always used, and the death follows when the course ends. One row
 * per ill counted person, in the renewal engine's `countedIllness` table; when
 * a counted person is filled in, the health engine reads that row so their
 * record matches the group (`giveHealthRecord`).
 */
import { remainingDaysAfterOnset } from "./death-causes";
import type { ModuleRow } from "./module-data";
import type { CoreAPI, IsoDate, PersonId, PlaceId } from "./types";

export const COUNTED_ILLNESS_TABLE = "countedIllness";
const RENEWAL_MODULE = "core2-renewal-v1";

export interface CountedIllnessRow {
  id: PersonId;
  placeId: PlaceId;
  onsetDate: IsoDate;
  /** The day the course ends in death, unless the person is filled in first. */
  dueDate: IsoDate;
  /** The monthly counts row of the month the illness began (the group's record). */
  countsId: string;
}

const store = (api: CoreAPI) =>
  api.state.modules.has(RENEWAL_MODULE)
    ? api.moduleState(RENEWAL_MODULE).table(COUNTED_ILLNESS_TABLE)
    : undefined;

/** The days a counted person's illness runs, as a full person's does. */
export function countedCourseDays(age: number): number {
  return remainingDaysAfterOnset({ age, severity: 1, covered: null });
}

/** The ill counted people of a place. */
export function illInPlace(
  api: CoreAPI,
  placeId: PlaceId,
): readonly CountedIllnessRow[] {
  return (store(api)?.query("byPlace", [placeId]) ??
    []) as unknown as CountedIllnessRow[];
}

export function bookCountedIllness(api: CoreAPI, row: CountedIllnessRow): void {
  store(api)?.put(row as unknown as ModuleRow);
}

export function endCountedIllness(api: CoreAPI, personId: PersonId): void {
  store(api)?.remove(personId);
}

/** The illness a counted person has now, if any; nothing for a full person. */
export function countedIllnessOf(
  api: CoreAPI,
  personId: PersonId,
): CountedIllnessRow | undefined {
  return store(api)?.get(personId) as unknown as CountedIllnessRow | undefined;
}
