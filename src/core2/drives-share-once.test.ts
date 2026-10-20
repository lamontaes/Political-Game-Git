import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { addDays, makeIsoDate } from "./kernel/dates";
import { advanceCore } from "./life";
import { gameStartDate } from "./game-start";
import { coreAPI } from "./state";
import type { CoreState } from "./types";

// Telling a neighbor about a cause is one conversation: a plan that spans
// several days does not repeat it. The bench world, a place drawn from all 56
// on a seed nobody chose, four months from the start.
const seed = process.env.SHARE_ONCE_SEED ?? randomBytes(8).toString("hex");
const place = drawPlace(seed, "share-once");

describe(`sharing a cause (${place.name}, seed ${seed})`, () => {
  it("tells each neighbor each cause once", () => {
    const world = buildBenchWorld(place.seed, gameStartDate(), {
      twoLevel: true,
      placeKey: place.key,
    });
    const core = world.core as unknown as CoreState;
    const api = coreAPI(core);
    const told = new Map<string, string[]>();
    api.subscribeEvents("share-once", ["cause.shared"], (_api, event) => {
      const e = event as { id: string; date: string };
      // cause.shared:<date>:<speaker>:<neighbor>:cause:<topic>
      const [, , speaker, neighbor, , ...topic] = e.id.split(":");
      const key = `${speaker}>${neighbor}|${topic.join(":")}`;
      told.set(key, [...(told.get(key) ?? []), e.date]);
    });
    advanceCore(core, addDays(makeIsoDate(core.date), 125));
    expect(told.size, `${place.name}: causes were shared`).toBeGreaterThan(0);
    const repeated = [...told].filter(([, dates]) => dates.length > 1);
    expect(
      repeated.map(([key, dates]) => `${key} on ${dates.join(", ")}`),
      `${place.name}, seed ${seed}`,
    ).toEqual([]);
  }, 1_800_000);
});
