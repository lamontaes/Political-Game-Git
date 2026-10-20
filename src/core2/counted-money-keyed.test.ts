import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { unkeyedSharedMinor } from "./counted-money";
import type { CoreState } from "./types";

// Counted money is keyed (one model, two tiers): in a year of the played
// world no engine pays a place's counted residents as a whole, and the
// residual sweep finds nothing to share by people. The bench world, a place
// drawn from all 56 on a seed nobody chose.
const seed = process.env.COUNTED_KEYED_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(
  seed,
  process.env.COUNTED_KEYED_PURPOSE ?? "counted-keyed",
);

describe(`counted money is keyed (${place.name}, seed ${seed})`, () => {
  it("pays no counted money unkeyed in a played year", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as unknown as CoreState;
    advanceCore(core, addDays(makeIsoDate(core.date), 365));
    expect(unkeyedSharedMinor(core)).toBe(0);
  }, 1_800_000);
});
