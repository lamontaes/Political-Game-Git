import { expect, it } from "vitest";
import { officeInSentence } from "./person-work";

// An office title in a sentence: lower case except a word in capitals, and a
// form's note in parentheses is never said (Fable A on the crew line, Nov 13:
// "Has served as railroad commission (3 members, statewide, staggered 6-year
// terms) since 2021.").
it("says an office title in a sentence without the form's note", () => {
  expect(
    officeInSentence(
      "Railroad Commission (3 members, statewide, staggered 6-year terms)",
    ),
  ).toBe("railroad commission member");
  expect(
    officeInSentence("Superintendent of Public Instruction (nonpartisan)"),
  ).toBe("superintendent of public instruction");
  expect(officeInSentence("U.S. Senator")).toBe("U.S. senator");
  expect(officeInSentence("Council Member")).toBe("council member");
  expect(officeInSentence("Public Service Commission President")).toBe(
    "public service commission president",
  );
  expect(officeInSentence("Chairman of the Council (elected citywide)")).toBe(
    "chairman of the council",
  );
  expect(officeInSentence("Insurance Commissioner")).toBe(
    "insurance commissioner",
  );
  expect(
    officeInSentence("State Board of Education (8 members (at large))"),
  ).toBe("state board of education member");
});
