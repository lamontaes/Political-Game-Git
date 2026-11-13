/**
 * A scene as played, for the words bar: in drawn places, a member of a local
 * body (the player) drafts a bill and lives day by day until the director
 * stages a scene of the asked type for them from the world's own records;
 * the scene is composed by the scene engine, the way play does. Prints the
 * place and seed, the facts the scene carries with the records they cite,
 * the lines on the trait-led path and every reply offered at every node.
 *
 *   OCD_STORAGE_OVERRIDE=... NODE_OPTIONS=--max-old-space-size=4096 \
 *     npx tsx scripts/words/scene-played.ts <typeKey> <seed> [places=3] [days=120]
 *
 * Each place is drawn with the repository's drawPlace from `<seed>:<n>`; a
 * place where no member sits or no such scene is staged in the window is
 * named with why and passed over. Development tooling; play never imports it.
 */
import { buildBenchWorld } from "../../src/bench/world";
import { seatAct, seatView } from "../../src/bench/legislature";
import { drawPlace } from "../core2-year/place";
import { setBookkeeping } from "../../src/core2/bookkeeping";
import { gameStartDate } from "../../src/core2/game-start";
import { addDays, makeIsoDate } from "../../src/core2/kernel/dates";
import { advanceCore } from "../../src/core2/life";
import type { PersonId } from "../../src/core2/types";
import { purposeScene } from "../../src/director/purpose-scene";
import type { TreeNode } from "../../src/director/scene-talk";

const typeKey = process.argv[2] ?? "office-hours";
const seed = process.argv[3] ?? "scene-played";
const want = Number(process.argv[4] ?? 3);
const DAYS = Number(process.argv[5] ?? 120);
const ATTEMPTS = want * 4;
const QUESTIONS_TRIED = 4;

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
  const place = drawPlace(`${seed}:${attempt}`, `scene-played:${typeKey}`);
  const where = `${place.name} (${place.key}), seed ${seed}:${attempt}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
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
  // A bill of their own on the calendar, so the legislature has a roll ahead.
  for (const question of [...seat.questions].slice(0, QUESTIONS_TRIED)) {
    const bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { status: string };
    if (bill.status !== "blocked") break;
  }
  let entry;
  for (let day = 0; day < DAYS && !entry; day++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    entry = director.ledger.people
      .get(me)
      ?.schedule.find((row) => row.bindings.some((b) => b.typeKey === typeKey));
  }
  if (!entry) {
    process.stdout.write(
      `PASSED OVER ${where}: no ${typeKey} staged for ${me} within ${DAYS} days\n`,
    );
    continue;
  }
  const result = purposeScene(core, director, me, entry, { typeKey });
  if (result?.kind !== "composed") {
    process.stdout.write(`PASSED OVER ${where}: ${JSON.stringify(result)}\n`);
    continue;
  }
  shown += 1;
  const { scene } = result as unknown as {
    scene: {
      facts: { key: string; text: string; recordIds: string[] }[];
      talk?: {
        purpose: string;
        lines: { speaker: string; text: string }[];
        tree: TreeNode;
      };
    };
  };
  const out: string[] = [
    `=== ${where}; ${core.date}; member ${member.givenName} ${member.familyName} (${me}); cause ${entry.momentId}`,
    `facts: ${scene.facts.map((row) => `${row.key}="${row.text}" [${row.recordIds.join(", ")}]`).join("; ")}`,
  ];
  const talk =
    (result as unknown as { talk?: typeof scene.talk }).talk ?? scene.talk;
  if (talk) {
    out.push(`purpose ${talk.purpose}`);
    out.push("-- path the member's traits lean toward:");
    for (const line of talk.lines) out.push(`  ${line.speaker}: ${line.text}`);
    out.push("-- every reply offered:");
    walk(talk.tree, 1, out);
  }
  process.stdout.write(`${out.join("\n")}\n`);
}
