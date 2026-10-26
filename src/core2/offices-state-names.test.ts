/**
 * A state's seats name the state, never its key (US-KS) as their government.
 * Played world in a place drawn from all 56; the place and seed are named in
 * every failure message. Set GOLDEN_PATH_SEED to reproduce a run.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { governmentView } from "../bench/government";
import { setBookkeeping } from "./bookkeeping";
import { gameStartDate } from "./game-start";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(16).toString("hex");

it("names every state seat by the state, never by its key", () => {
  setBookkeeping(false);
  try {
    const draw = drawPlace(seed, "office-state-names");
    const { core } = buildBenchWorld(draw.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: draw.key,
    });
    const where = `${draw.key} [${draw.state}], seed ${draw.seed}`;
    const seats = governmentView(
      core,
      core.playerId ?? [...core.people.keys()][0]!,
    ).seats.filter((s) => s.level === "state");
    expect(seats.length, `${where}: state seats`).toBeGreaterThan(0);
    for (const seat of seats)
      expect(seat.government, `${where}: ${seat.government}`).not.toMatch(
        /^US-/,
      );
  } finally {
    setBookkeeping(true);
  }
}, 600_000);
