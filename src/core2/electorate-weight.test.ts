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
  // A household's weight is fitted to the Census count for its size, so the
  // town's records carry weights near the scale, not all exactly equal to it.
  expect(townVoters.every((v) => v.weight >= 1)).toBe(true);
  const meanWeight =
    townVoters.reduce((n, v) => n + v.weight, 0) / townVoters.length;
  expect(meanWeight).toBeGreaterThan(SCALE * 0.9);
  expect(meanWeight).toBeLessThan(SCALE * 1.2);

  // The line the places are counted from: ranks by the real voters a record
  // stands for, so three-fold weights leave every rank where it was.
  const date = `${Number(base.date.slice(0, 4)) + 2}-11-07`;
  const before = electorateSample(coreAPI(base), date, 0);
  const after = electorateSample(coreAPI(scaled), date, 0);
  expect(after.length).toBe(before.length);
  // The sample is the town's adults; the town's records all carry the weight.
  const plainTotal = before.reduce((n, v) => n + v.weight, 0);
  const heavyTotal = after.reduce((n, v) => n + v.weight, 0);
  // Fitted weights leave the total within a few percent of the scale times the plain count.
  expect(heavyTotal / (plainTotal * SCALE)).toBeGreaterThan(0.9);
  expect(heavyTotal / (plainTotal * SCALE)).toBeLessThan(1.15);
  for (const [i, voter] of before.entries()) {
    expect(voter.weight).toBe(1);
    // Unequal fitted weights nudge a rank, never by more than a couple of points.
    expect(Math.abs(after[i]!.rank - voter.rank)).toBeLessThan(0.02);
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
  // With fitted (unequal) weights the two counts agree to a few percent, not exactly.
  expect(Math.abs(three.cast - one.cast) / one.cast).toBeLessThan(0.05);
  for (const [id, votes] of Object.entries(one.votes))
    expect(
      Math.abs((three.votes as Record<string, number>)[id]! - votes) /
        Math.max(1, one.cast),
    ).toBeLessThan(0.05);
}, 600_000);
