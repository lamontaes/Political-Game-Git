/**
 * A court case told through the words composer (Words builder W1, Nov 12,
 * 2026): `charge-say`, `conviction-say` and `acquittal-say`, from the justice
 * engine's case, pretrial and sentence records (the offense, a plea or the
 * trial day, the bail; the prison term, the fine or the probation). Every
 * way the records can fall has a telling that names the offense, and a
 * conviction names the sentence it carries.
 */
import { describe, expect, it } from "vitest";
import { composeConversationLine } from "../english/conversation-words";
import type { PersonId } from "../core2/types";

const fact = (text: string) => ({ text, sourceRecordIds: ["case:test"] });
const say = (subject: string, facts: Record<string, ReturnType<typeof fact>>) =>
  composeConversationLine({
    seed: "court-case-talk-words",
    subject,
    speakerId: "person_test" as PersonId,
    traits: {},
    facts,
    stage: "default",
    momentKey: subject,
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
});
