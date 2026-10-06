import { describe, expect, it } from "vitest";

import {
  ADMISSION_DECISION_DAYS,
  ADMISSION_TIMETABLE_ESTIMATE,
  COLLEGE_FALL_TERM_START,
} from "./study-provider";

describe("the admission timetable says where it comes from", () => {
  it("is marked designed with a rationale and names its research key", () => {
    expect(ADMISSION_TIMETABLE_ESTIMATE.provenance).toBe("designed");
    expect(ADMISSION_TIMETABLE_ESTIMATE.estimated).toBe(false);
    expect(ADMISSION_TIMETABLE_ESTIMATE.rationale).toMatch(/reads .* balances/);
    expect(ADMISSION_TIMETABLE_ESTIMATE.researchQuestionId).toBe(
      "when-college-applications-are-decided-and-terms-begin",
    );
    expect(ADMISSION_DECISION_DAYS).toBe(45);
    expect(COLLEGE_FALL_TERM_START).toEqual({ month: 8, day: 25 });
  });
});
