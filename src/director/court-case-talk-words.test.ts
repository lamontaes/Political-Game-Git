/**
 * A court case told through the words composer (Words builder W1, Nov 12,
 * 2026): `charge-say`, `conviction-say` and `acquittal-say`, from the justice
 * engine's case, pretrial and sentence records (the offense, a plea or the
 * trial day, the bail; the prison term, the fine or the probation). Every
 * way the records can fall has a telling that names the offense, and a
 * conviction names the sentence it carries. Every reply the player can give
 * is answered back (`<kind>-back`, `dayTalk.answersBack`), from what the
 * telling left out, never the figure it said (Nov 13: in the played talks
 * the relative said nothing after the player's reply).
 */
import { describe, expect, it } from "vitest";
import { composeConversationLine } from "../english/conversation-words";
import type { PersonId } from "../core2/types";

const fact = (text: string) => ({ text, sourceRecordIds: ["case:test"] });
const say = (
  subject: string,
  facts: Record<string, ReturnType<typeof fact>>,
  stage = "default",
) =>
  composeConversationLine({
    seed: "court-case-talk-words",
    subject,
    speakerId: "person_test" as PersonId,
    traits: {},
    facts,
    stage,
    momentKey: `${subject}:${stage}`,
  });
const OFFENSE = { offense: fact("taking bribes") };

describe("a court case told through the composer", () => {
  it("tells a charge with the plea or the trial day", () => {
    for (const [mark, text] of [
      [{ plea: fact("yes") }, "pleading guilty"],
      [{ trial: fact("March 4") }, "March 4"],
      [{}, "taking bribes"],
    ] as const) {
      const line = say("charge-say", { ...OFFENSE, ...mark });
      expect(line!.text).toContain("taking bribes");
      expect(line!.text).toContain(text);
    }
  });

  it("tells a conviction with the sentence it carries", () => {
    for (const [mark, text] of [
      [{ term: fact("eight months") }, "eight months"],
      [{ fine: fact("about $5,000") }, "about $5,000"],
      [{ probation: fact("two years") }, "two years"],
    ] as const)
      expect(say("conviction-say", { ...OFFENSE, ...mark })!.text).toContain(
        text,
      );
    expect(say("acquittal-say", OFFENSE)!.text).toContain("taking bribes");
  });

  it("answers every reply back, without the figure the telling said", () => {
    const told = (keys: string[]) =>
      Object.fromEntries(keys.map((key) => [`told-${key}`, fact("ZZTOLD")]));
    const cases: [
      string,
      string[],
      Record<string, ReturnType<typeof fact>>[],
    ][] = [
      [
        "charge-reply-back",
        ["ask", "comfort", "promise", "blame"],
        [
          told(["offense", "plea"]),
          { ...told(["offense", "trial"]), bail: fact("$5,000") },
          told(["offense"]),
        ],
      ],
      [
        "conviction-reply-back",
        ["ask", "comfort", "promise", "blame"],
        [
          told(["offense", "term"]),
          told(["offense", "fine"]),
          told(["offense", "probation"]),
        ],
      ],
      [
        "acquittal-reply-back",
        ["congratulate", "ask", "blame", "comfort"],
        [told(["offense"])],
      ],
    ];
    for (const [subject, moves, factSets] of cases)
      for (const move of moves)
        for (const facts of factSets) {
          const back = say(subject, { ...facts, you: fact("Dad") }, move);
          expect(back, `${subject} ${move} ${Object.keys(facts)}`).toBeTruthy();
          expect(back!.text).not.toContain("ZZTOLD");
        }
  });

  it("says what happened from the case: whom the bribe was offered to", () => {
    const back = say(
      "charge-reply-back",
      {
        "told-offense": fact("offering a bribe"),
        "told-plea": fact("yes"),
        official: fact("Randy Luna"),
        you: fact("Austin"),
      },
      "ask",
    );
    expect(back!.text).toContain("Randy Luna");
  });

  it("owns a denial once a trial they fought ends in a conviction", () => {
    const facts = {
      "told-offense": fact("offering a bribe"),
      "told-term": fact("30 months"),
      contested: fact("yes"),
      you: fact("Elizabeth"),
    };
    expect(say("conviction-reply-back", facts, "blame")!.text).toContain(
      "I'm sorry",
    );
  });
});
