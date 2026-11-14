/**
 * Replays the apology scene at pinned places with every line's speaker (a
 * development tool for a words read, account lead Nov 14). Stages a missed
 * payment the way `src/director/apology-variants.test.ts` does, lets the
 * engines write the quarrel and schedule the scene, then prints the narration,
 * the asker's opening and every branch of the talk.
 *
 *   node --import tsx scripts/dialogue-batch/apology-replay.ts --out <file.md> [attempts...]
 */
import { writeFileSync } from "node:fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { applyCoreEvent } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { SceneTalkLine, TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const at = process.argv.indexOf("--out");
const out = at >= 0 ? process.argv[at + 1]! : "";
const attempts = process.argv
  .slice(2)
  .filter((arg, i, all) => /^\d+$/.test(arg) && all[i - 1] !== "--out")
  .map(Number);
const lines: string[] = [
  "# Apology scene replay (pinned places, seed apology-pin)",
  "",
];
const say = (line: SceneTalkLine, depth: number) =>
  `${"  ".repeat(depth)}- ${line.speaker}: ${line.text}`;
const walk = (node: TreeNode, depth: number) => {
  for (const line of node.lines) lines.push(say(line, depth));
  if (node.end?.close) lines.push(say(node.end.close, depth));
  for (const reply of node.replies) {
    lines.push(say(reply.line, depth));
    if (reply.next) walk(reply.next, depth + 1);
  }
};

setBookkeeping(false);
for (const attempt of attempts.length ? attempts : [0, 1]) {
  const place = drawPlace("apology-pin", `apology:${attempt}`);
  const { core, director, playerId } = buildBenchWorld(
    place.seed,
    gameStartDate(),
    { twoLevel: true, placeKey: place.key },
  );
  const id = playerId as PersonId;
  director.watch(core, id);
  const book = director.ledger.people.get(id)!;
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  const player = core.people.get(id)!;
  applyCoreEvent(core, {
    id: `event:credit.payment-missed:probe-${attempt}:${core.date}`,
    date: core.date,
    kind: "credit.payment-missed",
    personIds: [id],
    placeId: player.placeId,
    publicRecord: false,
    source: {
      tag: "ESTIMATED",
      asOf: core.date,
      citation: "Hand-staged missed payment for the apology replay.",
    },
  });
  let entry;
  for (let day = 0; day < 10 && !entry; day += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    entry = book.schedule.find((row) =>
      row.bindings.some((b) => b.typeKey === "apology"),
    );
  }
  lines.push(`## ${place.name} (attempt ${attempt}, place seed ${place.seed})`);
  const result = entry
    ? purposeScene(core, director, id, entry, { typeKey: "apology" })
    : null;
  if (result?.kind !== "composed") {
    lines.push(`- no scene: ${result?.kind ?? "none scheduled"}`, "");
    continue;
  }
  const talk = result.scene.talk;
  lines.push(
    `Player: ${core.people.get(id)!.givenName}; asker: ${core.people.get(result.scene.askerId)!.givenName}; arc ${result.scene.variant?.variant}`,
    "",
    ...talk.narration.map((row) => `- Narrator: ${row.text}`),
    ...(talk.open ? [say(talk.open, 0)] : []),
    say(talk.state, 0),
  );
  walk(talk.tree, 1);
  lines.push("");
}
setBookkeeping(true);
if (out) writeFileSync(out, lines.join("\n"));
else process.stdout.write(lines.join("\n"));
