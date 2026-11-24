/**
 * The Politics screen's state filter lists every sitting member of a state's
 * legislature, the player's own or any other. A place and a second state are
 * drawn from all 56; set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { gameStartDate } from "../core2/game-start";
import { buildBenchWorld } from "./world";
import { politicsStates, stateLegislators } from "./government";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it("lists every sitting member of any state's legislature, and a different state lists different members", () => {
  const place = drawPlace(seed, "politics-states");
  const where = `${place.name} (${place.key}), seed ${place.seed}`;
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core } = world;
  const states = politicsStates();
  expect(states.length, where).toBeGreaterThanOrEqual(50);
  const own = place.state;
  const other = states
    .map((s) => s.key)
    .filter((key) => key !== own)
    .sort()[Number.parseInt(seed.slice(0, 4), 16) % (states.length - 1)]!;
  const mine = stateLegislators(core, own);
  const theirs = stateLegislators(core, other);
  expect(mine.length, `${where}: ${own}`).toBeGreaterThan(0);
  expect(theirs.length, `${where}: ${other}`).toBeGreaterThan(0);
  // Every seat is shown with its sitting holder.
  for (const row of [...mine, ...theirs]) {
    expect(row.holder?.familyName, `${where}: ${row.seatId}`).toBeTruthy();
  }
  // Another state lists its own seats, not the first state's.
  const ids = new Set(mine.map((row) => row.seatId));
  expect(
    theirs.some((row) => ids.has(row.seatId)),
    where,
  ).toBe(false);
  expect(stateLegislators(core, "not-a-state"), where).toEqual([]);
}, 900_000);
