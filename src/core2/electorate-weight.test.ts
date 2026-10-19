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

it("counts each counted voter as many times as its household stands for, and a town without weights is unchanged", () => {
  const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(32).toString("hex");
  const draw = drawPlace(seed, "electorate-weight");
  const base = openTown(draw.seed, draw.key);
  const scaled = openTown(draw.seed, draw.key, SCALE);

  // Records are the same people; each one carries its household's weight.
  const plain = countedResidents(base);
  const heavy = countedResidents(scaled);
  expect(plain.length, `${draw.name} ${seed}`).toBeGreaterThan(0);
  expect(heavy.length).toBe(plain.length);
  const town = lawChain(coreAPI(base)).townPlaceId;
  expect(plain.every((v) => v.weight === 1)).toBe(true);
  const townVoters = heavy.filter((v) => v.placeId === town);
  expect(townVoters.length).toBeGreaterThan(0);
  expect(townVoters.every((v) => v.weight === SCALE)).toBe(true);

  // The line the places are counted from: ranks by the real voters a record
  // stands for, so three-fold weights leave every rank where it was.
  const date = `${Number(base.date.slice(0, 4)) + 2}-11-07`;
  const before = electorateSample(coreAPI(base), date, 0);
  const after = electorateSample(coreAPI(scaled), date, 0);
  expect(after.length).toBe(before.length);
  // The sample is the town's adults; the town's records all carry the weight.
  expect(after.reduce((n, v) => n + v.weight, 0)).toBeCloseTo(
    before.reduce((n, v) => n + v.weight, 0) * SCALE,
    6,
  );
  for (const [i, voter] of before.entries()) {
    expect(voter.weight).toBe(1);
    expect(after[i]!.rank).toBeCloseTo(voter.rank, 9);
  }

  // The same place, counted from either town's sample, gives the same votes.
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
  const one = countPlaces(before, [place], field);
  const three = countPlaces(after, [place], field);
  expect(three.cast).toBe(one.cast);
  expect(three.votes).toEqual(one.votes);
}, 600_000);
