/**
 * Plays a first day at a new job in a drawn place and prints every talk whole (Story lead, Nov 17;
 * development tooling like door-walk.ts, shipped play never imports it).
 *
 *   node --import tsx scripts/words/first-day-walk.ts --seed <word> [--label a] [--months 24]
 *     [--per 4] [--seen-out <file>]
 *
 * The place is drawn from all 56 by seed and label. The director watches every working-age full
 * person in town; the jobs engine hires them in play (a seeker takes an opening, the hire is
 * recorded, the director's ledger writes the `money:job-started` moment and the scene is staged
 * with a coworker as the authority). The world runs a month at a time; each staged `first-day`
 * scene is composed with purposeScene and its whole tree printed with every reply pressed, with the
 * facts it leans on and the piece keys said. A summary line counts the scenes by the facts they
 * held (a first job, a job after another, a night shift) so a missing case is said, not assumed.
 * With `--seen-out`, the keys of every piece said are written to the file, one per line.
 */
import { writeFileSync } from "fs";
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const months = Number(option("months", "24"));
const per = Number(option("per", "4"));
const seenOut = option("seen-out", "");
const LABEL = "money:job-started";

setBookkeeping(false);
const place = drawPlace(seed, `first-day-walk:${label}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const world = buildBenchWorld(place.seed, gameStartDate() as never, {
  twoLevel: true,
  placeKey: place.key,
});
const { core, director } = world;
const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
const said = new Set<string>();
const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines) {
    l.parts.forEach((key) => said.add(key));
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  }
  for (const r of node.replies) {
    r.line.parts.forEach((key) => said.add(key));
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end) {
    node.end.close?.parts.forEach((key) => said.add(key));
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
  }
};
const cases = new Map<string, number>();
const show = (result: ReturnType<typeof purposeScene>, head: string) => {
  if (result?.kind !== "composed") {
    console.log(`\n## ${head}: not composed (${result?.reason ?? "none"})`);
    return false;
  }
  const { scene } = result;
  console.log(`\n## ${head}: ${scene.purpose}`);
  const held = new Set(scene.facts.map((f) => f.key));
  for (const f of scene.facts)
    console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  for (const key of [
    "first-job",
    "came-from",
    "nights",
    "boss",
    "before-you",
    "coworkers",
    "longest-there",
    "pay-low",
  ])
    if (held.has(key)) cases.set(key, (cases.get(key) ?? 0) + 1);
  for (const n of scene.talk.narration) {
    n.parts.forEach((key) => said.add(key));
    console.log(`Narrator: ${n.text}   <${n.parts.join(" + ")}>`);
  }
  for (const l of [
    ...(scene.talk.open ? [scene.talk.open] : []),
    ...scene.talk.intro,
  ]) {
    l.parts.forEach((key) => said.add(key));
    console.log(`${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  }
  scene.talk.state.parts.forEach((key) => said.add(key));
  console.log(
    `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  if (scene.talk.gaps.length)
    console.log(`   GAPS: ${scene.talk.gaps.join("; ")}`);
  return true;
};

const watched = new Set<string>();
const watchWorkers = () => {
  for (const person of core.people.values()) {
    if (watched.has(person.id)) continue;
    const age = ageOnDate(
      makeIsoDate(person.birthDate),
      makeIsoDate(core.date),
    );
    if (
      person.alive &&
      person.tier !== "husk" &&
      person.placeId === town &&
      age >= 16 &&
      age < 70
    ) {
      watched.add(person.id);
      core.focusPersonIds.add(person.id as PersonId);
      director.watch(core, person.id as PersonId);
    }
  }
};
watchWorkers();
console.log(`# WATCHING ${watched.size} people`);
const seen = new Set<string>();
let got = 0;
for (let month = 0; month < months && got < per; month += 1) {
  advanceCore(core, addDays(makeIsoDate(core.date), 30));
  watchWorkers();
  for (const book of director.ledger.people.values())
    for (const entry of book.schedule) {
      const key = `${book.personId}|${entry.momentId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const moment = book.momentsById.get(entry.momentId);
      if (!moment || moment.label !== LABEL) continue;
      if (!entry.bindings.some((row) => row.typeKey === "first-day")) continue;
      if (got >= per) continue;
      if (
        show(
          purposeScene(core, director, book.personId as PersonId, entry, {
            typeKey: "first-day",
          }),
          `${moment.label} on ${core.date} (${moment.causeId})`,
        )
      )
        got += 1;
    }
}
if (seenOut) writeFileSync(seenOut, [...said].sort().join("\n") + "\n");
console.log(
  `\n# DONE ${where}: ${got} first-day scenes; facts held: ${[...cases.entries()].map(([k, v]) => `${k} x${v}`).join(", ") || "none"}; last day ${core.date}`,
);
process.exit(0);
