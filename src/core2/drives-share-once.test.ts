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
// several days does not repeat it. The bench world, places drawn from all 56
// on a seed nobody chose, four months from the start. A cause is shared only
// where someone's drive has formed, so a drawn place where nobody told anyone
// is passed over for another draw; the test fails when every draw is quiet.
const seed = process.env.SHARE_ONCE_SEED ?? randomBytes(8).toString("hex");
const purpose = process.env.SHARE_ONCE_PURPOSE ?? "share-once";
const DRAWS = 12;

/** Four months of one drawn place: who told whom which cause, and when. */
function runPlace(draw: number) {
  const place = drawPlace(seed, `${purpose}:${draw}`);
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
  return { place, told };
}

describe(`sharing a cause (seed ${seed})`, () => {
  it("tells each neighbor each cause once", () => {
    const quiet: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const { place, told } = runPlace(draw);
      if (told.size === 0) {
        quiet.push(place.name);
        continue;
      }
      const repeated = [...told].filter(([, dates]) => dates.length > 1);
      expect(
        repeated.map(([key, dates]) => `${key} on ${dates.join(", ")}`),
        `${place.name}, seed ${seed}, draw ${draw}`,
      ).toEqual([]);
      return;
    }
    throw new Error(
      `no cause was shared in ${DRAWS} drawn places (seed ${seed}): ${quiet.join(", ")}`,
    );
  }, 1_800_000);
});
