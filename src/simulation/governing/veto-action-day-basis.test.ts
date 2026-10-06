import { describe, expect, it } from "vitest";
import windows from "../../../data/research/laws/veto-windows-2023.json";
import {
  vetoWindowDayBasisFor,
  legislatureProfilePack,
} from "../legislature-game-profile";
import { assertRulePackIntegrity } from "../legislature-rules";

describe("profile veto day counting from recorded Table 3.16 cells", () => {
  it("retains each row's Sunday exception and source provenance", () => {
    for (const row of windows.rows) {
      const basis = vetoWindowDayBasisFor(`US-${row.usps}`, false);
      expect(basis.kind).toBe("known");
      if (basis.kind !== "known") throw new Error("Missing table day basis");
      expect(basis.value).toBe(
        row.table.duringSession.includes("(q)")
          ? "CALENDAR"
          : "SUNDAYS_EXCEPTED",
      );
      expect(basis.source.verification).toBe("game-profile");
      expect(basis.source.note).toContain("Table 3.16");
      expect(basis.source.note).toContain(row.table.duringSession);
      const pack = legislatureProfilePack(`US-${row.usps}`, row.name);
      if (pack) {
        assertRulePackIntegrity(pack);
        expect(pack.executive.actionWindowDayBasisInSession).toEqual(basis);
      }
    }
  });

  it("marks an absent post-adjournment cell as an estimate from recorded observations", () => {
    const missing = windows.rows.find(
      (row) =>
        !row.table.afterSessionBecomesLawUnlessVetoed &&
        !row.table.afterSessionDiesUnlessSigned,
    )!;
    expect(missing).toBeDefined();
    const basis = vetoWindowDayBasisFor(`US-${missing.usps}`, true);
    expect(basis.kind).toBe("known");
    if (basis.kind !== "known") throw new Error("Missing estimated day basis");
    expect(basis.source.note).toContain("ESTIMATED");
    expect(basis.source.verification).toBe("game-profile");
  });
});
