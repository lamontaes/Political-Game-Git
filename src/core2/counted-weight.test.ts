/** One model, two tiers: a counted household stands for as many real households as its weight says. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { reachOf } from "./counted-reach";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { residentsRuntime, takeResidentHousehold } from "./modules/residents";
import { coreAPI } from "./state";

const SCALE = 3;

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

  // The same town with each counted household standing for three.
  expect(plainPeople(scaled.store, scaled.town)).toBe(plain);
  expect(scaled.store.weightedPeople(scaled.town)).toBeCloseTo(
    plain * SCALE,
    6,
  );
  expect(
    reachOf(scaled.core, scaled.town, everyone).counted.people,
  ).toBeCloseTo(plain * SCALE, 6);

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
});
