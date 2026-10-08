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
    const studentDebt = readiness.entries.find(
      (entry) =>
        entry.questionKey ===
        "us-federal-positions:education.forgive-student-loans",
    );
    expect(studentDebt?.blockers).toContain(
      "The poverty link is about-zero because debt relief is not money income. The canonical student-debt writer creates named federal student loans, and the household-loan ledger supports recorded noncash discharges, but no law consequence dispatches enacted forgiveness terms to those records.",
    );
    expect(studentDebt?.existingRuntimePieces).toEqual([
      "src/simulation/student-debt.ts#financeRecordedStudentTuition",
      "src/simulation/household-loans.ts#recordLoanDischarge",
    ]);
    expect(studentDebt?.termReaderGaps).toEqual([
      "The catalog assigns cap unit usd-forgiven-per-borrower, but this unit is absent from LAW_AMOUNT_UNITS, which readFinalEnactedLawTerm requires.",
      "The eligibility parameter has no allowed-values vocabulary for the final-law category reader.",
    ]);
  });
});
