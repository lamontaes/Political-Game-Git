/**
 * Words builder W3's proof for the news bank (Nov 12, 2026): plays a year of
 * the bench world in a place drawn from all 56 and prints every story the
 * paper printed whose sentences carry a bill's next step, a vacancy, a new
 * officeholder's seat, a law's reach, a vote's margin or a closing's account,
 * as the News reader words it, with the place, the seed and the record ids.
 * Usage: node --import tsx scripts/words/w3-news-year.ts <seed> [days]
 */
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import { wordPrintedStory } from "../../src/bench/archive-words";
import { buildBenchWorld } from "../../src/bench/world";

const seed = process.argv[2] ?? "w3-news";
const days = Number(process.argv[3] ?? 365);
// PLACE_TAG draws the place a test draws for the same seed (e.g. "printed-words").
const place = drawPlace(seed, process.env.PLACE_TAG ?? "w3-news-year");
setBookkeeping(false);
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
const api = coreAPI(core);
const end = addDays(makeIsoDate(core.date), days);
const seen = new Set<string>();
console.log(`Place: ${place.name} (${place.key}), seed ${seed}`);
while (core.date < end) {
  advanceCore(core, [addDays(makeIsoDate(core.date), 7), end].sort()[0]!);
  for (const story of api
    .moduleState("news")
    .table("stories")
    .rows() as unknown as {
    id: string;
    kind: string;
    date: string;
    facts: Record<string, unknown>;
  }[]) {
    if (seen.has(story.id) || story.kind !== "press.printed") continue;
    seen.add(story.id);
    const worded = wordPrintedStory(core, story);
    if (!worded?.paragraphs || worded.paragraphs.length < 2) continue;
    console.log(
      `\n${story.date} ${story.facts.sourceRecordId}\n  ${worded.headline}\n  ${worded.paragraphs.join("\n  ")}`,
    );
  }
}
