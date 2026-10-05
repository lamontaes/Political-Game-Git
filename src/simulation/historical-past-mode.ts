import { growingIndex, type GrowingIndexKind } from "./history-index";
import { settleAllOfficeSalaries } from "./office-salary";
import type { EntityId, GoalStateRecord, IsoDate, World } from "./types";

/** The same clock runs every decision; only distant routine pay is summarized. */
export interface HistoricalPastMode {
  readonly kind: "historical-past-v1";
  readonly focusPersonId: EntityId;
  readonly throughDate: IsoDate;
}

export function beginHistoricalPastMode(
  world: World,
  focusPersonId: EntityId,
  throughDate: IsoDate,
): World {
  if (world.control.kind !== "observer" || !world.people[focusPersonId])
    throw new Error(
      "The historical past requires its existing resident and observer World.",
    );
  if (throughDate < world.currentDate)
    throw new Error("The historical boundary is already past.");
  return {
    ...world,
    pastMode: { kind: "historical-past-v1", focusPersonId, throughDate },
  };
}

/** Close the existing salary writer before returning the same World to Begin. */
export function endHistoricalPastMode(world: World): World {
  if (!world.pastMode) return world;
  if (world.currentDate !== world.pastMode.throughDate)
    throw new Error(
      "The historical past has not reached its recorded boundary.",
    );
  const settled = settleAllOfficeSalaries(world);
  const preserved = { ...settled };
  delete preserved.pastMode;
  return preserved;
}

const GOAL_PEOPLE: GrowingIndexKind<Set<EntityId>> = {
  create: () => new Set(),
  add: (people, row) => people.add((row as GoalStateRecord).personId),
};
const NEAR_PEOPLE = new WeakMap<object, Map<EntityId, Set<EntityId>>>();

/** Residents with private goals, relatives and contacts retain ordinary payroll. */
export function distantHistoricalRoutine(
  world: World,
  personId: EntityId,
): boolean {
  const mode = world.pastMode;
  if (!mode || world.currentDate > mode.throughDate) return false;
  if (
    personId === mode.focusPersonId ||
    growingIndex(GOAL_PEOPLE, world.history.goalStates).has(personId)
  )
    return false;
  const focus = world.people[mode.focusPersonId];
  if (!focus) throw new Error("The historical resident is missing.");
  let byFocus = NEAR_PEOPLE.get(world.people);
  if (!byFocus) {
    byFocus = new Map();
    NEAR_PEOPLE.set(world.people, byFocus);
  }
  let nearby = byFocus.get(mode.focusPersonId);
  if (!nearby) {
    nearby = new Set(
      world.personOrder.filter(
        (id) =>
          world.people[id]?.homeJurisdictionId === focus.homeJurisdictionId,
      ),
    );
    byFocus.set(mode.focusPersonId, nearby);
  }
  if (nearby.has(personId)) return false;
  for (const rows of [
    world.history.kinshipRelationships,
    world.history.partnerships,
    world.history.relationshipInteractions,
  ])
    for (const row of rows)
      if (
        row.personIds.includes(mode.focusPersonId) &&
        row.personIds.includes(personId)
      )
        return false;
  return true;
}
