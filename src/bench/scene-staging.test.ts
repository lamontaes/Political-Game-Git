import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { buildBenchWorld } from "./world";
import { hides, presentIds, turnOf } from "./scene";
import { backdropStaging } from "./staging";
import staging from "../../art/backdrops/staging.json" with { type: "json" };

// A random painted place each run, named so a failure can be replayed.
const places = Object.keys(staging.places).filter(
  (place) =>
    backdropStaging(place)!.spots.filter(
      (spot) => (spot.pose ?? "stand") === "stand",
    ).length >= 2,
);
const place =
  process.env.PEOPLE_TEST_PLACE ??
  places[Math.floor(Math.random() * places.length)]!;

describe(`who people face at ${place}`, () => {
  const stage = backdropStaging(place)!;
  const [a, b] = stage.spots
    .filter((spot) => (spot.pose ?? "stand") === "stand")
    .sort((x, y) => x.x - y.x);

  it("turns two people toward each other", () => {
    if (a!.x === b!.x) return;
    expect(turnOf(a!, [a!, b!], undefined).toward).toBe("right");
    expect(turnOf(b!, [a!, b!], undefined).toward).toBe("left");
  });

  it("turns everyone in a room with a front toward the front", () => {
    const front = 50;
    for (const spot of [a!, b!]) {
      const turn = turnOf(spot, [a!, b!], front);
      if (Math.abs(spot.x - front) >= 3)
        expect(turn.toward).toBe(spot.x < front ? "right" : "left");
      if (spot.facing === "away") expect(turn.view).toBe("back");
    }
  });

  it("knows two people on one spot cover each other, and far-apart ones don't", () => {
    expect(hides(stage, a!, a!)).toBe(true);
    const far = { ...a!, x: a!.x < 50 ? 95 : 5 };
    expect(hides(stage, a!, far)).toBe(false);
  });
});

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
