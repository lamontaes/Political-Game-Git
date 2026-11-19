import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore, createLifeCore } from "./life";
import { buildPopulation } from "./population";
import { climateNow, openClimate } from "./modules/climate";
import { setHistoryMode } from "./modules/elections";
import { openLaws } from "./modules/laws";
import { coreAPI } from "./state";

const seed = process.env.CLIMATE_SEED ?? randomBytes(16).toString("hex");
const SMALL_TOWN = 30;

/** One world with the same laws as any other, run two years; its climate month. */
function run(worldSeed: string) {
  // Bookkeeping (read tracing, validation, frozen copies) is a debug switch
  // (AGENTS.md, "Keep it simple"); a played-world check runs without it.
  setBookkeeping(false);
  const place = drawPlace(worldSeed, "climate-own");
  setHistoryMode(place.seed, "today");
  const core = createLifeCore(
    buildPopulation({
      seed: place.seed,
      placeKey: place.key,
      startedAt: gameStartDate(),
      minimumPeople: SMALL_TOWN,
    }),
  );
  openLaws(core);
  openClimate(core);
  const openingDate = makeIsoDate(core.date);
  const endDate = addDays(openingDate, 365 * 2);
  // The first played day opens climate. Its monthly calendar runs in results mode.
  advanceCore(core, addDays(openingDate, 1));
  advanceCore(core, endDate, { results: true });
  return { place, row: climateNow(coreAPI(core))! };
}

describe(`the rest of the world's CO2 is each world's own (seed ${seed})`, () => {
  it("differs between two worlds with the same laws, and is never a published path", () => {
    const a = run(`${seed}:a`);
    const b = run(`${seed}:b`);
    process.stdout.write(
      `climate own: ${a.place.name} (${a.place.seed}) and ${b.place.name} (${b.place.seed}); cumulative Gt ${a.row.cumulativeGt.toFixed(4)} / ${b.row.cumulativeGt.toFixed(4)}; records ${a.row.id}\n`,
    );
    expect(a.row.cumulativeGt, "two worlds, same laws").not.toBe(
      b.row.cumulativeGt,
    );
    // Both carry on from the opening stock at a pace inside the scenarios' span.
    for (const { row } of [a, b]) {
      expect(row.fossilGt).toBeGreaterThan(30);
      expect(row.fossilGt).toBeLessThan(40);
    }
  });
});
