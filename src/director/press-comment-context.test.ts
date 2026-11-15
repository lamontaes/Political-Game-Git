import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { chooseOwnVote } from "../bench/bill-stage";
import { seatAct, seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { electorateSides } from "../core2/modules/voting";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { Fact } from "../english/scene-talk-words";
import { purposeScene } from "./purpose-scene";
import {
  composeSceneTalk,
  playedNode,
  type PurposeType,
  type TreeNode,
} from "./scene-talk";
import { SITUATION_LIBRARY } from "./scheduling";

// A reporter's call is about something, and every line after the opening has
// to stand on what was said. The scene carries `story`, the bill the record
// names (else its topic), cited to the records it came from; the opening of
// each arc names it, and no reaction leans on a "paragraph" or a "claim" that
// nothing introduced. Played in a drawn place: a member brings a question,
// votes with the player's own press (bill-stage.ts chooseOwnVote), and the
// reporter's call about the vote composes as play composes it; every line a
// tap can reach is checked. The lines a reply says after a vote are played
// tap by tap at pinned places in press-comment-after-vote.test.ts; this test
// no longer words the call again under other arcs or hand-set traits
// (Account lead, Nov 15: no two tests of the same lines by two methods).
const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const ATTEMPTS = 12;
const VOTE_DAYS = 120;
const TYPE = SITUATION_LIBRARY.types.find(
  (row) => row.key === "press-interview",
) as unknown as PurposeType;

it(`a reporter's call names its story, and every line stands on it (seed ${seed})`, () => {
  const tried: string[] = [];
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const place = drawPlace(`${seed}:${attempt}`, "press-comment-context");
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
        chooseOwnVote(core, bill.id, sides.yes >= sides.no ? "no" : "yes", me);
      }
    }
    const voteId = `bill-vote:${bill.id}:${body.officeId}`;
    for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day++)
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
    if (!core.durableLog.has(voteId)) {
      tried.push(`${where}: ${bill.id} not voted within ${VOTE_DAYS} days`);
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
      tried.push(`${where}: ${voteId} staged no reporter's call`);
      continue;
    }
    const result = purposeScene(core, director, me, entry, {
      typeKey: "press-interview",
    });
    expect(result?.kind, `${where}: ${JSON.stringify(result)}`).toBe(
      "composed",
    );
    if (result?.kind !== "composed") continue;
    const { scene } = result;
    const story = scene.facts.find((row) => row.key === "story");
    expect(story, `${where}: the call names no story`).toBeTruthy();
    expect(story!.recordIds.length, where).toBeGreaterThan(0);
    expect(story!.text, where).not.toMatch(/\{|\}|undefined/);

    // The call as play composes it, with the reporter's own traits: every
    // line a tap can reach (playedNode after a lie, as replyInScene plays it).
    const lines: string[] = [
      ...scene.talk.narration.map((row) => row.text),
      ...(scene.talk.open ? [scene.talk.open.text] : []),
      scene.talk.state.text,
    ];
    const walk = (node: TreeNode): void => {
      for (const reply of node.replies) {
        lines.push(reply.line.text);
        if (!reply.next) continue;
        const next = playedNode(reply.next);
        lines.push(...next.lines.map((row) => row.text));
        if (next.end?.close) lines.push(next.end.close.text);
        walk(next);
      }
    };
    walk(scene.talk.tree);
    for (const text of lines) {
      expect(text, where).not.toMatch(/\d{4}-\d{2}-\d{2}|\{|\}|undefined/);
      expect(text, where).not.toMatch(
        /the paragraph|your neighbors|big claim\. I'll check it with/,
      );
    }
    // Kept composed: the national arc. Play gives it only to a national
    // outlet's reporter, never on a town's call, so no played call here
    // reaches it; its opening must still name the story. The reporter's own
    // traits, no hand-set ones.
    const national = composeSceneTalk(
      core,
      director,
      { askerId: scene.askerId, askedId: scene.askedId },
      { ...TYPE, purpose: "press-comment.national", family: "press-comment" },
      Object.fromEntries(
        scene.facts.map((row) => [
          row.key,
          { text: row.text, sourceRecordIds: row.recordIds } as Fact,
        ]),
      ),
    );
    expect(national.kind, where).toBe("composed");
    if (national.kind === "composed")
      expect(
        national.talk.lines.map((row) => row.text).join(" "),
        `${where}: the national arc's opening names the story`,
      ).toContain(story!.text);
    process.stdout.write(
      `PRESS CONTEXT ${where}: story "${story!.text}" cited to ${story!.recordIds.join(", ")}; vote ${voteId}\n${lines.map((t) => `  ${t}`).join("\n")}\n`,
    );
    return;
  }
  throw new Error(`no reporter's call composed: ${tried.join("; ")}`);
}, 1_800_000);
