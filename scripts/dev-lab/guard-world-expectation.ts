/** The guard world's own mortality expectation, computed rather than borrowed. */
import { addDays } from "../../src/simulation/dates";
import {
  ssa2023AnnualProbability,
  SSA_2023_MAX_AGE,
} from "../../src/simulation/crisis/mortality-table";
import { mortalityCalibrationOf } from "../../src/simulation/crisis/mortality";
import { DEFAULT_NEW_GAME_SETUP } from "../../src/presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../src/presentation/opening-life";
import { passOrdinaryDays } from "../../src/presentation/ordinary-life";
import type { EntityId } from "../../src/simulation/types";

const seed = process.argv[2] ?? "no-dead-actors";
const days = Number(process.argv[3] ?? 365);
const game = generateOpeningLife(
  prepareOpeningLife({
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    startAge: 30,
    depth: "summarize-earlier-life",
  }),
).game!;
let world = game.world;
const startDate = world.currentDate;
const target = addDays(startDate, days);
let guard = 0;
while (world.currentDate < target && guard < 100) {
  world = passOrdinaryDays(world, 30);
  guard += 1;
}

function ageOn(birthDate: string, on: string): number {
  const born = new Date(`${birthDate}T00:00:00Z`);
  const at = new Date(`${on}T00:00:00Z`);
  let age = at.getUTCFullYear() - born.getUTCFullYear();
  if (
    at.getUTCMonth() < born.getUTCMonth() ||
    (at.getUTCMonth() === born.getUTCMonth() &&
      at.getUTCDate() < born.getUTCDate())
  )
    age -= 1;
  return Math.max(0, Math.min(SSA_2023_MAX_AGE, age));
}

// Ages at the START of the span: everybody was exposed from then on, so this
// is the honest basis for a one-year expectation rather than end-date ages.
let expected = 0;
const buckets = new Map<string, number>();
let counted = 0;
for (const personId of world.personOrder) {
  const person = world.people[personId];
  if (!person || person.birthDate > startDate) continue;
  const age = ageOn(person.birthDate, startDate);
  const category = mortalityCalibrationOf(world, personId as EntityId);
  const q = (c: "male" | "female") => Number(ssa2023AnnualProbability(age, c));
  expected +=
    category === "equal-mixture"
      ? (q("male") + q("female")) / 2
      : q(category as "male" | "female");
  counted += 1;
  const bucket = `${Math.floor(age / 10) * 10}s`;
  buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
}
const observed = world.history.personDeaths.filter(
  (death) => death.diedAt <= world.currentDate,
).length;
console.log(
  JSON.stringify(
    {
      seed,
      days,
      from: startDate,
      to: world.currentDate,
      peopleAtStart: counted,
      peopleNow: Object.keys(world.people).length,
      expectedDeaths: Math.round(expected * 100) / 100,
      observedDeaths: observed,
      ageBuckets: Object.fromEntries(
        [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      ),
    },
    null,
    2,
  ),
);
