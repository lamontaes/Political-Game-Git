import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";

// M6-01: two new games' openings differ. Two places drawn from all 56 (not
// the same one), each opened as the play build opens it; the address and
// the people the sequence points out are the world's own, so they differ.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

function opening(draw: ReturnType<typeof drawPlace>) {
  setBookkeeping(false);
  const world = buildBenchWorld(draw.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: draw.key,
  });
  const story = world.director.ledger.opening;
  expect(story, `${draw.name} (${draw.key}) has an opening`).toBeTruthy();
  const figures = story!.sequence.flatMap((stage) =>
    stage.people.map((person) => `${stage.stage}:${person.name}`),
  );
  return {
    text: story!.address.text,
    figures,
    stages: story!.sequence.map((s) => s.stage),
  };
}

it(`two new games open differently (seed ${seed})`, () => {
  const first = drawPlace(`${seed}:a`, "opening-differ");
  let second = drawPlace(`${seed}:b`, "opening-differ");
  for (let n = 0; second.key === first.key && n < 8; n += 1)
    second = drawPlace(`${seed}:b${n}`, "opening-differ");
  const where = `${first.name} (${first.key}) against ${second.name} (${second.key}), seed ${seed}`;
  const a = opening(first);
  const b = opening(second);
  console.log(`opening-differ: ${where}`);
  // The same stages in the same order, with different people in them.
  expect(a.stages, where).toEqual(b.stages);
  expect(a.figures, where).not.toEqual(b.figures);
  expect(a.text === b.text, where).toBe(false);
}, 900_000);
