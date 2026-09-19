/**
 * Does the recorded death count match what the model's own table implies?
 *
 * Reads a save already on disk, sums each living person's annual probability
 * from the SSA table at their own age and calibration category, and compares
 * the total with the deaths the world actually recorded. It builds no world,
 * writes nothing, and is not a timing measurement.
 *
 * It answers "is this count consistent with the rates", not "is the draw
 * correct": a matching total would not prove the per-person draw is right, and
 * a mismatch says where to look rather than what is wrong.
 *
 *   node --import tsx scripts/dev-lab/expected-deaths.ts <savePath>
 */
import { readFileSync } from "node:fs";
import { deserializeWorld } from "../../src/simulation/serialization";
import {
  ssa2023AnnualProbability,
  SSA_2023_MAX_AGE,
} from "../../src/simulation/crisis/mortality-table";
import { mortalityCalibrationOf } from "../../src/simulation/crisis/mortality";
import type { EntityId } from "../../src/simulation/types";

const path = process.argv[2];
if (!path) throw new Error("A save path is required.");
const world = deserializeWorld(readFileSync(path, "utf8"));

function ageOn(birthDate: string, on: string): number {
  const born = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${on}T00:00:00Z`);
  let age = at.getUTCFullYear() - born.getUTCFullYear();
  const beforeBirthday =
    at.getUTCMonth() < born.getUTCMonth() ||
    (at.getUTCMonth() === born.getUTCMonth() &&
      at.getUTCDate() < born.getUTCDate());
  if (beforeBirthday) age -= 1;
  return Math.max(0, Math.min(SSA_2023_MAX_AGE, age));
}

const asOf = world.currentDate;
const deaths = world.history.personDeaths.filter(
  (death) => death.diedAt <= asOf,
);
const deadIds = new Set(deaths.map((death) => death.personId as string));

let expectedPerYear = 0;
const buckets = new Map<string, number>();
let counted = 0;
for (const personId of world.personOrder) {
  const person = world.people[personId];
  if (!person) continue;
  // The dead are counted at their age when exposed, not skipped: they were
  // part of the population the rate applied to.
  const age = ageOn(person.birthDate, asOf);
  const category = mortalityCalibrationOf(world, personId as EntityId);
  const q = (c: "male" | "female") => Number(ssa2023AnnualProbability(age, c));
  const probability =
    category === "equal-mixture"
      ? (q("male") + q("female")) / 2
      : q(category as "male" | "female");
  expectedPerYear += probability;
  counted += 1;
  const bucket = `${Math.floor(age / 10) * 10}s`;
  buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
}

console.log(
  JSON.stringify(
    {
      save: path,
      asOf,
      peopleCounted: counted,
      recordedDeaths: deaths.length,
      deadNotInPersonOrder: [...deadIds].filter(
        (id) => !world.personOrder.includes(id as EntityId),
      ).length,
      expectedDeathsPerYear: Math.round(expectedPerYear * 100) / 100,
      ageBuckets: Object.fromEntries(
        [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ),
      note: "Ages are taken at the save's current date, so a multi-year save's expectation is approximate: people were younger for the earlier part of the span, which makes this a slight OVER-estimate of the per-year rate.",
    },
    null,
    2,
  ),
);
