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

it.each([0, 1, 2])(
  "governments read the live count, which moves with the world's own people (draw %i)",
  { timeout: 1_800_000 },
  (draw) => {
    setBookkeeping(false);
    // A place where every adult lives in group quarters has no one to play:
    // name it, pass over it and draw the next, at most twelve times.
    const passed: string[] = [];
    let drawn: ReturnType<typeof drawPlace> | undefined;
    let world: ReturnType<typeof buildBenchWorld> | undefined;
    for (let attempt = 0; attempt < 12 && !world; attempt += 1) {
      const place = drawPlace(
        seed,
        attempt === 0
          ? `live-population:${draw}`
          : `live-population:${draw}:${attempt}`,
      );
      process.stdout.write(
        `live-population: ${place.name}, ${place.state} (${place.key}), run seed ${seed}, place seed ${place.seed}\n`,
      );
      try {
        world = buildBenchWorld(place.seed, gameStartDate(), {
          twoLevel: true,
          placeKey: place.key,
        });
        drawn = place;
      } catch (error) {
        if ((error as Error).name !== "NoPlayerHereError") throw error;
        passed.push(`${place.name} (${place.key}): no one to play`);
      }
    }
    if (!world || !drawn)
      throw new Error(`no drawn place had a player: ${passed.join("; ")}`);
    const place = drawn;
    const where = `${place.name}, ${place.state} (${place.key}), run seed ${seed}, place seed ${place.seed}${passed.length ? `, passed over ${passed.join("; ")}` : ""}`;
    const core = world.core;
    const api = coreAPI(core);
    const before = townPopulation(api);
    expect(before, where).toBeGreaterThan(0);
    const start = makeIsoDate(core.date);
    for (let month = 1; month <= 12; month += 1)
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
      // A county holds the town and everyone else in it.
      if (gov.level === "county")
        expect(residents, `${where} ${gov.id}`).toBeGreaterThanOrEqual(after);
      // The town's share of any government is its live count over that government's.
      expect(townShareOf(api, gov), `${where} ${gov.id}`).toBeCloseTo(
        gov.level === "city" ? 1 : Math.min(1, after / residents),
        9,
      );
    }
  },
);
