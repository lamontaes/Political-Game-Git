/**
 * A put-off is kept on the record (Words lead, Nov 15, class E: a put-off is
 * kept with a call back on a day the record gives, or it is not offered). In a
 * pinned place the player files for a race and plays on to the outlets'
 * invitations. They put off the interview and the debate ("call you back") in
 * the invitations' own scenes; the press engine keeps the put-off on the
 * interview row and calls back on its next weekly pass, and the meetings
 * engine calls back once, the day before the debate goes on without them. On
 * each call back the opening says why they are calling, and the player gets
 * yes and no only: no second put-off, no question, no walk-off. A yes on the
 * call back is the yes the engines read.
 *
 * The route is the ordinary one (the player's filing, the rivals who file,
 * the press and meetings engines' weekly passes, the director's scenes); the
 * one hand-set thing is the platform the player files with, as in
 * debate-sitting.test.ts, which this world shares.
 */
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { PLATFORM_QUESTIONS } from "../core2/campaign-data";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { fileCandidacy, playerContests } from "../core2/modules/elections";
import { lawChain } from "../core2/modules/laws";
import {
  DEBATE_ACCEPTED_EVENT,
  DEBATE_INVITED_EVENT,
} from "../core2/modules/meetings";
import {
  INTERVIEW_ACCEPTED_EVENT,
  INTERVIEW_INVITED_EVENT,
} from "../core2/modules/press";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import type { ScheduleEntry } from "./scheduling";
import { purposeScene, replyInScene } from "./purpose-scene";
import type { SceneTalk } from "./scene-talk";
import rulesFile from "./data/scene-talk-rules.json" with { type: "json" };
import conversationBank from "../../data/english/parts/scene-talk.json" with { type: "json" };

/** Pinned as debate-sitting.test.ts is: seed pin-b, draw 1 is Shelby, Mississippi. */
const seed = "pin-b";
const draw = 1;

const platform = PLATFORM_QUESTIONS.flatMap((question, index) =>
  index % 3 === 2 ? [] : [`${question}=${index % 2 === 0 ? 1 : -1}`],
);

const INVITES = {
  "debate-invite": DEBATE_INVITED_EVENT,
  "interview-invite": INTERVIEW_INVITED_EVENT,
} as const;
type Invite = keyof typeof INVITES;

interface Call {
  typeKey: Invite;
  how: "stall" | "leave";
  /** The bank part the put-off said. */
  piece: string;
  first: SceneTalk;
  again?: SceneTalk;
  accepted?: boolean;
}

interface Played {
  where: string;
  calls: Call[];
}

/** What a call back's opening says after each put-off (Words lead, Nov 15, 07:50Z). */
const OPENS: Record<Invite, Record<string, string>> = {
  "debate-invite": {
    "put-off-call": "You said you'd call me back about the debate.",
    "put-off-left": "We didn't finish talking about the debate.",
  },
  "interview-invite": {
    "put-off-week":
      "I asked you for an interview. You were going to look at your week.",
    "put-off-think":
      "I asked you for an interview. You wanted to think about it.",
    "put-off-left": "I asked you for an interview. You had to go.",
  },
};

const opening = (talk: SceneTalk) =>
  [talk.open?.text, talk.state.text].filter(Boolean).join(" ");

function play(): Played | string {
  const place = drawPlace(`${seed}:${draw}`, "debate-sitting");
  const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
  setBookkeeping(false);
  const { core, director } = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const town = lawChain(coreAPI(core)).townPlaceId;
  const me = [...core.people.values()]
    .filter(
      (person) =>
        person.alive &&
        person.placeId === town &&
        ageOnDate(person.birthDate, core.date) >= 35 &&
        ageOnDate(person.birthDate, core.date) < 60,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!.id as PersonId;
  core.playerId = me;
  director.watch(core, me);
  const api = coreAPI(core);
  const findContest = () =>
    [...playerContests(api)]
      .filter((c) => c.level !== "federal" && c.level !== "state")
      .filter((c) => c.electionDate >= addDays(makeIsoDate(core.date), 120))
      .sort(
        (a, b) =>
          a.electionDate.localeCompare(b.electionDate) ||
          a.id.localeCompare(b.id),
      )
      .find((c) =>
        ["petitioning", "on-ballot"].includes(
          (
            fileCandidacy(api, {
              personId: me,
              contestId: c.id,
              platform,
              party: null,
            }) as { filing?: { status?: string } }
          ).filing?.status ?? "",
        ),
      );
  let contest = findContest();
  for (let week = 0; week < 52 && !contest; week += 1) {
    advanceCore(core, addDays(makeIsoDate(core.date), 7));
    contest = findContest();
  }
  if (!contest)
    return `${where}: no race four months out the player could enter`;
  const petition = gatherSignatures(core, `filing:${contest.id}:${me}`);
  if (petition && !(petition.check && petition.check.valid >= petition.needed))
    return `${where}: the petition came up short`;

  const calls: Call[] = [];
  const putOff = new Map<string, Call>();
  let interviews = 0;
  const seen = new Set<string>();
  const sceneFor = (entry: ScheduleEntry, typeKey: Invite) => {
    const result = purposeScene(core, director, me, entry, { typeKey });
    return result?.kind === "composed" ? result.scene : undefined;
  };
  const rowOf = (facts: Readonly<Record<string, unknown>> | undefined) =>
    String(facts?.debateId ?? facts?.interviewId ?? "");
  // Day by day, so each call back is met on its own day.
  while (
    core.date < contest.electionDate &&
    !(putOff.size === 3 && [...putOff.values()].every((c) => c.again))
  ) {
    advanceCore(core, addDays(makeIsoDate(core.date), 1));
    for (const entry of director.ledger.people.get(me)!.schedule) {
      if (seen.has(entry.momentId)) continue;
      const typeKey = (Object.keys(INVITES) as Invite[]).find((key) =>
        entry.bindings.some((row) => row.typeKey === key),
      );
      if (!typeKey) continue;
      seen.add(entry.momentId);
      const scene = sceneFor(entry, typeKey);
      if (!scene) continue;
      const cause = core.durableLog.get(scene.cause.id as never)!;
      if (cause.kind !== INVITES[typeKey]) continue;
      const tree = scene.talk.tree;
      const row = rowOf(cause.facts);
      if (cause.facts?.again !== "yes") {
        // The debate and the first interview are put off with a stall; the
        // second interview with a question, then a walk-off.
        const how =
          typeKey === "debate-invite"
            ? "stall"
            : (interviews += 1) === 1
              ? "stall"
              : interviews === 2
                ? "leave"
                : null;
        if (!how || putOff.has(row)) continue;
        let path: number[];
        let piece: string;
        if (how === "stall") {
          const stall = tree.replies.findIndex((r) => r.line.move === "stall");
          expect(
            stall,
            `${where}: ${typeKey} offers a put-off`,
          ).toBeGreaterThan(-1);
          path = [stall];
          piece = tree.replies[stall]!.line.parts[0]!;
        } else {
          const ask = tree.replies.findIndex((r) => r.line.move === "ask");
          const then = tree.replies[ask]?.next?.replies ?? [];
          const leave = then.findIndex((r) => r.line.move === "leave");
          expect(leave, `${where}: ${typeKey} lets them go`).toBeGreaterThan(
            -1,
          );
          path = [ask, leave];
          piece = then[leave]!.line.parts[0]!;
        }
        expect(
          replyInScene(core, director, me, entry, path),
          where,
        ).toBeTruthy();
        putOff.set(row, { typeKey, how, piece, first: scene.talk });
        continue;
      }
      // The call back: yes.
      const call = putOff.get(row);
      expect(call, `${where}: a call back only after a put-off`).toBeTruthy();
      expect(call!.again, `${where}: one call back per row`).toBeUndefined();
      call!.again = scene.talk;
      const agree = tree.replies.findIndex((r) => r.line.move === "agree");
      expect(
        agree,
        `${where}: ${typeKey} call back offers yes`,
      ).toBeGreaterThan(-1);
      expect(
        replyInScene(core, director, me, entry, [agree]),
        where,
      ).toBeTruthy();
      call!.accepted = core.durableLog.has(
        `${typeKey === "debate-invite" ? DEBATE_ACCEPTED_EVENT : INTERVIEW_ACCEPTED_EVENT}:${row}` as never,
      );
      calls.push(call!);
    }
  }
  return { where, calls: [...putOff.values()] };
}

describe("a put-off is kept on the record and called back once", () => {
  it("every put-off line of an invitation names what its call back opens on", () => {
    const said = rulesFile.callBack.said as Record<string, string>;
    const stalls = conversationBank.parts.filter((part) =>
      part.uses.some(
        (use) =>
          ["invite-debate", "invite-interview", "job-offer"].includes(
            use.purpose ?? "",
          ) &&
          use.step === "reply" &&
          use.move === "stall",
      ),
    );
    expect(stalls.length).toBeGreaterThan(0);
    for (const part of stalls) expect(said[part.key], part.key).toBeTruthy();
  });

  // The played days to the debate's call back, day by day, at one pinned
  // place: about a minute (53 s measured), with a limit near twice that,
  // since the call back is met only on its own played day.
  it("the interview and the debate call back on what was said, with yes and no only", () => {
    const played = play();
    if (typeof played === "string") throw new Error(played);
    const { where, calls } = played;
    expect(calls.map((c) => `${c.typeKey}:${c.how}`).sort(), where).toEqual([
      "debate-invite:stall",
      "interview-invite:leave",
      "interview-invite:stall",
    ]);
    const said = rulesFile.callBack.said as Record<string, string>;
    for (const call of calls) {
      const label = `${where}: ${call.typeKey} after a ${call.how} (${call.piece})`;
      expect(call.again, `${label}: called back`).toBeTruthy();
      const moves = call.again!.tree.replies.map((r) => r.line.move).sort();
      expect(moves, `${label}: yes and no only`).toEqual(["agree", "decline"]);
      expect(call.accepted, `${label}: the yes is the engine's yes`).toBe(true);
      // The first call never opens as a call back.
      expect(opening(call.first), label).not.toMatch(
        /call me back|You were going|didn't finish|You had to go/,
      );
      const fact = call.how === "leave" ? "put-off-left" : said[call.piece]!;
      expect(call.again!.open?.text, label).toBe(OPENS[call.typeKey][fact]);
    }
    const debate = calls.find((c) => c.typeKey === "debate-invite")!;
    expect(debate.again!.state.text, where).toMatch(
      /^(It's tomorrow\. )?I need an answer/,
    );
    for (const call of calls.filter((c) => c.typeKey === "interview-invite"))
      expect(call.again!.state.text, where).toBe("Is it yes or no?");
  }, 120_000);
});
