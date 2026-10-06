import { describe, expect, it } from "vitest";
import { US_FEDERAL_POSITIONS_PACK } from "../../../policy-pack-us-federal-positions";
import { createLawConsequenceRegistry } from "../../../law-consequence-registry";
import { FEDERAL_MANDATORY_MINIMUM_ROW } from ".";

describe("federal justice and rights law rows", () => {
  it("routes federal mandatory-minimum terms through the canonical sentence outcome", () => {
    const question = US_FEDERAL_POSITIONS_PACK.propositions?.find(
      (row) => row.key === "justice-rights.reduce-mandatory-minimums",
    );

    expect(question?.consequences).toEqual([FEDERAL_MANDATORY_MINIMUM_ROW]);
    expect(FEDERAL_MANDATORY_MINIMUM_ROW).toMatchObject({
      kind: "legal-outcome",
      when: "case-stage",
      who: { selector: "court.saved-defendant" },
      what: "minimum-custody-months",
      amount: { op: "term", key: "floor", unit: "months" },
      onRepeal: "preserve-completed",
    });
    expect(FEDERAL_MANDATORY_MINIMUM_ROW.evidence.uncertainty).toMatch(
      /No federal-prison population or crime change is inferred/,
    );
    expect(
      createLawConsequenceRegistry().handlers.get("legal-outcome")?.actions,
    ).toContain(FEDERAL_MANDATORY_MINIMUM_ROW.what);
  });

  it("does not represent an unsized stock-trading ban as a permission for people", () => {
    const question = US_FEDERAL_POSITIONS_PACK.propositions?.find(
      (row) => row.key === "government.ban-congressional-stock-trading",
    );

    expect(question?.consequences).toBeUndefined();
  });
});
