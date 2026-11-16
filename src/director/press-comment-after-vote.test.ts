import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { billStage, chooseOwnVote } from "../bench/bill-stage";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { LEGISLATURE_MODULE_ID } from "../core2/modules/legislature";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import { playedNode, type TreeNode } from "./scene-talk";

// The reporter's call after the player votes on a bill, played as play plays
// it: the bill is the player's own (drafted with the player's own press,
// handler.ts seatAct) or a colleague's that came up in play; the player
// votes with their own press (bill-stage.ts chooseOwnVote); the game stages
// the call after the vote and composes it with the reporter's own traits;
// the player taps replies by their move (purpose-scene.ts replyInScene), and
// the game picks the words. Places are drawn as press-comment-context.test.ts
// draws them, pinned here with their seeds; the paths were found by a script
// outside the test (Account lead, Nov 15 23:28Z).
//
// Old premise (#9510): after a yes both plain answers ("I voted for it. I'd
// vote for it again." and "I support it. It's good for {place}.") are said.
// New premise (Words lead, Nov 15): a "why" is answered by the largest
// reasons the roll holds, cited to the roll (`top-reason-*`), and a line says
// only what its fact reads.
interface Case {
  readonly who: string;
  readonly seed: string;
  readonly key: string;
  readonly own: boolean;
  readonly vote: "yes" | "no";
  readonly tops: readonly string[];
  /** Each path of moves the player taps, and the line its last reply says. */
  readonly said: readonly { moves: readonly string[]; text: string }[];
}
const CASES: readonly Case[] = [
  {
    who: "the author",
    seed: "yes-vote-6:0",
    key: "0405140",
    own: true,
    vote: "yes",
    tops: ["top-reason-own-bill"],
    said: [{ moves: ["answer"], text: "It's my bill. I believe in it." }],
  },
  {
    who: "a member voting on a colleague's bill",
    seed: "yes-vote-6:0",
    key: "0405140",
    own: false,
    vote: "yes",
    tops: ["top-reason-own-view", "top-reason-people"],
    said: [
      { moves: ["answer"], text: "People here want it. I voted with them." },
      {
        moves: ["deflect", "answer"],
        text: "I voted for it because I believe in it.",
      },
    ],
  },
  {
    who: "a member voting on a colleague's bill",
    seed: "pr-1:0",
    key: "4121215",
    own: false,
    vote: "yes",
    tops: ["top-reason-own-view", "top-reason-sponsor"],
    said: [{ moves: ["answer"], text: "I trust the member who wrote it." }],
  },
  // Against their own bill no reason is set (vote-stand-facts.ts reads the
  // sponsor off the bill), so no line gives one: the two plain wordings say
  // the vote and nothing more (Words lead, Nov 16; second reader's hold,
  // upheld by the Account lead).
  {
    who: "the author",
    seed: "yes-vote-6:0",
    key: "0405140",
    own: true,
    vote: "no",
    tops: [],
    said: [
      {
        moves: ["answer"],
        text: "When it came to the vote, I couldn't say yes.",
      },
    ],
  },
  {
    who: "the author",
    seed: "pr-4:0",
    key: "2623500",
    own: true,
    vote: "no",
    tops: [],
    said: [
      {
        moves: ["answer"],
        text: "I couldn't vote for it. That's all there is to it.",
      },
      {
        moves: ["refuse", "answer"],
        text: "When it came to the vote, I couldn't say yes.",
      },
    ],
  },
  // Here the author's own view leans no, and still no reason is said.
  {
    who: "the author",
    seed: "yes-vote-3:0",
    key: "2018500",
    own: true,
    vote: "no",
    tops: [],
    said: [
      {
        moves: ["answer"],
        text: "When it came to the vote, I couldn't say yes.",
      },
    ],
  },
  // A no on a colleague's bill that came up in play, with the member's own
  // view leaning no.
  {
    who: "a member voting on a colleague's bill",
    seed: "pr-44:0",
    key: "5035725",
    own: false,
    vote: "no",
    tops: ["top-reason-own-view"],
    said: [
      { moves: ["answer"], text: "I voted no because I don't believe in it." },
      {
        moves: ["deflect", "answer"],
        text: "I voted against it. It wasn't right for Island Pond.",
      },
      {
        moves: ["refuse", "answer"],
        text: "I voted against it. Island Pond deserves better than that.",
      },
    ],
  },
];

const VOTE_DAYS = 120;
const BILL_DAYS = 60;

function play(c: Case) {
  const place = drawPlace(c.seed, "press-comment-context");
  expect(place.key).toBe(c.key);
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const me = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .find((p) => seatView(core, p.id).bodies.length > 0)!.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const seat = seatView(core, me);
  const body = seat.bodies[0]!;
  let bill: { id: string; status: string; sponsorId?: string } | undefined;
  if (c.own) {
    for (const question of [...seat.questions].slice(0, 4)) {
      if (bill && bill.status !== "blocked") break;
      bill = seatAct(core, me, {
        kind: "draft",
        officeId: body.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
    }
  } else {
    const bills = () =>
      coreAPI(core)
        .moduleState(LEGISLATURE_MODULE_ID)
        .table("bills")
        .rows() as unknown as {
        id: string;
        status: string;
        sponsorId: string;
        bodyOfficeId: string;
      }[];
    for (let day = 0; day < BILL_DAYS && !bill; day++) {
      advanceCore(core, addDays(makeIsoDate(core.date), 1));
      bill = bills().find(
        (row) =>
          row.bodyOfficeId === body.officeId &&
          row.sponsorId !== me &&
          billStage(core, row.id, me).yours.mayChoose,
      );
    }
    expect(
      bill,
      "a colleague's bill comes up for the player's vote",
    ).toBeTruthy();
  }
  expect(bill && bill.status).not.toBe("blocked");
  chooseOwnVote(core, bill!.id, c.vote, me);
  const voteId = `bill-vote:${bill!.id}:${body.officeId}`;
  for (let day = 0; day < VOTE_DAYS && !core.durableLog.has(voteId); day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  expect(core.durableLog.has(voteId), "the vote is held").toBe(true);
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const entry = director.ledger.people
    .get(me)
    ?.schedule.find(
      (row) =>
        row.momentId.includes(voteId) &&
        row.bindings.some((b) => b.typeKey === "press-interview"),
    );
  expect(entry, "the vote stages the reporter's call").toBeTruthy();
  const result = purposeScene(core, director, me, entry!, {
    typeKey: "press-interview",
  });
  expect(result?.kind).toBe("composed");
  if (result?.kind !== "composed") throw new Error("no call");
  const { scene } = result;
  const keys = scene.facts.map((row) => row.key);
  const walk = (moves: readonly string[]) => {
    let node: TreeNode | null = scene.talk.tree;
    const path: number[] = [];
    const said: string[] = [
      ...scene.talk.narration.map((l) => `(${l.text})`),
      ...(scene.talk.open ? [`Reporter: ${scene.talk.open.text}`] : []),
      `Reporter: ${scene.talk.state.text}`,
    ];
    let last = "";
    for (const move of moves) {
      const index = node!.replies.findIndex((r) => r.line.move === move);
      expect(
        index,
        `the call offers ${move} after ${path}`,
      ).toBeGreaterThanOrEqual(0);
      const reply = node!.replies[index]!;
      path.push(index);
      expect(
        replyInScene(core, director, me, entry!, path, {
          typeKey: "press-interview",
        }),
      ).toBeTruthy();
      last = reply.line.text;
      said.push(`You: ${last}`);
      node = reply.next ? playedNode(reply.next) : null;
      for (const l of node?.lines ?? [])
        said.push(
          l.role === "narrator" ? `(${l.text})` : `Reporter: ${l.text}`,
        );
      if (node?.end?.close) said.push(`Reporter: ${node.end.close.text}`);
    }
    return { said, last };
  };
  const offered: string[] = [];
  const all = (node: TreeNode, depth: string): void => {
    for (const reply of node.replies) {
      offered.push(`${depth}[${reply.line.move}] ${reply.line.text}`);
      if (reply.next) all(playedNode(reply.next), `${depth}  `);
    }
  };
  all(scene.talk.tree, "");
  return { place, me, keys, walk, offered };
}

it.each(CASES)(
  "after the player votes $vote as $who, the reporter's call answers why with the reasons the roll holds ($key, seed $seed)",
  (c) => {
    const { place, me, keys, walk, offered } = play(c);
    process.stdout.write(
      `PRESS AFTER VOTE ${place.name} (${place.key}), the player ${me}, ${c.who}, voted ${c.vote}\n${offered.join("\n")}\n`,
    );
    expect(keys).toContain(c.vote === "yes" ? "voted-yes" : "voted-no");
    expect(keys).toContain("acted");
    expect(keys.filter((key) => key.startsWith("top-reason-"))).toEqual(c.tops);
    for (const { moves, text } of c.said) {
      const { said, last } = walk(moves);
      process.stdout.write(`${said.join("\n")}\n`);
      expect(last).toBe(text);
    }
    const wrong = c.vote === "yes" ? /I voted (no|against)/ : /I voted for/;
    for (const line of offered) expect(line).not.toMatch(wrong);
    // The author is never told the reporter "never asks who wrote the bill".
    if (c.own) expect(offered.join("\n")).not.toContain("who wrote the bill");
    expect(offered.join("\n")).not.toContain("hasn't changed since day one");
    // A judgment on the bill needs a reason that leans no (Words lead, Nov 16).
    if (
      c.vote === "no" &&
      !c.tops.some((top) =>
        ["top-reason-own-view", "top-reason-people"].includes(top),
      )
    )
      for (const judged of ["deserves better than that", "wasn't right for"])
        expect(offered.join("\n")).not.toContain(judged);
  },
  60_000,
);
