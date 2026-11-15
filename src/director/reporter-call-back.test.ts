/**
 * A reporter put off before a vote calls back once (Words lead, Nov 15; press.ts
 * keepPutOffComment). In a pinned place a member of a body is the player and
 * drafts a bill, as comment-printed.test.ts does; a reporter asks about it the
 * next day. The player refuses, the reporter presses, and the player says
 * "Let me check and call you back today."; the reporter answers "All right.
 * I'll call you back." The next day, with the vote still ahead, the reporter
 * calls back: "You were going to call me back about {bill}." and the vote's
 * day, with the answer and decline replies only. The answer given on the call
 * back is the comment kept on the record the reporter first asked about.
 */
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { seatAct, seatView } from "../bench/legislature";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { commentOn, PRESS_CALL_BACK_EVENT } from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { SceneTalk, TreeNode } from "./scene-talk";

/** Pinned: seed pin-reporter-call-back, draw 0 is Peter, Utah. */
const seed = "pin-reporter-call-back";
const draw = 0;
const STALL = "scene-talk.reply-stall.let-me-check-and-call-you-back-today";

/** The path to the put-off: a refusal, the reporter presses, then the stall. */
function putOffPath(tree: TreeNode): { path: number[]; said: string[] } | null {
  for (const [at, first] of tree.replies.entries()) {
    if (first.line.move !== "refuse" && first.line.move !== "deflect") continue;
    const stall = first.next?.replies.findIndex(
      (row) => row.line.parts[0] === STALL,
    );
    if (stall !== undefined && stall >= 0)
      return {
        path: [at, stall],
        said: [first.line.text, first.next!.replies[stall]!.line.text],
      };
  }
  return null;
}

interface Played {
  where: string;
  first: SceneTalk;
  said: string[];
  heard: string[];
  again: SceneTalk;
  quote: string | null;
}

function play(draw: number): Played | string {
  const place = drawPlace(`${seed}:${draw}`, "reporter-call-back");
  const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const api = coreAPI(core);
  // The first member (by id) who can draft a bill.
  const members = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((p) => seatView(core, p.id).bodies.length > 0);
  if (!members.length) return `${where}: no resident member of a body`;
  let me: PersonId | null = null;
  let bill: { id: string; status: string } = { id: "", status: "" };
  for (const member of members.slice(0, 40)) {
    const seat = seatView(core, member.id);
    for (const body of seat.bodies) {
      // An executive's office drafts nothing (seatAct asks a member).
      if ("byRequest" in body && body.byRequest) continue;
      bill = seatAct(core, member.id as PersonId, {
        kind: "draft",
        officeId: body.officeId,
        series: "minimum-wage",
        value:
          (seat.amounts.find((a) => a.series === "minimum-wage")?.current ??
            0) + 200,
      }) as { id: string; status: string };
      for (const question of seat.questions) {
        if (bill.status !== "blocked") break;
        bill = seatAct(core, member.id as PersonId, {
          kind: "draft",
          officeId: body.officeId,
          question,
          value: 1,
        }) as { id: string; status: string };
      }
      if (core.durableLog.has(`office.introduced:${bill.id}`)) {
        me = member.id as PersonId;
        break;
      }
    }
    if (me) break;
  }
  if (!me) return `${where}: no member's bill was introduced`;
  core.playerId = me;
  director.watch(core, me);
  if (!core.durableLog.has(`office.introduced:${bill.id}`))
    return `${where}: ${bill.status}, no introduction record`;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const entry = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(`:office.introduced:${bill.id}`) &&
        row.bindings.some((b) => b.typeKey === "press-interview"),
    );
  if (!entry) return `${where}: no reporter for ${bill.id}`;
  const first = purposeScene(core, director, me, entry, {
    typeKey: "press-interview",
  });
  if (first?.kind !== "composed") return `${where}: no first call`;
  const put = putOffPath(first.scene.talk.tree);
  if (!put) return `${where}: no put-off offered`;
  // What the reporter says after the put-off.
  let node: TreeNode | null = first.scene.talk.tree;
  for (const at of put.path) node = node!.replies[at]!.next;
  const heard = [
    ...(node?.lines ?? []).map((line) => line.text),
    node?.end?.close?.text ?? "",
  ].filter(Boolean);
  expect(
    replyInScene(core, director, me, entry, put.path, {
      typeKey: "press-interview",
    }),
    where,
  ).toBeTruthy();
  const causeId = first.scene.cause.id;
  // The call back is the next day: played through it.
  advanceCore(core, addDays(makeIsoDate(core.date), 2));
  const again = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(`:${PRESS_CALL_BACK_EVENT}:`) &&
        row.bindings.some((b) => b.typeKey === "press-interview"),
    );
  if (!again)
    return `${where}: no call back the next day (record ${core.durableLog.has(`${PRESS_CALL_BACK_EVENT}:${causeId}` as never)}; moments ${director.ledger.people
      .get(me)
      ?.schedule.filter((row) => row.momentId.includes(PRESS_CALL_BACK_EVENT))
      .map(
        (row) =>
          `${row.momentId} [${row.bindings.map((b) => b.typeKey)}] ${JSON.stringify(row.heldBack ?? [])}`,
      )
      .join("; ")})`;
  const call = purposeScene(core, director, me, again, {
    typeKey: "press-interview",
  });
  if (call?.kind !== "composed")
    return `${where}: call back not composed (${JSON.stringify(call).slice(0, 200)})`;
  const answer = call.scene.talk.tree.replies.findIndex(
    (row) => row.line.move === "answer",
  );
  expect(answer, `${where}: the call back can be answered`).toBeGreaterThan(-1);
  let path = [answer];
  let next = call.scene.talk.tree.replies[answer]!.next;
  for (
    let depth = 0;
    next && !next.end && next.replies.length && depth < 6;
    depth += 1
  ) {
    const on = next.replies.findIndex((row) => row.line.move === "answer");
    const at = on >= 0 ? on : 0;
    path = [...path, at];
    next = next.replies[at]!.next;
  }
  expect(
    replyInScene(core, director, me, again, path, {
      typeKey: "press-interview",
    }),
    where,
  ).toBeTruthy();
  return {
    where,
    first: first.scene.talk,
    said: put.said,
    heard,
    again: call.scene.talk,
    quote: commentOn(api, causeId)?.quote ?? null,
  };
}

// Two played days at one pinned place: about 15 s measured, with a limit near
// twice that plus the world's build.
it("a reporter put off before a vote calls back once, about the bill and the vote's day", () => {
  const played = play(draw);
  if (typeof played === "string") throw new Error(played);
  const { where, again } = played;
  expect(played.heard.join(" "), where).toContain(
    "All right. I'll call you back.",
  );
  expect(again.open?.text, where).toMatch(
    /^You were going to call me back about .+\.$/,
  );
  expect(again.state.text, where).toMatch(
    /^The vote is (coming|[A-Z][a-z]+( \d{1,2}(st|nd|rd|th))?)\. Where do you stand\?$/,
  );
  expect(
    [...new Set(again.tree.replies.map((r) => r.line.move))].sort(),
    where,
  ).toEqual(["answer", "refuse"]);
  expect(
    played.quote,
    `${where}: the call back's answer is the comment`,
  ).toBeTruthy();
}, 60_000);
