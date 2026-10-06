import { describe, expect, it } from "vitest";

import { LOCAL_BUSINESS_ESTIMATE } from "./recorded-employer";

describe("the local business fallback wage says where it comes from", () => {
  it("is marked estimated with a source", () => {
    expect(LOCAL_BUSINESS_ESTIMATE.provenance).toBe("estimated-from-average");
    expect(LOCAL_BUSINESS_ESTIMATE.estimated).toBe(true);
    expect(LOCAL_BUSINESS_ESTIMATE.estimatedFrom.length).toBeGreaterThan(10);
  });
});
