import { describe, expect, it } from "vitest";

import {
  QUALIFICATION_PROFILE_COVERAGE,
  qualificationRange,
  standInQualification,
  standInRequirementSentence,
} from "./office-qualification-profile";
import { qualificationRows } from "./office-qualification-rules";

const UNREAD = [
  "US-KY",
  "US-CA",
  "US-TX",
  "US-FL",
  "US-NY",
  "US-WY",
  "US-AK",
  "US-HI",
  "US-VT",
  "US-ME",
] as const;

describe("what the game has actually read", () => {
  it("covers a minority of the country, which is why a stand-in is needed", () => {
    expect(QUALIFICATION_PROFILE_COVERAGE.statesRead.length).toBeLessThan(51);
    expect(QUALIFICATION_PROFILE_COVERAGE.statesRead).toContain("MN");
  });
});

describe("the range is the corpus, not this file", () => {
  it("spans exactly the distinct values the compiled rows carry", () => {
    const values = [
      ...new Set(
        qualificationRows()
          .filter(
            (row) =>
              row.field === "MINIMUM_AGE" &&
              row.officeFamily === "LOWER_CHAMBER" &&
              row.sourceState === "KNOWN" &&
              typeof row.value === "number",
          )
          .map((row) => row.value as number),
      ),
    ].sort((left, right) => left - right);
    const range = qualificationRange("MINIMUM_AGE", "LOWER_CHAMBER");
    expect(range!.enactedValues).toEqual(values);
    expect(range!.lowest).toBe(values[0]);
    expect(range!.highest).toBe(values[values.length - 1]);
  });

  it("offers nothing where the corpus carries nothing, and borrows from no other office", () => {
    // No compiled row states a district-residence length for a state senate,
    // and a house's year is not a measurement of a senate's.
    expect(
      qualificationRange("DISTRICT_RESIDENCE", "UPPER_CHAMBER"),
    ).toBeNull();
    expect(
      standInQualification("US-KY", "DISTRICT_RESIDENCE", "UPPER_CHAMBER"),
    ).toBeNull();
  });
});

describe("an unread state gets a plausible rule", () => {
  it("offers a whole number inside the spread, never an arithmetic artefact", () => {
    for (const state of UNREAD) {
      const standIn = standInQualification(
        state,
        "MINIMUM_AGE",
        "LOWER_CHAMBER",
      )!;
      expect(Number.isInteger(standIn.value)).toBe(true);
      expect(standIn.value).toBeGreaterThanOrEqual(standIn.lowest);
      expect(standIn.value).toBeLessThanOrEqual(standIn.highest);
    }
  });

  it("takes the spread's ends from real enacted law", () => {
    const standIn = standInQualification(
      "US-KY",
      "MINIMUM_AGE",
      "LOWER_CHAMBER",
    )!;
    expect(standIn.enactedValues).toContain(standIn.lowest);
    expect(standIn.enactedValues).toContain(standIn.highest);
  });

  it("answers the same way for one state every single time", () => {
    for (const state of UNREAD) {
      const first = standInQualification(state, "MINIMUM_AGE", "LOWER_CHAMBER");
      const again = standInQualification(state, "MINIMUM_AGE", "LOWER_CHAMBER");
      expect(again!.value).toBe(first!.value);
    }
  });

  it("does not hand every unread state the same rules", () => {
    const drawn = new Set(
      UNREAD.map(
        (state) =>
          standInQualification(state, "STATE_RESIDENCE", "UPPER_CHAMBER")!
            .value,
      ),
    );
    expect(drawn.size).toBeGreaterThan(1);
  });

  it("varies a state's fields independently, so none is strictest at everything", () => {
    // Two fields of one state are drawn separately; across a set of states the
    // pairing of the two must not be constant, or the fields move together.
    const pairs = new Set(
      UNREAD.map((state) => {
        const age = standInQualification(
          state,
          "MINIMUM_AGE",
          "LOWER_CHAMBER",
        )!;
        const residence = standInQualification(
          state,
          "STATE_RESIDENCE",
          "LOWER_CHAMBER",
        )!;
        return `${age.value}:${residence.value}`;
      }),
    );
    expect(pairs.size).toBeGreaterThan(1);
  });

  it("stays inside the spread real states set", () => {
    for (const state of UNREAD) {
      const standIn = standInQualification(
        state,
        "STATE_RESIDENCE",
        "UPPER_CHAMBER",
      )!;
      expect(standIn.value).toBeGreaterThanOrEqual(standIn.lowest);
      expect(standIn.value).toBeLessThanOrEqual(standIn.highest);
    }
  });

  it("is always labelled as the game's own, never as a source", () => {
    expect(
      standInQualification("US-KY", "MINIMUM_AGE", "LOWER_CHAMBER")!.basis,
    ).toBe("game-profile");
  });
});

describe("what the player is told", () => {
  it("states the requirement and nothing about where it came from", () => {
    const standIn = standInQualification(
      "US-KY",
      "STATE_RESIDENCE",
      "LOWER_CHAMBER",
    )!;
    const sentence = standInRequirementSentence(standIn, "residence", "years");
    expect(sentence).toContain(String(standIn.value));
    // No research state on a player-facing surface: no talk of reading, of
    // sources, of other states, or of this being a stand-in.
    expect(sentence).not.toMatch(
      /read|source|stand-in|corpus|typical|game has|other states|law of/i,
    );
  });

  it("keeps every bit of that provenance in the record instead", () => {
    const standIn = standInQualification(
      "US-KY",
      "STATE_RESIDENCE",
      "LOWER_CHAMBER",
    )!;
    expect(standIn.basis).toBe("game-profile");
    expect(standIn.states.length).toBeGreaterThan(0);
    expect(standIn.enactedValues).toContain(standIn.lowest);
  });
});
