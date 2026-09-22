import { describe, expect, it } from "vitest";

import {
  readableCampaignDate,
  splitEligibilityText,
} from "./CampaignWorkspace";

describe("campaign office text", () => {
  it("shows every reason once, and hides none of them", () => {
    const refusal =
      "You can't run for office in Nebraska this early. A life that starts later may be able to run here.";
    const split = splitEligibilityText(
      `${refusal} This character is already running for something.`,
    );
    expect(split.reasons).toEqual([
      "You can't run for office in Nebraska this early.",
      "A life that starts later may be able to run here.",
      "This character is already running for something.",
    ]);
  });

  it("says a repeated reason once", () => {
    const sentence = "This character is already running for something.";
    expect(splitEligibilityText(`${sentence} ${sentence}`).reasons).toEqual([
      sentence,
    ]);
  });

  it("writes stored dates the way a reader does and leaves other text alone", () => {
    expect(readableCampaignDate("2026-02-02")).toBe("February 2, 2026");
    expect(readableCampaignDate("decided 2026-11-03 at noon")).toBe(
      "decided November 3, 2026 at noon",
    );
    expect(readableCampaignDate("no date here")).toBe("no date here");
  });
});
