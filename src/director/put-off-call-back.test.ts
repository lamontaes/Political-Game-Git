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

interface Played {
  where: string;
  calls: Record<
    Invite,
    { first: SceneTalk; again: SceneTalk; againId: string } | undefined
  >;
  acceptedDebate: boolean;
  acceptedInterview: boolean;
}

const said = (talk: SceneTalk) =>
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

  const calls: Played["calls"] = {
    "debate-invite": undefined,
    "interview-invite": undefined,
  };
  const firsts: Partial<Record<Invite, SceneTalk>> = {};
  const seen = new Set<string>();
  const sceneFor = (entry: ScheduleEntry, typeKey: Invite) => {
    const result = purposeScene(core, director, me, entry, { typeKey });
    return result?.kind === "composed" ? result.scene : undefined;
  };
  // Day by day, so the call back is met on its own day.
  while (
    core.date < contest.electionDate &&
    !(calls["debate-invite"] && calls["interview-invite"])
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
      if (cause.facts?.again !== "yes") {
        if (firsts[typeKey]) continue;
        // The first call: the player puts it off.
        const stall = tree.replies.findIndex((r) => r.line.move === "stall");
        expect(stall, `${where}: ${typeKey} offers a put-off`).toBeGreaterThan(
          -1,
        );
        expect(
          replyInScene(core, director, me, entry, [stall]),
          where,
        ).toBeTruthy();
        firsts[typeKey] = scene.talk;
        continue;
      }
      // The call back: yes.
      const agree = tree.replies.findIndex((r) => r.line.move === "agree");
      calls[typeKey] = {
        first: firsts[typeKey]!,
        again: scene.talk,
        againId: cause.id,
      };
      expect(
        agree,
        `${where}: ${typeKey} call back offers yes`,
      ).toBeGreaterThan(-1);
      expect(
        replyInScene(core, director, me, entry, [agree]),
        where,
      ).toBeTruthy();
    }
  }
  const interviewId = calls["interview-invite"]
    ? String(
        core.durableLog.get(calls["interview-invite"].againId as never)!.facts!
          .interviewId,
      )
    : "";
  const debateId = calls["debate-invite"]
    ? String(
        core.durableLog.get(calls["debate-invite"].againId as never)!.facts!
          .debateId,
      )
    : "";
  return {
    where,
    calls,
    acceptedDebate: core.durableLog.has(
      `${DEBATE_ACCEPTED_EVENT}:${debateId}` as never,
    ),
    acceptedInterview: core.durableLog.has(
      `${INTERVIEW_ACCEPTED_EVENT}:${interviewId}` as never,
    ),
  };
}

describe("a put-off is kept on the record and called back once", () => {
  // The played days to the debate's call back, day by day, at one pinned
  // place: about a minute (53 s measured), with a limit near twice that,
  // since the call back is met only on its own played day.
  it("the interview and the debate call back, with yes and no only", () => {
    const played = play();
    if (typeof played === "string") throw new Error(played);
    const { where, calls } = played;
    for (const typeKey of Object.keys(INVITES) as Invite[]) {
      const call = calls[typeKey];
      expect(call, `${where}: the ${typeKey} called back`).toBeTruthy();
      const moves = call!.again.tree.replies.map((r) => r.line.move).sort();
      expect(moves, `${where}: ${typeKey} call back replies`).toEqual([
        "agree",
        "decline",
      ]);
      // The first call never opens as a call back.
      expect(said(call!.first), where).not.toMatch(
        /call me back|You were going/,
      );
    }
    expect(said(calls["debate-invite"]!.again), where).toMatch(
      /^You said you'd call me back about the debate\. (It's tomorrow\. )?I need an answer/,
    );
    expect(said(calls["interview-invite"]!.again), where).toBe(
      "I asked you for an interview. You were going to look at your week. Is it yes or no?",
    );
    expect(played.acceptedDebate, `${where}: the yes is the debate's yes`).toBe(
      true,
    );
    expect(
      played.acceptedInterview,
      `${where}: the yes is the interview's yes`,
    ).toBe(true);
  }, 120_000);
});
