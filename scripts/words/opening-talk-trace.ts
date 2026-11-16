/**
 * Opens a New Game the way the button does and prints the first talks of day
 * one with each line's bank, parts and records, and each reply set's wording.
 * Run: SEEDS=21,22,23 node --import tsx scripts/words/opening-talk-trace.ts
 */
import { execSync } from "node:child_process";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import type { PersonId } from "../../src/core2/types";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import { openingArrivalMinute, openingFrames } from "../../src/bench/opening";
import { roomIds } from "../../src/bench/scene";
import {
  openConversation,
  subjectsBetween,
} from "../../src/director/conversation";

setBookkeeping(false);
console.log(
  `# Opening talks, head ${execSync("git rev-parse HEAD").toString().trim()}\n`,
);
for (const seed of (process.env.SEEDS ?? "21,22,23").split(",")) {
  const world = await buildBenchWorldInStages(
    seed,
    gameStartDate(),
    { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
    () => undefined,
  );
  const { core, director } = world;
  const playerId = world.playerId as PersonId;
  console.log(`## Seed ${seed}, ${world.place.displayName}\n`);
  const staged = director.ledger.people
    .get(playerId)
    ?.schedule.find(
      (row) =>
        row.date === core.date &&
        row.outcome.startsWith("scene") &&
        row.bindings.length > 0,
    );
  console.log(
    `Staged scene today: ${staged ? JSON.stringify({ momentId: staged.momentId, outcome: staged.outcome, situation: (staged as { situationId?: string }).situationId }) : "none"}\n`,
  );
  const story = director.ledger.opening;
  if (story) {
    console.log(
      `Opening address: kind=${story.addressKind} theme=${story.theme} asks=${story.asks.join("|")} president=${story.president.id}`,
    );
    for (const part of story.address.parts) console.log(`> ${part}`);
    console.log(
      `Landing: ${openingFrames(core, playerId, story).home.landing}\n`,
    );
  }
  const me = core.people.get(playerId)!;
  const household = core.households.get(me.householdId ?? "");
  const minute = openingArrivalMinute(core, playerId);
  const room = roomIds(core, playerId, undefined, minute);
  for (const id of (household?.memberIds ?? []).filter((m) => m !== playerId)) {
    const other = core.people.get(id as PersonId);
    if (!other?.alive) continue;
    const talk = openConversation(core, playerId, id as PersonId, {
      director,
      presentIds: room as PersonId[],
      minuteOfDay: minute,
      ...(staged ? { occasionId: staged.momentId } : {}),
    });
    console.log(`### With ${id} (${other.relationLabel ?? ""})\n`);
    // Why each subject could be raised: the tie record the rule accepted, and what it refused.
    const refused: string[] = [];
    const offered = subjectsBetween(core, id as PersonId, playerId, director, {
      presentIds: room as PersonId[],
      minuteOfDay: minute,
      refused: (subject) => refused.push(subject.id),
    });
    for (const row of offered)
      console.log(
        `  tie: ${row.id} -> ${row.tie?.kind} on ${row.tie?.recordIds.join(", ")}`,
      );
    for (const row of refused) console.log(`  refused (no tie): ${row}`);
    for (const line of talk.lines)
      console.log(
        `- [${line.kind}/${line.act}] "${line.text}"  bank=${line.wording?.bank} parts=${(line.wording?.parts ?? []).join("+")} subject=${line.subjectId} records=${line.sourceRecordIds.join(",")}`,
      );
    for (const c of talk.choices)
      console.log(
        `  - reply [${c.move}] "${c.text}" bank=${c.wording?.bank} parts=${(c.wording?.parts ?? []).join("+")} answers=${c.answers}`,
      );
    console.log("");
  }
}
