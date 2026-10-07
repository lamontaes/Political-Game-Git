import { describe, expect, it } from "vitest";

import { LOCAL_BUSINESS_ESTIMATE } from "./recorded-employer";

describe("the local business fallback wage says where it comes from", () => {
  it("is marked designed with what it reads and balances", () => {
    expect(LOCAL_BUSINESS_ESTIMATE.provenance).toBe("designed");
    expect(LOCAL_BUSINESS_ESTIMATE.rationale).toMatch(/reads .* balances/);
  });
});
