import { describe, expect, it } from "vitest";

import { CLEMENCY_CALENDAR_ESTIMATE } from "./clemency-reasoning";

describe("the clemency calendar says where it comes from", () => {
  it("is marked estimated with a source", () => {
    expect(CLEMENCY_CALENDAR_ESTIMATE.provenance).toBe(
      "estimated-from-average",
    );
    expect(CLEMENCY_CALENDAR_ESTIMATE.estimated).toBe(true);
    expect(CLEMENCY_CALENDAR_ESTIMATE.estimatedFrom.length).toBeGreaterThan(10);
  });
});
