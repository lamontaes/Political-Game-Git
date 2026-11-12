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
import { castMemberVote } from "../core2/modules/legislature";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { commentOn } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

/**
 * Answers that count (path 7; scene-reporter-calls-on-a-vote). In a played
 * world a resident member of a body (the player, as in a seated start) casts
 * a vote on a bill. The vote record (`bill-vote:<bill>:<office>`) stages the
 * reporter's call, which asks why they voted the way their own vote record
 * says. Answering on the record keeps their words, refusing keeps that they
 * declined, and the paper's next story of that vote quotes them or says they
 * declined, citing the reply's record. Drawn places, a fresh seed, place and
 * seed printed.
 */

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 12;
const VOTE_DAYS = 120;
const PAPER_DAYS = 10;

/** The path that answers with `move`, then takes the first reply until the talk ends. */
function pathOf(tree: TreeNode, move: string): number[] | null {
  const first = tree.replies.findIndex((row) => row.line.move === move);
  if (first < 0) return null;
  const path = [first];
  let node = tree.replies[first]!.next;
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

it(`a member's vote brings the reporter's call, and the vote's story carries the answer (seed ${seed})`, () => {
  const shown: string[] = [];
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS && shown.length < 2; attempt += 1) {
    const move = shown.length === 0 ? "answer" : "refuse";
    const side = attempt % 2 === 0 ? "yes" : "no";
    const place = drawPlace(`${seed}:${attempt}`, "reporter-on-vote");
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
    // The member decides their own vote before the body holds it.
    castMemberVote(api, bill.id, me, side);
    const voteId = `bill-vote:${bill.id}:${body.officeId}`;
    for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (!core.durableLog.has(voteId)) {
      tried.push(`${where}: ${bill.id} not voted within ${VOTE_DAYS} days`);
      continue;
    }
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    const staged = director.ledger.people
      .get(me)
      ?.schedule.find((row) => row.momentId.includes(voteId));
    // The vote's own record stages the call where a reporter who is a full
    // person covers the body (no dice: every member who voted).
    const entry = staged?.bindings.some((b) => b.typeKey === "press-interview")
      ? staged
      : undefined;
    if (!entry) {
      tried.push(
        `${where}: ${voteId} staged ${JSON.stringify(staged?.bindings.map((b) => b.typeKey) ?? null)}`,
      );
      continue;
    }
    const scene = purposeScene(core, director, me, entry!, {
      typeKey: "press-interview",
    });
    expect(scene?.kind, `${where}: ${JSON.stringify(scene)}`).toBe("composed");
    if (scene?.kind !== "composed") continue;
    expect(scene.scene.cause.id, where).toBe(voteId);
    // The call asks about the side the member's own vote record shows.
    const ownId = `office.voted:${bill.id}:${me}`;
    const sideFact = scene.scene.facts.find(
      (row) => row.key === `voted-${side}`,
    );
    expect(sideFact?.recordIds, `${where}: voted-${side}`).toContain(ownId);
    const asked = scene.scene.talk.state.text;
    expect(asked, where).toMatch(side === "yes" ? /\bfor\b/ : /\bagainst\b/);
    const path = pathOf(scene.scene.talk.tree, move);
    if (!path) {
      tried.push(`${where}: no ${move} reply`);
      continue;
    }
    const replyId = replyInScene(core, director, me, entry!, path, {
      typeKey: "press-interview",
    });
    const comment = commentOn(api, voteId);
    const here = `${where}: ${voteId}`;
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
        row.facts.sourceRecordId === voteId &&
        row.date >= comment.date,
    );
    if (!story) {
      tried.push(`${here}: not printed`);
      continue;
    }
    const words = wordPrintedStory(core, story);
    const text = (words?.paragraphs ?? [words?.lede ?? ""]).join(" ");
    const name = `${member.givenName} ${member.familyName}`;
    if (comment.quote) expect(text, here).toContain(comment.quote);
    else
      expect(text, here).toMatch(
        new RegExp(`${name} (declined to|would not) comment`),
      );
    expect(words!.sourceRecordIds, here).toContain(replyId);
    shown.push(
      `${here} (voted ${side}, ${move}): asked "${asked}"; ${story.id}: ${words!.headline} / ${text}`,
    );
  }
  process.stdout.write(
    `REPORTER ON A VOTE\n${shown.join("\n")}\nTRIED ${tried.join("; ")}\n`,
  );
  expect(shown.length, `seed ${seed}: ${tried.join("; ")}`).toBe(2);
}, 3_600_000);
