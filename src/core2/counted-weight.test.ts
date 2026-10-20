/** One model, two tiers: a counted household stands for as many real households as its weight says. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { forgetTownFacts, townFacts } from "./law-reach/group-b-people";
import { COUNTED_MOVES_MODULE_ID } from "./modules/counted-moves";
import { reachOf } from "./counted-reach";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { residentsRuntime, takeResidentHousehold } from "./modules/residents";
import { coreAPI } from "./state";

const SCALE = 3;
// The opening fits each counted household's weight to the census, so a town
// at a count scale of three holds weights near three, not exactly three. The
// fitted total may sit this far from the plain multiple.
const FIT_BAND = 0.15;
// Households of different weights mix a little differently in a group's average rate.
const RATE_BAND = 0.2;

function openTown(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  const town = lawChain(coreAPI(core)).townPlaceId;
  return { core, town, store: residentsRuntime(core)!.store };
}

const plainPeople = (
  store: ReturnType<typeof openTown>["store"],
  town: string,
) => {
  let n = 0;
  for (const h of store.liveHouseholds())
    if (h.placeId === town) n += store.countedCount(h);
  return n;
};

/** Every counted person in the town, each household read at the weight it carries. */
const weightedByHousehold = (
  store: ReturnType<typeof openTown>["store"],
  town: string,
) => {
  let n = 0;
  for (const h of store.liveHouseholds())
    if (h.placeId === town) n += store.countedCount(h) * store.weightOf(h);
  return n;
};

it("reads a counted household as many times as it stands for, and keeps the people when one is filled in", () => {
  const draw = drawPlace(randomBytes(32).toString("hex"), "census-weight");
  const base = openTown(draw.seed, draw.key);
  const scaled = openTown(draw.seed, draw.key, SCALE);
  const everyone = { ageFrom: 0 };

  // Without weights nothing changes: the reach counts each counted member once.
  const plain = plainPeople(base.store, base.town);
  expect(plain).toBeGreaterThan(0);
  expect(base.store.weightedPeople(base.town)).toBe(plain);
  expect(reachOf(base.core, base.town, everyone).counted.people).toBeCloseTo(
    plain,
    6,
  );

  // The same town with each counted household standing for about three: the
  // people are the same, each household is read at the weight it carries.
  expect(plainPeople(scaled.store, scaled.town)).toBe(plain);
  const weighted = weightedByHousehold(scaled.store, scaled.town);
  expect(scaled.store.weightedPeople(scaled.town)).toBeCloseTo(weighted, 6);
  expect(weighted).toBeGreaterThan(plain * SCALE * (1 - FIT_BAND));
  expect(weighted).toBeLessThan(plain * SCALE * (1 + FIT_BAND));
  expect(
    reachOf(scaled.core, scaled.town, everyone).counted.people,
  ).toBeCloseTo(weighted, 6);

  // Filling one household in takes one real household out of the counts.
  const home = [...scaled.store.liveHouseholds()].find(
    (h) => h.placeId === scaled.town && scaled.store.countedCount(h) > 0,
  )!;
  const size = scaled.store.countedCount(home);
  const personId = scaled.store.ids[scaled.store.countedMembers(home)[0]!]!;
  const before = scaled.store.weightedPeople(scaled.town);
  expect(takeResidentHousehold(scaled.core, personId)).toBeDefined();
  expect(scaled.store.weightedPeople(scaled.town)).toBeCloseTo(
    before - size,
    6,
  );
  expect(
    reachOf(scaled.core, scaled.town, everyone).counted.people,
  ).toBeCloseTo(before - size, 6);

  // Law reach reads the same weight: the town's modeled residents are the
  // named ones plus the counted ones times their weight (one at scale one).
  // A read earlier the same day is cached, so read the town as it stands now.
  forgetTownFacts(coreAPI(base.core));
  const facts = townFacts(coreAPI(base.core), base.town);
  const named = facts.residents.filter((r) => r.named).length;
  expect(facts.modeled).toBeCloseTo(named + plain, 6);
}, 900_000);

it("weighs movers in real people: the monthly pull is the unscaled pull times the scale", () => {
  type Pull = { people: number; moversPerMonth: number };
  const pulls = (world: ReturnType<typeof openTown>) => {
    // Moves are weighed on the first of each month.
    let day = makeIsoDate(world.core.date);
    while (!day.endsWith("-01")) day = addDays(day, 1);
    advanceCore(world.core, day);
    return new Map(
      coreAPI(world.core)
        .moduleState(COUNTED_MOVES_MODULE_ID)
        .table("pulls")
        .rows()
        .map((row) => [String(row.id), row as unknown as Pull]),
    );
  };
  // Draw places until one opens with counted groups in the town itself.
  for (let attempt = 0; attempt < 8; attempt++) {
    const draw = drawPlace(
      randomBytes(32).toString("hex"),
      "census-weight-moves",
    );
    const base = openTown(draw.seed, draw.key);
    const before = pulls(base);
    // Only the town opens from a sample; its neighbors' groups are not scaled.
    const townGroups = [...before].filter(([id]) =>
      id.startsWith(`group:${base.town}:`),
    );
    if (!townGroups.length) continue;
    const after = pulls(openTown(draw.seed, draw.key, SCALE));
    let peopleBefore = 0,
      peopleAfter = 0,
      moversBefore = 0,
      moversAfter = 0;
    for (const [id, row] of townGroups) {
      const scaled = after.get(id)!;
      expect(scaled.people).toBeGreaterThan(row.people);
      peopleBefore += row.people;
      peopleAfter += scaled.people;
      moversBefore += row.moversPerMonth;
      moversAfter += scaled.moversPerMonth;
    }
    // Fitted weights run near the scale, so the town's real people and its
    // movers rise by about the scale, and movers per real person stay put.
    expect(peopleAfter / peopleBefore).toBeGreaterThan(SCALE * (1 - FIT_BAND));
    expect(peopleAfter / peopleBefore).toBeLessThan(SCALE * (1 + FIT_BAND));
    expect(
      moversAfter / peopleAfter / (moversBefore / peopleBefore),
    ).toBeGreaterThan(1 - RATE_BAND);
    expect(
      moversAfter / peopleAfter / (moversBefore / peopleBefore),
    ).toBeLessThan(1 + RATE_BAND);
    return;
  }
  throw new Error("No drawn place opened with counted groups in its town.");
}, 900_000);
