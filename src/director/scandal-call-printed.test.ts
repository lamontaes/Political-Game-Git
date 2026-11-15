/**
 * What the paper prints of the reporter's call on an exposure (press.ts
 * keepComment and runExposure; src/bench/printed-words.ts printedFacts),
 * played through the call the game composes: the player picks a reply by
 * its move and the game picks the words. The story quotes the official's own
 * answer (owning it, or a lie), prints a decline when the call ends without
 * one, and says nothing of comment when there was no call. Set PLAYED_OUT to
 * a path to write the calls and the printed stories.
 *
 * Pinned: Gilbert, Iowa (1930630), seed reporters-call-1. The bribes are
 * staged through the game's own path (a member drafts a bill, is offered
 * money for the vote, takes it, and the one who paid leaks it), as in
 * scandal-call.test.ts; the conflict is an award put in the contracts table
 * in the shape contracts.ts writes it (no award comes in a world's first
 * weeks), which the paper's weekly desk finds on its own path. About a minute.
 */
import { writeFileSync } from "node:fs";
import { expect, it } from "vitest";
import { wordPrintedStory } from "../bench/archive-words";
import { seatAct, seatView } from "../bench/legislature";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import {
  BRIBE_OFFERED,
  considerBribe,
  crimeRecord,
} from "../core2/modules/corruption";
import { NEWS_MODULE_ID } from "../core2/modules/news";
import { BUSINESS_MODULE_ID } from "../core2/business-module-id";
import { governments } from "../core2/modules/budgets";
import {
  CONTRACTS_MODULE_ID,
  OWNER_RELATION,
  type ContractAwardRow,
} from "../core2/modules/contracts";
import type { ModuleRow } from "../core2/module-data";
import {
  leakToReporter,
  outletsHere,
  PRESS_EXPOSED,
  PRESS_MODULE_ID,
  townOutlet,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { TreeNode } from "./scene-talk";

const PLACE = "1930630";
const SEED = "reporters-call-1";

/**
 * The reply the player picks at each step, by its move; null is no call.
 * `outlet` is the kind of outlet whose reporter the one who paid goes to
 * (the town paper when unset); `close` has a relative or friend pay.
 */
const CALLS: readonly {
  name: string;
  moves: readonly string[] | null;
  outlet?: string;
  close?: boolean;
}[] = [
  { name: "owns it, gives a reason", moves: ["confess", "answer"] },
  { name: "owns it, then says no more", moves: ["confess", "refuse"] },
  {
    name: "owns it, a relative or friend paid",
    moves: ["confess", "answer"],
    close: true,
  },
  { name: "will not comment", moves: ["refuse"] },
  { name: "asks who told, then says no more", moves: ["confront", "refuse"] },
  { name: "asks who told, then owns it", moves: ["confront", "confess"] },
  { name: "lies", moves: ["lie"] },
  {
    name: "owns it to the TV station, then has to go",
    moves: ["confess", "leave"],
    outlet: "television",
  },
  {
    name: "owns it to a news site, then has to go",
    moves: ["confess", "leave"],
    outlet: "online",
  },
  {
    name: "owns it to a magazine, then has to go",
    moves: ["confess", "leave"],
    outlet: "magazine",
  },
  { name: "no call, the player", moves: null },
  { name: "no call, unattended", moves: null },
];

interface Played {
  name: string;
  days?: string;
  exposedId: string;
  who: PersonId;
  said: string[];
  answer: string | null;
}

it("the story prints the official's own answer on the call, a decline, or nothing without a call (Gilbert IA, seed reporters-call-1)", () => {
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
    twoLevel: true,
    placeKey: PLACE,
  });
  const api = coreAPI(core);
  const tips = api.moduleState(PRESS_MODULE_ID).table("tips");
  const out: string[] = [];

  /** The call the exposure stages for the player, played reply by reply. */
  const call = (who: PersonId, exposedId: string, moves: readonly string[]) => {
    core.playerId = who;
    if (!director.ledger.people.has(who)) director.watch(core, who);
    director.stageOwnPress(core, who, exposedId);
    const entry = director.ledger.people
      .get(who)
      ?.schedule.find(
        (row) =>
          row.momentId.includes(exposedId) &&
          row.bindings.some((b) => b.typeKey === "scandal"),
      );
    expect(entry, "the exposure stages the call").toBeTruthy();
    const result = purposeScene(core, director, who, entry!, {
      typeKey: "scandal",
    });
    expect(result?.kind, JSON.stringify(result).slice(0, 300)).toBe("composed");
    if (result?.kind !== "composed") throw new Error("no call");
    const talk = (
      result.scene as unknown as {
        talk: { state: { text: string }; tree: TreeNode };
      }
    ).talk;
    const runsOn = String(core.durableLog.get(exposedId)?.facts?.runsOn);
    const days = `Found ${core.durableLog.get(exposedId)?.date}, call ${(entry as unknown as { date: string }).date}, runs ${runsOn}.`;
    const said = [`Reporter: ${talk.state.text}`];
    let node: TreeNode | null = talk.tree;
    const path: number[] = [];
    let answer: string | null = null;
    for (const move of moves) {
      const index = node!.replies.findIndex(
        (r) => (r.line as { move?: string }).move === move,
      );
      expect(index, `the call offers ${move}`).toBeGreaterThanOrEqual(0);
      const reply = node!.replies[index]!;
      path.push(index);
      expect(
        replyInScene(core, director, who, entry!, path, { typeKey: "scandal" }),
      ).toBeTruthy();
      said.push(`You: ${reply.line.text}`);
      if (["confess", "deny", "lie"].includes(move)) answer = reply.line.text;
      node = reply.next;
      for (const l of node?.lines ?? []) said.push(`Reporter: ${l.text}`);
      // After a lie the reporter's answer depends on what they know.
      const known = node?.branches?.find((b) => b.knows);
      if (known) {
        for (const l of known.node.lines) said.push(`Reporter: ${l.text}`);
        node = known.node;
      }
      // Where the call ends, the reporter's closing line.
      if (node?.end?.close) said.push(`Reporter: ${node.end.close.text}`);
    }
    return { said, answer, days };
  };

  // Bribes: each member takes one in the offer scene while the player
  // plays them, and the one who paid leaks it to the town paper.
  const staff = new Set(outletsHere(api).flatMap((row) => row.reporterIds));
  const members = [...core.people.values()]
    .filter((p) => p.alive && p.id.startsWith("person_"))
    .sort((a, b) => a.id.localeCompare(b.id))
    .filter((p) => {
      const body = seatView(core, p.id).bodies[0];
      return body && !("byRequest" in body && body.byRequest);
    });
  const played: Played[] = [];
  let next = 0;
  for (const c of CALLS) {
    const member = members[next++]!;
    const who = member.id as PersonId;
    core.playerId = who;
    const offerer = [...core.people.values()]
      .filter(
        (p) =>
          p.alive &&
          p.id !== who &&
          p.placeId === member.placeId &&
          !staff.has(p.id) &&
          !members.some((m) => m.id === p.id) &&
          // A relative of the member pays only where the call asks for one.
          member.familyIds.has(p.id) === Boolean(c.close),
      )
      .sort(
        (a, b) => b.liquidMinor - a.liquidMinor || a.id.localeCompare(b.id),
      )[0]!;
    expect(offerer, `${c.name}: one who pays`).toBeTruthy();
    const seat = seatView(core, who);
    let bill = { id: "", status: "blocked" };
    for (const question of [...seat.questions].slice(0, 6)) {
      if (bill.status !== "blocked") break;
      bill = seatAct(core, who, {
        kind: "draft",
        officeId: seat.bodies[0]!.officeId,
        question,
        value: 1,
      }) as { id: string; status: string };
    }
    const offered = considerBribe(api, {
      offererId: offerer.id,
      officialId: who,
      stakeMinor: offerer.liquidMinor * 1000,
      subjectId: bill.id,
      pick: { offer: true },
    })!;
    if (offered.pending)
      api.emit({
        id: `scene.reply:printed-test:${offered.id}`,
        date: core.date,
        kind: "scene.reply",
        personIds: [who, offerer.id],
        placeId: member.placeId,
        facts: {
          typeKey: "bribe-offer",
          causeId: `${BRIBE_OFFERED}:${offered.id}`,
          ending: "took-it",
        },
        source: { tag: "SOURCED", asOf: core.date, citation: "test" },
      });
    expect(crimeRecord(api, offered.id)?.taken, c.name).toBe(true);
    const outlet = c.outlet
      ? outletsHere(api).find((row) => row.kind === c.outlet)!
      : townOutlet(api)!;
    const tip = leakToReporter(api, {
      leakerId: offerer.id,
      reporterId: outlet.reporterIds[0]!,
      crimeId: offered.id,
    }) as { exposedId?: string | null };
    expect(tip.exposedId, c.name).toBeTruthy();
    const { said, answer, days } = c.moves
      ? call(who, tip.exposedId!, c.moves)
      : { said: [], answer: null, days: undefined };
    played.push({
      name: c.name,
      exposedId: tip.exposedId!,
      who,
      said,
      answer,
      days,
    });
  }
  // The player plays the "no call" member when the paper prints.
  core.playerId = played.find((p) => p.name === "no call, the player")!.who;

  // A conflict: no award is made in a world's first weeks, so one is put in
  // the contracts table in the shape contracts.ts writes it (a government's
  // road line won by a real firm of the town, its real owner voting for it);
  // the paper's weekly desk finds it on its own path (press.ts conflictBeat).
  // The opening's owners are recorded in the first days (the bribe stories
  // print meanwhile, on their own day).
  for (let day = 0; day < 3; day++)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const firm = [
    ...(api
      .moduleState(BUSINESS_MODULE_ID)
      .table("owners")
      .rows() as unknown as { id: string; ownerId: string }[]),
  ]
    .sort((a, b) => a.id.localeCompare(b.id))
    .find(
      (row) =>
        core.people.get(row.ownerId as PersonId)?.alive &&
        core.organizations.has(row.id) &&
        !played.some((p) => p.who === row.ownerId) &&
        !staff.has(row.ownerId),
    )!;
  const gov = governments(api)[0]!;
  api
    .moduleState(CONTRACTS_MODULE_ID)
    .table("awards")
    .put({
      id: `contract:${gov.id}:highways:${core.date}`,
      governmentId: gov.id,
      line: "highways",
      fiscalYear: Number(core.date.slice(0, 4)),
      awardedOn: core.date,
      organizationId: firm.id,
      basis: "vote",
      bids: [],
      votes: { [firm.ownerId]: firm.id },
      tally: { [firm.id]: 1 },
      bribes: [],
      boughtVotes: [],
      conflicts: [
        {
          memberId: firm.ownerId,
          organizationId: firm.id,
          ownerId: firm.ownerId,
          relation: OWNER_RELATION,
        },
      ],
      paidMinor: 0,
      paymentIds: [],
      lastPaidOn: "",
    } satisfies ContractAwardRow as unknown as ModuleRow);
  const conflictOf = () =>
    [...(core.logByKind.get(PRESS_EXPOSED) ?? [])]
      .map((id) => core.durableLog.get(String(id))!)
      .find((e) =>
        Object.values(e.facts ?? {}).includes("conflict-of-interest"),
      );
  const until = addDays(makeIsoDate(core.date), 8);
  while (!conflictOf() && core.date < until)
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const conflict = conflictOf();
  expect(
    conflict,
    "the desk exposes the conflict within its week",
  ).toBeTruthy();
  const conflictWho = conflict!.personIds[0] as PersonId;
  const player = core.playerId;
  const conflictCall = call(conflictWho, conflict!.id, ["confess", "answer"]);
  core.playerId = player;
  played.push({
    name: "conflict, owns it",
    exposedId: conflict!.id,
    who: conflictWho,
    ...conflictCall,
  });

  // Every story runs on its day.
  const last = played
    .map((p) => String(core.durableLog.get(p.exposedId)?.facts?.runsOn))
    .sort()
    .at(-1)!;
  if (last > core.date) advanceCore(core, last);
  for (const p of played) {
    const tip = [...tips.rows()].find(
      (row) => (row as { exposedId?: string }).exposedId === p.exposedId,
    ) as { storyId?: string } | undefined;
    expect(tip?.storyId, `${p.name}: printed`).toBeTruthy();
    const story = api
      .moduleState(NEWS_MODULE_ID)
      .table("stories")
      .get(tip!.storyId!) as never;
    const worded = wordPrintedStory(core, story);
    const text = (worded?.paragraphs ?? [worded?.lede ?? ""]).join(" ");
    const name = core.people.get(p.who)!;
    const full = `${name.givenName} ${name.familyName}`;
    if (p.answer) expect(text, p.name).toContain(p.answer);
    else if (p.said.length)
      expect(text, p.name).toMatch(/declined to comment|would not comment/);
    else expect(text, p.name).not.toMatch(/comment|said:|told reporters/);
    out.push(
      `## ${p.name}`,
      "",
      ...(p.said.length
        ? [p.days!, "", "The call:", "", ...p.said.map((l) => `- ${l}`), ""]
        : ["No call.", ""]),
      `Printed ${(story as { date: string }).date} by ${worded?.outlet?.name ?? "?"}, about ${full}:`,
      "",
      `**${worded?.headline ?? ""}**`,
      "",
      ...(worded?.paragraphs ?? [worded?.lede ?? ""]).map((l) => `> ${l}`),
      "",
    );
  }
  if (process.env.PLAYED_OUT)
    writeFileSync(process.env.PLAYED_OUT, out.join("\n"));
}, 240_000);
