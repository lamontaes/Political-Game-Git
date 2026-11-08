/**
 * The federal courts as a flow and a stock (Nation, Nov 8): with no law
 * changed, the Bureau of Prisons' stock by group is explained by the
 * Commission's admissions, mean sentences and the derived stay share, so it
 * stays within a tenth of the Bureau's table (a cause check, not a target);
 * once Congress's reduce-mandatory-minimums law is in force, the people
 * sentenced under it serve shorter sentences and the drug stock falls. The
 * law is entered by hand (edge case): a bill's route to it is the
 * legislature's. Played in a place drawn from all 56 on a seed nobody chose.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { enactLaw } from "./modules/laws";
import {
  federalCourtsFor,
  REDUCE_MANDATORY_MINIMUMS,
} from "./modules/federal-courts";
import { coreAPI } from "./state";
import bop from "../../data/research/justice/bop-federal-offenses-2026.json";

const seed = process.env.NATION_SEED ?? randomBytes(8).toString("hex");

it("the federal stock follows admissions, sentences and the stay share, and the reduce law shortens it", () => {
  const place = drawPlace(seed, "federal-courts");
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(world.core);
  let day = makeIsoDate(world.core.date);
  const advance = (days: number) => {
    const end = addDays(day, days);
    while (day < end) {
      day = addDays(day, 1);
      advanceCore(world.core, day);
    }
  };
  advance(60);
  const where = `${place.name}, seed ${seed}`;
  const drug0 = federalCourtsFor(api, "Drug");
  expect(drug0, `${where}: federal courts row`).toBeDefined();
  const opening = bop.offenses.find((o) => o.id === "drug")!.inmates;
  expect(Math.abs(drug0!.stock - opening) / opening).toBeLessThan(0.1);
  for (const group of [
    "Weapons",
    "Immigration",
    "SexOffenses",
    "Fraud",
    "Robbery",
  ])
    expect(federalCourtsFor(api, group)?.stock, group).toBeGreaterThan(0);
  expect(drug0!.sentenceFactor).toBe(1);
  // Congress enacts the reduction; it takes effect at once.
  enactLaw(api, {
    jurisdiction: "US",
    level: "federal",
    series: REDUCE_MANDATORY_MINIMUMS,
    value: 1,
    effectiveDate: day,
    measureId: "nation-test",
    citation: "Entered by hand to prove the reader (edge case).",
  });
  advance(750);
  const drug1 = federalCourtsFor(api, "Drug")!;
  expect(drug1.sentenceFactor, `${where}: ${drug1.id}`).toBeLessThan(1);
  expect(drug1.lawIds.length).toBe(1);
  expect(drug1.newStock).toBeGreaterThan(0);
  expect(drug1.stock, `${where}: the drug stock falls`).toBeLessThan(
    drug0!.stock,
  );
}, 1800000);
