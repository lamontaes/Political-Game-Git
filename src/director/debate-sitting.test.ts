/**
 * A debate the player accepts is played, not answered for them (owner, Oct
 * 26-29: interviews and debates are scenes). In a drawn place the player
 * files for a race, plays to the week the outlet invites them to its debate,
 * and says yes in the invitation's scene. The meetings engine puts
 * `debate-accepted` on the record (with the moderator who asks), the director
 * stages the sitting from it, and in the conversation the moderator puts each
 * of the debate's own questions as a line. The player picks how to answer each,
 * and the debate held afterward stores exactly those moves in its answers:
 * the record the views engine and the campaign read, in the voters the
 * outlet's audience reached. The other candidates answer from their own
 * positions at that moment; nobody answers for the player.
 *
 * The route is the ordinary one: the player's filing, the rivals who file
 * themselves, the meetings engine's weekly debate, the director's scenes. Two
 * things are set up by hand and named as such: the platform the player files
 * with (the bench files with none until SG-SCREENS-filing-platform-from-views)
 * and a vote of theirs on the first question asked, so the further fact and
 * the lie, which stand on a vote, are offered.
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
import {
  CAMPAIGNS_MODULE_ID,
  causesFor,
  statementSpeechId,
  type PromiseRow,
} from "../core2/modules/campaigns";
import { fileCandidacy, openContests } from "../core2/modules/elections";
import {
  DEBATE_ACCEPTED_EVENT,
  DEBATE_INVITED_EVENT,
  debatesIn,
  meetingParameter,
  type DebateRow,
} from "../core2/modules/meetings";
import { recordVote } from "../core2/modules/record";
import { lawChain } from "../core2/modules/laws";
import { retellingsOf } from "../core2/modules/speech";
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
  chosen: { question: string; move: string }[];
  held: DebateRow;
  stored: string[];
  records: string[];
}

function play(draw: number): Evidence | string {
  const place = drawPlace(`${seed}:${draw}`, "debate-sitting");
  const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const { core, director } = world;
  // A grown resident of the town is the player: one who lives there, never a
  // filled-in official elsewhere whose id sorts first (Berryville, Virginia,
  // seed chk2-b: the U.S. Secretary of Agriculture, whom nobody in town
  // knew, so the debate moved no one's view).
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

  // Play week by week to the debate's invitation, and say yes in its scene.
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
      if (!entry.bindings.some((row) => row.typeKey === "debate-invite"))
        continue;
      const result = purposeScene(core, director, me, entry, {
        typeKey: "debate-invite",
      });
      if (result?.kind !== "composed") continue;
      const agree = result.scene.talk.tree.replies.findIndex(
        (reply) => reply.line.move === "agree",
      );
      expect(agree, `${where}: the invitation can be accepted`).toBeGreaterThan(
        -1,
      );
      const id = String(
        core.durableLog.get(result.scene.cause.id as never)!.facts!.debateId,
      );
      expect(
        replyInScene(core, director, me, entry, [agree]),
        where,
      ).toBeTruthy();
      yes = { id, eventId: `${DEBATE_ACCEPTED_EVENT}:${id}` };
      break;
    }
  }
  if (!yes) return `${where}: no debate invitation reached the player`;
  const waiting = debatesIn(api, contest.id).find((row) => row.id === yes!.id)!;
  // The yes put the sitting on the record; nothing was answered for the player.
  const accepted = core.durableLog.get(yes.eventId as never)!;
  expect(accepted.kind, where).toBe(DEBATE_ACCEPTED_EVENT);
  const moderatorId = accepted.facts!.reporterId as PersonId;
  expect(accepted.personIds, where).toEqual([me, moderatorId]);
  expect(
    core.durableLog.get(`${DEBATE_INVITED_EVENT}:${waiting.id}` as never)?.facts
      ?.reporterId,
    `${where}: the moderator is the one who invited them`,
  ).toBe(moderatorId);
  expect(waiting.status, `${where}: the debate waits for the sitting`).toBe(
    "invited",
  );
  expect(waiting.answers, where).toEqual({});

  // The director stages the sitting from that record, the next day, before
  // the eve of the election holds the debate without it.
  const eve = addDays(
    makeIsoDate(contest.electionDate),
    -meetingParameter("debateLapseDaysBefore"),
  );
  if (addDays(makeIsoDate(core.date), 1) >= eve)
    return `${where}: the invitation came on the eve of the election`;
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const staged = director.ledger.people
    .get(me)!
    .schedule.filter((entry) =>
      entry.bindings.some((row) => row.typeKey === "debate-sitting"),
    );
  expect(staged.length, `${where}: one sitting is staged`).toBe(1);
  const sitting = staged[0]!;
  expect(sitting.momentId, where).toContain(yes.eventId);
  const scene = composeScene(core, director, me, sitting);
  expect(scene?.talkToId, `${where}: the moderator opens it`).toBe(moderatorId);

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
    occasionId: sitting.momentId,
  });
  expect(
    conversation.sitting?.row.kind,
    `${where}: the talk is the debate's sitting`,
  ).toBe("debate");
  const chosen: { question: string; move: string }[] = [];
  const prefer = ["further", "turn", "brief", "plain"];
  for (let at = 0; conversation.choices.length; at += 1) {
    const question = conversation.sitting!.now!.question;
    const moves = conversation.choices.map((choice) => choice.move);
    expect(new Set(moves).size, `${where}: ${moves.join(", ")}`).toBe(
      moves.length,
    );
    if (at === 1) {
      // The second question is passed on in silence.
      sayNothing(core, conversation);
      chosen.push({ question, move: "silence" });
    } else if (at === 0) {
      // The first, where the vote makes it possible, is the lie.
      const lie = conversation.lies[0];
      expect(lie, `${where}: a vote allows the lie`).toBeTruthy();
      expect(moves, `${where}: a vote allows a further fact`).toContain(
        "further",
      );
      chosen.push({ question, move: "lie" });
      say(core, conversation, lie!.key);
    } else {
      const pick = prefer
        .map((move) => conversation.choices.find((c) => c.move === move))
        .find(Boolean)!;
      chosen.push({ question, move: pick.move });
      say(core, conversation, pick.key);
    }
  }
  expect(conversation.sitting!.published, where).toBe(waiting.id);

  // The held debate stores the moves the player chose, by question.
  const held = debatesIn(api, contest.id).find((row) => row.id === waiting.id)!;
  expect(held.status, where).toBe("held");
  const mine = held.answers[me]!;
  expect(
    mine.map((a) => a.question),
    where,
  ).toEqual(waiting.questions);
  chosen.forEach(({ question, move }) => {
    const stored = mine.find((a) => a.question === question)!;
    const stand = stands.get(question) ?? null;
    const label = `${where}: ${question} (${move})`;
    if (move === "silence") {
      expect(stored.position, label).toBeNull();
      expect(stored.move, label).toBe("plain");
    } else if (move === "lie") {
      expect(stored.move, label).toBe("lie");
      expect(stored.position, label).toBe(-vote.stance.position);
      expect(stored.recordId, label).toBe(vote.id);
    } else {
      expect(stored.move, label).toBe(move);
      expect(stored.position, label).toBe(
        move === "further" ? (stand ?? vote.stance.position) : stand,
      );
    }
  });
  // The rivals answered too, from their own positions, none of them asked.
  const others = Object.keys(held.answers).filter((id) => id !== me);
  expect(
    others.length,
    `${where}: the other candidates answered`,
  ).toBeGreaterThan(0);
  const debateRecord = `debate:${held.id}`;
  expect(core.durableLog.get(debateRecord as never)?.kind, where).toBe(
    "debate",
  );

  // Another engine reads them. The campaign keeps each statement the player
  // made as a promise only its audience heard, with the position they chose.
  const date = core.date;
  const statements = mine.filter((a) => a.position !== null);
  const promises = api.moduleState(CAMPAIGNS_MODULE_ID).table("promises");
  for (const statement of statements) {
    const promise = promises.get(
      `promise:${me}:${date}:debate:${held.id}:${statement.question}`,
    ) as unknown as PromiseRow | undefined;
    expect(promise?.stance.position, `${where}: ${statement.question}`).toBe(
      statement.position,
    );
  }
  expect(
    promises.get(
      `promise:${me}:${date}:debate:${held.id}:${chosen[1]!.question}`,
    ),
    `${where}: the question passed on in silence is no promise`,
  ).toBeUndefined();
  // Voters of the outlet's audience heard them: causes on the voters (act
  // "debate", the campaign's `makeStatements`), and the views engine moved
  // those who heard each statement as a speech.
  const heard = [...core.people.keys()].flatMap((voterId) =>
    causesFor(api, voterId, me).filter(
      (cause) => cause.act === "debate" && cause.date === date,
    ),
  );
  if (!heard.length)
    return `${where}: the outlet's audience was nobody the debate reached`;
  expect(held.audience, where).toBeGreaterThan(0);
  const speech = statementSpeechId(me, date, {
    act: "debate",
    venue: held.id,
  });
  // How far each listener moved is the speech engine's record of the views
  // engine's read, kept the moment each statement was heard: a stance
  // outside the player's circle keeps only its latest cause, and a rival
  // who answered the same questions after the player holds it by evening
  // (Berryville, Virginia, seed chk2-b).
  const spoken = statements.map(
    (_, index) => speech + (index ? `:${index}` : ""),
  );
  const moved = spoken.flatMap((id) =>
    retellingsOf(api, id)
      .filter((row) => row.moved > 0)
      .map(() => String(core.durableLog.get(id as never)?.topic)),
  );
  expect(
    moved.length,
    `${where}: the views engine read the statements`,
  ).toBeGreaterThan(0);
  const topics = new Set(moved);
  for (const topic of topics)
    expect(
      statements.map((a) => a.question),
      `${where}: ${topic} was a statement the player made`,
    ).toContain(topic);

  // The sitting was the debate's scene: the director stages no second one
  // for the record that held it, or for the invitation again.
  advanceCore(core, addDays(makeIsoDate(core.date), 1));
  const everything = director.ledger.people.get(me)!.schedule;
  expect(
    everything.filter((entry) =>
      entry.bindings.some((row) => row.typeKey === "debate-sitting"),
    ).length,
    `${where}: one debate sitting`,
  ).toBe(1);
  const afterHeld = everything
    .filter((entry) => entry.momentId.includes(debateRecord))
    .flatMap((entry) => entry.bindings.map((row) => row.typeKey));
  expect(afterHeld, `${where}: no second debate scene`).not.toContain(
    "debate-sitting",
  );
  expect(afterHeld, where).not.toContain("debate-invite");

  return {
    where,
    lines: [
      ...scene!.narration.map((line) => `(narrator) ${line.text}`),
      ...conversation.lines.map((line) => {
        const who = core.people.get(line.speakerId)!;
        return `${who.givenName}: ${line.text}`;
      }),
    ],
    chosen,
    held,
    stored: mine.map((a) => `${a.move}/${a.position}`),
    records: [
      yes.eventId,
      sitting.momentId,
      debateRecord,
      vote.id,
      heard[0]!.id,
      `${speech}`,
      ...moved.slice(0, 1).map((stance) => stance.id),
    ],
  };
}

describe("the debate sitting", () => {
  it(`is played in a drawn place, and the held debate stores the moves the player chose (up to ${DRAWS} draws from seed ${seed})`, () => {
    const passed: string[] = [];
    for (let draw = 0; draw < DRAWS; draw += 1) {
      const result = play(draw);
      if (typeof result === "string") {
        passed.push(result);
        continue;
      }
      console.log(
        `DEBATE SITTING ${result.where}\n${result.lines.join("\n")}\nchosen: ${result.chosen
          .map((c) => c.move)
          .join(
            ", ",
          )}\nstored: ${result.stored.join(", ")}\nrecords: ${result.records.join(", ")}\npassed over: ${passed.join("; ") || "none"}`,
      );
      return;
    }
    throw new Error(
      `no drawn place from seed ${seed} had a debate invitation the player could accept: ${passed.join("; ")}`,
    );
  }, 3_600_000);
});
