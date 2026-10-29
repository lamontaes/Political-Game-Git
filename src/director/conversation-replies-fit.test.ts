/**
 * Every reply in everyday talk fits the line it answers
 * (words-everyday-talk-one-engine; owner, Oct 29: "did you see the
 * president's address? And then the reply is like, oh, okay. What about
 * you?"). In a played world (buildBenchWorld, every module) in two places
 * drawn from all 56, the player talks with everyone they live with or know
 * every five days for 30 days, as the bench's Talk does, and every line and
 * offered reply is read:
 *
 * - a reply offered to a question never opens with a question of its own
 *   ("What did you make of it?" to "Did you see the President's speech?"),
 *   and is never an acknowledgment ("Okay.");
 * - what the other person says after the player's answer is the scene
 *   engine's answer written for the move the answer made (a request to sit a
 *   while is met with "Sure.", a disagreement never with "That's what I
 *   thought too."), from the one scene bank;
 * - a question the player asks is answered, never taken in with a shrug;
 * - no line shows an unfilled blank.
 */
import { randomBytes } from "node:crypto";
import { expect, it } from "vitest";
import { drawPlace } from "../../scripts/core2-year/place";
import { setBookkeeping } from "../core2/bookkeeping";
import { gameStartDate } from "../core2/game-start";
import { addDays, makeIsoDate } from "../core2/kernel/dates";
import { advanceCore } from "../core2/life";
import type { PersonId } from "../core2/types";
import { buildBenchWorld } from "../bench/world";
import sceneBank from "../../data/english/parts/scene-talk.json" with { type: "json" };
import rules from "./data/conversation-rules.json" with { type: "json" };
import { openConversation, say, type Conversation } from "./conversation";

const seed = process.env.GOLDEN_PATH_SEED || randomBytes(20).toString("hex");
const PLACES = 2;
const DAYS = 30;
const EVERY = 5;
const TURNS = 5;

/** The scene bank's everyday-talk uses, by piece. */
const TALK_USES = new Map(
  (
    sceneBank as unknown as {
      parts: { key: string; uses: { purpose?: string; after?: string }[] }[];
    }
  ).parts.map((part) => [
    part.key,
    part.uses.filter((use) => use.purpose === "talk"),
  ]),
);
const REPLY_MOVES = rules.replyMoves as unknown as Record<
  string,
  Record<string, string> | string | string[]
>;
const moveOf = (kind: string, choice: string) =>
  (REPLY_MOVES[kind.replace(/-new$/, "")] as Record<string, string>)?.[
    choice
  ] ?? (REPLY_MOVES.default as string);
const asks = (text: string) => /\?\s*$/.test(text);
/** The first sentence of a reply. */
const opening = (text: string) => text.match(/^[^.?!]*[.?!]/)?.[0] ?? text;

it(`every reply in everyday talk fits the line it answers, over ${DAYS} days in ${PLACES} drawn places (seed ${seed})`, () => {
  const seen = { talks: 0, questions: 0, takes: 0, asked: 0 };
  for (let draw = 0; draw < PLACES; draw += 1) {
    setBookkeeping(false);
    const place = drawPlace(`${seed}:${draw}`, "talk-replies");
    const where = `${place.name} (${place.key}), seed ${seed}:${draw}`;
    process.stdout.write(`TALK REPLIES ${where}, world seed ${place.seed}\n`);
    const { core, director, playerId } = buildBenchWorld(
      place.seed,
      gameStartDate(),
      { twoLevel: true, placeKey: place.key },
    );
    const me = playerId as PersonId;
    const start = makeIsoDate(core.date);
    const talkers = () => {
      const home = [...core.people.values()]
        .filter(
          (row) =>
            row.alive &&
            row.id !== me &&
            row.householdId === core.people.get(me)!.householdId,
        )
        .map((row) => row.id as PersonId);
      const known = [...core.relationships.values()]
        .filter(
          (tie) => tie.actorId === me && core.people.get(tie.otherId)?.alive,
        )
        .map((tie) => tie.otherId as PersonId);
      return [...new Set([...home, ...known])].sort();
    };
    for (let day = 0; day <= DAYS; day += 1) {
      if (day) advanceCore(core, addDays(start, day));
      if (day % EVERY) continue;
      talkers().forEach((otherId, at) => {
        const talk: Conversation = openConversation(core, me, otherId, {
          director,
        });
        seen.talks += 1;
        for (let turn = 0; turn < TURNS && talk.choices.length; turn += 1) {
          const last = talk.lines.at(-1)!;
          const here = `${where} ${core.date} ${otherId}: "${last.text}"`;
          // A line that asks is never met with an acknowledgment, and a
          // question put to the player (the line ends asking) is answered
          // before anything is asked back. A reaction to news told
          // ("Have you seen this? ... sworn in." "Really?") is not that.
          if (last.act === "ask" || asks(last.text))
            for (const choice of talk.choices)
              expect(choice.move, `${here} -> "${choice.text}"`).not.toMatch(
                /^ack:/,
              );
          if (asks(last.text)) {
            seen.questions += 1;
            for (const choice of talk.choices)
              expect(
                asks(opening(choice.text)),
                `${here} -> "${choice.text}" answers a question with a question`,
              ).toBe(false);
          }
          const pick = talk.choices[(at + turn + day) % talk.choices.length]!;
          const kind = last.kind;
          const before = talk.lines.length;
          say(core, talk, pick.key);
          const reply = talk.lines[before + 1];
          if (!reply || reply.speakerId !== otherId || reply.kind !== "ack")
            continue;
          // The take-in is a scene-bank piece written for the move the
          // answer made: one naming that move or this subject and choice, or
          // a plain one only for a plain answer.
          seen.takes += 1;
          const move = moveOf(kind, pick.move);
          const piece = reply.wording?.parts[0] ?? "";
          const uses = TALK_USES.get(piece) ?? [];
          expect(
            uses.length,
            `${here} -> "${pick.text}" -> "${reply.text}" (${piece})`,
          ).toBeGreaterThan(0);
          expect(
            uses.some((use) =>
              use.after
                ? use.after === move ||
                  use.after === `${kind.replace(/-new$/, "")}:${pick.move}`
                : move === rules.replyMoves.default,
            ),
            `${here} -> "${pick.text}" (${move}) -> "${reply.text}"`,
          ).toBe(true);
          // A question the player asks is answered by a move that answers it.
          if (asks(pick.text)) {
            seen.asked += 1;
            expect(
              rules.replyMoves.answerable,
              `${here} -> "${pick.text}" -> "${reply.text}"`,
            ).toContain(move);
          }
        }
        for (const line of talk.lines)
          expect(line.text, `${where} ${otherId}`).not.toMatch(/[{}]/);
      });
    }
  }
  process.stdout.write(
    `TALK REPLIES ${seed}: ${seen.talks} talks, ${seen.questions} questions answered, ${seen.takes} answers taken in, ${seen.asked} of the player's questions answered\n`,
  );
  expect(seen.questions).toBeGreaterThan(0);
  expect(seen.takes).toBeGreaterThan(0);
}, 3_600_000);
