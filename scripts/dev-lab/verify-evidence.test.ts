import type { FullConfig } from "@playwright/test";
import { describe, expect, it } from "vitest";
import { sourceIdentity } from "./identity";
import verifyEvidence from "./verify-evidence";

describe("browser evidence teardown remains a failed gate", () => {
  it("fails when the served source identity no longer matches", async () => {
    const expectedIdentity = sourceIdentity();
    await expect(
      verifyEvidence({
        metadata: {
          expectedIdentity: { ...expectedIdentity, head: "0".repeat(40) },
          historicalEvidence: {},
        },
      } as unknown as FullConfig),
    ).rejects.toThrow(/head/);
  });

  it("fails when ordinary tests mutate historical evidence", async () => {
    const expectedIdentity = sourceIdentity();
    await expect(
      verifyEvidence({
        metadata: {
          expectedIdentity,
          historicalEvidence: { "docs/agent/evidence/sentinel": "changed" },
        },
      } as unknown as FullConfig),
    ).rejects.toThrow("Ordinary browser tests modified historical evidence");
  });
});
