/**
 * Prints face-to-face greetings at Sheridan WY (5669845), seed 7: the talks
 * after a day and after forty days, grouped by what the person said before the
 * player spoke, so the opener-then-core shape can be read.
 * Run: node --import tsx scripts/words/greet-openings-replay.ts > played-<sha8>.md
 */
import { execSync } from "node:child_process";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { buildBenchWorld } from "../../src/bench/world";
import { openConversation } from "../../src/director/conversation";

setBookkeeping(false);
console.log(
  `# Face-to-face greetings, head ${execSync("git rev-parse HEAD").toString().trim()}\n`,
);
console.log(
  "Sheridan WY (5669845), seed 7. Each line is one talk's greeting turns by the other person.\n",
);
const { core, director, playerId } = buildBenchWorld("7", gameStartDate(), {
  twoLevel: true,
  placeKey: "5669845",
});
director.watch(core, playerId);
core.focusPersonIds.add(playerId);
const me = core.people.get(playerId as PersonId)!;
const api = coreAPI(core);
const others = [...core.people.values()]
  .filter(
    (row) =>
      row.alive &&
      row.tier !== "husk" &&
      row.id !== me.id &&
      (row.householdId === me.householdId || row.jobId !== undefined),
  )
  .slice(0, 60);
for (const row of others)
  api.meet(me.id, row.id, {
    placeId: me.placeId,
    sourceId: "fixture-meeting",
    cause: "met-in-group",
    hours: 1,
  });
for (const days of [1, 40]) {
  advanceCore(core, addDays(makeIsoDate(core.date), days));
  console.log(`## After ${days} day${days > 1 ? "s" : ""}\n`);
  const seen = new Set<string>();
  for (const row of others) {
    const talk = openConversation(core, playerId as PersonId, row.id, {
      director,
    });
    const greets = talk.lines
      .filter((line) => line.kind === "greet" && line.speakerId === row.id)
      .map((line) => line.text);
    if (!greets.length) continue;
    const text = greets.map((line) => `"${line}"`).join(" then ");
    if (seen.has(text)) continue;
    seen.add(text);
    console.log(`- ${row.id}: ${text}`);
  }
  console.log("");
}
