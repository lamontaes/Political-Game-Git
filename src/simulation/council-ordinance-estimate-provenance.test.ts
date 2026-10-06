import { describe, expect, it } from "vitest";

import {
  COUNCIL_ORDINANCE_ESTIMATE,
  councilOpeningNumber,
} from "./measure-numbering";

describe("the council ordinance pace says where it comes from", () => {
  it("is marked estimated from the average and names its research key", () => {
    expect(COUNCIL_ORDINANCE_ESTIMATE.provenance).toBe(
      "estimated-from-average",
    );
    expect(COUNCIL_ORDINANCE_ESTIMATE.estimated).toBe(true);
    expect(COUNCIL_ORDINANCE_ESTIMATE.researchQuestionId).toBe(
      "local-council-legislative-volume",
    );
    expect(councilOpeningNumber("2026-01-02")).toBe(1);
  });
});
