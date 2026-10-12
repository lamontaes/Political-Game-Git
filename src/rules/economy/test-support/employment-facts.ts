/** Full raw records, dated life/jail/profile, compiled geography/institution sources and original unfiltered numeric naming words. No hire/role/name selection is borrowed. */
import { SeededRng } from "../../../simulation/rng";
import { lifePlaceByJurisdictionId } from "../../../simulation/life-places";
import {
  countyGeoidsForPlace,
  countyGovernmentUnitsForPlace,
} from "../../../simulation/government-units";
import { localInstitutionsFor } from "../../../simulation/local-institutions";
import {
  organizationClosingAt,
  organizationProfileAt,
} from "../../../simulation/life-queries";
import { jailTermOn } from "../../../simulation/justice/jail-terms";
import { drawCanonicalNameForGender } from "../../../simulation/people";
import { nameCorpusVersionForWorld } from "../../../simulation/place-name-corpus";
import { TOWN_WORKPLACES } from "../../../simulation/living-world/town-employment";
import {
  employmentSourceKey,
  type EmploymentFacts,
  TOWN_EMPLOYMENT_VERSION,
} from "../employment";
import type { World, EntityId } from "../../../simulation/types";
const cache = new Map<
  string,
  { positions: Map<string, readonly number[]>; families: Map<string, string> }
>();
export function employmentFacts(world: World, town: EntityId): EmploymentFacts {
  const ids = [...new Set([...world.jurisdictionOrder, town])],
    places = new Map(ids.map((id) => [id, lifePlaceByJurisdictionId(id)])),
    geoids = [...places.values()].flatMap((place) =>
      place?.sourceGeoid ? [place.sourceGeoid] : [],
    );
  const key = employmentSourceKey(world.seed, town),
    names = cache.get(key) ?? {
      positions: new Map<string, readonly number[]>(),
      families: new Map<string, string>(),
    };
  cache.set(key, names);
  for (const workplace of TOWN_WORKPLACES) {
    const stem = `${TOWN_EMPLOYMENT_VERSION}:${town}:employer:${workplace.key}:`,
      outlets = new Set([
        ...Array.from({ length: workplace.outlets }, (_, index) => index),
        ...world.history.organizations
          .filter((row) => row.stableKey.startsWith(stem))
          .map((row) => Number(row.stableKey.slice(stem.length))),
      ]);
    for (const outlet of outlets) {
      const stableKey = stem + outlet;
      if (names.positions.has(employmentSourceKey(stableKey, "name-style")))
        continue;
      const rng = new SeededRng(world.seed).fork(stableKey);
      for (const fork of [
        "name-style",
        ...Array.from(
          { length: 128 },
          (_, attempt) => `name:${attempt}:family`,
        ),
      ]) {
        const producer =
          fork === "name-style"
            ? rng.fork(fork)
            : rng.fork(fork.slice(0, -7)).fork("family");
        names.positions.set(
          employmentSourceKey(stableKey, fork),
          Array.from({ length: 16 }, () => producer.next() * 0x1_0000_0000),
        );
      }
      if (
        !world.personOrder.some(
          (id) =>
            world.people[id]?.homeJurisdictionId === town &&
            world.people[id]?.familyName,
        )
      )
        for (let attempt = 0; attempt < 128; attempt++)
          names.families.set(
            employmentSourceKey(stableKey, attempt),
            drawCanonicalNameForGender(
              rng.fork(`name:${attempt}`).fork("family"),
              "unstated",
              nameCorpusVersionForWorld(world, town),
            ).familyName,
          );
    }
  }
  return {
    id: world.id,
    currentDate: world.currentDate,
    records: world.history,
    people: world.people,
    personOrder: world.personOrder,
    townFinances: world.townFinances,
    publicBudgets: world.publicBudgets,
    places,
    counties: new Map(geoids.map((id) => [id, countyGeoidsForPlace(id)])),
    countyGovernments: new Map(
      geoids.map((id) => [id, countyGovernmentUnitsForPlace(id)]),
    ),
    institutions: new Map(
      ids.map((id) => [id, localInstitutionsFor(world, id)]),
    ),
    profiles: new Map(
      world.history.organizations.map((row) => [
        row.id,
        organizationProfileAt(world, row.id),
      ]),
    ),
    closings: new Map(
      world.history.organizations.map((row) => [
        row.id,
        organizationClosingAt(world, row.id),
      ]),
    ),
    jail: new Map(world.personOrder.map((id) => [id, jailTermOn(world, id)])),
    positions: names.positions,
    families: names.families,
  };
}
