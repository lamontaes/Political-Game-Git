/**
 * The age retiring starts to pull on a worker is the earliest Social Security
 * claim age under the law in force (pool item web-calibrate-choice-terms):
 * the jobs engine reads the law when it weighs a worker's retiring, so a law
 * that raises it keeps people at work longer. A law that raises the full
 * retirement age reaches them through the outcome web's retirement-age link
 * instead (jobs-older-work-web.test.ts).
 *
 * The law moves through the game's own path: Congress's act is enacted with
 * `enactLaw` and takes effect the next day. An earlier version mocked
 * `socialSecurityAges` on the laws module; the jobs engine is loaded inside
 * that module's own imports and kept the real function, so the mock never
 * reached it and the test read 62 at every place (pool item
 * tests-retirement-onset-law-reads-62-after-the-law-moves).
 *
 * Pinned (skill pinned-tests) to the two places the red was first seen at.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { retirementOnsetYears } from "./modules/jobs";
import { enactLaw } from "./modules/laws";
import { coreAPI } from "./state";

const PLACES = [
  {
    name: "Cottontown, Tennessee",
    placeKey: "4717420",
    seed: "18d35a5e412d41fda1eb7373cac9ed9d016c79031344f8e208487dd3eb154d06",
  },
  {
    name: "Bethlehem, North Carolina",
    placeKey: "3705530",
    seed: "8bf2f5fefdd222edfa5d7986bcd33b0b604ee99099d5efb886618536ecdb24da",
  },
];

for (const place of PLACES)
  it(`retiring pulls from the earliest claim age under the law in ${place.name} (${place.placeKey}), world seed ${place.seed}`, () => {
    const { core } = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.placeKey,
    });
    const api = coreAPI(core);
    // The law as enacted: 62.
    expect(retirementOnsetYears(api)).toBe(62);
    // Congress raises the earliest claim age to 65, in force tomorrow. Read
    // today, the engine still answers 62; the next day's read follows the law.
    const tomorrow = addDays(makeIsoDate(core.date), 1);
    enactLaw(api, {
      jurisdiction: "US",
      level: "federal",
      series: "social-security-earliest-claim-age",
      value: 65,
      unit: "years",
      effectiveDate: tomorrow,
      measureId: "measure:test-raise-earliest-claim-age",
      citation: "A test measure raising the earliest claim age to 65.",
    });
    expect(retirementOnsetYears(api)).toBe(62);
    advanceCore(core, tomorrow);
    expect(retirementOnsetYears(api)).toBe(65);
  }, 120_000);
