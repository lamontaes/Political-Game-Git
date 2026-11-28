/**
 * Appoints a resident of a drawn place to one of the town's appointed posts and prints the scene the director stages
 * for them, every reply pressed, with the facts it leans on and the piece keys said (appointment-offer). The appointment
 * is the executive engine's own door (`appoint`, the call the game makes when an appointing official names someone), so
 * the walk makes no record of its own. Development tooling for the Story thread, shipped play never imports it; the shape
 * of mayor-walk.ts, reusing walk-places.ts.
 *
 *   node --import tsx scripts/words/appointment-walk.ts --seed <word> [--label a] [--attempts 12] [--days 60]
 *
 * The place is drawn from all 56 by seed and label. A place with no appointed town post, or whose post the door does not
 * fill, is passed over by name and the next place is drawn (up to `--attempts`; the seed and every place passed over are
 * printed). The run ends by naming the situation types the director bound to the appointee and each purpose it did not
 * stage.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { appoint, townPosts } from "../../src/core2/modules/executive";
import { townSeats } from "../../src/core2/modules/offices";
import { corePlaceByKey } from "../../src/core2/place-lookup";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { townResidentsByCash } from "../../tests/support/resident-adults-test-kit";
import { drawPlace } from "../core2-year/place";
import { walkPlaces } from "./walk-places";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const days = Number(option("days", "60"));
const walk = walkPlaces(option, label);

setBookkeeping(false);
const place = drawPlace(seed, `appointment-walk:${walk.drawLabel}`);
const where = `${place.name} (${place.key}), seed ${place.seed}`;
console.log(`# PLACE ${where}`);
const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
  twoLevel: true,
  placeKey: place.key,
});
const api = coreAPI(core);

const printTree = (node: TreeNode, ind: string) => {
  for (const l of node.lines)
    console.log(`${ind}${l.speaker}: ${l.text}   <${l.parts.join(" + ")}>`);
  for (const r of node.replies) {
    console.log(
      `${ind}> YOU press [${r.line.move}]: ${r.line.text}   <${r.line.parts.join(" + ")}>`,
    );
    if (r.next) printTree(r.next, ind + "    ");
  }
  if (node.end)
    console.log(
      `${ind}[END ${node.end.ending?.id}]${node.end.close ? ` close: ${node.end.close.text} <${node.end.close.parts.join(" + ")}>` : ""}`,
    );
};
const show = (result: ReturnType<typeof purposeScene>, head: string) => {
  if (result?.kind !== "composed") return false;
  const { scene } = result;
  console.log(
    `\n## ${head}: ${scene.purpose}; facts: ${scene.facts.map((f) => f.key).join(", ")}`,
  );
  for (const f of scene.facts)
    console.log(`   fact ${f.key} = ${f.text}  [${f.recordIds.join(" ")}]`);
  for (const n of scene.talk.narration) console.log(`Narrator: ${n.text}`);
  console.log(
    `${scene.talk.state.speaker}: ${scene.talk.state.text}   <${scene.talk.state.parts.join(" + ")}>`,
  );
  printTree(scene.talk.tree, "  ");
  return true;
};

const posts = townPosts(api);
if (!posts.length)
  walk.passOver(where, "the town's government has no appointed post");
const start = makeIsoDate(core.date);
const town = corePlaceByKey(place.key)?.context.jurisdiction.id;
const held = new Set(
  townSeats(api).flatMap((s) =>
    s.holder?.personId ? [s.holder.personId] : [],
  ),
);
// The door names whom it ranks first among the town's adults (alignment, qualification, acquaintance), so the walk
// watches the town's adults first, so the director books the appointment for whichever of them is named, and plays that one.
const adults = townResidentsByCash(core, api).filter(
  (r) =>
    r.alive &&
    r.placeId === town &&
    r.tier !== "husk" &&
    !held.has(r.id) &&
    ageOnDate(makeIsoDate(r.birthDate), start) >= 25,
);
for (const row of adults.slice(0, 200))
  director.watch(core, row.id as PersonId);
let appointed: ReturnType<typeof appoint> = null;
let post = "";
for (const spec of posts) {
  appointed = appoint(api, { post: spec.key });
  if (appointed) {
    post = spec.key;
    break;
  }
}
if (!appointed)
  walk.passOver(where, `the door filled none of ${posts.length} posts`);
const me = appointed!.holderId as PersonId;
if (!core.people.has(me) || !director.ledger.people.has(me))
  walk.passOver(
    where,
    `the appointee ${me} is not a full person the director watches`,
  );
core.playerId = me;
core.focusPersonIds.add(me);
console.log(
  `# APPOINTED ${me} to ${post} (${appointed!.title}) by ${appointed!.appointedBy}, confirmation ${JSON.stringify(appointed!.confirmation)}`,
);

const book = director.ledger.people.get(me)!;
const seen = new Set<string>();
const got = new Map<string, number>();
const notComposed = new Map<string, number>();
const sweep = () => {
  for (const entry of book.schedule)
    for (const binding of entry.bindings) {
      if (binding.typeKey !== "appointment") continue;
      const key = `${entry.momentId}|${binding.typeKey}`;
      if (seen.has(key)) continue;
      const result = purposeScene(core, director, me, entry, {
        typeKey: binding.typeKey,
      });
      if (result?.kind !== "composed") {
        const why = `${binding.typeKey}: ${result ? result.kind : "none"}`;
        notComposed.set(why, (notComposed.get(why) ?? 0) + 1);
        continue;
      }
      seen.add(key);
      if (show(result, `${binding.typeKey} on ${core.date}`))
        got.set("appointment-offer", (got.get("appointment-offer") ?? 0) + 1);
    }
};
for (let day = 0; day <= days; day += 1) {
  sweep();
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
}
sweep();
const typesSeen = new Map<string, number>();
for (const entry of book.schedule)
  for (const binding of entry.bindings)
    typesSeen.set(binding.typeKey, (typesSeen.get(binding.typeKey) ?? 0) + 1);
console.log(
  `# bound but not composed: ${[...notComposed.entries()].map(([k, v]) => `${k} (${v} sweeps)`).join("; ") || "none"}`,
);
console.log(
  `# the director bound these situation types to the appointee: ${[...typesSeen.entries()].map(([k, v]) => `${k} x${v}`).join(", ") || "none"}`,
);
console.log(
  `\n# DONE ${where}: ${[...got.entries()].map(([k, v]) => `${k} x${v}`).join("; ") || "no scene"}; ${got.has("appointment-offer") ? "" : "not staged here: appointment-offer; "}last day ${core.date}`,
);
