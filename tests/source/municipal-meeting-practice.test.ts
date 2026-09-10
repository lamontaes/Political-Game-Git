import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import declarations from "../../data/source/municipal-governance/meeting-practice/declarations.json";
import {
  MEETING_PRACTICE_FIXTURE,
  renderMunicipalMeetingPractice,
} from "../../scripts/source/municipal-meeting-practice";
import {
  municipalGovernmentByKey,
  municipalPublicMeetingSeries,
  municipalMeetingReading,
  lawReading,
} from "../../src/simulation/municipal-government";

describe("dated municipal meeting references stay distinct from legal authority", () => {
  it("replays every declared source through the existing municipal fixture compiler", () => {
    expect(renderMunicipalMeetingPractice()).toBe(
      readFileSync(MEETING_PRACTICE_FIXTURE, "utf8"),
    );
    for (const row of declarations.candidates) {
      const government = municipalGovernmentByKey(row.governmentKey)!;
      const reference = government.readings.find(
        (reading) => reading.evidence === "reference-observation",
      )!;
      expect(reference).toBeDefined();
      expect(reference.powers).toEqual([]);
      expect(reference.form).toBeNull();
      expect(reference.procedure.passageText).toBeNull();
      const active = municipalPublicMeetingSeries(government).find(
        (series) => series.seriesKey === row.seriesKey,
      );
      if (
        "currentApplicability" in row &&
        row.currentApplicability === "UNKNOWN"
      )
        expect(active).toBeUndefined();
      else expect(active?.publicAttendance?.openToPublic).toBe(true);
      expect(lawReading(government)?.evidence).not.toBe(
        "reference-observation",
      );
    }
  });
  it("refuses a quotation that the captured source does not contain", () => {
    const corrupt = structuredClone(declarations);
    corrupt.candidates[0]!.quotes[0] =
      "Unestablished authority invented for this negative control.";
    expect(() => renderMunicipalMeetingPractice(corrupt)).toThrow(
      /excerpt missing/,
    );
  });
  it("keeps public caucus comment denial separate from formal-session access", () => {
    const government = municipalGovernmentByKey("us-nj-jersey-city")!;
    const series = municipalPublicMeetingSeries(government);
    expect(
      series.find((row) => row.seriesKey === "regular")!.publicAttendance!
        .publicCommentOffered,
    ).toBe(true);
    expect(
      series.find((row) => row.seriesKey === "caucus")!.publicAttendance!
        .publicCommentOffered,
    ).toBe(false);
    expect(
      series.find((row) => row.seriesKey === "caucus")!.publicAttendance!.note,
    ).toContain("Closed caucuses");
  });
  it("does not invent a current rule from Cincinnati's mixed publication dates", () => {
    const government = municipalGovernmentByKey("us-oh-cincinnati")!;
    expect(
      municipalMeetingReading(government, "regular").meetingSeries[0]!
        .publicAttendance,
    ).toBeNull();
    const reading = government.readings.find(
      (row) => row.evidence === "reference-observation",
    )!;
    expect(
      reading.facts.some(
        (fact) =>
          fact.state === "UNKNOWN" &&
          fact.reason?.includes("Conflicting document timing"),
      ),
    ).toBe(true);
    expect(
      reading.facts.some(
        (fact) =>
          typeof fact.value === "string" && fact.value.includes("Updated"),
      ),
    ).toBe(true);
  });
});
