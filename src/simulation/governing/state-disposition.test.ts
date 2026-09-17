import { describe, expect, it } from "vitest";

import { makeIsoDate } from "../dates";
import { allStateGoverningDispositions } from "./state-disposition";

describe("all-fifty-state governing disposition", () => {
  it("has one explicit row per state, with unfinished work named", () => {
    const rows = allStateGoverningDispositions(makeIsoDate("2026-01-05"));
    expect(rows).toHaveLength(50);
    expect(new Set(rows.map((row) => row.stateUsps)).size).toBe(50);
    for (const row of rows) {
      if (row.termCalendar !== "verified")
        expect(row.unfinished.join(" ")).toMatch(/calendar/);
      if (!row.executiveAuthorityPack)
        expect(row.unfinished.join(" ")).toMatch(/legal powers/);
      if (!row.legislativeRulePack)
        expect(row.unfinished.join(" ")).toMatch(/legislature/);
    }
    const summary = {
      verifiedCalendar: rows
        .filter((r) => r.termCalendar === "verified")
        .map((r) => r.stateUsps),
      executivePacks: rows
        .filter((r) => r.executiveAuthorityPack)
        .map((r) => r.stateUsps),
      legislativePacks: rows
        .filter((r) => r.legislativeRulePack)
        .map((r) => r.stateUsps),
      governorQualificationStates: rows
        .filter((r) => r.governorQualificationFacts > 0)
        .map((r) => r.stateUsps),
    };
    console.info(`[governing disposition] ${JSON.stringify(summary)}`);
    expect(summary.verifiedCalendar).toEqual(["WA"]);
    expect([...summary.executivePacks].sort()).toEqual([
      "AK",
      "IL",
      "KY",
      "MN",
      "NE",
    ]);
  });
});
