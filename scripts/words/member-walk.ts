/**
 * Plays a sitting member's bill in a drawn place and prints the scenes the director stages around it, every reply
 * pressed, with the facts they lean on and the piece keys said: the reporter's call about a vote (press-comment),
 * a colleague asking the member to confirm a vote (confirm-vote), a member asking them to carry a bill (carry-bill),
 * a chair holding or being asked to hold a hearing (hearing-ask) and a desk visit. Development tooling for the Story
 * thread, shipped play never imports it; the shape of door-walk.ts, reusing walk-places.ts.
 *
 *   node --import tsx scripts/words/member-walk.ts --seed <word> [--label a] [--attempts 12] [--days 120]
 *
 * The place is drawn from all 56 by seed and label. A resident who sits in a body brings a bill on the question the
 * town is most settled on that the body may decide (the shape of tests/src/director/press-comment-variants.test.ts),
 * votes the side the town stands against, and lives until the bill is voted and `--days` more days; the director's
 * schedule is swept every day. A place with no resident member, no question the body may decide, or a bill never
 * voted is passed over by name and the next place is drawn (up to `--attempts`; the seed and every place passed over
 * are printed). The run ends by naming each purpose it did not stage, so a purpose a place cannot reach is said.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { seatAct, seatView } from "../../src/bench/legislature";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { castMemberVote } from "../../src/core2/modules/legislature";
import { electorateSides } from "../../src/core2/modules/voting";
import { coreAPI } from "../../src/core2/state";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";
import { drawPlace } from "../core2-year/place";
import { walkPlaces } from "./walk-places";

const option = (name: string, fallback: string) => {
  const at = process.argv.indexOf(`--${name}`);
  return at >= 0 ? (process.argv[at + 1] ?? fallback) : fallback;
};
const seed = option("seed", "");
if (!seed) throw new Error("--seed <word> is required");
const label = option("label", "a");
const afterDays = Number(option("days", "120"));
const walk = walkPlaces(option, label);

/** The situation types this walk looks for, with the purpose each one plays. */
const TARGETS: Record<string, string> = {
  "press-interview": "press-comment",
  "vote-confirmed": "confirm-vote",
  "bill-carry": "carry-bill",
  "bill-held-chair": "hearing-ask",
  "hold-chair-sought": "hearing-ask",
  "desk-visit": "desk-visit",
};
const VOTE_DAYS = 120;

setBookkeeping(false);
const place = drawPlace(seed, `member-walk:${walk.drawLabel}`);
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

const member = [...core.people.values()]
  .filter((p) => p.alive && p.id.startsWith("person_"))
  .sort((a, b) => a.id.localeCompare(b.id))
  .find((p) => seatView(core, p.id).bodies.length > 0);
if (!member) walk.passOver(where, "no resident sits in a body");
const me = member!.id as PersonId;
core.playerId = me;
core.focusPersonIds.add(me);
director.watch(core, me);
const seat = seatView(core, me);
const body = seat.bodies[0]!;
const marginOn = (question: string) => {
  const sides = electorateSides(api, question);
  return Math.abs(sides.yes - sides.no);
};
const questions = [...seat.questions].sort(
  (a, b) => marginOn(b) - marginOn(a) || a.localeCompare(b),
);
let bill = { id: "", status: "blocked" };
let brought = "";
for (const question of questions) {
  if (bill.status !== "blocked") break;
  brought = question;
  bill = seatAct(core, me, {
    kind: "draft",
    officeId: body.officeId,
    question,
    value: 1,
  }) as { id: string; status: string };
}
if (bill.status === "blocked")
  walk.passOver(
    where,
    `${body.officeId} may decide none of its ${questions.length} questions`,
  );
if (!core.durableLog.has(`office.introduced:${bill.id}`))
  walk.passOver(where, `${bill.status}, no introduction record`);
const townSides = electorateSides(api, brought);
const side = townSides.yes >= townSides.no ? "no" : "yes";
castMemberVote(api, bill.id, me, side);
console.log(
  `# MEMBER ${me} of ${body.officeId} drafted ${bill.id} on ${brought} and voted ${side} (town yes ${townSides.yes.toFixed(2)} no ${townSides.no.toFixed(2)})`,
);
const voteId = `bill-vote:${bill.id}:${body.officeId}`;
for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day += 1)
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
if (!core.durableLog.has(voteId))
  walk.passOver(where, `${bill.id} not voted within ${VOTE_DAYS} days`);

const book = director.ledger.people.get(me)!;
const seen = new Set<string>();
const got = new Map<string, number>();
/** A situation type the director bound but the words engine did not compose, and how: the lines it waits on. */
const notComposed = new Map<string, number>();
const sweep = () => {
  for (const entry of book.schedule)
    for (const binding of entry.bindings) {
      const purpose = TARGETS[binding.typeKey];
      const key = `${entry.momentId}|${binding.typeKey}`;
      if (!purpose || seen.has(key)) continue;
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
        got.set(purpose, (got.get(purpose) ?? 0) + 1);
    }
};
for (let day = 0; day <= afterDays; day += 1) {
  sweep();
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
}
sweep();
console.log(
  `# bound but not composed: ${[...notComposed.entries()].map(([k, v]) => `${k} (${v} sweeps)`).join("; ") || "none"}`,
);
const typesSeen = new Map<string, number>();
for (const entry of book.schedule)
  for (const binding of entry.bindings)
    typesSeen.set(binding.typeKey, (typesSeen.get(binding.typeKey) ?? 0) + 1);
console.log(
  `# the director bound these situation types to the member: ${[...typesSeen.entries()].map(([k, v]) => `${k} x${v}`).join(", ") || "none"}`,
);
const missed = [...new Set(Object.values(TARGETS))].filter((p) => !got.has(p));
console.log(
  `\n# DONE ${where}: ${[...got.entries()].map(([k, v]) => `${k} x${v}`).join("; ") || "no scene"}; not staged here: ${missed.join(", ") || "none"}; last day ${core.date}`,
);
