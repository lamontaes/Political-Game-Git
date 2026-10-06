import { describe, expect, it } from "vitest";

import { MOGUL_OFFERS_ESTIMATE } from "./moguls";

describe("mogul offer rates say where they come from", () => {
  it("are marked estimated with a source", () => {
    expect(MOGUL_OFFERS_ESTIMATE.provenance).toBe("estimated-from-average");
    expect(MOGUL_OFFERS_ESTIMATE.estimated).toBe(true);
    expect(MOGUL_OFFERS_ESTIMATE.estimatedFrom.length).toBeGreaterThan(10);
  });
});
