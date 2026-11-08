/* eslint-disable @typescript-eslint/no-explicit-any */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { gameStartDate } from "../../src/core2/game-start";
import { countedResidents } from "../../src/core2/electorate";
import { countyPlaceOfWorld } from "../../src/core2/opening-county-sample";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { ageInYears } from "../../src/core2/kernel/dates";
setBookkeeping(false);
for (const seed of process.argv.slice(2)) {
  const place = drawPlace(seed, "elections");
  const { core } = buildBenchWorld(place.seed, gameStartDate(), { twoLevel: true, placeKey: place.key });
  const county = countyPlaceOfWorld(core as any);
  const v = countedResidents(core).filter((x) => x.placeId === county && ageInYears(x.birthDate, core.date) >= 18);
  const all = countedResidents(core).filter((x) => ageInYears(x.birthDate, core.date) >= 18);
  const byPlace = new Map<string, number>(); for (const x of countedResidents(core)) byPlace.set(x.placeId, (byPlace.get(x.placeId) ?? 0) + 1);
  console.log("places", [...byPlace], "county", county, "town", (core.placeMetadata as any).placeKey);
  console.log(place.name, seed, "county adult records", v.length, "(weighted", Math.round(v.reduce((n, x) => n + x.weight, 0)), ") party active", v.filter((x) => (x.partyActivity ?? 0) > 0).length, "weighted", Math.round(v.filter((x) => (x.partyActivity ?? 0) > 0).reduce((n, x) => n + x.weight, 0)), "owners", v.filter((x) => x.ownedEmployerId).length, "civic", v.filter((x) => x.civicRoles?.length).length, "| all counted adults active", all.filter((x) => (x.partyActivity ?? 0) > 0).length, "of", all.length);
}
