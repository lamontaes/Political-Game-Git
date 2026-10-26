import { describe, expect, it } from "vitest";
import { inSurveyUniverse } from "./cause-activity-year";

describe("the cause-activity report's survey universe", () => {
  const person = (birthDate: string, alive = true, tier = "full") => ({
    alive,
    tier,
    birthDate,
  });

  it("counts a person by completed age on the day the year is measured", () => {
    // Born December 31, 2010: sixteen on December 31, 2026, so fifteen on
    // January 20, 2026, the case a subtraction of years let in.
    expect(inSurveyUniverse(person("2010-12-31"), "2026-01-20")).toBe(false);
    expect(inSurveyUniverse(person("2010-01-21"), "2026-01-20")).toBe(false);
    expect(inSurveyUniverse(person("2010-01-20"), "2026-01-20")).toBe(true);
    expect(inSurveyUniverse(person("2009-12-31"), "2026-01-20")).toBe(true);
  });

  it("leaves out the dead and the people who are no longer full", () => {
    expect(inSurveyUniverse(person("1980-05-01", false), "2026-01-20")).toBe(
      false,
    );
    expect(
      inSurveyUniverse(person("1980-05-01", true, "husk"), "2026-01-20"),
    ).toBe(false);
  });
});
