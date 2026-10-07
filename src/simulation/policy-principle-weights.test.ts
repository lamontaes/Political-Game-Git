import { describe, expect, it } from "vitest";
import { loadPolicyPacks } from "./policy-packs";
import { US_POLICY_POSITIONS_PACK } from "./policy-pack-us-policy-positions";
import { US_STATE_AND_LOCAL_POLICY_PACK } from "./policy-pack-us-state-and-local";
function load(weight?: number) {
  const row = US_POLICY_POSITIONS_PACK.propositions![0]!;
  return loadPolicyPacks([
    US_STATE_AND_LOCAL_POLICY_PACK,
    {
      ...US_POLICY_POSITIONS_PACK,
      propositions: [
        {
          ...row,
          principles: [
            {
              principle: "collective-provision",
              bearing: "consistent-with",
              ...(weight === undefined ? {} : { weight }),
            },
          ],
        },
      ],
    },
  ]);
}
describe("law-specific principle relevance", () => {
  it("admits the health positions with their authored weight and canonical principle", () => {
    const loaded = loadPolicyPacks([
      US_STATE_AND_LOCAL_POLICY_PACK,
      US_POLICY_POSITIONS_PACK,
    ]);
    expect(loaded.report.rejections).toEqual([]);
    const law = loaded.propositions.find(
      (p) =>
        p.stableKey ===
        "us-policy-positions:health-human-services.expand-medicaid-eligibility",
    )!;
    const principle = loaded.principles.find(
      (p) => p.stableKey === "us-policy-positions:collective-provision",
    )!;
    expect(
      law.principles?.find((p) => p.principleId === principle.id)?.weight,
    ).toBe(0.95);
  });
  it("preserves zero, fractional and full weights in the canonical catalog", () => {
    for (const weight of [0, 0.35, 1]) {
      const loaded = load(weight);
      expect(loaded.report.rejections).toEqual([]);
      expect(loaded.propositions[0]!.principles![0]!.weight).toBe(weight);
    }
  });
  it("preserves omitted legacy relevance without inventing a different weight", () => {
    expect(load().propositions[0]!.principles![0]!.weight).toBeUndefined();
  });
  it("rejects invalid weights instead of silently dropping or clamping them", () => {
    for (const weight of [-0.01, 1.01, NaN, Infinity]) {
      const loaded = load(weight);
      expect(loaded.propositions).toHaveLength(0);
      expect(loaded.report.rejections[0]!.reason).toContain(
        "finite number from 0 to 1",
      );
    }
  });
});
