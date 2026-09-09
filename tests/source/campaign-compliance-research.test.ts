import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { compileCampaignComplianceResearchTransport } from "../../src/source/domains/campaign-compliance-research/index";

const PATH = resolve(
  import.meta.dirname,
  "../../docs/research/92M-campaign-finance-ethics-lobbying.json",
);

describe("92M campaign-compliance research transport", () => {
  it("compiles every jurisdiction and field without promoting the synthesis", () => {
    const bytes = readFileSync(PATH);
    expect(createHash("sha256").update(bytes).digest("hex")).toBe(
      "49c5bd015b071dc888ce7ab31cf9336483b6f006690699ebc7bab427d1551a31",
    );
    const compiled = compileCampaignComplianceResearchTransport(bytes);
    expect(compiled.recordCount).toBe(1_020);
    expect(new Set(compiled.claims.map((claim) => claim.jurisdictionId)).size).toBe(51);
    expect(new Set(compiled.claims.map((claim) => claim.field)).size).toBe(20);
    expect(
      compiled.claims.filter((claim) => claim.status === "KNOWN"),
    ).toHaveLength(989);
    expect(
      compiled.claims.filter((claim) => claim.status === "NOT_APPLICABLE"),
    ).toHaveLength(31);
    expect(
      compiled.claims.every(
        (claim) =>
          claim.productionStatus === "staged-secondary-research" &&
          claim.blockedReason.includes("not a locked publisher URL"),
      ),
    ).toBe(true);
  });

  it("refuses a field whose incomplete row instead of supplying a default", () => {
    const original = JSON.parse(readFileSync(PATH, "utf-8")) as {
      jurisdictions: Record<
        string,
        { rules: Record<string, Record<string, unknown>> }
      >;
    };
    delete original.jurisdictions["us-ky"]!.rules.contribution_limits!
      .official_source;
    expect(() =>
      compileCampaignComplianceResearchTransport(
        Buffer.from(JSON.stringify(original)),
      ),
    ).toThrow(/official_source must be a non-empty string/);
  });
});
