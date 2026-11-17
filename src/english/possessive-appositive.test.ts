import { describe, expect, it } from "vitest";
import { renderLine } from "./bank-line";
import { bareName } from "./said-as";

// A person said with what they are ("Anika Meadows, a member of the Stoneham
// Select Board,") takes the bare name where the line follows the slot with a
// possessive: "Anika Meadows's team", never an appositive inside the possessive
// ("...Select Board,'s team"). The appositive stays on the first full mention.
// Older than the family-loss pull request (#9512), which gave the opponent
// fact its bare name.
const meadows = { givenName: "Anika", familyName: "Meadows" };
const said = "Anika Meadows, a member of the Stoneham Select Board,";

const say = (text: string) =>
  renderLine({
    seed: "possessive-appositive",
    surface: "dialogue",
    holderId: "person:speaker",
    bankKey: "possessive-appositive",
    version: "1",
    variants: [{ key: "v", text }],
    facts: {
      opponent: {
        text: said,
        bare: bareName(said, meadows),
        sourceRecordIds: ["record:count"],
      },
    },
    momentKey: "moment:call",
    fallbackSourceId: "record:count",
  })?.text;

describe("a name with its appositive inside a possessive", () => {
  it("finds the bare name of a said person", () => {
    expect(bareName(said, meadows)).toBe("Anika Meadows");
    expect(bareName("Anika Meadows", meadows)).toBeUndefined();
  });

  it("says the possessive on the bare name", () => {
    expect(say("{{opponent}}'s team is waiting on the call.")).toBe(
      "Anika Meadows's team is waiting on the call.",
    );
  });

  it("keeps the appositive where the slot is not a possessive", () => {
    expect(say("The call goes to {{opponent}}.")).toBe(
      "The call goes to Anika Meadows, a member of the Stoneham Select Board.",
    );
  });
});
