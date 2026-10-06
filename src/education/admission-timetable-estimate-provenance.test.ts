import { describe, expect, it } from "vitest";

import {
  ADMISSION_DECISION_DAYS,
  ADMISSION_TIMETABLE_ESTIMATE,
  COLLEGE_FALL_TERM_START,
} from "./study-provider";

describe("the admission timetable says where it comes from", () => {
  it("is marked estimated from the average and names its research key", () => {
    expect(ADMISSION_TIMETABLE_ESTIMATE.provenance).toBe(
      "estimated-from-average",
    );
    expect(ADMISSION_TIMETABLE_ESTIMATE.estimated).toBe(true);
    expect(ADMISSION_TIMETABLE_ESTIMATE.researchQuestionId).toBe(
      "when-college-applications-are-decided-and-terms-begin",
    );
    expect(ADMISSION_DECISION_DAYS).toBe(45);
    expect(COLLEGE_FALL_TERM_START).toEqual({ month: 8, day: 25 });
  });
});
