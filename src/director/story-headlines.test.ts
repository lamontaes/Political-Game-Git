import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { NEWS_MODULE_ID, type Story } from "../core2/modules/news";
import { coreAPI } from "../core2/state";
import { storyHeadline } from "./story-headlines";

// The News screen's headlines for a state's jobs report, a town hall and a
// held public meeting (pool item words-scene-narration-scene-words-json-then-
// people), in a played year in a drawn place: each is worded from its own
// record, with no key or brace showing, and says what the record says.
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const KINDS = ["economy.state-jobs-report", "town-hall", "public-meeting"];

it(`words a jobs report, a town hall and a public meeting, seed ${seed}`, () => {
  setBookkeeping(false);
  const tried: string[] = [];
  for (let draw = 0; draw < 6; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "story-headlines");
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
    const by = new Map<string, { story: Story; headline: string }[]>();
    for (const story of stories) {
      if (!story.topic || !KINDS.includes(story.topic)) continue;
      const words = storyHeadline(core, story, true);
      if (!words) continue;
      expect(words.headline, story.id).not.toMatch(
        /[{}]|undefined|NaN|person_|organization:|jurisdiction_/,
      );
      expect(words.sourceRecordIds, story.id).toContain(story.id);
      const rows = by.get(story.topic) ?? [];
      rows.push({ story, headline: words.headline });
      by.set(story.topic, rows);
    }
    tried.push(
      `${place.name}: ${KINDS.map((kind) => `${kind} ${by.get(kind)?.length ?? 0}`).join(", ")}`,
    );
    if (!KINDS.every((kind) => by.get(kind)?.length)) continue;
    for (const { story, headline } of by.get("economy.state-jobs-report")!)
      expect(headline, story.id).toContain(
        Number(story.facts.unemploymentPct).toFixed(1),
      );
    for (const { story, headline } of by.get("town-hall")!)
      expect(headline, story.id).toContain(
        core.people.get(story.facts.hostId!)!.givenName,
      );
    return;
  }
  throw new Error(
    `no year with all three kinds worded in: ${tried.join("; ")}`,
  );
}, 3_600_000);
