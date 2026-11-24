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
import { appendFileSync, writeFileSync } from "node:fs";
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
import {
  CONTRACTS_MODULE_ID,
  type ContractAwardRow,
} from "../core2/modules/contracts";
import {
  leakToReporter,
  outletsHere,
  PRESS_EXPOSED,
  PRESS_MODULE_ID,
  townOutlet,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import type { Director } from "./ledger";
import { purposeScene, replyInScene } from "./purpose-scene";
import { playedNode, type TreeNode } from "./scene-talk";
import { townResidentsByCash } from "../core2/resident-adults-test-kit";

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
  { name: "lies, then owns it", moves: ["lie", "confess"] },
  {
    name: "owns it, a relative or friend paid",
    moves: ["confess", "answer"],
    close: true,
  },
  { name: "will not comment", moves: ["refuse"] },
  { name: "asks who told, then says nothing", moves: ["confront", "refuse"] },
  { name: "asks who told, then owns it", moves: ["confront", "confess"] },
  {
    name: "asks who told, lies, then says the papers are wrong",
    moves: ["confront", "lie", "lie"],
  },
  {
    name: "owns it to the TV station, then has to go",
    moves: ["confess", "leave"],
    outlet: "television",
  },
  {
    name: "lies to a news site, then tells them to run it",
    moves: ["lie", "confront"],
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

/** The call the exposure stages for the player, played reply by reply. */
function playCall(
  core: CoreState,
  director: Director,
  who: PersonId,
  exposedId: string,
  moves: readonly string[],
) {
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
      talk: {
        narration: { text: string }[];
        open?: { text: string };
        state: { text: string };
        tree: TreeNode;
      };
    }
  ).talk;
  const runsOn = String(core.durableLog.get(exposedId)?.facts?.runsOn);
  const days = `Found ${core.durableLog.get(exposedId)?.date}, call ${(entry as unknown as { date: string }).date}, runs ${runsOn}.`;
  const said = [
    ...talk.narration.map((l) => `(${l.text})`),
    ...(talk.open ? [`Reporter: ${talk.open.text}`] : []),
    `Reporter: ${talk.state.text}`,
  ];
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
    // The paper quotes the last stand on the charge: the last reply that
    // owns it or denies it (Words lead, Nov 15).
    if (["confess", "deny", "lie"].includes(move)) answer = reply.line.text;
    // After a lie, the outcome the records give, as play reaches it.
    node = reply.next ? playedNode(reply.next) : null;
    for (const l of node?.lines ?? []) said.push(`Reporter: ${l.text}`);
    // Where the call ends, the reporter's closing line.
    if (node?.end?.close) said.push(`Reporter: ${node.end.close.text}`);
  }
  return { said, answer, days };
}

/** Every story runs on its day; what each prints, checked against the call. */
function printStories(core: CoreState, played: readonly Played[]): string[] {
  const api = coreAPI(core);
  const tips = api.moduleState(PRESS_MODULE_ID).table("tips");
  const out: string[] = [];
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
  return out;
}

// The cut of Nov 17 left this scene's lines unwritten; the lines are
// story-lines-office-press-and-pressure (CTO, Nov 19 00:38Z on #9750).
it.fails(
  "the story prints the official's own answer on the call, a decline, or nothing without a call (Gilbert IA, seed reporters-call-1)",
  () => {
    setBookkeeping(false);
    const { core, director } = buildBenchWorld(SEED, gameStartDate(), {
      twoLevel: true,
      placeKey: PLACE,
    });
    const api = coreAPI(core);
    const out: string[] = [];

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
      const offerer = townResidentsByCash(core, coreAPI(core)).filter(
        (p) =>
          p.alive &&
          p.id !== who &&
          p.placeId === member.placeId &&
          !staff.has(p.id) &&
          !members.some((m) => m.id === p.id) &&
          // A relative of the member pays only where the call asks for one.
          member.familyIds.has(p.id) === Boolean(c.close),
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
        ? playCall(core, director, who, tip.exposedId!, c.moves)
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

    out.push(...printStories(core, played));
    if (process.env.PLAYED_OUT)
      writeFileSync(process.env.PLAYED_OUT, out.join("\n"));
  },
  60_000,
);

/**
 * Conflicts on awards the game itself makes. No hand-made record: each body
 * votes its contracts on the fiscal year's first day (contracts.ts), a member
 * votes for a firm that is theirs or their housemate's, the award row names
 * the conflict, and the paper's weekly desk finds it, holds it a day for the
 * call and prints it (press.ts conflictBeat, weighTip, runExposure). Found by
 * drawing places on seeds named for it (`conflict-scan-<n>`) and pinned here:
 * Wall, South Dakota (4668380) and Boyd, Texas (4809748) each have one member
 * with two conflicted county awards on 2025-02-01; Hayden, Colorado (0835070)
 * and West Hartford, Connecticut (0982660) one each. The world plays its own
 * days to the desk's sitting after the awards, about five weeks. Measured
 * one at a time: 14 to 26 seconds, and 56 for West Hartford, the largest
 * town. Beside the other changed tests: 21 to 33 seconds, and 68 for West
 * Hartford; hence the 135 second limit, about twice the slower run.
 */
const CONFLICT_WORLDS: readonly {
  name: string;
  place: string;
  seed: string;
  /**
   * The reply moves for each conflicted award's call, in award id order;
   * null where the call is not staged: one official's second story found the
   * same day is a moment of its own but not a second call (the scandal
   * situation fires once a day for a person).
   */
  calls: readonly { name: string; moves: readonly string[] | null }[];
}[] = [
  {
    name: "Wall, South Dakota",
    place: "4668380",
    seed: "conflict-scan-1",
    calls: [
      {
        name: "conflict, your own firm, gives a reason",
        moves: ["confess", "answer"],
      },
      {
        name: "conflict, the same official's second story that day, no second call",
        moves: null,
      },
    ],
  },
  {
    name: "Boyd, Texas",
    place: "4809748",
    seed: "conflict-scan-17",
    calls: [
      {
        name: "conflict, the firm of someone you live with, gives a reason",
        moves: ["confess", "answer"],
      },
      {
        name: "conflict, the same official's second story that day, no second call",
        moves: null,
      },
    ],
  },
  {
    name: "Hayden, Colorado",
    place: "0835070",
    seed: "conflict-scan-10",
    calls: [
      {
        name: "conflict, your own firm, asks who told, then owns it",
        moves: ["confront", "confess"],
      },
    ],
  },
  {
    name: "West Hartford, Connecticut",
    place: "0982660",
    seed: "conflict-scan-5",
    calls: [
      {
        name: "conflict, your own firm, asks who told, lies, then says no more",
        moves: ["confront", "lie", "deflect"],
      },
    ],
  },
];

// The cut of Nov 17 left this scene's lines unwritten; the lines are
// story-lines-office-press-and-pressure (CTO, Nov 19 00:38Z on #9750).
for (const world of CONFLICT_WORLDS)
  it.fails(
    `a conflict on an award the game makes plays its call and prints (${world.name} ${world.place}, seed ${world.seed})`,
    () => {
      setBookkeeping(false);
      const { core, director } = buildBenchWorld(world.seed, gameStartDate(), {
        twoLevel: true,
        placeKey: world.place,
      });
      const api = coreAPI(core);
      const awards = () =>
        (
          api
            .moduleState(CONTRACTS_MODULE_ID)
            .table("awards")
            .rows() as unknown as ContractAwardRow[]
        )
          .filter((row) => row.conflicts.length)
          .sort((a, b) => a.id.localeCompare(b.id));
      const exposedFor = (award: ContractAwardRow) =>
        [...(core.logByKind.get(PRESS_EXPOSED) ?? [])]
          .map((id) => core.durableLog.get(String(id))!)
          .find((e) =>
            Object.keys(e.facts ?? {}).includes(`award:${award.id}`),
          );
      // The fiscal year's awards, then the desk's week (press.ts DESK_WEEK).
      const until = "2025-02-20";
      while (
        core.date < until &&
        !(awards().length >= world.calls.length && awards().every(exposedFor))
      )
        advanceCore(core, addDays(makeIsoDate(core.date), 1));
      const found = awards();
      expect(found.length, "the conflicted awards").toBe(world.calls.length);
      const played: Played[] = world.calls.map((c, at) => {
        const exposure = exposedFor(found[at]!);
        expect(exposure, `${c.name}: the desk exposes it`).toBeTruthy();
        const who = exposure!.personIds[0] as PersonId;
        const name = `${c.name} (${world.name}, ${found[at]!.id})`;
        if (c.moves)
          return {
            name,
            exposedId: exposure!.id,
            who,
            ...playCall(core, director, who, exposure!.id, c.moves),
          };
        // Its moment is staged, with no scandal call bound to it.
        const entry = director.stageOwnPress(core, who, exposure!.id);
        expect(entry, `${c.name}: a moment of its own`).toBeTruthy();
        expect(
          entry!.bindings.some((b) => b.typeKey === "scandal"),
          `${c.name}: no second call`,
        ).toBe(false);
        return { name, exposedId: exposure!.id, who, said: [], answer: null };
      });
      const out = printStories(core, played);
      // Two found the same day: the first is told as the first, the next as
      // the second (printed-words.ts exposed).
      if (played.length > 1) {
        const at = (p: Played) => out.indexOf(`## ${p.name}`);
        const first = out.slice(at(played[0]!), at(played[1]!)).join(" ");
        const second = out.slice(at(played[1]!)).join(" ");
        expect(first).not.toMatch(/again|second time|A second/);
        expect(second).toMatch(/again|second time|A second/);
      }
      if (process.env.PLAYED_OUT)
        appendFileSync(process.env.PLAYED_OUT, `\n${out.join("\n")}`);
    },
    135_000,
  );
