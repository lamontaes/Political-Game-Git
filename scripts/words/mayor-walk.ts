/**
 * Plays a town's mayor in a drawn place while the council brings bills, and prints the scenes the director stages for
 * the executive, every reply pressed, with the facts they lean on and the piece keys said: a bill presented to the
 * mayor's desk (desk-visit), a budget line argued over (cut-argument, the budget-cut type) and an appointment offered
 * (appointment-offer). Development tooling for the Story thread, shipped play never imports it; the shape of
 * member-walk.ts, reusing walk-places.ts.
 *
 *   node --import tsx scripts/words/mayor-walk.ts --seed <word> [--label a] [--attempts 12] [--days 200]
 *
 * The place is drawn from all 56 by seed and label. The town's mayor is the player; a resident who sits in the
 * council brings bills on the questions the body may decide and the walk lives `--days` days, sweeping the mayor's
 * schedule every day. A place with no held mayor seat, no resident in a body or no question the body may decide is
 * passed over by name and the next place is drawn (up to `--attempts`; the seed and every place passed over are
 * printed). The run ends by naming the situation types the director bound to the mayor, those bound but not
 * composed, and each purpose it did not stage.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { seatAct, seatView } from "../../src/bench/legislature";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import { townSeats } from "../../src/core2/modules/offices";
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
const days = Number(option("days", "200"));
const walk = walkPlaces(option, label);

/** The situation types this walk looks for, with the purpose each one plays. */
const TARGETS: Record<string, string> = {
  "desk-visit": "desk-visit",
  "budget-cut": "cut-argument",
  appointment: "appointment-offer",
};

setBookkeeping(false);
const place = drawPlace(seed, `mayor-walk:${walk.drawLabel}`);
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

const mayorSeat = townSeats(api).find(
  (row) => row.office.kind === "mayor" && row.holder?.personId,
);
if (!mayorSeat?.holder) walk.passOver(where, "no mayor seat is held");
const mayor = mayorSeat!.holder!.personId as PersonId;
const member = [...core.people.values()]
  .filter((p) => p.alive && p.id.startsWith("person_") && p.id !== mayor)
  .sort((a, b) => a.id.localeCompare(b.id))
  .find((p) => seatView(core, p.id).bodies.length > 0);
if (!member)
  walk.passOver(where, "no resident other than the mayor sits in a body");
core.playerId = mayor;
core.focusPersonIds.add(mayor);
director.watch(core, mayor);
const seat = seatView(core, member!.id);
const body = seat.bodies[0]!;
let brought = 0;
for (const question of seat.questions) {
  if (brought >= 3) break;
  const bill = seatAct(core, member!.id as PersonId, {
    kind: "draft",
    officeId: body.officeId,
    question,
    value: 1,
  }) as { id: string; status: string };
  if (bill.status === "blocked") continue;
  brought += 1;
  console.log(`# COUNCIL BILL ${bill.id} on ${question} by ${member!.id}`);
}
if (!brought)
  walk.passOver(where, `${body.officeId} may decide none of its questions`);
console.log(
  `# MAYOR ${mayor} of ${where}; the council brought ${brought} bill(s)`,
);

const book = director.ledger.people.get(mayor)!;
const seen = new Set<string>();
const got = new Map<string, number>();
/** A situation type the director bound but the words engine did not compose. */
const notComposed = new Map<string, number>();
const sweep = () => {
  for (const entry of book.schedule)
    for (const binding of entry.bindings) {
      const purpose = TARGETS[binding.typeKey];
      const key = `${entry.momentId}|${binding.typeKey}`;
      if (!purpose || seen.has(key)) continue;
      const result = purposeScene(core, director, mayor, entry, {
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
  `# the director bound these situation types to the mayor: ${[...typesSeen.entries()].map(([k, v]) => `${k} x${v}`).join(", ") || "none"}`,
);
const missed = [...new Set(Object.values(TARGETS))].filter((p) => !got.has(p));
console.log(
  `\n# DONE ${where}: ${[...got.entries()].map(([k, v]) => `${k} x${v}`).join("; ") || "no scene"}; not staged here: ${missed.join(", ") || "none"}; last day ${core.date}`,
);
