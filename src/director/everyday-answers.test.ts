/**
 * Talk like people (words-everyday-talk-one-engine, its first line): a
 * question put to the player is answered, never only taken in. In a played
 * world in two drawn places, every everyday conversation the player can open
 * with the people they know, each week for 30 days, and each reply after it,
 * offers no acknowledgment ("Oh, okay.") as the answer to a question, and
 * after a question the rules say what answers ("What do you think?" is
 * answered by an opinion, not "I heard about it." or "Huh."), only those.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { buildBenchWorld } from "../bench/world";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { openConversation, say, type Conversation } from "./conversation";
import rules from "./data/conversation-rules.json" with { type: "json" };

const seed = process.env.GOLDEN_PATH_SEED ?? randomBytes(8).toString("hex");
const PLACES = 2;
const DAYS = 30;
const STEP = 7;
const TURNS = 4;
/** The choices that only take a line in (conversation-rules.json replyMoves.notes). */
const NOTES = new Set(["ack", "ack-none"]);
const ANSWERS_TO = rules.answersTo as unknown as Record<string, string[]>;

const asked = (talk: Conversation) => {
  const last = talk.lines.at(-1);
  return !!last && last.speakerId !== talk.playerId && /\?\s*$/.test(last.text);
};

it(`a question put to the player is answered, never only acknowledged (seed ${seed})`, () => {
  const report: string[] = [];
  for (let draw = 0; draw < PLACES; draw += 1) {
    const place = drawPlace(`${seed}:${draw}`, "everyday-answers");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    setBookkeeping(false);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId! as PersonId;
    director.watch(core, me);
    let questions = 0;
    let ruled = 0;
    let talks = 0;
    const end = addDays(makeIsoDate(core.date), DAYS);
    for (
      let day = makeIsoDate(core.date);
      day <= end;
      day = addDays(day, STEP)
    ) {
      if (day > core.date) advanceCore(core, day);
      const known = [...(core.people.get(me)?.knownIds ?? [])]
        .filter((id) => core.people.get(id)?.alive)
        .sort();
      for (const otherId of known) {
        let talk = openConversation(core, me, otherId as PersonId, {
          director,
        });
        talks += 1;
        for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
          if (asked(talk)) {
            questions += 1;
            const question = talk.lines.at(-1)!.text;
            const acks = talk.choices.filter((choice) =>
              NOTES.has(choice.move),
            );
            expect(
              acks.map((choice) => choice.text),
              `${where}, ${core.date}: "${question}" answered by`,
            ).toEqual([]);
            const move = talk.lines
              .at(-1)!
              .wording?.parts.at(-1)
              ?.split(".")[1];
            const fitting = move ? ANSWERS_TO[move] : undefined;
            if (fitting) {
              ruled += 1;
              for (const choice of talk.choices)
                expect(
                  fitting,
                  `${where}, ${core.date}: "${question}" answered "${choice.text}"`,
                ).toContain(choice.move);
            }
          }
          // Carry on as a player would: the first reply on offer.
          talk = say(core, talk, talk.choices[0]!.key);
        }
      }
    }
    report.push(
      `${where}: ${talks} talks, ${questions} questions put to the player, none only acknowledged, ${ruled} answered only as the rules say`,
    );
    expect(talks, `${where}: no one to talk to`).toBeGreaterThan(0);
  }
  process.stdout.write(`EVERYDAY ANSWERS\n${report.join("\n")}\n`);
}, 3_600_000);
