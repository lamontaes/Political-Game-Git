/**
 * Words builder W3's proof for the clerk's filing scene (Nov 13, 2026): in a
 * place drawn from all 56, a grown resident files at the counter for the first
 * local race they may, the day turns, and the director's `filing` scene
 * (filing-petition) is printed as played: narration, the clerk's statement,
 * every reply with what follows it, with the place, the seed and the record ids.
 * Usage: node --import tsx scripts/words/w3-filing-scene.ts <seed> [repeat]
 * With "repeat", the resident files a second time first, so the clerk speaks
 * to someone who has filed before.
 */
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import {
  checkEligibility,
  filingOfficeFor,
  playerContests,
} from "../../src/core2/modules/elections";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { chooseAtCounter, openBenchFilingVisit } from "../../src/bench/filing";
import { buildBenchWorld } from "../../src/bench/world";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";

const seed = process.argv[2] ?? "w3-filing";
setBookkeeping(false);
for (let attempt = 0; attempt < 6; attempt += 1) {
  const place = drawPlace(seed, `w3-filing-scene:${attempt}`);
  const where = `${place.name} (${place.key}), seed ${seed}, draw ${attempt}`;
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const playerId = core.playerId as PersonId;
  director.watch(core, playerId);
  const open = () =>
    playerContests(api).find(
      (row) =>
        row.level !== "federal" &&
        row.level !== "state" &&
        checkEligibility(api, playerId, row.id).every((check) => check.met),
    );
  let contest = open();
  for (let week = 0; week < 52 && !contest; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    contest = open();
  }
  if (!contest) {
    console.log(`Passed over ${where}: no local race the player may file for`);
    continue;
  }
  const filedWith = filingOfficeFor(api, contest.id).filedWith;
  let counter = openBenchFilingVisit(core, playerId, filedWith, 10 * 60);
  counter = chooseAtCounter(core, counter, `pick:${contest.id}`);
  counter = chooseAtCounter(core, counter, "file", {});
  const result = counter.result as { status: string; filing?: { id: string } };
  if (result.status === "refused" || !result.filing) {
    console.log(`Passed over ${where}: the filing was refused`);
    continue;
  }
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const book = director.ledger.people.get(playerId)!;
  const entry = book.schedule.find(
    (row) =>
      row.momentId.includes(`candidate-filed:${result.filing!.id}`) &&
      row.bindings.some((binding) => binding.typeKey === "filing"),
  );
  const scene = entry
    ? purposeScene(core, director, playerId, entry, { typeKey: "filing" })
    : null;
  if (scene?.kind !== "composed") {
    console.log(
      `Passed over ${where}: no filing scene (${JSON.stringify(scene)})`,
    );
    continue;
  }
  const { talk } = scene.scene;
  console.log(`Place: ${where}`);
  console.log(`Race: ${contest.title}; filing ${result.filing.id}`);
  console.log(
    `Facts: ${scene.scene.facts.map((f) => `${f.key}=${f.text}`).join("; ")}`,
  );
  for (const line of talk.narration) console.log(`  [narration] ${line.text}`);
  console.log(`  ${talk.state.speaker}: ${talk.state.text}`);
  const walk = (node: TreeNode | null, depth: number) => {
    if (!node || depth > 2) return;
    for (const line of node.lines)
      console.log(`${"  ".repeat(depth + 1)}${line.speaker}: ${line.text}`);
    if (node.end?.close)
      console.log(
        `${"  ".repeat(depth + 1)}${node.end.close.speaker}: ${node.end.close.text}`,
      );
    for (const reply of node.replies) {
      console.log(`${"  ".repeat(depth + 1)}> ${reply.line.text}`);
      walk(reply.next, depth + 1);
    }
  };
  walk(talk.tree, 0);
  process.exit(0);
}
console.log("No drawn place filed in six draws.");
