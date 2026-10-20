/** One model, two tiers: a counted voter stands for as many real voters as its household's weight says. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "./bookkeeping";
import { countPlaces, countedResidents } from "./electorate";
import { gameStartDate } from "./game-start";
import { lawChain } from "./modules/laws";
import { electorateSample } from "./modules/voting";
import { coreAPI } from "./state";
import { residentsRuntime } from "./modules/residents";

const SCALE = 3;

function openTown(seed: string, key: string, countScale?: number) {
  setBookkeeping(false);
  const { core } = buildBenchWorld(seed, gameStartDate(), {
    twoLevel: true,
    placeKey: key,
    ...(countScale ? { countScale } : {}),
  });
  return core;
}

/**
 * What the town's counted records hold: the people still counted, and the
 * people of the households filled in since the opening (a record the player's
 * world named: an official, a candidate, a key person).
 */
function townRecords(core: ReturnType<typeof openTown>, town: string) {
  const store = residentsRuntime(core)!.store;
  let counted = 0,
    filledIn = 0;
  for (const h of store.households) {
    if (h.placeId !== town) continue;
    if (h.gone) filledIn += h.members.length;
    else counted += store.countedCount(h);
  }
  return { store, counted, filledIn };
}

it("counts each counted voter as many times as its household stands for, and a town without weights is unchanged", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex");
  const draw = drawPlace(seed, "electorate-weight");
  const where = `${draw.name} ${seed}`;
  const base = openTown(draw.seed, draw.key);
  const scaled = openTown(draw.seed, draw.key, SCALE);

  // Records are the same people; each one carries its household's weight.
  const plain = countedResidents(base);
  const heavy = countedResidents(scaled);
  expect(plain.length, where).toBeGreaterThan(0);
  expect(heavy.length).toBe(plain.length);
  const town = lawChain(coreAPI(base)).townPlaceId;
  expect(plain.every((v) => v.weight === 1)).toBe(true);
  const townVoters = heavy.filter((v) => v.placeId === town);
  expect(townVoters.length).toBeGreaterThan(0);

  // A household filled in since the opening stands for itself alone: the rest
  // of the households it stood for go to the other households of its group
  // (or of the place), so the people counted stay the same. The town's real
  // counted people are therefore exactly the scale times the people still
  // counted, plus the scale less one times the people filled in.
  const b = townRecords(base, town);
  const s = townRecords(scaled, town);
  expect(s.counted, where).toBe(b.counted);
  expect(s.filledIn, where).toBe(b.filledIn);
  expect(b.store.weightedPeople(town), where).toBe(b.counted);
  expect(s.store.weightedPeople(town), where).toBeCloseTo(
    SCALE * b.counted + (SCALE - 1) * b.filledIn,
    6,
  );
  // No record weighs less than the scale, and households of one group share
  // one weight (each got the same share).
  const groupWeight = new Map<number, number>();
  for (const h of s.store.liveHouseholds()) {
    if (h.placeId !== town) continue;
    const weight = s.store.weightOf(h);
    expect(
      weight,
      `${where}: a record weighs less than the scale`,
    ).toBeGreaterThanOrEqual(SCALE - 1e-9);
    const seen = groupWeight.get(h.group);
    if (seen === undefined) groupWeight.set(h.group, weight);
    else expect(weight, `${where}: group ${h.group}`).toBeCloseTo(seen, 9);
  }
  if (b.filledIn === 0)
    expect(townVoters.every((v) => v.weight === SCALE)).toBe(true);

  // The line the places are counted from: records in the same order, each
  // ranked by the real voters before it plus half its own.
  const date = `${Number(base.date.slice(0, 4)) + 2}-11-07`;
  const before = electorateSample(coreAPI(base), date, 0);
  const after = electorateSample(coreAPI(scaled), date, 0);
  expect(after.map((v) => v.id)).toEqual(before.map((v) => v.id));
  for (const voter of before) expect(voter.weight).toBe(1);
  const weightOf = new Map(heavy.map((v) => [v.id, v.weight]));
  const total = after.reduce((n, v) => n + weightOf.get(v.id)!, 0);
  let passed = 0;
  const expected = after.map((voter) => {
    const weight = weightOf.get(voter.id)!;
    const rank = (passed + weight / 2) / total;
    passed += weight;
    return { ...voter, weight, rank };
  });
  for (const [i, voter] of after.entries()) {
    expect(voter.weight, `${where}: ${voter.id}`).toBeCloseTo(
      expected[i]!.weight,
      9,
    );
    expect(voter.rank, `${where}: ${voter.id}`).toBeCloseTo(
      expected[i]!.rank,
      9,
    );
  }

  // The same place counted from the scaled town's own sample gives the votes
  // the weights and ranks above give, and a town without weights gives one
  // vote per record.
  const place = {
    id: "place",
    name: "Place",
    eligible: 50_000,
    rightShare: 0.5,
    source: "test",
  };
  const field = [-1, 1].map((side) => ({
    id: side > 0 ? "R" : "D",
    side,
    isIncumbent: false,
    standing: 0,
    localStanding: 0,
    recognition: 0,
    platform: [],
  }));
  const fromTown = countPlaces(after, [place], field);
  const fromRecords = countPlaces(expected, [place], field);
  expect(fromTown.cast, where).toBe(fromRecords.cast);
  expect(fromTown.votes, where).toEqual(fromRecords.votes);
  expect(countPlaces(before, [place], field).cast, where).toBeGreaterThan(0);
  // With nothing filled in, scaling every weight leaves the count where it was.
  if (b.filledIn === 0) {
    const one = countPlaces(before, [place], field);
    expect(fromTown.cast).toBe(one.cast);
    expect(fromTown.votes).toEqual(one.votes);
  }
}, 600_000);
