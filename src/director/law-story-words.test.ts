import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { LAWS_MODULE_ID } from "../core2/modules/laws";
import { NEWS_MODULE_ID, type Story } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { lawStoryHeadline } from "./law-story-words";

// The News screen shows a headline for a law taking effect, worded from the
// record (pool item words-scene-narration-scene-words-json-then-people): in a
// played year in a drawn place, the printed stories of laws that took effect
// get headlines in the direction their records show, with no key or brace.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");

it(`words a law taking effect in the direction its record shows, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "law-story-words");
    const { core } = buildBenchWorld(place.seed, "2026-10-12", {
      twoLevel: true,
      placeKey: place.key,
    });
    for (let day = 0; day < 365; day += 1)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const api = coreAPI(core);
    const laws = api.moduleState(LAWS_MODULE_ID).table("laws");
    const stories = (
      api
        .moduleState(NEWS_MODULE_ID)
        .table("stories")
        .rows() as unknown as Story[]
    ).filter((row) => row.facts.lawId && row.facts.change);
    const worded = stories.flatMap((story) => {
      const words = lawStoryHeadline(core, story, true);
      return words ? [{ story, words }] : [];
    });
    tried.push(`${place.name}: ${worded.length} of ${stories.length}`);
    if (!worded.length) continue;
    for (const { story, words } of worded) {
      const here = `${story.id}: ${words.headline}`;
      expect(words.headline, here).not.toMatch(
        /[{}]|undefined|NaN|us-policy-positions|law:/,
      );
      // Ask why: the headline cites the law row it reports.
      expect(words.sourceRecordIds, here).toContain(story.facts.lawId);
      if (story.facts.change === "ended")
        expect(words.headline, here).toMatch(/Repeals|Ends/);
      if (story.facts.change === "replaced") {
        const before = laws.get(story.facts.replacesLawId!) as unknown as {
          value: number;
        };
        expect(words.headline, here).toMatch(
          Number(story.facts.value) > before.value
            ? /Raises|Lifts/
            : /Cuts|Trims/,
        );
      }
    }
    return;
  }
  throw new Error(`no law story with words in a year in: ${tried.join("; ")}`);
}, 3_600_000);
