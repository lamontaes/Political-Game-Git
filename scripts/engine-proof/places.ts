import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import {
  lifePlaceByKey,
  stateJurisdictionForKey,
  searchLifePlaces,
} from "../../src/simulation/life-places";
import { SeededRng } from "../../src/simulation/rng";
import { personName } from "../../src/simulation/people";
import type { World } from "../../src/simulation/types";

/** Random selection is for proof coverage only; it makes no simulation decision. */
export function nationalPlacePlan(seed: string, watchedCount = 5) {
  const keys = Object.keys(nominationRules.places).sort();
  if (keys.length !== 56)
    throw new Error(`Expected 56 source jurisdictions, found ${keys.length}`);
  if (
    !Number.isSafeInteger(watchedCount) ||
    watchedCount < 1 ||
    watchedCount > keys.length
  )
    throw new Error("Watched count must be 1–56");
  const rng = new SeededRng(`engine-proof:${seed}`);
  const rows = keys.map((jurisdictionKey) => {
    const places = searchLifePlaces("", 100_000, {
      stateJurisdictionKey: jurisdictionKey,
    }).filter((p) => p.scope !== "state");
    if (!places.length)
      throw new Error(`No source-backed locality for ${jurisdictionKey}`);
    const place = places[rng.nextUint32() % places.length]!;
    return {
      jurisdictionKey,
      seed: `${seed}:${jurisdictionKey}`,
      placeKey: place.key,
      placeName: place.displayName,
      availablePlaces: places.length,
    };
  });
  const shuffled = [...rows];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = rng.nextUint32() % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return {
    seed,
    source:
      "data/research/elections/party-nomination-rules-2026.json + life-places generated identities",
    jurisdictions: rows,
    watched: shuffled.slice(0, watchedCount),
  };
}
/** Direct event jurisdictions only: no guessed local-to-state rollup. */
export function nationalHistoryTable(world: World) {
  return nationalPlacePlan(world.seed, 1).jurisdictions.map((row) => {
    const id = stateJurisdictionForKey(row.jurisdictionKey)?.id ?? null;
    const events = id
      ? world.history.events.filter((e) => e.jurisdictionId === id)
      : [];
    return {
      jurisdictionKey: row.jurisdictionKey,
      jurisdictionId: id,
      present: id !== null && world.jurisdictions[id] !== undefined,
      directEvents: events.length,
      eventTypes: [...new Set(events.map((e) => e.type))].sort(),
    };
  });
}
export function watchedIdentity(
  world: World,
  anchorPersonId: string,
  placeKey: string,
) {
  const person = world.people[anchorPersonId];
  if (!person) throw new Error("Watched anchor must be a saved person");
  const place = lifePlaceByKey(placeKey);
  if (!place) throw new Error("Watched place must be source-backed");
  return {
    seed: world.seed,
    personId: person.id,
    personName: personName(person),
    placeKey,
    placeName: place.displayName,
    jurisdictionKey: place.stateJurisdictionKey,
  };
}
