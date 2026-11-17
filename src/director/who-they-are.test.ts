/**
 * The narrator says who a person is the first time it names someone the
 * player has not met (owner, Nov 15, rule 136), from the one reader
 * (`whatTheyAre`), worded by the said-as reader.
 */
import { expect, it } from "vitest";

import { renderLine } from "../english/bank-line";

it("a name set off by the line itself or made possessive takes no appositive, and a closing comma never stands before the sentence's mark", () => {
  const facts = {
    name: {
      text: "Jose Salgado, the town clerk,",
      bare: "Jose Salgado",
      sourceRecordIds: ["person_a"],
    },
  };
  const say = (text: string) =>
    renderLine({
      seed: "s",
      surface: "scene",
      holderId: "person_b",
      bankKey: "test",
      version: "1",
      variants: [{ key: "v", text }],
      facts,
      momentKey: text,
      fallbackSourceId: "person_a",
    })?.text;
  expect(say("{{name}} is waiting downtown.")).toBe(
    "Jose Salgado, the town clerk, is waiting downtown.",
  );
  expect(say("You meet {{name}}.")).toBe(
    "You meet Jose Salgado, the town clerk.",
  );
  expect(say("Your phone lights up with {{name}}'s name.")).toBe(
    "Your phone lights up with Jose Salgado's name.",
  );
  expect(say("{{name}}, the police chief, asks for ten minutes.")).toBe(
    "Jose Salgado, the police chief, asks for ten minutes.",
  );
});
