import { describe, expect, it } from "vitest";

import { GOAL_PURSUIT_ESTIMATE } from "./people-goal-pursuit-content";

describe("goal pursuit pacing says where it comes from", () => {
  it("is marked estimated with a source", () => {
    expect(GOAL_PURSUIT_ESTIMATE.provenance).toBe("estimated-from-average");
    expect(GOAL_PURSUIT_ESTIMATE.estimated).toBe(true);
    expect(GOAL_PURSUIT_ESTIMATE.estimatedFrom).toMatch(/66/);
  });
});
