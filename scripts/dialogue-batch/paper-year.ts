/**
 * What a played year prints, in the paper and in the player's Journal
 * (words-paper-and-journal-everyday-life, step 1): a year in each drawn
 * place, every story the press printed worded as News words it, counted by
 * story kind, and every Journal line counted by the kind of record it tells,
 * with each sentence that repeats more than three times in the year.
 *
 *   node --max-old-space-size=6144 --import tsx scripts/dialogue-batch/paper-year.ts --seed <seed> [--draws 3] [--days 365]
 */
import { drawPlace } from "../core2-year/place";
import { buildBenchWorld } from "../../src/bench/world";
import { wordPrintedStory } from "../../src/bench/archive-words";
import { printedFacts } from "../../src/bench/printed-words";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { composeJournal } from "../../src/director/journal";

const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? process.argv[at + 1]! : fallback;
};
const seed = arg("seed", "paper-year");
const draws = Number(arg("draws", "3"));
const days = Number(arg("days", "365"));
const REPEATS = 3;

/** The sentences of a text, as a reader meets them. */
const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((row) => row.trim())
    .filter(Boolean);

const table = (counts: Map<string, number>) =>
  [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

setBookkeeping(false);
for (let draw = 0; draw < draws; draw += 1) {
  const place = drawPlace(`${seed}:${draw}`, "paper-year");
  const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const me = playerId as PersonId;
  director.watch(core, me);
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  const api = coreAPI(core);
  const printed = (
    api.moduleState("news").table("stories").rows() as unknown as {
      id: string;
      kind: string;
      date: string;
      topic?: string;
      facts: Record<string, unknown>;
    }[]
  ).filter((story) => story.kind === "press.printed");

  // The paper: stories by kind, and each sentence by how often it prints.
  const kinds = new Map<string, number>();
  const said = new Map<string, number>();
  let unworded = 0;
  for (const story of printed) {
    const read = printedFacts(core, story);
    const worded = wordPrintedStory(core, story);
    const kind = read?.kind ?? "(unread)";
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
    if (!worded) {
      unworded += 1;
      continue;
    }
    const texts = [
      worded.headline,
      ...(worded.paragraphs ?? (worded.lede ? [worded.lede] : [])),
    ].filter((text): text is string => !!text);
    for (const text of texts)
      for (const sentence of sentences(text))
        said.set(sentence, (said.get(sentence) ?? 0) + 1);
  }
  const repeated = table(said).filter(([, count]) => count > REPEATS);

  // The Journal: lines by the kind of record they tell.
  const book = director.ledger.people.get(me);
  const lines = composeJournal(core, director, me).flatMap(
    (chapter) => chapter.lines,
  );
  const lineKinds = new Map<string, number>();
  const lineSaid = new Map<string, number>();
  for (const line of lines) {
    const moment = book?.momentsById.get(line.momentIds[0] ?? "");
    const kind = moment?.causeKind ?? line.id.split(":")[0] ?? "(none)";
    lineKinds.set(kind, (lineKinds.get(kind) ?? 0) + 1);
    for (const sentence of sentences(line.text))
      lineSaid.set(sentence, (lineSaid.get(sentence) ?? 0) + 1);
  }
  const lineRepeated = table(lineSaid).filter(([, count]) => count > REPEATS);

  console.log(`\n## ${where}: ${days} days to ${core.date}\n`);
  console.log(
    `Paper: ${printed.length} printed stories, ${unworded} unworded, ${kinds.size} kinds, ${said.size} distinct sentences, ${repeated.length} printed more than ${REPEATS} times.\n`,
  );
  console.log("| Story kind | Printed |\n| --- | --- |");
  for (const [kind, count] of table(kinds))
    console.log(`| ${kind} | ${count} |`);
  console.log(`\nSentences printed more than ${REPEATS} times:\n`);
  for (const [sentence, count] of repeated.slice(0, 25))
    console.log(`- ${count}x "${sentence}"`);
  console.log(
    `\nJournal: ${lines.length} lines for the player, ${lineKinds.size} kinds, ${lineRepeated.length} sentences said more than ${REPEATS} times.\n`,
  );
  console.log("| Journal line, by record | Lines |\n| --- | --- |");
  for (const [kind, count] of table(lineKinds))
    console.log(`| ${kind} | ${count} |`);
  for (const [sentence, count] of lineRepeated.slice(0, 10))
    console.log(`- ${count}x "${sentence}"`);
}
