import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import {
  searchLifePlaces,
  type LifePlace,
} from "../../src/simulation/life-places";
import { SeededRng } from "../../src/simulation/rng";

/**
 * A place drawn at random for a watched run, reproducibly from `seed`: first
 * one of the 56 jurisdictions (50 states, D.C. and the five territories),
 * then one of its towns, cities or counties. Watched runs name the drawn
 * place and the seed rather than returning to the same few places by habit
 * (CTO rulings, 9/28/2026 11:00 p.m.). A caller that needs a kind of place
 * passes `accept` and the draw continues until one fits.
 */
export function drawRandomPlace(
  seed: string,
  accept: (place: LifePlace) => boolean = () => true,
): LifePlace {
  const rng = new SeededRng(`random-place:${seed}`);
  const jurisdictions = Object.keys(
    (nominationRules as { places: Record<string, unknown> }).places,
  ).sort();
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const state = jurisdictions[rng.nextUint32() % jurisdictions.length]!;
    const places = searchLifePlaces("", 100_000, {
      stateJurisdictionKey: state,
    }).filter((place) => place.scope !== "state" && accept(place));
    if (places.length === 0) continue;
    return places[rng.nextUint32() % places.length]!;
  }
  throw new Error(`No place fits the draw for seed ${seed}.`);
}
