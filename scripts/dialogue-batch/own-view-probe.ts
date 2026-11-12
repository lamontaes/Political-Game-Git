/**
 * For a bench seed (the world `POST /api/newlife?seed=<seed>` builds), lists
 * the people most willing to tell the player where they stand, where they
 * work, and the line a talk with them raises today
 * (words-home-own-view-lines-are-composed). Usage:
 *   node --import tsx scripts/dialogue-batch/own-view-probe.ts --seed <seed> [--days 3]
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import type { PersonId } from "../../src/core2/types";
import { openConversation, say } from "../../src/director/conversation";
import {
  strongestQuestion,
  viewTopicWeight,
  viewWillingness,
} from "../../src/director/view-learned";
import { coreAPI } from "../../src/core2/state";

const arg = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1]! : fallback;
};
const seed = arg("seed", "own-view-probe");
const days = Number(arg("days", "3"));
const out = (line: string) => process.stdout.write(`${line}\n`);
setBookkeeping(false);
const { core, director, playerId } = buildBenchWorld(seed, gameStartDate(), {
  twoLevel: true,
});
const me = playerId as PersonId;
advanceCore(core, addDays(makeIsoDate(core.date), days));
const api = coreAPI(core);
const player = core.people.get(me)!;
out(
  `seed ${seed}, ${core.date}, player ${player.givenName} ${player.familyName}`,
);
const ranked = [...core.people.values()]
  .filter((p) => p.alive && p.id !== me)
  .map((p) => ({
    person: p,
    weight: viewTopicWeight(viewWillingness(core, p.id as PersonId, me)),
  }))
  .filter((row) => row.weight > 0)
  .sort((a, b) => b.weight - a.weight)
  .slice(0, 12);
for (const { person, weight } of ranked) {
  const id = person.id as PersonId;
  const job = person.jobId ? core.jobs.get(person.jobId) : undefined;
  const org = job ? core.organizations.get(job.organizationId)?.name : "-";
  const home = person.householdId === player.householdId ? "home" : "away";
  let talk = openConversation(core, me, id, { director });
  let line = talk.lines.find((row) => row.kind === "own-view");
  // With --again, a second talk right after the first: the first topic is
  // behind them, and the next one leads.
  if (!line && process.argv.includes("--again") && talk.choices.length) {
    say(core, talk, talk.choices[0]!.key);
    talk = openConversation(core, me, id, { director });
    line = talk.lines.find((row) => row.kind === "own-view");
  }
  out(
    `${id} ${person.givenName} ${person.familyName} (${home}, ${org}) weight ${weight.toFixed(2)} top ${strongestQuestion(api, id)?.about ?? "-"}: ${line ? line.text : `[${talk.lines.map((l) => l.kind).join(",")}]`}`,
  );
}
