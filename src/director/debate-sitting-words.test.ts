/**
 * The debate sitting's words, for every question and every standing the record
 * can give (edge cases only, built from facts, not a played world: the played
 * route is debate-sitting.test.ts). Whatever a candidate's filed stand, a vote
 * of theirs on the question and a rival's stand are, the moderator can put the
 * question, the player is offered exactly the moves the record allows (the
 * same answers as in an interview, from the bank the debate's row names), and
 * the moderator opens, takes each answer in and closes. Every line is a piece
 * of the conversation bank, said with the question's spoken name and never its
 * id; a rival is named only where the record holds a stand of theirs.
 */
import { describe, expect, it } from "vitest";
import { wordConversationMove, type Fact } from "../english/conversation-words";
import {
  NAMED_QUESTIONS,
  questionAbout,
  questionTo,
} from "../english/question-names";
import { CONVERSATION_DATA } from "./conversation";
import { flagsOf } from "./sitting";
import sittings from "./data/sittings.json" with { type: "json" };

const rules = { ...sittings, subjects: sittings.kinds.debate.subjects };

const cited = ["debate:proof", "question:proof"];
const fact = (text: string): Fact => ({ text, sourceRecordIds: cited });

/** Every standing a record can give: a stand, a vote and a rival who differs. */
const standings = [null, 1, -1].flatMap((stand) =>
  [0, 1, -1].flatMap((voted) =>
    [null, 1, -1]
      .filter(
        (rival) =>
          rival === null || stand === null || Math.sign(rival) !== stand,
      )
      .map((rival) => ({ stand, voted, rival })),
  ),
);

const say = (
  subject: string,
  part: "open" | "ask" | "answers" | "lie" | "reply" | "leave",
  facts: Record<string, Fact>,
  momentKey: string,
  extra: { stage?: string; keys?: readonly string[] } = {},
) =>
  wordConversationMove({
    seed: "debate-sitting-words",
    subject,
    part,
    speakerId: "speaker",
    traits: {},
    facts,
    momentKey,
    words: CONVERSATION_DATA,
    ...extra,
  });

const shows = (text: string) => /[{}]|us-policy|\bundefined\b/.test(text);

describe("the debate sitting's words", () => {
  it("puts every question at every stage, to a friend and to a stranger, in any standing, and never by its id", () => {
    const failures: string[] = [];
    for (const question of NAMED_QUESTIONS)
      for (const tie of ["acquainted", "stranger"])
        for (const stage of Object.values(rules.stages))
          for (const { stand, voted, rival } of standings) {
            const label = `${question} ${tie} ${stage} stand ${stand} vote ${voted} rival ${rival}`;
            const line = say(
              rules.subjects.question,
              "ask",
              {
                about: fact(questionAbout(question)!),
                to: fact(questionTo(question)!),
                outlet: fact("The Courier"),
                ...(rival === null ? {} : { rival: fact("Sam Rivera") }),
                ...Object.fromEntries(
                  flagsOf(stand, voted, rival).map((key) => [key, fact("yes")]),
                ),
                [tie]: fact("yes"),
              },
              label,
              { stage },
            );
            if (!line) failures.push(`${label}: no line`);
            else if (shows(line.text))
              failures.push(`${label}: "${line.text}" shows a key`);
          }
    expect(failures).toEqual([]);
  });

  it("offers the player exactly the moves the record allows, from the bank the debate names", () => {
    const failures: string[] = [];
    for (const question of NAMED_QUESTIONS)
      for (const { stand, voted, rival } of standings) {
        const facts: Record<string, Fact> = {
          about: fact(questionAbout(question)!),
          to: fact(questionTo(question)!),
          ...(rival === null ? {} : { rival: fact("Sam Rivera") }),
          ...Object.fromEntries(
            flagsOf(stand, voted, rival).map((key) => [key, fact("yes")]),
          ),
        };
        const label = `${question} stand ${stand} vote ${voted} rival ${rival}`;
        const offered = rules.moves.filter((move) =>
          say(rules.subjects.answers, "answers", facts, label, {
            keys: [move],
          }),
        );
        const expected = [
          "plain",
          ...(voted !== 0 ? ["further"] : []),
          ...(rival !== null ? ["turn"] : []),
          "brief",
        ];
        if (offered.join() !== expected.join())
          failures.push(`${label}: offered ${offered.join(", ")}`);
        const lie = say(rules.subjects.answers, "lie", facts, label);
        if (!!lie !== (voted !== 0))
          failures.push(`${label}: lie ${lie?.text}`);
      }
    expect(failures).toEqual([]);
  });

  it("opens, takes each answer in, and closes", () => {
    const base = { outlet: fact("The Courier") };
    for (const tie of ["acquainted", "stranger"]) {
      const facts = { ...base, [tie]: fact("yes") };
      expect(say(rules.subjects.open, "open", facts, tie), tie).toBeTruthy();
    }
    for (const move of [...rules.moves, rules.lie, rules.declined]) {
      // A turned-back answer is only ever given with a rival to name.
      const withRival = {
        ...base,
        acquainted: fact("yes"),
        rival: fact("Sam Rivera"),
      };
      for (const facts of move === "turn"
        ? [withRival]
        : [{ ...base, stranger: fact("yes") }, withRival]) {
        const line = say(
          `${rules.subjects.takePrefix}${move}`,
          "reply",
          facts,
          move,
        );
        expect(line, move).toBeTruthy();
        expect(shows(line!.text), `${move}: ${line!.text}`).toBe(false);
      }
    }
    for (const passed of [false, true])
      expect(
        say(
          rules.subjects.close,
          "leave",
          {
            ...base,
            stranger: fact("yes"),
            ...(passed ? { passed: fact("yes") } : {}),
          },
          String(passed),
        ),
      ).toBeTruthy();
  });

  it("names the rival where the record holds a stand of theirs, and not otherwise", () => {
    const text = (rival: boolean, at: number) =>
      say(
        rules.subjects.question,
        "ask",
        {
          about: fact("a higher minimum wage"),
          to: fact("raise the minimum wage"),
          stranger: fact("yes"),
          ...(rival
            ? { rival: fact("Sam Rivera"), "rival-for": fact("yes") }
            : {}),
        },
        `rival:${rival}:${at}`,
        { stage: "next" },
      )!.text;
    const named = Array.from({ length: 40 }, (_, at) => text(true, at));
    expect(named.some((line) => line.includes("Sam Rivera"))).toBe(true);
    const unnamed = Array.from({ length: 40 }, (_, at) => text(false, at));
    expect(unnamed.some((line) => /rival|Sam/.test(line))).toBe(false);
  });
});
