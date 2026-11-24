import { expect, it } from "vitest";
import { officeInSentence } from "./person-work";

// An office title in a sentence: lower case except a word in capitals. A title
// is the office's name alone (its seats, terms and form are fields of the
// record), so nothing here drops a note.
it("says an office title in a sentence", () => {
  expect(officeInSentence("Railroad Commission")).toBe(
    "railroad commission member",
  );
  expect(officeInSentence("Superintendent of Public Instruction")).toBe(
    "superintendent of public instruction",
  );
  expect(officeInSentence("U.S. Senator")).toBe("U.S. senator");
  expect(officeInSentence("Council Member")).toBe("council member");
  expect(officeInSentence("Public Service Commission President")).toBe(
    "public service commission president",
  );
  expect(officeInSentence("Chairman of the Council")).toBe(
    "chairman of the council",
  );
  expect(officeInSentence("Insurance Commissioner")).toBe(
    "insurance commissioner",
  );
  expect(officeInSentence("State Board of Education")).toBe(
    "state board of education member",
  );
});
