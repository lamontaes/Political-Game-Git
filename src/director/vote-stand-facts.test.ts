import { expect, it } from "vitest";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { castMemberVote } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

// Rule 113 (owner's feedback on the reporter's call, Nov 14 2026): no line
// says what the record contradicts. A member votes NO on a bill they drafted;
// the reporter's call the next day carries the vote's facts from the roll
// (vote-stand-facts.ts), and no line in the whole tree says they support it,
// that they will vote, or that it works. Pinned: Gilbert, Iowa (1930630),
// seed "reporters-call-1", where the owner played the scene.
const PLACE = "1930630";
const SEED = "reporters-call-1";

/** Lines that say the member is for the bill, or that the vote is still to come. */
const CONTRADICTS_A_NO_VOTE_HELD = [
  /\bI support it\b/,
  /always supported/,
  /for it from the beginning/,
  /when I vote/,
  /after the vote/,
  /before the vote\?/,
  /\bleaning\b/i,
  /I'll vote yes/,
  /I'm voting/,
  /ahead of the vote/,
  /it works/,
];

it("a reporter's call after a no vote says nothing the vote contradicts (Gilbert IA, seed reporters-call-1)", () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const member = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0);
  expect(member, "a resident member of a body").toBeTruthy();
  const me = member!.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const seat = seatView(core, me);
  const body = seat.bodies[0]!;
  let bill = { id: "", status: "blocked" };
  for (const question of [...seat.questions].slice(0, 6)) {
    if (bill.status !== "blocked") break;
    bill = seatAct(core, me, {
      kind: "draft",
      officeId: body.officeId,
      question,
      value: 1,
    }) as { id: string; status: string };
    if (bill.status !== "blocked")
      castMemberVote(coreAPI(core), bill.id, me, "no");
  }
  const voteId = `bill-vote:${bill.id}:${body.officeId}`;
  // The game's own days until the roll (about two weeks in this place).
  for (let day = 0; day < 60 && !core.durableLog.has(voteId); day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(core.durableLog.has(voteId), voteId).toBe(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const entry = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(voteId) &&
        row.bindings.some((b) => b.typeKey === "press-interview"),
    );
  expect(entry, "the vote stages a reporter's call").toBeTruthy();
  const result = purposeScene(core, director, me, entry!, {
    typeKey: "press-interview",
  });
  expect(result?.kind).toBe("composed");
  if (result?.kind !== "composed") return;
  const facts = new Set(result.scene.facts.map((row) => row.key));
  for (const key of ["voted-no", "acted", "bill-failed", "reason-own-view"])
    expect(facts, key).toContain(key);
  expect(facts).not.toContain("voted-yes");

  const talk = (
    result.scene as unknown as {
      talk: { tree: TreeNode; lines: { text: string }[] };
    }
  ).talk;
  const said: string[] = talk.lines.map((row) => row.text);
  const walk = (node: TreeNode): void => {
    for (const reply of node.replies) {
      said.push(reply.line.text);
      if (reply.next) {
        said.push(...reply.next.lines.map((row) => row.text));
        walk(reply.next);
      }
    }
  };
  walk(talk.tree);
  expect(said.length).toBeGreaterThan(10);
  for (const text of said)
    for (const wrong of CONTRADICTS_A_NO_VOTE_HELD)
      expect(text, `"${text}" after a no vote`).not.toMatch(wrong);
}, 60_000);
