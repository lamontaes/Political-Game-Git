import { describe, expect, it } from "vitest";
import readiness from "../../data/research/laws/lw08-effect-readiness.json";
import termsBatch from "../../data/research/laws/catalog-terms-batch-03.json";
import { loadedPolicyRegistry } from "./policy-pack-registry";

const UNSUPPORTED_QUESTIONS = [
  "us-policy-positions:business-commerce.cap-development-incentives",
  "us-policy-positions:technology-privacy.consumer-data-privacy-law",
] as const;

describe("LW-08 effect readiness", () => {
  it("records supported curriculum and library paths without claiming their linked outcomes", () => {
    expect(readiness.batch).toBe("LW-08");
    expect(readiness.status).toBe("partial-with-unsupported-outcomes-recorded");
    expect(readiness.runtimeActivation).toBe(false);
    for (const questionKey of readiness.supportedQuestionKeys) {
      const proposition = loadedPolicyRegistry().propositions.find(
        (candidate) => candidate.stableKey === questionKey,
      );
      expect(proposition?.consequences?.length).toBeGreaterThan(0);
    }
  });

  it("keeps the development incentive cap unsupported until both terms have sources", () => {
    const questionKey = UNSUPPORTED_QUESTIONS[0];
    const terms = termsBatch.laws.find(
      (entry) => entry.questionKey === questionKey,
    );
    expect(
      terms?.parameters.map((parameter) => parameter.selectableRange.status),
    ).toEqual(["needs-research", "needs-research"]);
    expect(terms?.currentLawSource.status).toBe(
      "missing-starting-row-research-required",
    );
    expect(
      readiness.entries.find((entry) => entry.questionKey === questionKey)
        ?.blockers.length,
    ).toBeGreaterThan(0);
  });

  it("records consumer privacy as unsupported without adding a person-level effect", () => {
    const questionKey = UNSUPPORTED_QUESTIONS[1];
    const proposition = loadedPolicyRegistry().propositions.find(
      (candidate) => candidate.stableKey === questionKey,
    );
    expect(proposition?.consequences ?? []).toEqual([]);
    const entry = readiness.entries.find(
      (candidate) => candidate.questionKey === questionKey,
    );
    expect(entry?.source.trim()).not.toBe("");
    expect(entry?.blockers.length).toBeGreaterThan(0);
  });

  it("keeps both unsupported outcomes inactive and evidence-backed", () => {
    expect(readiness.entries.map((entry) => entry.questionKey)).toEqual(
      UNSUPPORTED_QUESTIONS,
    );
    for (const entry of readiness.entries) {
      expect(entry.evidenceStatus).not.toBe("built");
      expect(entry.source.trim()).not.toBe("");
      expect(entry.blockers.every((blocker) => blocker.trim().length > 0)).toBe(
        true,
      );
    }
  });
});
