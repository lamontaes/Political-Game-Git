/**
 * Family 14: every reader uses the world's live population. In a drawn place, after a played
 * stretch, the town's, county's and state's governments read the count the world's records give
 * that day, and the nation is the sum of the state rows. A reader that kept the published count
 * (the old `referencePopulation`, a government row's frozen `residents`) fails here.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import {
  countyPopulation,
  nationPopulation,
  statePopulation,
  townPopulation,
} from "./live-population";
import { governmentResidents, governments } from "./modules/budgets";
import { coreAPI } from "./state";
import { townShareOf } from "./budgets-treasury";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it(
  "governments read the live count, which moves with the world's own people",
  { timeout: 900_000 },
  () => {
    setBookkeeping(false);
    const place = drawPlace(seed, "live-population");
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${seed}, place seed ${place.seed}`;
    process.stdout.write(`live-population: ${where}\n`);
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core;
    const api = coreAPI(core);
    const before = townPopulation(api);
    expect(before, where).toBeGreaterThan(0);
    const start = makeIsoDate(core.date);
    for (let month = 1; month <= 4; month += 1)
      advanceCore(core, addDays(start, 30 * month));
    const after = townPopulation(api);
    process.stdout.write(
      `live-population: town ${before} -> ${after} on ${core.date}; county ${countyPopulation(api, governments(api).find((g) => g.level === "county")?.id ?? "")}, state ${statePopulation(api, governments(api).find((g) => g.level === "state")!.id)}, nation ${nationPopulation(api)}\n`,
    );
    for (const gov of governments(api)) {
      const residents = governmentResidents(api, gov);
      if (gov.level === "city")
        expect(residents, `${where} ${gov.id}`).toBe(after);
      if (gov.level === "county")
        expect(residents, `${where} ${gov.id}`).toBe(
          countyPopulation(api, gov.id) || after,
        );
      if (gov.level === "state")
        expect(residents, `${where} ${gov.id}`).toBe(
          statePopulation(api, gov.id) ?? residents,
        );
      if (gov.level === "federal")
        expect(residents, `${where} ${gov.id}`).toBe(
          nationPopulation(api) ?? residents,
        );
      expect(residents, `${where} ${gov.id}`).toBeGreaterThan(0);
      // The town's share of any government is its live count over that government's.
      expect(townShareOf(api, gov), `${where} ${gov.id}`).toBeCloseTo(
        gov.level === "city" ? 1 : Math.min(1, after / residents),
        9,
      );
    }
  },
);
