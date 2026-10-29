/**
 * The sitting's words, for every question and every standing the record can
 * give (edge cases only, built from facts, not a played world: the played
 * route is interview-sitting.test.ts). Whatever a candidate's filed stand, a
 * vote of theirs on the question and a rival's stand are, the reporter can put
 * the question and the player is offered exactly the moves the record allows:
 * a plain answer and a brief one always, a further fact only on a vote, a
 * turn only on a rival, the lie only on a vote. Every line is a piece of the
 * conversation bank, said with the question's spoken name and never its id.
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

const rules = { ...sittings, subjects: sittings.kinds.interview.subjects };

const cited = ["interview:proof", "question:proof"];
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
    seed: "interview-sitting-words",
    subject,
    part,
    speakerId: "speaker",
    traits: {},
    facts,
    momentKey,
    words: CONVERSATION_DATA,
    ...extra,
  });

describe("the interview sitting's words", () => {
  it("offers exactly the moves the record allows, four different answers, for every question", () => {
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
          say("interview-question", "answers", facts, label, { keys: [move] }),
        );
        const expected = [
          "plain",
          ...(voted !== 0 ? ["further"] : []),
          ...(rival !== null ? ["turn"] : []),
          "brief",
        ];
        if (offered.join() !== expected.join())
          failures.push(`${label}: offered ${offered.join(", ")}`);
        const lie = say("interview-question", "lie", facts, label);
        if (!!lie !== (voted !== 0))
          failures.push(`${label}: lie ${lie?.text}`);
        const texts = offered.map(
          (move) =>
            say("interview-question", "answers", facts, label, {
              keys: [move],
            })!.text,
        );
        if (new Set(texts).size !== texts.length)
          failures.push(`${label}: ${texts.join(" / ")}`);
        for (const text of [...texts, lie?.text ?? ""])
          if (/[{}]|us-policy|\bundefined\b/.test(text))
            failures.push(`${label}: "${text}" shows a key`);
      }
    expect(failures).toEqual([]);
  });

  it("puts every question at every stage, to a friend and to a stranger, and never by its id", () => {
    const failures: string[] = [];
    for (const question of NAMED_QUESTIONS)
      for (const tie of ["acquainted", "stranger"])
        for (const stage of Object.values(rules.stages)) {
          const facts = {
            about: fact(questionAbout(question)!),
            to: fact(questionTo(question)!),
            outlet: fact("The Courier"),
            [tie]: fact("yes"),
          };
          const line = say(
            "interview-question",
            "ask",
            facts,
            `${question}:${tie}:${stage}`,
            { stage },
          );
          if (!line) failures.push(`${question} ${tie} ${stage}: no line`);
          else if (/[{}]|us-policy|\bundefined\b/.test(line.text))
            failures.push(`${question} ${tie} ${stage}: "${line.text}"`);
        }
    expect(failures).toEqual([]);
  });

  it("opens, takes each answer in, and closes", () => {
    const base = { outlet: fact("The Courier") };
    for (const tie of ["acquainted", "stranger"]) {
      const facts = { ...base, [tie]: fact("yes") };
      expect(say("interview-open", "open", facts, tie), tie).toBeTruthy();
    }
    for (const move of [...rules.moves, rules.lie, rules.declined]) {
      for (const facts of [
        { ...base, stranger: fact("yes") },
        { ...base, acquainted: fact("yes"), rival: fact("Sam Rivera") },
      ])
        expect(
          say(`${rules.subjects.takePrefix}${move}`, "reply", facts, move),
          move,
        ).toBeTruthy();
    }
    for (const passed of [false, true])
      expect(
        say(
          "interview-close",
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

  it("puts the same question differently to someone the reporter knows and to a stranger", () => {
    // Over forty moments of the same question, each tie has lines the other
    // never says (a witness over the whole bank, not one draw).
    const said = (tie: string) =>
      new Set(
        Array.from(
          { length: 40 },
          (_, at) =>
            say(
              "interview-question",
              "ask",
              {
                about: fact("a higher minimum wage"),
                to: fact("raise the minimum wage"),
                [tie]: fact("yes"),
              },
              `${tie}:${at}`,
              { stage: "next" },
            )!.text,
        ),
      );
    const friend = said("acquainted");
    const stranger = said("stranger");
    expect([...friend].filter((text) => !stranger.has(text))).not.toEqual([]);
    expect([...stranger].filter((text) => !friend.has(text))).not.toEqual([]);
  });

  it("answers the same question in four different voices, by what the record allows", () => {
    // A candidate with a vote and a rival is offered four answers that are
    // four different sentences, whichever way their stand points.
    for (const stand of [1, -1]) {
      const facts: Record<string, Fact> = {
        about: fact("a higher minimum wage"),
        to: fact("raise the minimum wage"),
        rival: fact("Sam Rivera"),
        ...Object.fromEntries(
          flagsOf(stand, stand, -stand).map((key) => [key, fact("yes")]),
        ),
      };
      const texts = rules.moves.map(
        (move) =>
          say("interview-question", "answers", facts, "four", {
            keys: [move],
          })!.text,
      );
      expect(new Set(texts).size).toBe(texts.length);
    }
  });
});
