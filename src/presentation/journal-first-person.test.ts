import { describe, expect, it } from "vitest";
import {
  journalChronicleInFirstPerson,
  journalInFirstPerson,
} from "./journal-first-person";

describe("the Journal in the character's own hand", () => {
  it("tells recorded sentences as I, in the past tense", () => {
    expect(journalInFirstPerson("You live in Lincoln, Nebraska.")).toBe(
      "I lived in Lincoln, Nebraska.",
    );
    expect(journalInFirstPerson("You are at home.")).toBe("I was at home.");
    expect(journalInFirstPerson("Ravi Alvarez asked you for money.")).toBe(
      "Ravi Alvarez asked me for money.",
    );
    expect(
      journalInFirstPerson("Your mom told you she was proud of you."),
    ).toBe("My mom told me she was proud of me.");
    expect(journalInFirstPerson("Privately, you support the measure.")).toBe(
      "Privately, I supported the measure.",
    );
    expect(
      journalInFirstPerson("You and Dana Reyes went to the meeting."),
    ).toBe("Dana Reyes and I went to the meeting.");
  });

  it("keeps quoted words, names and facts as recorded", () => {
    expect(
      journalInFirstPerson("You told Dana: “I can drive you there.”"),
    ).toBe("I told Dana: “I can drive you there.”");
    expect(
      journalInFirstPerson(
        "Keanu Hall will host the community town hall on 2026-01-07.",
      ),
    ).toBe("Keanu Hall will host the community town hall on January 7, 2026.");
    expect(
      journalInFirstPerson(
        "You began working as Store assistant at Neighborhood Market.",
      ),
    ).toBe("I began working as a store assistant at Neighborhood Market.");
  });

  it("joins the two birth facts into one sentence", () => {
    const told = journalChronicleInFirstPerson([
      { text: "You were born on January 1, 1992." },
      { text: "You were born in Lincoln, Nebraska." },
      { text: "You were enrolled at Lincoln High School." },
    ]);
    expect(
      told.filter((line) => !line.absorbed).map((line) => line.firstPerson),
    ).toEqual([
      "I was born in Lincoln, Nebraska, on January 1, 1992.",
      "I was enrolled at Lincoln High School.",
    ]);
  });
});
