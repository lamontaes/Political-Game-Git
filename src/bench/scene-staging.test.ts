import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { buildBenchWorld } from "./world";
import { presentIds } from "./scene";

describe("who is drawn in a bedroom", () => {
  it("is nobody, even with a household and an act's target on record", () => {
    const seed =
      process.env.GOLDEN_PATH_SEED ?? randomBytes(20).toString("hex");
    const drawn = drawPlace(seed, "bench-bedroom-staging");
    setBookkeeping(false);
    const world = buildBenchWorld(drawn.seed, "2026-01-01", {
      placeKey: drawn.key,
      twoLevel: true,
      settings: { population: 1500 },
    });
    const core = world.core;
    const player = core.people.get(world.playerId!)!;
    const others = (core.households.get(player.householdId)?.memberIds ?? [])
      .filter((id) => id !== player.id)
      .filter((id) => core.people.get(id)?.alive === true);
    const bedroom = "bedroom-plain";
    const context = `${drawn.name}, seed ${seed}`;
    expect(presentIds(core, player.id, bedroom, "sleep"), context).toEqual([]);
    if (others.length)
      expect(
        presentIds(core, player.id, bedroom, "talk", others[0]),
        context,
      ).toEqual([]);
  });
});
