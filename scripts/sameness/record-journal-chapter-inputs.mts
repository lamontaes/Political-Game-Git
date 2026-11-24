/**
 * The sameness gate's input for the sentence that opens a Journal chapter
 * (`journal-chapter-open`; the Story lead, Nov 24): one drawn world per run,
 * appending one line per chapter opener the player's Journal has on day one,
 * the outline input the one planner told it from (`chapterOpenTelling`,
 * src/director/journal-chapter-open.ts). Run once per world, so memory frees
 * between worlds:
 *   for i in $(seq 30); do node --import tsx scripts/sameness/record-journal-chapter-inputs.mts; done
 * SEED=<hex> chooses the world; with none it draws one, and each line names it.
 * Output: scripts/sameness/inputs/journal-chapter-open-drawn.jsonl (OUT= to change).
 * Prints each chapter's opening line, and whether this row told it, so a
 * run shows which openers the row composer still tells.
 */
import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import type { IsoDate, PersonId } from "../../src/core2/types";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import { BenchPlayer } from "../../src/bench/player";
import {
  composeJournal,
  journalChapterOpeners,
} from "../../src/director/journal";
import { tell } from "../../src/english/outline-planner";

setBookkeeping(false);
const seed = process.env.SEED ?? randomBytes(8).toString("hex");
const out =
  process.env.OUT ?? "scripts/sameness/inputs/journal-chapter-open-drawn.jsonl";
const world = await buildBenchWorldInStages(
  seed,
  gameStartDate(),
  { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
  () => undefined,
);
const { core, director } = world;
const place = world.place.displayName;
const me = world.playerId as PersonId | undefined;
if (!me) {
  console.error(`${seed} ${place}: no player`);
  process.exit(0);
}
// The Journal as the player opens it: the player is the one the director follows.
new BenchPlayer(core, director).select(me);
const options = { through: core.date as IsoDate };
const openers = journalChapterOpeners(core, director, me, options);
for (const input of openers) {
  appendFileSync(
    out,
    `${JSON.stringify({
      facts: input.facts,
      traits: input.traits,
      momentKey: input.momentKey,
      worldSeed: input.worldSeed,
      place,
    })}\n`,
  );
}
const planned = new Set(
  openers.map((input) => tell(input)?.paragraphs.join(" ").toLowerCase()),
);
for (const chapter of composeJournal(core, director, me, options)) {
  const first = chapter.lines[0]?.text ?? "";
  const by = [...planned].some(
    (text) => !!text && first.toLowerCase().includes(text),
  )
    ? "told by journal-chapter-open"
    : "not this row";
  console.error(`${seed} ${place}: ${chapter.title}: ${by}: ${first}`);
}
console.error(`${seed} ${place}: ${openers.length} openers recorded`);
