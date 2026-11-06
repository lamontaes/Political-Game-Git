// @vitest-environment node
/** The Nation heading: laws other states passed, told in the English engine's words from the law rows. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { nationStories } from "./nation-news";
import { buildBenchWorld } from "./world";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "nation-news");

it(`other states' new laws are told under Nation, in words, from their law rows: ${drawn.name} (${drawn.key}), replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    let best: ReturnType<typeof nationStories> = [];
    for (let week = 0; week < 40 && best.length < 5; week++) {
      advanceCore(world.core, addDays(makeIsoDate(world.core.date), 7));
      best = nationStories(world.core, "Nation");
    }
    expect(
      best.length,
      `${drawn.name}, replay ${replay}`,
    ).toBeGreaterThanOrEqual(5);
    for (const story of best) {
      const text = `${story.headline ?? ""} ${story.lede ?? ""}`;
      expect(text.trim(), story.id).not.toBe("");
      // No developer text: no ids, no ISO dates, no raw question keys.
      expect(text, story.id).not.toMatch(/law:|us-policy|\d{4}-\d{2}-\d{2}/);
      expect(story.outlet.name).toBe("Nation");
      expect(story.sourceRecordIds, story.id).toContain(story.id);
    }
    console.log(
      best
        .slice(0, 3)
        .map((s) => `${s.headline} | ${s.lede}`)
        .join("\n"),
    );
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);
