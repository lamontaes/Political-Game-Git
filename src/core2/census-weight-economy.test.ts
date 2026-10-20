/**
 * One model, two tiers, at a real town's size: a place above 10,000 opens with
 * its counted records weighted so the town stands for its Census population,
 * and the people, workers, rental stock and the macro engine's town all follow
 * that size. The place is drawn from every place above 10,000 that has a
 * Census reference; the seed and place are in every failure message.
 */
import { createHash, randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { residentCounts, townPlaceOf } from "./modules/residents";
import { corePlaceByKey } from "./place-lookup";
import { placeLocalities, placeStateKeys } from "./places";
import { coreAPI } from "./state";
import { placeReferencePopulation } from "../simulation/nationwide-world/place-population";
import type { StockRow } from "./housing-construction";

const seed = process.env.CENSUS_WEIGHT_SEED ?? randomBytes(16).toString("hex");

/** A place with a Census reference between 15,000 and 60,000, drawn from the seed. */
function drawLargerPlace() {
  const keys = [...placeStateKeys()].sort();
  const all = keys.flatMap((state) =>
    [...placeLocalities(state)].sort((a, b) => a.key.localeCompare(b.key)),
  );
  for (let attempt = 0; attempt < 2000; attempt += 1) {
    const hash = createHash("sha256")
      .update(`${seed}:census-weight-economy:${attempt}`)
      .digest("hex");
    const locality = all[parseInt(hash.slice(0, 8), 16) % all.length]!;
    const geoid = corePlaceByKey(locality.key)?.sourceGeoid;
    const reference = geoid ? placeReferencePopulation(geoid) : null;
    if (reference && reference.value >= 15_000 && reference.value <= 60_000)
      return { seed: hash, key: locality.key, reference: reference.value };
  }
  throw new Error(`no place above 10,000 drawn from seed ${seed}`);
}

function open(placeSeed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(placeSeed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  // The macro and housing engines record their state on their first day.
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  return core;
}

it("a town above 10,000 stands for its Census size in people, workers, rental stock and macro", () => {
  const draw = drawLargerPlace();
  const where = `seed ${draw.seed}, ${draw.key}, Census ${draw.reference}`;
  // The town the player lives in; the world holds other places too.
  const sum = (
    core: ReturnType<typeof open>,
    field: "people" | "households" | "workers",
  ) =>
    residentCounts(core)
      .filter((row) => row.placeId === townPlaceOf(core))
      .reduce((n, row) => n + row[field], 0);
  const rentals = (core: ReturnType<typeof open>) =>
    (
      coreAPI(core)
        .moduleState("housing")
        .table("stock")
        .rows() as unknown as StockRow[]
    ).reduce((n, row) => n + row.rentalUnits, 0);
  const townResidents = (core: ReturnType<typeof open>) =>
    (
      coreAPI(core)
        .moduleState("macro")
        .table("state")
        .get("macro:state") as unknown as { townResidents: number }
    ).townResidents;

  const base = open(draw.seed, draw.key);
  const basePeople = sum(base, "people");
  expect(basePeople, where).toBeGreaterThan(0);
  const scale = draw.reference / basePeople;
  expect(
    scale,
    `${where}: the sample is under the Census size`,
  ).toBeGreaterThan(1);
  const big = open(draw.seed, draw.key, scale);
  const facts = `${where}; base people ${basePeople}, scale ${scale.toFixed(3)}, big people ${sum(big, "people")}, macro town ${townResidents(big)} (base ${townResidents(base)})`;

  // People: the scaled town totals its Census population.
  expect(
    sum(big, "people") / draw.reference,
    `people: ${facts}`,
  ).toBeGreaterThan(0.9);
  expect(sum(big, "people") / draw.reference, `people: ${facts}`).toBeLessThan(
    1.1,
  );
  // Workers and households follow, in the base town's own proportion.
  for (const field of ["workers", "households"] as const) {
    const ratio = sum(big, field) / sum(base, field);
    expect(ratio, `${where}: ${field}`).toBeGreaterThan(scale * 0.8);
    expect(ratio, `${where}: ${field}`).toBeLessThan(scale * 1.2);
  }
  // Housing: the rental stock grows with the renters it stands for.
  expect(rentals(big), where).toBeGreaterThan(rentals(base));
  // Macro hears the larger town: its residents (the town and the places around it) grow by the town's own growth.
  expect(
    townResidents(big) - townResidents(base),
    `macro: ${facts}`,
  ).toBeCloseTo(sum(big, "people") - basePeople, 3);
}, 900_000);
