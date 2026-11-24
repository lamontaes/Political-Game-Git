/**
 * Answers that count (path 7, "a reporter's story quoting you or saying you
 * declined"; scene-reporter-calls-on-a-vote's story half). In a played world
 * the player files, runs to election day and is asked for comment by a
 * reporter (the press-interview scene). Answering on the record keeps their
 * words; refusing keeps that they declined. The paper's story of the record
 * the reporter asked about then quotes them or says they declined, citing
 * the reply's record. Drawn places, a fresh seed, place and seed printed.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { wordPrintedStory } from "../bench/archive-words";
import { seatAct, seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { commentOn } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 8;
const PAPER_DAYS = 10;

/** The path that answers with `move`, then takes the first reply until the talk ends. */
function pathOf(tree: TreeNode, move: string): number[] | null {
  const first = tree.replies.findIndex((row) => row.line.move === move);
  if (first < 0) return null;
  const path = [first];
  let node = tree.replies[first]!.next;
  // Then the same move again where it is offered, else walking off, else
  // the first reply, until the talk ends.
  for (let depth = 0; node && !node.end && depth < 6; depth += 1) {
    if (!node.replies.length) return null;
    const again = node.replies.findIndex((row) => row.line.move === move);
    const leave = node.replies.findIndex((row) => row.line.move === "leave");
    const at = again >= 0 ? again : leave >= 0 && move !== "answer" ? leave : 0;
    path.push(at);
    node = node.replies[at]!.next;
  }
  return path;
}

// A resident council member drafts a bill (the legislature's own draft
// step), a reporter asks them about it, and the paper's story of the
// introduction carries what they said, or that they declined. (A candidate
// meets no reporter's question: declining an interview is a snub, not a
// story to comment on.)
it(`what a member tells a reporter about their bill is in the paper's story (seed ${seed})`, () => {
  const shown: string[] = [];
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS && shown.length < 2; attempt += 1) {
    const move = shown.length === 0 ? "answer" : "refuse";
    const place = drawPlace(`${seed}:${attempt}`, "comment-printed-office");
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
      tried.push(`${where}: no resident member of a body`);
      continue;
    }
    // The member is the player here, as in a seated start.
    const me = member.id as PersonId;
    core.playerId = me;
    director.watch(core, me);
    const seat = seatView(core, me);
    const body = seat.bodies[0]!;
    let bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      series: "minimum-wage",
      value:
        (seat.amounts.find((a) => a.series === "minimum-wage")?.current ?? 0) +
        200,
    }) as { id: string; status: string };
    for (const question of seat.questions) {
      if (bill.status !== "blocked") break;
      bill = seatAct(core, me, {
        kind: "draft",
        officeId: body.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
    }
    if (!core.durableLog.has(`office.introduced:${bill.id}`)) {
      tried.push(`${where}: ${bill.status}, no introduction record`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    // One sitting a day: the reporter's scene that day covers every bill the
    // member introduced (scheduling folds the rest into it).
    const entry = director.ledger.people
      .get(me)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(":office.introduced:") &&
          row.bindings.some((b) => b.typeKey === "press-interview"),
      );
    if (!entry) {
      tried.push(`${where}: no reporter for ${bill.id}`);
      continue;
    }
    const scene = purposeScene(core, director, me, entry, {
      typeKey: "press-interview",
    });
    if (scene?.kind !== "composed") {
      tried.push(
        `${where}: scene not composed (${JSON.stringify(scene).slice(0, 160)})`,
      );
      continue;
    }
    const path = pathOf(scene.scene.talk.tree, move);
    if (!path) {
      tried.push(`${where}: no ${move} reply`);
      continue;
    }
    const replyId = replyInScene(core, director, me, entry, path, {
      typeKey: "press-interview",
    });
    const causeId = scene.scene.cause.id;
    const comment = commentOn(api, causeId);
    const here = `${where}: ${causeId}`;
    if (!comment) {
      tried.push(
        `${here}: the ${move} path kept nothing (${core.durableLog.get(replyId as never)?.facts?.ending})`,
      );
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), PAPER_DAYS));
    const story = (
      api.moduleState(NEWS_MODULE_ID).table("stories").rows() as unknown as {
        id: string;
        kind: string;
        date: string;
        facts: Record<string, string>;
      }[]
    ).find(
      (row) =>
        row.kind === "press.printed" &&
        row.facts.sourceRecordId === causeId &&
        row.date >= comment.date,
    );
    if (!story) {
      tried.push(`${here}: not printed`);
      continue;
    }
    const words = wordPrintedStory(core, story);
    const body2 = (words?.paragraphs ?? [words?.lede ?? ""]).join(" ");
    const name = `${member.givenName} ${member.familyName}`;
    if (comment.quote) expect(body2, here).toContain(comment.quote);
    else
      expect(body2, here).toMatch(
        new RegExp(`${name} (declined to|would not) comment`),
      );
    expect(words!.sourceRecordIds, here).toContain(replyId);
    shown.push(`${here} (${move}): ${story.id}: ${words!.headline} / ${body2}`);
  }
  process.stdout.write(
    `MEMBER COMMENTS PRINTED\n${shown.join("\n")}\nTRIED ${tried.join("; ")}\n`,
  );
  expect(shown.length, `seed ${seed}: ${tried.join("; ")}`).toBe(2);
}, 3_600_000);
