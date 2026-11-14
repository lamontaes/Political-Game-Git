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
 * - no job or employer is said as the outside market.
 *
 * `TALK_PLACE_SEED` and `TALK_PLACE_KEY` run a labeled world instead of a draw
 * (the grading life of Nov 12: seed a9c85de3-e7fa-4418-8499-569a5c5e6e10,
 * place 0686174).
 */
import { randomBytes } from "node:crypto";
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
import { openConversation, say, type Conversation } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(10).toString("hex");
const DAYS = 14;
const MORNING = 7 * 60;
const EVENING = 20 * 60 + 30;
const TURNS = 8;
const WEEK = 7;
const SHOWN_DAYS = 3;

function build() {
  const labeled = process.env.TALK_PLACE_SEED;
  const key = process.env.TALK_PLACE_KEY;
  const place =
    labeled && key
      ? { seed: labeled, key, name: `labeled ${key}` }
      : drawPlace(seed, "home-talk-fortnight");
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
const NON_ANSWER = /^(okay|oh, i see|alright|all right|oh, okay)\.$/i;
const OUTSIDE =
  /\b(a works outside the town|outside market|outside buyers|treasury)\b/i;
const sentences = (text: string) =>
  text.split(/(?<=[.!?])\s+/).filter((row) => row.split(/\s+/).length > 3);

it(`two weeks of talk at home hold the telling's rules (seed ${seed})`, () => {
  const { core, director, playerId, where } = build();
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
  for (let day = 0; day < DAYS; day += 1) {
    const saidToday = new Map<string, string>();
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
        if (!talk.lines.length) continue;
        talks += 1;
        for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1)
          say(
            core,
            talk,
            talk.choices[(day + turn) % talk.choices.length]!.key,
          );
        const here = `${where}, day ${day} at ${Math.floor(minute / 60)}:${String(minute % 60).padStart(2, "0")}, with ${core.people.get(otherId)!.givenName}`;
        if (day < SHOWN_DAYS) {
          played.push(`-- ${here}`);
          for (const line of talk.lines)
            played.push(
              `${line.speakerId === playerId ? "  You" : `  ${core.people.get(line.speakerId)?.givenName}`}: ${line.text}`,
            );
        }
        const theirs = talk.lines.filter((line) => line.speakerId === otherId);
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
        if (topic) {
          const key = `${otherId}|${topic.replace(/:\d{4}-\d{2}-\d{2}$/, "")}`;
          const last = lastTopic.get(key);
          if (last !== undefined && day - last < WEEK && day !== last)
            broken.push(
              `${here}: the subject ${topic} again within the week (day ${last})`,
            );
          lastTopic.set(key, day);
        }
      }
    }
  }
  process.stdout.write(
    `HOME-TALK ${where}: ${talks} talks\n${played.join("\n")}\n`,
  );
  expect(talks, `${where}: no talk at home in two weeks`).toBeGreaterThan(0);
  expect(broken, where).toEqual([]);
}, 1_800_000);
