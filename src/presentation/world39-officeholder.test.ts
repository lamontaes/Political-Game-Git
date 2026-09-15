import { describe, expect, it } from "vitest";

import type { IsoDate } from "../simulation";
import { institutionRestatesTitle, officeholderSentence } from "./world39-news";

const JANUARY_2025 = "2025-01-20" as IsoDate;

describe("officeholder sentence", () => {
  it("does not name the same office twice", () => {
    const sentence = officeholderSentence(
      "Dana Ortiz",
      "President of the United States",
      "Presidency of the United States",
      JANUARY_2025,
    );
    expect(sentence).not.toContain(" at ");
    expect(sentence).toMatch(
      /^Dana Ortiz has served as President of the United States since /,
    );
  });

  it("still names a distinct institution", () => {
    const sentence = officeholderSentence(
      "Dana Ortiz",
      "Clerk",
      "Hart County Library",
      JANUARY_2025,
    );
    expect(sentence).toContain("Clerk at Hart County Library since");
  });

  it("says who serves without inventing a start date it does not have", () => {
    expect(
      officeholderSentence(
        "Dana Ortiz",
        "Governor of Nevada",
        "Office of the Governor of Nevada",
        null,
      ),
    ).toBe("Dana Ortiz serves as Governor of Nevada.");
  });

  it("recognizes restatement by shared tail or containment, not by name lists", () => {
    expect(
      institutionRestatesTitle(
        "Governor of Nevada",
        "Office of the Governor of Nevada",
      ),
    ).toBe(true);
    expect(
      institutionRestatesTitle("Mayor of Alamo", "Mayoralty of Alamo"),
    ).toBe(true);
    expect(
      institutionRestatesTitle("Member of the Assembly", "Nevada Legislature"),
    ).toBe(false);
    expect(
      institutionRestatesTitle(
        "Secretary of State",
        "Department of Motor Vehicles",
      ),
    ).toBe(false);
  });
});
