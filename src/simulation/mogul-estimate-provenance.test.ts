import { describe, expect, it } from "vitest";

import { MOGUL_OFFERS_ESTIMATE } from "./moguls";

describe("mogul offer rates say where they come from", () => {
  it("are marked designed with what they read and balance", () => {
    expect(MOGUL_OFFERS_ESTIMATE.provenance).toBe("designed");
    expect(MOGUL_OFFERS_ESTIMATE.rationale).toMatch(/reads .* balances/);
  });
});
