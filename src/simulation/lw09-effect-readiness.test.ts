import { describe, expect, it } from "vitest";
import readiness from "../../data/research/laws/lw09-effect-readiness.json";

const LW09_QUESTIONS = [
  "us-policy-positions:technology-privacy.age-verification-for-social-media",
  "us-federal-positions:immigration.admit-more-immigrants",
  "us-federal-positions:education.forgive-student-loans",
  "us-federal-positions:emergencies.states-share-disaster-costs",
] as const;

describe("LW-09 effect readiness", () => {
  it("keeps unsupported consequences disabled and identifies each concrete blocker", () => {
    expect(readiness.batch).toBe("LW-09");
    expect(readiness.runtimeActivation).toBe(false);
    expect(readiness.status).toBe("research-and-record-seams-required");
    expect(readiness.entries.map((entry) => entry.questionKey)).toEqual(
      LW09_QUESTIONS,
    );
    for (const entry of readiness.entries) {
      expect(entry.evidenceStatus).not.toBe("built");
      expect(entry.blockers.length).toBeGreaterThan(0);
      expect(entry.blockers.every((blocker) => blocker.trim().length > 0)).toBe(
        true,
      );
    }
  });
});
