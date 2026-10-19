import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { NEWS_MODULE_ID, type Story } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { wordedStory } from "../director/opening-story";
import { buildBenchWorld } from "./world";

// The News screen shows the paper's words, not record keys (pool item
// words-scene-narration-scene-words-json-then-people, headlines slice): in a
// played year in a drawn place, every story of a kind the English engine has
// words for gets a headline or a first sentence from its own record, with no
// key, brace or id showing.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`words the stories of a played year, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "news-words");
    const { core } = buildBenchWorld(place.seed, "2026-10-12", {
      twoLevel: true,
      placeKey: place.key,
    });
    for (let day = 0; day < 365; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const stories = coreAPI(core)
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .rows() as unknown as Story[];
    const worded = stories.flatMap((story) => {
      const words = wordedStory(core, story);
      return words ? [{ story, words }] : [];
    });
    tried.push(`${place.name}: ${worded.length} of ${stories.length}`);
    if (!worded.length) continue;
    for (const { story, words } of worded) {
      const text = `${words.headline ?? ""} ${words.lede ?? ""}`;
      expect(text.trim().length, story.id).toBeGreaterThan(0);
      expect(text, story.id).not.toMatch(
        /[{}]|undefined|NaN|organization:|person_/,
      );
      // Ask why: the words name the record they rest on.
      expect(words.sourceRecordIds.length, story.id).toBeGreaterThan(0);
    }
    return;
  }
  throw new Error(`no story with words in a year in: ${tried.join("; ")}`);
}, 3_600_000);
