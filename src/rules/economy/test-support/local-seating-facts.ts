/** Raw business/wage tables, geographic population sources, original numeric words and separately owned WHO identity/name/birth records. */
import { SeededRng } from "../../../simulation/rng";
import { LOCAL_BUSINESS_KINDS } from "../../../simulation/local-economy";
import { lifePlaceByJurisdictionId } from "../../../simulation/life-places";
import { countyLandSharesForPlace } from "../../../simulation/government-units";
import { placeReferencePopulation } from "../../../simulation/nationwide-world/place-population";
import {
  COUNTY_BUSINESS_ROWS,
  STATE_BUSINESS_ROWS,
  SALES_PER_EMPLOYEE_ROWS,
  LOCAL_BUSINESS_COUNT_KINDS,
} from "../../../simulation/local-business-counts.generated";
import {
  PLACE_COUNTY_RELATIONS_ROWS,
  PLACE_COUNTY_RELATIONS_META,
} from "../../../simulation/place-county-relations.generated";
import { NATIONAL_PLACES_ROWS } from "../../../simulation/national-places.generated";
import {
  inventedPersonAge,
  inventedPersonBirthDate,
  type InventedPersonRole,
} from "../../../simulation/invented-person-age";
import {
  DISTINCT_GIVEN_NAME_GENERATION_VERSION,
  drawCanonicalNameForGender,
} from "../../../simulation/people";
import { generatePersonIdentity } from "../../../simulation/person-identity";
import { nameCorpusVersionForWorld } from "../../../simulation/place-name-corpus";
import { employerWageFacts } from "./employer-wage-facts";
import {
  localSeatingSourceKey,
  type LocalSeatingFacts,
} from "../local-seating";
import type { World, EntityId } from "../../../simulation/types";
const populations = new Map<
  string,
  ReturnType<typeof placeReferencePopulation>
>();
for (const [key] of JSON.parse(NATIONAL_PLACES_ROWS) as [
  string,
  ...unknown[],
][])
  populations.set(key, placeReferencePopulation(key));
const cache = new Map<
  string,
  Pick<LocalSeatingFacts, "words" | "identities">
>();
export function localSeatingFacts(
  world: World,
  town: EntityId,
): LocalSeatingFacts {
  const places = new Map(
    world.jurisdictionOrder.map((id) => [id, lifePlaceByJurisdictionId(id)]),
  );
  const geoids = [...places.values()].flatMap((p) =>
    p?.sourceGeoid ? [p.sourceGeoid] : [],
  );
  const key = localSeatingSourceKey(world.seed, town, world.currentDate);
  let source = cache.get(key);
  if (!source) {
    const words = new Map<string, readonly number[]>(),
      identities = new Map<
        string,
        LocalSeatingFacts["identities"] extends ReadonlyMap<string, infer V>
          ? V
          : never
      >();
    const rng = new SeededRng(world.seed).fork("local-businesses:" + town),
      corpus = nameCorpusVersionForWorld(world, town);
    for (const kind of LOCAL_BUSINESS_KINDS)
      for (let index = 0; index < 2; index++) {
        const fork = index === 0 ? kind.key : kind.key + ":" + (index + 1),
          kindRng = rng.fork(fork),
          numeric = rng.fork(fork);
        words.set(
          fork,
          Array.from({ length: 32 }, () => numeric.next() * 0x100000000),
        );
        for (const role of ["owner", "worker:1", "worker:2", "worker:3"]) {
          const person = kindRng.fork(role),
            identity = generatePersonIdentity(person.fork("identity")),
            ageRole: InventedPersonRole =
              role === "owner" ? "business-owner" : "business-worker";
          const names = Array.from({ length: 8 }, (_, attempt) =>
            drawCanonicalNameForGender(
              person.fork(attempt === 0 ? "name" : "name:" + attempt),
              identity.gender,
              corpus,
              DISTINCT_GIVEN_NAME_GENERATION_VERSION,
            ),
          );
          identities.set(localSeatingSourceKey(fork, role), {
            names,
            identity,
            birthDate: inventedPersonBirthDate(person.fork("age"), {
              role: ageRole,
              referenceDate: world.currentDate,
              age: inventedPersonAge(person, ageRole),
            }),
          });
        }
      }
    source = { words, identities };
    cache.set(key, source);
  }
  return {
    id: world.id,
    currentDate: world.currentDate,
    jurisdictions: world.jurisdictions,
    records: world.history,
    ...source,
    wage: employerWageFacts(world),
    supply: {
      kinds: LOCAL_BUSINESS_COUNT_KINDS,
      countyRows: COUNTY_BUSINESS_ROWS,
      stateRows: STATE_BUSINESS_ROWS,
      salesRows: SALES_PER_EMPLOYEE_ROWS,
      countyRelationsRows: PLACE_COUNTY_RELATIONS_ROWS,
      nationalPlacesRows: NATIONAL_PLACES_ROWS,
      geographyAsOf: PLACE_COUNTY_RELATIONS_META.geographyAsOf,
      places,
      populations,
      landShares: new Map(geoids.map((g) => [g, countyLandSharesForPlace(g)])),
    },
  };
}
