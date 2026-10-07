import { describe, expect, it } from "vitest";

import { JOB_MARKET_TIMING_ESTIMATE } from "./job-market";

describe("job market timings say where they come from", () => {
  it("are marked estimated with a source", () => {
    expect(JOB_MARKET_TIMING_ESTIMATE.provenance).toBe(
      "estimated-from-average",
    );
    expect(JOB_MARKET_TIMING_ESTIMATE.estimated).toBe(true);
    expect(JOB_MARKET_TIMING_ESTIMATE.estimatedFrom).toMatch(/Job Openings/);
  });
});
