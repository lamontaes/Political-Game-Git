/**
 * The player asks the chair of the committee that held their bill for a hearing
 * (pool item gov-player-asks-chair-for-hearing). The chair answers from the
 * committee's own record of why it held the bill (`chairReasons`: their position,
 * their temper and the cosponsors' pull) and what a favor to the player is worth to
 * them; the answer reopens the hearing or leaves the hold. Played at Texas (place
 * 4846968, world seed 8647-mason), the player a state senator who drafts one bill and
 * plays the days by the game's own presses; the seats and questions were found by a
 * script outside the test (every seat draws one question and the holds' chair leans and
 * favor are listed after Mar 20).
 */
import { expect, it } from "vitest";
import sceneTalk from "../../data/english/parts/scene-talk.json" with { type: "json" };
import reasonTermsFile from "./data/bargain-reasons.json" with { type: "json" };

it("the reasons the chair can give are exactly the ones the bank has a line for", () => {
  const bank = (
    sceneTalk as unknown as {
      parts: {
        uses: {
          purpose?: string;
          step?: string;
          move?: string;
          requiresFacts?: string[];
        }[];
      }[];
    }
  ).parts;
  const said = new Set<string>();
  for (const part of bank)
    for (const use of part.uses)
      if (
        use.purpose === "hearing-ask" &&
        use.step === "reply" &&
        use.move === "refuse"
      )
        for (const fact of use.requiresFacts ?? [])
          if (fact.startsWith("reason-") && fact !== "reason-none")
            said.add(fact.slice("reason-".length));
  expect([...said].sort()).toEqual([...reasonTermsFile.heldReasonsSaid].sort());
});
