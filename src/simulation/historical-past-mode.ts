import { recordsByKey } from "./history-index";
import { settleAllOfficeSalaries } from "./office-salary";
import type { EntityId, IsoDate, World } from "./types";

/** The same clock retains full player history and summarizes distant routine. */
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

const NEAR_PEOPLE = new WeakMap<object, Map<EntityId, Set<EntityId>>>();
interface TouchedJurisdictionCache {
  readonly focusId: EntityId;
  readonly date: IsoDate;
  readonly sources: readonly object[];
  readonly answers: Map<EntityId, boolean>;
}
const TOUCHED_JURISDICTIONS = new WeakMap<object, TouchedJurisdictionCache>();

/** All places actually recorded for the focus, rather than a fixed town list.
 * Future-dated plans do not make a town touched before the recorded date. */
export function historicalPlayerTouchesJurisdiction(
  world: World,
  jurisdictionId: EntityId,
): boolean {
  const focusId = world.pastMode?.focusPersonId;
  if (!focusId) return false;
  const sources = [
    world.history.events,
    world.history.householdMemberships,
    world.history.householdLocations,
    world.history.workRelationships,
    world.history.workRoles,
  ];
  let cache = TOUCHED_JURISDICTIONS.get(world.people);
  const priorSources = cache?.sources;
  if (
    !cache ||
    cache.focusId !== focusId ||
    cache.date !== world.currentDate ||
    sources.some((source, index) => source !== priorSources?.[index])
  ) {
    cache = { focusId, date: world.currentDate, sources, answers: new Map() };
    TOUCHED_JURISDICTIONS.set(world.people, cache);
  }
  const known = cache.answers.get(jurisdictionId);
  if (known !== undefined) return known;
  const answer = readHistoricalPlayerTouchesJurisdiction(
    world,
    focusId,
    jurisdictionId,
  );
  cache.answers.set(jurisdictionId, answer);
  return answer;
}

function readHistoricalPlayerTouchesJurisdiction(
  world: World,
  focusId: EntityId,
  jurisdictionId: EntityId,
): boolean {
  if (world.people[focusId]?.homeJurisdictionId === jurisdictionId) return true;
  const events = recordsByKey(
    world.history.events,
    "historical-past:focus-events",
    (row) => [
      ...row.involvedEntityIds,
      ...row.participants.map((p) => p.personId),
    ],
    focusId,
  );
  if (
    events.some(
      (row) =>
        row.occurredAt <= world.currentDate &&
        (row.jurisdictionId === jurisdictionId ||
          row.context.location?.jurisdictionId === jurisdictionId),
    )
  )
    return true;
  const memberships = recordsByKey(
    world.history.householdMemberships,
    "historical-past:focus-memberships",
    (row) => [row.personId],
    focusId,
  );
  for (const membership of memberships) {
    if (membership.startedAt > world.currentDate) continue;
    if (
      recordsByKey(
        world.history.householdLocations,
        "historical-past:household-locations",
        (row) => [row.householdId],
        membership.householdId,
      ).some(
        (row) =>
          row.effectiveAt <= world.currentDate &&
          row.jurisdictionId === jurisdictionId,
      )
    )
      return true;
  }
  const work = recordsByKey(
    world.history.workRelationships,
    "historical-past:focus-work",
    (row) => [row.personId],
    focusId,
  );
  return work.some(
    (relationship) =>
      relationship.startedAt <= world.currentDate &&
      recordsByKey(
        world.history.workRoles,
        "historical-past:work-locations",
        (row) => [row.workRelationshipId],
        relationship.id,
      ).some(
        (row) =>
          row.effectiveAt <= world.currentDate &&
          row.locationJurisdictionId === jurisdictionId,
      ),
  );
}

/** Player-touched towns, relatives and contacts retain ordinary payroll.
 * A distant actor's goal does not change their town's historical resolution. */
export function distantHistoricalRoutine(
  world: World,
  personId: EntityId,
): boolean {
  const mode = world.pastMode;
  if (!mode || world.currentDate > mode.throughDate) return false;
  if (personId === mode.focusPersonId) return false;
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
  const home = world.people[personId]?.homeJurisdictionId;
  if (home && historicalPlayerTouchesJurisdiction(world, home)) return false;
  const families: readonly (readonly [
    string,
    readonly { readonly personIds: readonly EntityId[] }[],
  ])[] = [
    ["kinship", world.history.kinshipRelationships],
    ["partnership", world.history.partnerships],
    ["interaction", world.history.relationshipInteractions],
  ];
  for (const [family, rows] of families) {
    const related = recordsByKey(
      rows,
      `historical-past:${family}`,
      (row) => row.personIds,
      mode.focusPersonId,
    );
    if (related.some((row) => row.personIds.includes(personId))) return false;
  }
  return true;
}
