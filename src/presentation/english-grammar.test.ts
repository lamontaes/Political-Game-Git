import { describe, expect, it } from "vitest";

import type { Person } from "../simulation";
import {
  apDate,
  apMoney,
  apPercent,
  finishPlayerLine,
  officeLabel,
  officePhrase,
  personWords,
  runForPhrase,
  tenseOf,
} from "./english-grammar";

function person(pronouns?: "she-her" | "he-him" | "they-them"): Person {
  return {
    ...(pronouns ? { identity: { gender: "unstated", pronouns } } : {}),
  } as unknown as Person;
}

describe("the grammar every player line goes through", () => {
  it("takes pronouns and agreement from the person record", () => {
    expect(personWords(person("she-her"))).toMatchObject({
      They: "She",
      are: "is",
      their: "her",
      have: "has",
    });
    expect(personWords(person("he-him"))).toMatchObject({
      They: "He",
      are: "is",
      them: "him",
    });
    // An unrecorded identity is they/them for the whole sentence.
    expect(personWords(person())).toMatchObject({ They: "They", are: "are" });
    expect(personWords(undefined).were).toBe("were");
  });

  it("says whether a dated thing is past, today or still ahead", () => {
    expect(tenseOf("2026-01-06", "2026-01-10")).toBe("past");
    expect(tenseOf("2026-01-10", "2026-01-10")).toBe("today");
    expect(tenseOf("2026-01-12", "2026-01-10")).toBe("upcoming");
  });

  it("reads offices the way AP style writes them", () => {
    expect(officePhrase("Seat in the Nebraska Legislature")).toBe(
      "a seat in the Nebraska Legislature",
    );
    expect(officeLabel("Seat in the Nebraska Legislature")).toBe(
      "A seat in the Nebraska Legislature",
    );
    expect(runForPhrase("Mayor")).toBe("mayor");
    expect(runForPhrase("Governor of Nebraska")).toBe("governor of Nebraska");
    expect(runForPhrase("U.S. Senator from Nebraska")).toBe(
      "U.S. senator from Nebraska",
    );
    expect(runForPhrase("Council member")).toBe("council member");
    expect(officeLabel("Mayor")).toBe("Mayor");
  });

  it("writes money, percentages and dates in AP style", () => {
    expect(apMoney(36000, "year")).toBe("$36,000 a year");
    expect(apMoney(18.5, "hour")).toBe("$18.50 an hour");
    expect(apMoney(1_200_000)).toBe("$1.2 million");
    expect(apMoney(3_000_000_000)).toBe("$3 billion");
    expect(apPercent(5)).toBe("5 percent");
    expect(apPercent(4.5)).toBe("4.5 percent");
    expect(apDate("2026-01-07")).toBe("January 7, 2026");
  });

  it("finishes a line: no ISO dates, no % sign, one period, a capital", () => {
    expect(
      finishPlayerLine("the meeting was on 2026-01-05 and turnout rose 5%.."),
    ).toBe("The meeting was on January 5, 2026 and turnout rose 5 percent.");
    expect(finishPlayerLine("You mention the news: a vote passed .")).toBe(
      "You mention the news: a vote passed.",
    );
    // An ellipsis is not a doubled period.
    expect(finishPlayerLine("Well...")).toBe("Well...");
  });
});
