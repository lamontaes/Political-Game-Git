import type { World } from "./types";
/** Saved arrivals remain evidence even after a resident moves, changes jobs or dies. */
export function assertImmigrationAdmissionIntegrity(world: World): void {
  const keys = new Set<string>(),
    people = new Set<string>();
  const measures = new Set(world.history.legislativeMeasures?.map((r) => r.id));
  for (const row of world.immigrationAdmissions ?? []) {
    if (
      keys.has(row.key) ||
      !measures.has(row.measureId) ||
      !world.jurisdictions[row.townId] ||
      !/^US-[A-Z]{2}$/.test(row.stateKey) ||
      row.arrivedOn > world.currentDate ||
      !Number.isSafeInteger(row.householdIndex) ||
      row.householdIndex < 0 ||
      !row.personIds.length ||
      !row.basis.trim()
    )
      throw Error("Invalid saved immigration admission");
    keys.add(row.key);
    for (const id of row.personIds) {
      if (people.has(id) || !world.people[id])
        throw Error(
          "An immigration admission must name distinct recorded residents",
        );
      people.add(id);
    }
  }
}
