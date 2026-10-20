/**
 * The age retiring starts to pull on a worker is the earliest Social Security
 * claim age under the law in force (pool item web-calibrate-choice-terms,
 * the outcome web's retirement-age link): the jobs engine reads the law when
 * it weighs a worker's retiring, so a law that raises it keeps people at work
 * longer. A place is drawn from all 56 (RETIRE_ONSET_SEED pins the run).
 */
import { randomBytes } from "node:crypto";
import { expect, it, vi } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { retirementOnsetYears } from "./modules/jobs";
import type * as Laws from "./modules/laws";
import { coreAPI } from "./state";

const held = vi.hoisted(() => ({ earliestMonths: 0 }));
vi.mock("./modules/laws", async (original) => {
  const real = await original<typeof Laws>();
  return {
    ...real,
    socialSecurityAges: (
      ...args: Parameters<typeof Laws.socialSecurityAges>
    ) => {
      const ages = real.socialSecurityAges(...args);
      return held.earliestMonths
        ? { ...ages, earliestMonths: held.earliestMonths }
        : ages;
    },
  };
});

const seed = process.env.RETIRE_ONSET_SEED || randomBytes(8).toString("hex");
const place = drawPlace(seed, "retire-onset");

it(`retiring pulls from the earliest claim age under the law in ${place.name} (${place.key}), world seed ${place.seed}, run seed ${seed}`, () => {
  const { core } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // The law as enacted: 62.
  held.earliestMonths = 0;
  expect(retirementOnsetYears(api)).toBe(62);
  // Congress raises the earliest claim age to 65; the next day's read follows.
  held.earliestMonths = 65 * 12;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(retirementOnsetYears(api)).toBe(65);
}, 600_000);
