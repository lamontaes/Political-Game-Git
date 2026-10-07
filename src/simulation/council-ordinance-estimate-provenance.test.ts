import { describe, expect, it } from "vitest";

import {
  COUNCIL_ORDINANCE_ESTIMATE,
  councilOpeningNumber,
} from "./measure-numbering";

describe("the council ordinance pace says where it comes from", () => {
  it("is marked designed with what it reads and balances, and names its research key", () => {
    expect(COUNCIL_ORDINANCE_ESTIMATE.provenance).toBe("designed");
    expect(COUNCIL_ORDINANCE_ESTIMATE.rationale).toMatch(/reads .* balances/);
    expect(COUNCIL_ORDINANCE_ESTIMATE.researchQuestionId).toBe(
      "local-council-legislative-volume",
    );
    expect(councilOpeningNumber("2026-01-02")).toBe(1);
  });
});
