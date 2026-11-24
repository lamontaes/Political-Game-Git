/**
 * Per-kind counts of what the tie rule offers and refuses in a played world
 * (the opening day of a New Game): every person the player could talk to,
 * each speaking to the player. Run:
 *   SEEDS=21,22,23 LIMIT=300 node --import tsx scripts/words/subject-tie-counts.ts
 */
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import type { PersonId } from "../../src/core2/types";
import {
  buildBenchWorldInStages,
  OPENING_WARMUP_DAYS,
} from "../../src/bench/world";
import { subjectsBetween } from "../../src/director/conversation";

setBookkeeping(false);
const offered: Record<string, number> = {};
const refused: Record<string, number> = {};
const byTie: Record<string, number> = {};
const byAct: Record<string, number> = {};
let pairs = 0;
const limit = Number(process.env.LIMIT ?? 300);
for (const seed of (process.env.SEEDS ?? "21,22,23").split(",")) {
  const world = await buildBenchWorldInStages(
    seed,
    gameStartDate(),
    { twoLevel: true, warmUpDays: OPENING_WARMUP_DAYS },
    () => undefined,
  );
  const { core, director } = world;
  const playerId = world.playerId as PersonId;
  console.error(`seed ${seed}: ${world.place.displayName}`);
  let n = 0;
  for (const person of core.people.values()) {
    if (person.id === playerId || !person.alive || n >= limit) continue;
    n += 1;
    pairs += 1;
    const rows = subjectsBetween(core, person.id, playerId, director, {
      refused: (subject) => {
        refused[subject.kind] = (refused[subject.kind] ?? 0) + 1;
      },
    });
    for (const row of rows) {
      offered[row.kind] = (offered[row.kind] ?? 0) + 1;
      const key = `${row.kind}:${row.tie?.kind}`;
      byTie[key] = (byTie[key] ?? 0) + 1;
      // What the news tie rests on: the kind of the record behind it (a recorded act, a household, a law's reach).
      if (row.kind === "news" && row.tie) {
        const behind = row.tie.recordIds[1] ?? "";
        const kind =
          core.durableLog.get(behind as never)?.kind ??
          "household or reach row";
        const label = `${row.tie.kind}:${kind}`;
        byAct[label] = (byAct[label] ?? 0) + 1;
      }
    }
  }
}
console.log(JSON.stringify({ pairs, offered, refused, byTie, byAct }, null, 2));
