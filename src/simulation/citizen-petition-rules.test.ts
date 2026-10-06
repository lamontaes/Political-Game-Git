import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { municipalCitizenPetitionRule } from "./citizen-petition-rules";

describe("municipal citizen petition rules", () => {
  const world = createDemoWorld("municipal-petition-rule-readings");

  it("uses the compiled initiative form and marks median window fallback as an estimate", () => {
    const rule = municipalCitizenPetitionRule(
      world,
      "us-ne-grand-island",
      "local-initiative",
    );

    expect(rule).toMatchObject({
      available: true,
      form: "indirect-council-first",
      thresholdBasis: "compiled",
      circulationBasis: "estimated",
      distribution: { basis: "estimated" },
      review: { kind: "clerk-checks-voter-eligibility" },
    });
    expect(rule.threshold).toMatchObject({ base: "registered-voters" });
    expect(rule.circulationDays).toBeGreaterThan(0);
  });

  it("explains in plain words when compiled law prohibits an initiative", () => {
    const rule = municipalCitizenPetitionRule(
      world,
      "us-ia-cedar-rapids",
      "local-initiative",
    );

    expect(rule).toMatchObject({
      available: false,
      form: "prohibited",
      reason: "State general law authorizes no citizen ordinance initiative.",
    });
  });
});
