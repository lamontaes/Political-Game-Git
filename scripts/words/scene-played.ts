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
 * For bribe-offer and bribe-pressed, where no offer comes in the window the
 * player is offered one through the corruption engine's own considerBribe on
 * their bill: by the lobbyist who met them on it where one did, else by the
 * residents with the most money, as the player-seat test does.
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
import { purposeScene, replyInScene } from "../../src/director/purpose-scene";
import { considerBribe } from "../../src/core2/modules/corruption";
import {
  INTEREST_GROUPS_MODULE_ID,
  type LobbyMeeting,
} from "../../src/core2/modules/interest-groups";
import { coreAPI } from "../../src/core2/state";
import type { TreeNode } from "../../src/director/scene-talk";

const typeKey = process.argv[2] ?? "office-hours";
const seed = process.argv[3] ?? "scene-played";
const want = Number(process.argv[4] ?? 3);
const DAYS = Number(process.argv[5] ?? 120);
const ATTEMPTS = want * 4;
const QUESTIONS_TRIED = 4;
/** The residents with the most money asked, in turn, whether to offer. */
const RICHEST = 40;
/** What the favor is worth to an offerer, in times their own money (the player-seat test's). */
const STAKE_TIMES = 1000;
/** Days lived after an offer for the director to stage it. */
const FORCED_DAYS = 3;

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
  let billId: string | undefined;
  for (const question of [...seat.questions].slice(0, QUESTIONS_TRIED)) {
    const bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; status: string };
    if (bill.status !== "blocked") {
      billId = bill.id;
      break;
    }
  }
  const find = () =>
    director.ledger.people
      .get(me)
      ?.schedule.find((row) => row.bindings.some((b) => b.typeKey === typeKey));
  let entry = find();
  for (let day = 0; day < DAYS && !entry; day++) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    entry = find();
  }
  if (!entry && typeKey.startsWith("bribe-") && billId) {
    const api = coreAPI(core);
    const lobbyists = core.modules.has(INTEREST_GROUPS_MODULE_ID)
      ? (
          api
            .moduleState(INTEREST_GROUPS_MODULE_ID)
            .table("meetings")
            .query("byBillMember", [billId, me]) as unknown as LobbyMeeting[]
        ).flatMap((row) => (row.lobbyistId ? [row.lobbyistId] : []))
      : [];
    const rich = [...core.people.values()]
      .filter((p) => p.id !== me && p.alive && p.placeId === member.placeId)
      .sort((a, b) => b.liquidMinor - a.liquidMinor)
      .slice(0, RICHEST)
      .map((p) => p.id);
    for (const offererId of [...lobbyists, ...rich]) {
      const offerer = core.people.get(offererId);
      if (!offerer) continue;
      const record = considerBribe(api, {
        offererId: offererId as PersonId,
        officialId: me,
        stakeMinor: offerer.liquidMinor * STAKE_TIMES,
        subjectId: billId,
      });
      if (record?.offered) break;
    }
    if (typeKey === "bribe-pressed") {
      // The player turns it down in the offer's own scene, as play does.
      const offer = director.ledger.people
        .get(me)
        ?.schedule.find((row) =>
          row.bindings.some((b) => b.typeKey === "bribe-offer"),
        );
      const offered = offer
        ? purposeScene(core, director, me, offer, { typeKey: "bribe-offer" })
        : null;
      const at =
        offered?.kind === "composed"
          ? offered.scene.talk.tree.replies.findIndex(
              (reply) => reply.line.move === "refuse",
            )
          : -1;
      if (offer && at >= 0)
        replyInScene(core, director, me, offer, [at], {
          typeKey: "bribe-offer",
        });
    }
    for (let day = 0; day < FORCED_DAYS && !entry; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      entry = find();
    }
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
