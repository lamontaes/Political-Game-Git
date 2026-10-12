/** Raw compiled places/counties, full saved records and the already lifted law source; no HUD, rent, household or pay math selection. */
import { lifePlaceByJurisdictionId } from "../../../simulation/life-places";
import { countyGeoidsForPlace } from "../../../simulation/government-units";
import { lawFacts } from "../../laws/test-support/law-facts";
import { HOUSING_SUPPLY_LAWS } from "../housing-prices";
import { RENT_LAW_KEYS, type RentReadingFacts } from "../rent-readings";
import type { World, IsoDate } from "../../../simulation/types";
export function rentReadingFacts(
  world: World,
  dates: readonly IsoDate[],
): RentReadingFacts {
  const questions = Object.values(world.policyCatalog.propositions)
    .filter((row) =>
      (
        [
          ...HOUSING_SUPPLY_LAWS,
          ...Object.values(RENT_LAW_KEYS),
        ] as readonly string[]
      ).includes(row.stableKey),
    )
    .map((row) => row.id);
  const allDates = [
    ...new Set([
      ...dates,
      world.currentDate,
      ...(world.macroEconomy?.months ?? []).map((row) => row.recordedAt),
    ]),
  ];
  const ids = [
    ...new Set([
      ...world.jurisdictionOrder,
      ...world.history.dwellings.map((row) => row.jurisdictionId),
    ]),
  ];
  const places = new Map(ids.map((id) => [id, lifePlaceByJurisdictionId(id)]));
  return {
    currentDate: world.currentDate,
    records: world.history,
    people: world.people,
    policyCatalog: world.policyCatalog,
    macroEconomy: world.macroEconomy,
    laws: lawFacts(world, questions, allDates, [undefined]),
    places,
    counties: new Map(
      [...places.values()].flatMap((place) =>
        place?.sourceGeoid
          ? [
              [
                place.sourceGeoid,
                countyGeoidsForPlace(place.sourceGeoid),
              ] as const,
            ]
          : [],
      ),
    ),
  };
}
