import { describe, expect, it } from "vitest";

import {
  QUALIFICATION_PROFILE_COVERAGE,
  typicalQualification,
  typicalQualificationNote,
} from "./office-qualification-profile";
import { qualificationRows } from "./office-qualification-rules";

/**
 * The profile exists because most of the country is unread, so the first thing
 * worth pinning is that this is still true — if the corpus ever grows to cover
 * every state, the profile has no work left to do and somebody should notice
 * rather than leave a stand-in standing in for nothing.
 */
describe("what the game has actually read", () => {
  it("covers a minority of the country, which is why a typical value is needed", () => {
    expect(QUALIFICATION_PROFILE_COVERAGE.statesRead.length).toBeLessThan(51);
    expect(QUALIFICATION_PROFILE_COVERAGE.statesRead).toContain("MN");
  });
});

describe("a typical value is measured, not chosen", () => {
  it("returns the median of the rows the corpus carries", () => {
    const ages = qualificationRows()
      .filter(
        (row) =>
          row.field === "MINIMUM_AGE" &&
          row.officeFamily === "LOWER_CHAMBER" &&
          row.sourceState === "KNOWN" &&
          typeof row.value === "number",
      )
      .map((row) => row.value as number)
      .sort((left, right) => left - right);
    const typical = typicalQualification("MINIMUM_AGE", "LOWER_CHAMBER");
    expect(typical).not.toBeNull();
    expect(typical!.sampleSize).toBe(ages.length);
    const middle =
      ages.length % 2 === 1
        ? ages[(ages.length - 1) / 2]
        : ages[ages.length / 2 - 1];
    expect(typical!.value).toBe(middle);
  });

  it("is a value real law uses, not an arithmetic mean", () => {
    const typical = typicalQualification("MINIMUM_AGE", "LOWER_CHAMBER");
    expect(Number.isInteger(typical!.value)).toBe(true);
    const rows = qualificationRows().filter(
      (row) =>
        row.field === "MINIMUM_AGE" &&
        row.officeFamily === "LOWER_CHAMBER" &&
        row.sourceState === "KNOWN",
    );
    // The value the profile offers is one some state actually legislated.
    expect(rows.map((row) => row.value)).toContain(typical!.value);
  });

  it("takes the lower middle value on an even sample, never the stricter one", () => {
    const typical = typicalQualification("STATE_RESIDENCE", "UPPER_CHAMBER");
    expect(typical).not.toBeNull();
    const values = qualificationRows()
      .filter(
        (row) =>
          row.field === "STATE_RESIDENCE" &&
          row.officeFamily === "UPPER_CHAMBER" &&
          row.sourceState === "KNOWN" &&
          typeof row.value === "number",
      )
      .map((row) => row.value as number);
    expect(typical!.value).toBe(Math.min(...values));
  });

  it("names every state the median rests on", () => {
    const typical = typicalQualification("MINIMUM_AGE", "LOWER_CHAMBER");
    expect(typical!.states.length).toBeGreaterThan(0);
    for (const state of typical!.states) {
      expect(QUALIFICATION_PROFILE_COVERAGE.statesRead).toContain(state);
    }
  });

  it("refuses to invent one where the corpus carries nothing", () => {
    // No compiled row states a district-residence length for a state senate.
    expect(
      typicalQualification("DISTRICT_RESIDENCE", "UPPER_CHAMBER"),
    ).toBeNull();
  });

  it("is always labelled as the game's own, never as a source", () => {
    for (const family of ["LOWER_CHAMBER", "UPPER_CHAMBER"] as const) {
      const typical = typicalQualification("MINIMUM_AGE", family);
      if (typical) expect(typical.basis).toBe("game-profile");
    }
  });
});

describe("what the player is told", () => {
  it("says the game has not read the rule, and does not call it the state's law", () => {
    const typical = typicalQualification("STATE_RESIDENCE", "LOWER_CHAMBER")!;
    const note = typicalQualificationNote(
      typical,
      "residence requirement",
      "year",
    );
    expect(note).toContain("has not read this state's residence requirement");
    expect(note).toContain("not this state's law");
    expect(note).not.toMatch(/this state requires/i);
  });

  it("shows its working, so the number is checkable rather than asserted", () => {
    const typical = typicalQualification("MINIMUM_AGE", "LOWER_CHAMBER")!;
    const note = typicalQualificationNote(typical, "minimum age", "years");
    expect(note).toContain(String(typical.value));
    expect(note).toContain(String(typical.sampleSize));
  });
});
