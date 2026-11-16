/**
 * The president's approval on the first day of play is the published figure moved by the world's
 * offset inside its own row's spread (owner, Oct 27: "realistic, not real"), so no two worlds open
 * on the same figure and none opens on the published 41. Pinned: the world seeds of four named
 * draws, fixed here.
 */
import { expect, it } from "vitest";
import data from "../data/electorate/national-opinion.json";
import { openingApproval, opinionParameter } from "./national-opinion";

const SEEDS = [
  "3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178", // Ridgeville AL, 8341-pin/p6
  "175545ba-b8b6-4a67-a9f7-c1fb02fe880c", // Bell Buckle TN, a played life
  "c1518637-35a2-40af-af90-1a4ea55ff338", // Fort Irwin CA, a played life
  "259e25c6-9d46-484f-9825-b9bb8504fc89", // Udall KS, a played life
];

it("opens the president's approval at the world's offset inside 36 to 45", () => {
  const [low, high] = data.parameters.openingPct.spread;
  const published = opinionParameter("openingPct");
  const opened = SEEDS.map((seed) => openingApproval(seed));
  for (const [i, pct] of opened.entries()) {
    expect(pct, SEEDS[i]).toBeGreaterThanOrEqual(low);
    expect(pct, SEEDS[i]).toBeLessThanOrEqual(high);
    expect(pct, `${SEEDS[i]}: not the published figure`).not.toBe(published);
  }
  // The same world opens on the same figure every time; different worlds differ.
  expect(openingApproval(SEEDS[0])).toBe(opened[0]);
  expect(new Set(opened).size).toBe(SEEDS.length);
}, 5_000);
