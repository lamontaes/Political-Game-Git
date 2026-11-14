import { describe, expect, it } from "vitest";
import { officeInSentence } from "./person-work";

// Every scene that says an office in talk takes one said form
// (officeInSentence): a title the record writes with capitals is lower case
// in running text, an initialism keeps its capitals, and a form's note is
// never said. Words lead, Nov 14: "your campaign for State Representative".
describe("an office in running text", () => {
  const CASES: readonly (readonly [string, string])[] = [
    ["State Representative", "state representative"],
    ["State Senator", "state senator"],
    ["U.S. Senator", "U.S. senator"],
    ["County Commissioner", "county commissioner"],
    ["Council member", "council member"],
    ["Mayor", "mayor"],
    ["Governor", "governor"],
    [
      "Superintendent of Public Instruction (nonpartisan, spring election)",
      "superintendent of public instruction",
    ],
  ];
  for (const [title, said] of CASES)
    it(`says "${title}" as "${said}"`, () => {
      expect(officeInSentence(title)).toBe(said);
    });
});
