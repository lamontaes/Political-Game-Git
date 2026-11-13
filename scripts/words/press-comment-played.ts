/**
 * A reporter's call as played, for the words bar: in drawn places, a seated
 * member brings a question, votes on it, and the reporter's call about the
 * vote is staged by the director and composed by the scene engine, the way
 * play does. Prints the place and seed, the facts the scene carries with the
 * records they cite, the lines on the trait-led path and every reply offered
 * at every node, so a reader sees what the player is offered.
 *
 *   OCD_STORAGE_OVERRIDE=... NODE_OPTIONS=--max-old-space-size=4096 \
 *     npx tsx scripts/words/press-comment-played.ts <seed> [places=3]
 *
 * Each place is drawn with the repository's drawPlace from `<seed>:<n>`; a
 * place where no member sits, the bill does not reach a vote in the window,
 * or no call is staged is named with why and passed over.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { seatAct, seatView } from "../../src/bench/legislature";
import { drawPlace } from "../core2-year/place";
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

const seed = process.argv[2] ?? "press-comment-played";
const want = Number(process.argv[3] ?? 3);
const ATTEMPTS = want * 4;
const VOTE_DAYS = 120;

function walk(node: TreeNode, depth: number, out: string[]): void {
  const pad = "  ".repeat(depth);
  for (const line of node.lines)
    out.push(`${pad}${line.speaker}: ${line.text}`);
  if (node.end?.close)
    out.push(`${pad}${node.end.close.speaker}: ${node.end.close.text}`);
  if (node.end?.ending) out.push(`${pad}[ending: ${node.end.ending.label}]`);
  for (const reply of node.replies) {
    out.push(`${pad}> ${reply.line.text}  (${reply.line.move})`);
    if (reply.next) walk(reply.next, depth + 1, out);
  }
}

let shown = 0;
for (let attempt = 0; attempt < ATTEMPTS && shown < want; attempt += 1) {
  const place = drawPlace(`${seed}:${attempt}`, "press-comment-played");
  const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  const member = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0);
  if (!member) {
    process.stdout.write(
      `PASSED OVER ${where}: no resident member of a body\n`,
    );
    continue;
  }
  const me = member.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const seat = seatView(core, me);
  const body = seat.bodies[0]!;
  let bill = { id: "", status: "blocked" };
  for (const question of [...seat.questions].slice(0, 4)) {
    if (bill.status !== "blocked") break;
    bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; status: string };
    if (bill.status !== "blocked") {
      const sides = electorateSides(api, question);
      castMemberVote(api, bill.id, me, sides.yes >= sides.no ? "no" : "yes");
    }
  }
  const voteId = `bill-vote:${bill.id}:${body.officeId}`;
  for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  if (!core.durableLog.has(voteId)) {
    process.stdout.write(
      `PASSED OVER ${where}: ${bill.id} not voted within ${VOTE_DAYS} days\n`,
    );
    continue;
  }
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const entry = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(voteId) &&
        row.bindings.some((b) => b.typeKey === "press-interview"),
    );
  if (!entry) {
    process.stdout.write(
      `PASSED OVER ${where}: ${voteId} staged no reporter's call\n`,
    );
    continue;
  }
  const result = purposeScene(core, director, me, entry, {
    typeKey: "press-interview",
  });
  if (result?.kind !== "composed") {
    process.stdout.write(`PASSED OVER ${where}: ${JSON.stringify(result)}\n`);
    continue;
  }
  shown += 1;
  const { scene } = result as unknown as {
    scene: {
      purpose?: string;
      askerId: string;
      askedId: string;
      facts: { key: string; text: string; recordIds: string[] }[];
      talk?: {
        purpose: string;
        lines: { speaker: string; text: string }[];
        tree: TreeNode;
        narration: { text: string }[];
      };
    };
  };
  const out: string[] = [
    `=== ${where}; member ${core.people.get(me)?.givenName} ${core.people.get(me)?.familyName} (${me}); vote ${voteId}`,
    `facts: ${scene.facts.map((row) => `${row.key}="${row.text}" [${row.recordIds.join(", ")}]`).join("; ")}`,
  ];
  const talk =
    (
      result as unknown as {
        talk?: {
          purpose: string;
          lines: { speaker: string; text: string }[];
          tree: TreeNode;
        };
      }
    ).talk ?? scene.talk;
  if (talk) {
    out.push(`purpose ${talk.purpose}`);
    out.push("-- path the member's traits lean toward:");
    for (const line of talk.lines) out.push(`  ${line.speaker}: ${line.text}`);
    out.push("-- every reply offered:");
    walk(talk.tree, 1, out);
  } else
    out.push(`(no talk on the result: keys ${Object.keys(result).join(", ")})`);
  process.stdout.write(`${out.join("\n")}\n`);
}
