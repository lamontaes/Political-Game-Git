/**
 * Every story a drawn place's press printed in a played year, by kind: how
 * many, how many print a body (the lede and more), and one example each with
 * the facts its builder read. Development tooling for the Words line: it shows
 * which kinds still print one sentence and what their records hold to say
 * more. Shipped play never imports it.
 *
 *   node --import tsx scripts/dialogue-batch/printed-kinds.ts --seed <seed> [--days 365] [--out file.json]
 *
 * The place is drawn from all 56 by the seed, as the printed-words test draws
 * it, so a failing test's GOLDEN_PATH_SEED reproduces here.
 */
import { writeFileSync } from "node:fs";
import { drawPlace } from "../core2-year/place";
import { wordPrintedStory } from "../../src/bench/archive-words";
import { printedFacts, type PrintedStory } from "../../src/bench/printed-words";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "printed-kinds");
const days = Number(option("days", "365"));
const out = option("out", "");

setBookkeeping(false);
const place = drawPlace(seed, "printed-words");
const world = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const core = world.core;
advanceCore(core, addDays(makeIsoDate(core.date), days));
const printed = (
  coreAPI(core)
    .moduleState("news")
    .table("stories")
    .rows() as unknown as PrintedStory[]
).filter((story) => story.kind === "press.printed");

interface Row {
  count: number;
  withBody: number;
  unworded: string[];
  example?: {
    facts: Record<string, string>;
    headline?: string;
    paragraphs: readonly string[];
  };
}
const byKind = new Map<string, Row>();
for (const story of printed) {
  const read = printedFacts(core, story);
  // A record no builder reads is named by its own kind, so the gap shows.
  const kind = read
    ? read.kind
    : `unbuilt:${String(story.facts.sourceRecordId ?? "").split(":")[0]}`;
  const worded = wordPrintedStory(core, story);
  const row = byKind.get(kind) ?? { count: 0, withBody: 0, unworded: [] };
  row.count += 1;
  if (worded?.paragraphs) row.withBody += 1;
  if (!worded) row.unworded.push(String(story.facts.sourceRecordId));
  if (read && worded && (!row.example || worded.paragraphs))
    row.example = {
      facts: Object.fromEntries(
        Object.entries(read.facts).map(([key, fact]) => [key, fact.text]),
      ),
      ...(worded.headline ? { headline: worded.headline } : {}),
      paragraphs: worded.paragraphs ?? (worded.lede ? [worded.lede] : []),
    };
  byKind.set(kind, row);
}
const rows = [...byKind].sort((a, b) => b[1].count - a[1].count);
const bodies = rows.reduce((sum, [, row]) => sum + row.withBody, 0);
console.log(
  `${place.name} (${place.key}), seed ${seed}: ${printed.length} printed stories, ${bodies} with a body`,
);
for (const [kind, row] of rows)
  console.log(
    `${kind.padEnd(18)} ${String(row.count).padStart(4)}  body ${String(row.withBody).padStart(4)}${row.unworded.length ? `  unworded ${row.unworded.length}` : ""}`,
  );
if (out)
  writeFileSync(
    out,
    JSON.stringify(
      { place: place.name, key: place.key, seed, days, kinds: rows },
      null,
      1,
    ),
  );
