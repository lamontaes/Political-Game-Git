/**
 * Two weeks of talk at home, played (words composer, unit 2: talk through
 * the telling; owner, Nov 12, 2026: "I can't even grade the rest of this").
 * The player's days are lived with `advancePlayerV1` as the bench lives them;
 * each morning and each evening the player talks with everyone in the room,
 * the room passed as the bench passes it, and answers with each offered
 * reply in turn. Over the whole run, in a drawn place:
 *
 * - nobody asks after someone who is in the room or lives with them both;
 * - no housemate asks what the player does for work;
 * - no subject comes back with the same person within a week;
 * - no closer names a part of the day that is over, or promises to check in;
 * - no two people of the household say the same sentence on one day;
 * - the President's full name is said at most once in one talk;
 * - no answer is only "Okay." or "Oh, I see.";
 * - no job or employer is said as the outside market;
 * - nobody asks whether the player saw the address they watched together;
 * - no goodbye at home, and no reply offered that only takes a line in;
 * - "the President" at most once in a talk (then the pronoun);
 * - no policy question named by two people of the house on one day;
 * - every day a housemate has something new on record of a kind the talk
 *   can tell, a talk on it is on offer; a silent day is reported with why
 *   (nothing new on record), never failed (lead, Nov 12);
 * - no subject comes back with the same person inside its wait (three days
 *   for a day's own subject, conversation-rules.json dayTalk; a week else);
 * - no two people of the house open on the same wording on one day.
 *
 * Five places are drawn from the seed (words lead, Nov 12: "Five draws").
 *
 * `TALK_PLACE_SEED` and `TALK_PLACE_KEY` run a labeled world instead of a draw
 * (the grading life of Nov 12: seed a9c85de3-e7fa-4418-8499-569a5c5e6e10,
 * place 0686174).
 */
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { isOnShift } from "../bench/shift";
import { buildBenchWorld } from "../bench/world";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { officialsIn } from "../core2/modules/officials";
import { advancePlayerV1, resumePlayerV1 } from "../core2/player-v1";
import { coreAPI } from "../core2/state";
import type { CoreState, PersonId } from "../core2/types";
import {
  noteHeard,
  openConversation,
  say,
  subjectsBetween,
  type Conversation,
} from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
/** Five draws (TALK_DRAWS runs fewer, one process each, where memory is short). */
const DRAWS = Number(process.env.TALK_DRAWS ?? 5);
/** A day's own subjects and their wait, from the rules the talk reads. */
const DAY_TALK = (
  JSON.parse(
    readFileSync(
      path.resolve(__dirname, "./data/conversation-rules.json"),
      "utf8",
    ),
  ) as {
    dayTalk: {
      kinds: string[];
      comesBack: string[];
      againAfterDays: { value: number };
    };
  }
).dayTalk;
const DAYS = 14;
const MORNING = 7 * 60;
const EVENING = 20 * 60 + 30;
const TURNS = 8;
const WEEK = 7;
/** Every talk of the fortnight is printed, for reading aloud. */
const SHOWN_DAYS = new Set(Array.from({ length: 14 }, (_, day) => day));

function build(draw: number) {
  const labeled = process.env.TALK_PLACE_SEED;
  const key = process.env.TALK_PLACE_KEY;
  const place =
    labeled && key
      ? { seed: labeled, key, name: `labeled ${key}` }
      : drawPlace(seed, `home-talk-fortnight:${draw}`);
  setBookkeeping(false);
  const world = buildBenchWorld(place.seed, gameStartDate(), {
    twoLevel: true,
    placeKey: place.key,
  });
  const playerId = world.playerId! as PersonId;
  world.director.watch(world.core, playerId);
  world.core.focusPersonIds.add(playerId);
  return {
    ...world,
    playerId,
    where: `${place.name} (${place.key}), seed ${labeled ?? seed}`,
  };
}

function liveThrough(
  core: CoreState,
  playerId: PersonId,
  day: number,
  minute: number,
) {
  let packet = advancePlayerV1(core, {
    controlledPersonId: playerId,
    through: {
      date: addDays(makeIsoDate(gameStartDate()), day),
      minuteOfDay: minute,
    },
  });
  while (packet.kind !== "complete")
    packet =
      packet.kind === "stop"
        ? resumePlayerV1(core, { kind: "stop", pauseId: packet.pauseId })
        : resumePlayerV1(core, { kind: "own-choice", pauseId: packet.pauseId });
}

const PAST_PARTS: Readonly<Record<string, RegExp>> = {
  morning: /\bagain this morning\b/i,
  afternoon: /\bthis morning\b(?! was)/i,
  evening:
    /\b(this morning|this afternoon|again tonight|later tonight|what's left of tonight)\b/i,
};
/** The stand a piece of the address point is written for, from the stand mark it requires. */
const SIDE_MARKS: Readonly<Record<string, readonly string[]>> = {
  "stand-with": ["with"],
  "stand-against": ["against"],
  "stand-unsure": ["unsure"],
  "stand-decided": ["with", "against"],
};
const POINT_SIDES = new Map<string, readonly string[]>();
for (const part of (
  JSON.parse(
    readFileSync(
      path.resolve(__dirname, "../../data/english/parts/conversation.json"),
      "utf8",
    ),
  ) as {
    parts: {
      key: string;
      uses?: { subject?: string; requiresFacts?: string[] }[];
    }[];
  }
).parts)
  for (const use of part.uses ?? [])
    if (use.subject === "address-point")
      for (const mark of use.requiresFacts ?? [])
        if (SIDE_MARKS[mark]) POINT_SIDES.set(part.key, SIDE_MARKS[mark]!);
const NON_ANSWER = /^(okay|oh, i see|alright|all right|oh, okay)\.$/i;
const OUTSIDE =
  /\b(a works outside the town|outside market|outside buyers|treasury)\b/i;
const sentences = (text: string) =>
  text.split(/(?<=[.!?])\s+/).filter((row) => row.split(/\s+/).length > 3);

it(`two weeks of talk at home hold the telling's rules (seed ${seed})`, () => {
  const labeled = !!(process.env.TALK_PLACE_SEED && process.env.TALK_PLACE_KEY);
  const broken: string[] = [];
  for (let draw = 0; draw < (labeled ? 1 : DRAWS); draw += 1)
    broken.push(...fortnight(draw));
  expect(broken).toEqual([]);
}, 3_600_000);

/** Two weeks in one drawn place: what broke, each naming the place and seed. */
function fortnight(draw: number): string[] {
  const { core, director, playerId, where } = build(draw);
  const player = core.people.get(playerId)!;
  const presidentRow = officialsIn(coreAPI(core), "US:president")[0];
  const presidentPerson = presidentRow
    ? core.people.get(presidentRow.id)
    : undefined;
  const presidentName = presidentPerson
    ? `${presidentPerson.givenName} ${presidentPerson.familyName}`
    : null;
  const broken: string[] = [];
  const played: string[] = [];
  const lastTopic = new Map<string, number>();
  let talks = 0;
  const silent: string[] = [];
  const toldOnce = new Set<string>();
  let typedSeen = 0;
  for (let day = 0; day < DAYS; day += 1) {
    const saidToday = new Map<string, string>();
    const questionsToday = new Map<string, string>();
    const openedToday = new Map<string, string>();
    let homeToday = false;
    let talksToday = 0;
    const newToday: string[] = [];
    for (const minute of day === 0 ? [EVENING] : [MORNING, EVENING]) {
      if (day > 0) liveThrough(core, playerId, day, minute);
      const household = [
        ...(core.households.get(player.householdId)?.memberIds ?? []),
      ]
        .filter((id) => id !== playerId && core.people.get(id)?.alive)
        .sort();
      const room = household.filter(
        (id) => day === 0 || !isOnShift(core, id, minute),
      );
      for (const otherId of room) {
        // The question each subject on record names, read before the talk
        // (a stand said in it is learned, and its subject is gone after).
        const questionOf = new Map(
          subjectsBetween(core, otherId as PersonId, playerId, director, {
            presentIds: room as PersonId[],
            minuteOfDay: minute,
          }).map((row) => [row.id, row.news?.question ?? row.point?.question]),
        );
        const talk: Conversation = openConversation(
          core,
          playerId,
          otherId as PersonId,
          {
            director,
            presentIds: room,
            minuteOfDay: minute,
          },
        );
        homeToday = true;
        // A new record of a kind the talk can tell (a day subject not told
        // to the player within its wait) is a talk on offer (lead, Nov 12:
        // a talk is offered when a housemate's records hold something new).
        const fresh = subjectsBetween(
          core,
          otherId as PersonId,
          playerId,
          director,
          { presentIds: room as PersonId[], minuteOfDay: minute },
        ).filter((row) => {
          if (!DAY_TALK.kinds.includes(row.kind)) return false;
          // Told once by the house (the rent due): no longer new once told.
          if (!DAY_TALK.comesBack.includes(row.kind) && toldOnce.has(row.id))
            return false;
          const last = lastTopic.get(
            `${otherId}|${otherId}>${row.id.replace(/:\d{4}-\d{2}-\d{2}$/, "")}`,
          );
          // A subject with a date in its id is told once (the rent due).
          if (
            last !== undefined &&
            row.id !== row.id.replace(/:\d{4}-\d{2}-\d{2}$/, "")
          )
            return false;
          return (
            last === undefined || day - last >= DAY_TALK.againAfterDays.value
          );
        });
        newToday.push(...fresh.map((row) => row.kind));
        if (!talk.lines.length) {
          if (fresh.length && !talksToday)
            broken.push(
              `${where}, day ${day}: ${core.people.get(otherId)!.givenName} has new on record (${fresh.map((row) => row.kind).join(", ")}) and no talk`,
            );
          continue;
        }
        noteHeard(core, talk);
        talks += 1;
        talksToday += 1;
        const offered: string[] = [];
        for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
          offered.push(...talk.choices.map((row) => row.text));
          say(
            core,
            talk,
            talk.choices[(day + turn) % talk.choices.length]!.key,
          );
        }
        const here = `${where}, day ${day} at ${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}, with ${core.people.get(otherId)!.givenName}`;
        if (SHOWN_DAYS.has(day)) {
          played.push(`-- ${here}`);
          for (const line of talk.lines)
            played.push(
              `${line.speakerId === playerId ? "  You" : `  ${core.people.get(line.speakerId)?.givenName}`}: ${line.text}`,
            );
        }
        const theirs = talk.lines.filter((line) => line.speakerId === otherId);
        // Every part of a point is written for the speaker's own stand: a
        // closer for disagreeing never joins an agreeing core (owner, Nov 12).
        for (const line of theirs.filter(
          (row) => row.kind === "address-point",
        )) {
          const stand = line.wording?.stage ?? "";
          for (const piece of line.wording?.parts ?? []) {
            const key = [...POINT_SIDES.keys()].find(
              (row) =>
                piece === row ||
                piece.endsWith(`:${row}`) ||
                piece.endsWith(row.slice(row.lastIndexOf(".") + 1)),
            );
            const sides = key ? POINT_SIDES.get(key)! : null;
            if (key) typedSeen += 1;
            if (sides && !sides.includes(stand))
              broken.push(
                `${here}: a part written for ${sides.join("/")} joined a ${stand} stand: "${line.text}"`,
              );
          }
        }
        // What the household did together nobody asks about.
        if (
          day === 0 &&
          theirs.some((line) => line.kind === "address" && line.act === "ask")
        )
          broken.push(
            `${here}: asked whether the player saw the address they watched together`,
          );
        // A talk at home ends on its last line that says something.
        for (const line of theirs.filter((row) => row.kind === "farewell"))
          broken.push(`${here}: a goodbye at home: "${line.text}"`);
        // Someone you live with never says they haven't seen you (lead, Nov
        // 12: a father to the child he lives with, North Anson, Maine).
        for (const line of theirs.filter((row) =>
          /haven't seen much of you/i.test(row.text),
        ))
          broken.push(`${here}: not seen, said at home: "${line.text}"`);
        // A role is said once; later it is the pronoun.
        const roles = theirs
          .map((line) => line.text.match(/\bthe President\b/gi)?.length ?? 0)
          .reduce((a, b) => a + b, 0);
        if (roles > 1)
          broken.push(`${here}: "the President" ${roles} times in one talk`);
        // No reply that only takes the line in.
        for (const text of offered)
          if (NON_ANSWER.test(text.trim()))
            broken.push(`${here}: a non-reply offered: "${text}"`);
        // Two people in one house never tell news on the same question on
        // one day (a fact is told once in the house a day). A stand is the
        // speaker's own: two of the house agreeing or disagreeing on the same
        // question is the scene, not a repeat (lead's ruling, Nov 13, fixer
        // round 5 of #8879), so a question named only by a stand (where they
        // stand, their point of the address) is not counted.
        const questionsBy = (kinds: readonly string[]) =>
          new Set(
            theirs
              .filter((line) => kinds.includes(line.kind))
              .map((line) =>
                questionOf.get(line.subjectId.replace(/^[^>]*>/, "")),
              )
              .filter((row): row is string => !!row),
          );
        const standQuestions = questionsBy(["own-view", "address-point"]);
        const newsQuestions = questionsBy([
          "news",
          "government-news",
          "brought-up",
        ]);
        for (const question of talk.questions ?? []) {
          if (question.startsWith("=")) continue;
          if (standQuestions.has(question) && !newsQuestions.has(question))
            continue;
          const by = questionsToday.get(question);
          if (by && by !== otherId)
            broken.push(`${here}: the question ${question} named twice today`);
          questionsToday.set(question, otherId);
        }
        for (const line of theirs) {
          const asked = /^mutual:(.+)$/.exec(line.subjectId)?.[1];
          if (asked && (room.includes(asked) || household.includes(asked)))
            broken.push(
              `${here}: asked after ${asked} in the room: "${line.text}"`,
            );
          if (line.act === "ask" && line.kind.startsWith("own-work"))
            broken.push(
              `${here}: a housemate asked the player's work: "${line.text}"`,
            );
          if (
            PAST_PARTS[minute >= EVENING ? "evening" : "morning"]!.test(
              line.text,
            )
          )
            broken.push(
              `${here}: a part of the day that is over: "${line.text}"`,
            );
          if (/\b(sworn in, gives|chewed on it)\b/i.test(line.text))
            broken.push(
              `${here}: a headline read out, or a follow that says nothing: "${line.text}"`,
            );
          if (/\bcheck on you again\b/i.test(line.text))
            broken.push(`${here}: a promise to check in: "${line.text}"`);
          if (NON_ANSWER.test(line.text.trim()))
            broken.push(`${here}: a non-answer: "${line.text}"`);
          for (const sentence of sentences(line.text)) {
            const other = saidToday.get(sentence);
            if (other && other !== otherId)
              broken.push(
                `${here}: said by two of the household today: "${sentence}"`,
              );
            saidToday.set(sentence, otherId);
          }
        }
        const screen = [
          ...talk.lines.map((line) => line.text),
          ...talk.choices.map((row) => row.text),
        ].join(" ");
        if (presidentName && screen.split(presidentName).length - 1 > 1)
          broken.push(`${here}: the President's full name twice: "${screen}"`);
        if (OUTSIDE.test(screen))
          broken.push(`${here}: the outside market said: "${screen}"`);
        const topic = talk.topics[0];
        if (topic) toldOnce.add(topic.replace(/^[^>]*>/, ""));
        if (topic) {
          const key = `${otherId}|${topic.replace(/:\d{4}-\d{2}-\d{2}$/, "")}`;
          const kind = topic.replace(/^[^>]*>/, "").split(":")[0]!;
          const wait = DAY_TALK.kinds.includes(kind)
            ? DAY_TALK.againAfterDays.value
            : WEEK;
          const last = lastTopic.get(key);
          if (last !== undefined && day - last < wait && day !== last)
            broken.push(
              `${here}: the subject ${topic} again inside ${wait} days (day ${last})`,
            );
          lastTopic.set(key, day);
        }
        // Two people of the house never open on the same wording one day.
        const opener = theirs[0]?.wording?.parts[0];
        if (opener) {
          const by = openedToday.get(opener);
          if (by && by !== otherId)
            broken.push(`${here}: opened on the wording ${opener} twice today`);
          openedToday.set(opener, otherId);
        }
      }
    }
    // A silent day is reported with why, never failed: nothing new on
    // record is nothing to say (lead, Nov 12).
    if (homeToday && !talksToday)
      silent.push(
        `day ${day}: silent, ${newToday.length ? `new on record (${newToday.join(", ")}) but no talk` : "nothing new on record"}`,
      );
  }
  process.stdout.write(
    `HOME-TALK ${where}: ${talks} talks, ${typedSeen} point parts typed by stand, ${silent.length} silent days\n${played.join("\n")}\nSILENT ${where}: ${silent.join("; ") || "none"}\n`,
  );
  if (!talks) broken.push(`${where}: no talk at home in two weeks`);
  return broken;
}
