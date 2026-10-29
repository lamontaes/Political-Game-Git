import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { homePriceRatio } from "./housing-prices";
import { createLifeCore } from "./life";
import {
  HOUSING_MODULE,
  ownedHomes,
  townFiguresByPlace,
} from "./modules/housing";
import { worldCoreData } from "./modules/world";
import { collapseToTwoLevels } from "./residents";
import { coreAPI } from "./state";
import type { CoreInput, Source } from "./types";

const seed = randomBytes(16).toString("hex");
const place = drawPlace(seed, "housing-reader");
const date = "2026-01-01";
const source: Source = {
  tag: "ESTIMATED",
  asOf: date,
  citation:
    "Technical housing reader fixture; ordinary-year proof is separate.",
};

describe(`housing reads in ${place.name}, seed ${seed}`, () => {
  it("filters both tiers without changing values and rereads changed opening dates", () => {
    const people = ["full", "counted", "elsewhere", "renter"].map((id) => ({
      id,
      givenName: id,
      familyName: "Fixture",
      birthDate: "1980-01-01",
      placeId: id === "elsewhere" ? "place:elsewhere" : place.key,
      householdId: `home:${id}`,
      tier: "monthly",
      traits: {},
      liquidMinor: 0,
      livingCostDailyMinor: 0,
      familyIds: [],
      knownIds: [],
      source,
    }));
    const input: CoreInput = {
      seed,
      startedAt: date,
      people,
      households: people.map((p) => ({
        id: p.householdId,
        placeId: p.placeId,
        memberIds: [p.id],
        source,
      })),
      organizations: [],
      jobs: [],
      focusPersonIds: [],
      focusPlaceIds: [],
      calendarDates: [],
      gaps: [],
      placeMetadata: { housingState: place.state.slice(3) },
    };
    const core = createLifeCore(
      collapseToTwoLevels(input, { keep: new Set(["full", "elsewhere"]) }),
      { data: worldCoreData(), modules: [HOUSING_MODULE] },
    );
    const api = coreAPI(core),
      state = api.moduleState("housing");
    for (const p of people)
      state.table("dwellings").put({
        id: `dwelling:${p.householdId}`,
        householdId: p.householdId,
        tenure: p.id === "renter" ? "rent" : "own",
        rentMinor: 35000,
        valueMinor: 10000000,
        basis: p.id === "elsewhere" ? "purchase" : "opening",
      });
    state.table("state").put({ id: "housing:state", openedAt: "2021-01-01" });
    const all = ownedHomes(api),
      local = ownedHomes(api, place.key);
    expect(local).toEqual(all.filter((row) => row.placeId === place.key));
    expect(local.map((row) => row.householdId).sort()).toEqual([
      "home:counted",
      "home:full",
    ]);
    expect(core.people.has("counted")).toBe(false);
    expect(ownedHomes(api, "place:absent")).toEqual([]);
    state.table("state").put({ id: "housing:state", openedAt: date });
    expect(ownedHomes(api, place.key).map((row) => row.valueMinor)).toEqual([
      10000000, 10000000,
    ]);
    expect(all.find((row) => row.householdId === "home:full")?.valueMinor).toBe(
      Math.round(
        10000000 *
          homePriceRatio(place.state.slice(3), "2021-01-01", date, core.seed),
      ),
    );
    expect(ownedHomes(api, "place:elsewhere")[0]?.valueMinor).toBe(10000000);
    const batch = townFiguresByPlace(
      api,
      new Set([place.key, "place:elsewhere", "place:absent"]),
    );
    expect(batch.get(place.key)).toEqual({
      homeValueMinor: 10000000,
      rentMinor: 35000,
      monthlyPayMinor: 0,
      renters: 1,
    });
    expect(batch.get("place:elsewhere")).toEqual({
      homeValueMinor: 10000000,
      rentMinor: 0,
      monthlyPayMinor: 0,
      renters: 0,
    });
    expect(batch.get("place:absent")).toEqual({
      homeValueMinor: 0,
      rentMinor: 0,
      monthlyPayMinor: 0,
      renters: 0,
    });
    expect(townFiguresByPlace(api, new Set()).size).toBe(0);
  });
});
