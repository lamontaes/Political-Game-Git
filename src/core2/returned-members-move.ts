/**
 * The step that takes the records of people returned to the counts away with
 * their counted household when it moves (pool item
 * core-press-staff-counted-job-not-resident). It tells the move as a full
 * mover's, and sits in this file, which imports no engine, so the counted
 * moves engine calls it as a household leaves without importing the moves
 * engine (an import between them left `MOVED_AWAY_EVENT` uninitialized when
 * the parties module loaded) and in every world that moves counted households,
 * whether or not the moves engine is installed.
 */
import { MOVED_AWAY_EVENT } from "./moved-away-event";
import { coreStateJurisdiction } from "./place-lookup";
import { placeStateKey } from "./place-map";
import type {
  CoreAPI,
  CoreState,
  PersonId,
  PersonState,
  Source,
} from "./types";

/**
 * The people of a departed counted household who keep their own records
 * leave with it: their records move to the state the household went to, as a
 * full mover's do (`destinationFor`'s state basis), and the move is
 * told as a full mover's is, so every engine holding their records lets them
 * go (a search for work, an office, a party). Without it a record stayed in
 * the counted town with no household behind it, a hire named that person, and
 * the press's fill-in of the new hire stopped the game (pool item
 * core-press-staff-counted-job-not-resident; Montpelier, Vermont, seed mont1,
 * 2027; South Hero, Vermont, seed 9bf1ede27ce5a00e).
 */
export function returnedMembersLeave(
  api: CoreAPI,
  people: readonly PersonState[],
  fromPlace: string,
  toUsps: string,
): void {
  if (!people.length) return;
  const core = api.state as CoreState;
  const date = core.date;
  const destination =
    coreStateJurisdiction(`US-${toUsps}`)?.id ??
    coreStateJurisdiction(placeStateKey(fromPlace) ?? "")?.id;
  if (!destination) return;
  const source: Source = {
    tag: "ESTIMATED",
    asOf: date,
    citation: `Moved away with their counted household (${toUsps}).`,
    estimatedFrom: "Counted moves: the household's destination state",
  };
  // One relocation per household record they share.
  const byHousehold = new Map<string, PersonState[]>();
  for (const person of people)
    byHousehold.set(person.householdId, [
      ...(byHousehold.get(person.householdId) ?? []),
      person,
    ]);
  for (const [householdId, movers] of byHousehold) {
    const ids = movers.map((person) => person.id);
    const home = core.households.get(householdId);
    const whole =
      home?.memberIds
        .filter((id) => core.people.get(id)?.alive)
        .every((id) => ids.includes(id as PersonId)) ?? false;
    api.relocatePeopleV1({
      personIds: ids,
      placeId: destination,
      householdId: whole ? householdId : `${householdId}:moved:${date}`,
      source,
    });
  }
  api.emit({
    id: `${MOVED_AWAY_EVENT}:counted:${people[0]!.id}:${date}`,
    date,
    kind: MOVED_AWAY_EVENT,
    personIds: people.map((person) => person.id),
    placeId: fromPlace,
    publicRecord: false,
    topic: destination,
    source,
    facts: Object.fromEntries(
      people.map((person) => [`person:${person.id}:residence`, destination]),
    ),
  });
}
