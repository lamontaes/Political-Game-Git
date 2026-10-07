import { describe, expect, it } from "vitest";
import { ESTIMATED_RECORD_IN_OFFICE } from "./record-in-office";

describe("record-in-office estimate metadata", () => {
  it("records its game-scale basis", () => {
    expect(ESTIMATED_RECORD_IN_OFFICE).toMatchObject({
      estimated: true,
      provenance: "estimated-from-recorded-campaign-weights",
      estimatedFrom: expect.stringContaining("campaigns.ts"),
    });
  });
});
