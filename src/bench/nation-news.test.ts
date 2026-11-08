// @vitest-environment node
/** The Nation heading: laws other states passed, picked by reach and the reader's ties, told in the English engine's words. */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import reach from "../core2/data/places/state-reach.json" with { type: "json" };
import { parameter } from "../core2/parameters";
import { placeStateKey } from "../core2/place-map";
import { nationLaws, nationScore, nationStories } from "./nation-news";
import { buildBenchWorld } from "./world";

const replay = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const drawn = drawPlace(replay, "nation-news");

it(`other states' laws are told by reach and ties, in words, from their law rows: ${drawn.name} (${drawn.key}), replay ${replay}`, () => {
  setBookkeeping(false);
  try {
    const world = buildBenchWorld(drawn.seed, gameStartDate(), {
      placeKey: drawn.key,
      twoLevel: true,
    });
    const core = world.core;
    const readerId = core.playerId ?? undefined;
    const bar = parameter("nationNewsReachBar", core.data.parameters);
    let all: ReturnType<typeof nationLaws> = [];
    for (let week = 0; week < 40 && all.length < 12; week++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 7));
      all = nationLaws(core);
    }
    const told = nationStories(core, "Nation", readerId);
    expect(
      all.length,
      `${drawn.name}, replay ${replay}`,
    ).toBeGreaterThanOrEqual(12);
    // Reach and ties pick the stories; not every other-state law is told.
    expect(told.length).toBeLessThan(all.length);
    const toldIds = new Set(told.map((s) => s.id));
    for (const law of all) {
      const score = nationScore(core, readerId, law.jurisdiction);
      if (toldIds.has(law.id))
        expect(score, law.id).toBeGreaterThanOrEqual(bar);
      else
        expect(
          score < bar ||
            // a law the English engine has no name for stays a record
            told.every((s) => s.id !== law.id),
          law.id,
        ).toBe(true);
    }
    for (const story of told) {
      const text = `${story.headline ?? ""} ${story.lede ?? ""}`;
      expect(text.trim(), story.id).not.toBe("");
      expect(text, story.id).not.toMatch(/law:|us-policy|\d{4}-\d{2}-\d{2}/);
      expect(story.outlet.name).toBe("Nation");
      expect(story.sourceRecordIds, story.id).toContain(story.id);
    }
    // A border adds to a state's score, and the nation's states sum to one.
    const score = (key: string) => nationScore(core, undefined, key);
    expect(score("US-CA")).toBeGreaterThan(score("US-VT"));
    // A state next door scores higher for a reader who lives here than for
    // one who is placed nowhere.
    const home = placeStateKey(core.people.get(readerId!)!.placeId)!;
    const next =
      reach.states[home.replace(/^US-/, "") as keyof typeof reach.states]
        ?.borders[0];
    if (next)
      expect(nationScore(core, readerId, `US-${next}`)).toBeGreaterThan(
        score(`US-${next}`),
      );
  } finally {
    setBookkeeping(true);
  }
}, 1_500_000);
