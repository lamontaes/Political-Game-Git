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
  // Each record carries its household's weight: the scale, plus the share of
  // a filled-in household's weight (the player's circle is named at the
  // opening) that its group took on, so people counted stay the same.
  expect(
    townVoters.every((v) => v.weight >= SCALE - 1e-9),
    `${draw.name} ${seed}: a record weighs less than the scale`,
  ).toBe(true);
  const plainTown = plain.filter((v) => v.placeId === town).length;
  const heavyWeight = townVoters.reduce((n, v) => n + v.weight, 0);
  expect(heavyWeight, `${draw.name} ${seed}`).toBeGreaterThanOrEqual(
    SCALE * plainTown - 1e-6,
  );
  expect(heavyWeight, `${draw.name} ${seed}`).toBeLessThan(
    SCALE * plainTown * 1.1,
  );

  // The line the places are counted from: ranks by the real voters a record
  // stands for, so scaling every weight leaves every rank where it was.
  const date = `${Number(base.date.slice(0, 4)) + 2}-11-07`;
  const before = electorateSample(coreAPI(base), date, 0);
  const after = electorateSample(coreAPI(scaled), date, 0);
  expect(after.length).toBe(before.length);
  for (const voter of before) expect(voter.weight).toBe(1);
  // The sample is the town's adults, each weighing at least the scale.
  expect(after.reduce((n, v) => n + v.weight, 0)).toBeGreaterThanOrEqual(
    before.length * SCALE - 1e-6,
  );
  // Each rank is the share of real voters before the record plus half its
  // own weight, so ranks rise through the town and stay inside the line.
  for (const [i, voter] of after.entries()) {
    expect(voter.rank).toBeGreaterThan(0);
    expect(voter.rank).toBeLessThan(1);
    if (i > 0) expect(voter.rank).toBeGreaterThanOrEqual(after[i - 1]!.rank);
  }
  const times = before.map((v) => ({ ...v, weight: v.weight * SCALE }));

  // The same place, counted from a sample with every weight scaled, gives the same votes.
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
  const three = countPlaces(times, [place], field);
  // The count reads an evenly spaced sample of the town's real voters, so a
  // different total of voters moves where the sample falls: the same line
  // gives the same result to within the sample's own resolution.
  const near = (a: number, b: number) =>
    expect(Math.abs(a - b) / Math.max(1, b)).toBeLessThan(0.05);
  near(three.cast, one.cast);
  for (const id of Object.keys(one.votes))
    near(three.votes[id] ?? 0, one.votes[id]!);
}, 600_000);
