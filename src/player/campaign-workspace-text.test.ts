import { describe, expect, it } from "vitest";

import {
  readableCampaignDate,
  splitEligibilityText,
} from "./CampaignWorkspace";

describe("campaign office text", () => {
  it("keeps a limitation visible, moves dated source bookkeeping to detail, and shows repeats once", () => {
    const observed =
      "NRS 218A.200 was observed in current source text on 2026-09-09; that later observation does not establish the rule on 2026-01-05.";
    const split = splitEligibilityText(
      `${observed} ${observed} This character is already running for something.`,
    );
    expect(split.reasons).toEqual([
      "This character is already running for something.",
    ]);
    expect(split.provenance).toEqual([observed]);
  });

  it("never turns an unresolved reason into an empty eligible status", () => {
    const split = splitEligibilityText(
      "Rule pack observed on 2026-09-09 does not establish the opening date.",
    );
    expect(split.reasons).toEqual([]);
    expect(split.provenance).toHaveLength(1);
  });

  it("writes stored dates the way a reader does and leaves other text alone", () => {
    expect(readableCampaignDate("2026-02-02")).toBe("February 2, 2026");
    expect(readableCampaignDate("decided 2026-11-03 at noon")).toBe(
      "decided November 3, 2026 at noon",
    );
    expect(readableCampaignDate("no date here")).toBe("no date here");
  });
});
