/**
 * An interview the player accepts is played, not answered for them (owner,
 * Oct 26-29: interviews are scenes). In a drawn place the player files for a
 * race, plays to the week an outlet invites them, and says yes in the
 * invitation's scene. The press engine puts `interview-accepted` on the
 * record, the director stages the sitting from it, and in the conversation
 * the reporter puts each of the interview's own questions as a line. The
 * player picks how to answer each, and the interview published afterward
 * stores exactly those moves: the record every other engine reads. A lie
 * names the vote it contradicts, and the reporter's dig reads that vote.
 *
 * The route is the ordinary one: the player's filing, the press engine's
 * weekly invitation, the director's scenes. Two things are set up by hand
 * and named as such: the platform the player files with (the bench files
 * with none until SG-SCREENS-filing-platform-from-views) and a vote of
 * theirs on the first question asked, so the further fact and the lie, which
 * stand on a vote, are offered.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gatherSignatures } from "../core2/campaign-petition-kit";
import { PLATFORM_QUESTIONS } from "../core2/campaign-views";
import { gameStartDate } from "../core2/game-start";
import { addDays, ageOnDate, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import {
  INTERVIEW_ACCEPTED_EVENT,
  PRESS_MODULE_ID,
  interviewsFor,
  pressParameter,
  type InterviewRow,
} from "../core2/modules/press";
import { recordVote } from "../core2/modules/record";
import { coreAPI } from "../core2/state";
import type { PersonId } from "../core2/types";
import { questionAbout } from "../english/question-names";
import { openConversation, say, sayNothing } from "./conversation";
import { purposeScene, replyInScene } from "./purpose-scene";
import { composeScene } from "./scene";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DRAWS = 8;

/** The platform the player files with: a stand on two of every three questions. */
const platformFor = () =>
  PLATFORM_QUESTIONS.flatMap((question, index) =>
    index % 3 === 2 ? [] : [`${question}=${index % 2 === 0 ? 1 : -1}`],
  );

interface Evidence {
  where: string;
  lines: string[];
  chosen: string[];
  published: InterviewRow;
  records: string[];
}

function play(draw: number): Evidence | string {
  const place = drawPlace(`${seed}:${draw}`, "interview-sitting");
  const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  // A grown resident of the town is the player.
  const me = [...core.people.values()]
    .filter(
      (person) =>
        person.alive &&
        ageOnDate(person.birthDate, core.date) >= 35 &&
        ageOnDate(person.birthDate, core.date) < 60,
    )
    .sort((a, b) => a.id.localeCompare(b.id))[0]!.id as PersonId;
  core.playerId = me;
  for (const id of [
    me,
    ...(core.households.get(core.people.get(me)!.householdId)?.memberIds ?? []),
  ])
    if (core.people.get(id)?.alive) director.watch(core, id as PersonId);
  const api = coreAPI(core);
  const platform = platformFor();
  const stands = new Map(
    platform.map((entry) => {
      const [question, position] = entry.split("=");
      return [question!, Number(position)] as const;
    }),
  );
  const contest = [...openContests(api)]
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
  if (!contest)
    return `${where}: no race four months out the player could enter`;
  const petition = gatherSignatures(core, `filing:${contest.id}:${me}`);
  if (petition && !(petition.check && petition.check.valid >= petition.needed))
    return `${where}: the petition came up short`;

  // Play week by week to the invitation, and say yes in its scene.
  const seen = new Set<string>();
  let yes: { id: string; eventId: string } | null = null;
  while (!yes && core.date < contest.electionDate) {
    advanceCore(
      core,
      [addDays(makeIsoDate(core.date), 7), contest.electionDate].sort()[0]!,
    );
    for (const entry of director.ledger.people.get(me)!.schedule) {
      if (seen.has(entry.momentId)) continue;
      seen.add(entry.momentId);
      if (!entry.bindings.some((row) => row.typeKey === "interview-invite"))
        continue;
      const result = purposeScene(core, director, me, entry, {
        typeKey: "interview-invite",
      });
      if (result?.kind !== "composed") continue;
      const agree = result.scene.talk.tree.replies.findIndex(
        (reply) => reply.line.move === "agree",
      );
      expect(agree, `${where}: the invitation can be accepted`).toBeGreaterThan(
        -1,
      );
      const id = String(
        core.durableLog.get(result.scene.cause.id as never)!.facts!.interviewId,
      );
      expect(
        replyInScene(core, director, me, entry, [agree]),
        where,
      ).toBeTruthy();
      yes = { id, eventId: `${INTERVIEW_ACCEPTED_EVENT}:${id}` };
      break;
    }
  }
  if (!yes)
    return `${where}: no invitation reached the player before election day`;
  const waiting = interviewsFor(api, me).find((row) => row.id === yes!.id)!;
  // The yes put the sitting on the record; nothing was answered for the player.
  expect(core.durableLog.get(yes.eventId as never)?.kind, where).toBe(
    INTERVIEW_ACCEPTED_EVENT,
  );
  expect(waiting.status, `${where}: the interview waits for the sitting`).toBe(
    "invited",
  );
  expect(waiting.answers, where).toEqual([]);

  // The director stages the sitting from that record.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const sitting = director.ledger.people
    .get(me)!
    .schedule.find((entry) =>
      entry.bindings.some((row) => row.typeKey === "interview-sitting"),
    );
  expect(sitting, `${where}: the sitting is staged`).toBeTruthy();
  const scene = composeScene(core, director, me, sitting!);
  expect(scene?.talkToId, `${where}: the reporter opens it`).toBe(
    waiting.reporterId,
  );

  // A vote of the player's on the first question asked, by hand.
  const asked = waiting.questions.filter((question) => questionAbout(question));
  const first = asked[0]!;
  const vote = recordVote(api, {
    personId: me,
    body: "council",
    measureId: `proof:${first}`,
    stance: { question: first, position: stands.get(first) ?? 1 },
    passed: true,
  });

  const conversation = openConversation(core, me, scene!.talkToId!, {
    director,
    occasionId: sitting!.momentId,
  });
  expect(
    conversation.sitting,
    `${where}: the talk is the sitting`,
  ).toBeTruthy();
  const chosen: string[] = [];
  const prefer = ["further", "turn", "brief", "plain"];
  for (let at = 0; conversation.choices.length; at += 1) {
    const moves = conversation.choices.map((choice) => choice.move);
    expect(new Set(moves).size, `${where}: ${moves.join(", ")}`).toBe(
      moves.length,
    );
    if (at === 1) {
      // The second question is passed on in silence.
      sayNothing(core, conversation);
      chosen.push("silence");
    } else if (at === 0) {
      // The first, where the vote makes it possible, is the lie.
      const lie = conversation.lies[0];
      expect(lie, `${where}: a vote allows the lie`).toBeTruthy();
      expect(moves, `${where}: a vote allows a further fact`).toContain(
        "further",
      );
      chosen.push("lie");
      say(core, conversation, lie!.key);
    } else {
      const pick = prefer
        .map((move) => conversation.choices.find((c) => c.move === move))
        .find(Boolean)!;
      chosen.push(pick.move);
      say(core, conversation, pick.key);
    }
  }
  expect(conversation.sitting!.published, where).toBe(waiting.id);

  // The published interview stores the moves the player chose, by question.
  const published = api
    .moduleState(PRESS_MODULE_ID)
    .table("interviews")
    .get(waiting.id) as unknown as InterviewRow;
  expect(published.status, where).toBe("published");
  expect(
    published.answers.map((a) => a.question),
    where,
  ).toEqual(waiting.questions);
  asked.forEach((question, at) => {
    const stored = published.answers.find((a) => a.question === question)!;
    const stand = stands.get(question) ?? null;
    const label = `${where}: ${question} (${chosen[at]})`;
    if (chosen[at] === "silence") {
      expect(stored.position, label).toBeNull();
      expect(stored.move, label).toBe("plain");
    } else if (chosen[at] === "lie") {
      expect(stored.move, label).toBe("lie");
      expect(stored.position, label).toBe(-vote.stance.position);
      expect(stored.recordId, label).toBe(vote.id);
    } else {
      expect(stored.move, label).toBe(chosen[at]);
      expect(stored.position, label).toBe(
        stored.move === "further" ? (stand ?? vote.stance.position) : stand,
      );
    }
  });
  expect(
    core.durableLog.get(`interview-published:${waiting.id}` as never)?.kind,
  ).toBe("interview-published");

  // The reporter's dig reads the vote the lie contradicts: a record only the
  // press engine's check of the claim reads, weeks later.
  const lieAt = published.answers.findIndex((a) => a.move === "lie");
  advanceCore(
    core,
    addDays(makeIsoDate(core.date), pressParameter("digDelayDays") + 1),
  );
  const dig = api
    .moduleState(PRESS_MODULE_ID)
    .table("digs")
    .get(`${waiting.id}:${lieAt}`) as unknown as
    { recordId: string; reporterId: string; dug: boolean } | undefined;
  expect(dig?.recordId, `${where}: the reporter checked the vote`).toBe(
    vote.id,
  );
  expect(dig?.reporterId, where).toBe(waiting.reporterId);

  return {
    where,
    lines: conversation.lines.map((line) => {
      const who = core.people.get(line.speakerId)!;
      return `${who.givenName}: ${line.text}`;
    }),
    chosen,
    published,
    records: [
      yes.eventId,
      sitting!.momentId,
      `interview-published:${waiting.id}`,
      vote.id,
      `${waiting.id}:${lieAt}`,
    ],
  };
}

describe("the interview sitting", () => {
  it(`is played in a drawn place, and the published interview stores the moves the player chose (up to ${DRAWS} draws from seed ${seed})`, () => {
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const result = play(draw);
      if (typeof result === "string") {
        passed.push(result);
        continue;
      }
      console.log(
        `INTERVIEW SITTING ${result.where}\n${result.lines.join("\n")}\nchosen: ${result.chosen.join(", ")}\nstored: ${result.published.answers
          .map((a) => `${a.move}/${a.position}`)
          .join(
            ", ",
          )}\nrecords: ${result.records.join(", ")}\npassed over: ${passed.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `no drawn place from seed ${seed} had an invitation the player could accept: ${passed.join("; ")}`,
    );
  }, 3_600_000);
});
