/**
 * A dated starting-law row ends when the next phase starts, never in a gap:
 * the latest phase of every law stays in force until a law changes it. The
 * federal income tax, Social Security tax and state income tax schedules
 * published for 2026 kept being withheld after January 1, 2027 (the
 * three-year trace of the played world found withholding falling to
 * Medicare only).
 */
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import startingLaw from "./data/laws/starting-law.json" with { type: "json" };
import {
  lawChainForPlace,
  startingLawRows,
  type StartingLawRow,
} from "./laws-starting";
import { resolveLawInForce } from "./laws-in-force";
import { withholdingFor } from "./tax-withholding";
import { searchCorePlaces, corePlaceStateIdentities } from "./place-lookup";

const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`laws-carry:${Date.now()}`).digest("hex");
function pick<T>(list: readonly T[], salt: string): T {
  const hash = createHash("sha256").update(`${seed}:${salt}`).digest("hex");
  return list[parseInt(hash.slice(0, 8), 16) % list.length]!;
}

const jurisdictions = (
  startingLaw as unknown as {
    jurisdictions: Record<string, readonly StartingLawRow[]>;
  }
).jurisdictions;

describe("starting law carries forward until a law changes it", () => {
  it("every row with an end date is followed by a phase starting that day", () => {
    const gaps: string[] = [];
    for (const [jurisdiction, rows] of Object.entries(jurisdictions))
      for (const row of rows) {
        if (row.endDate === null) continue;
        const next = rows.some(
          (other) =>
            other.series === row.series &&
            other.level === row.level &&
            other.tier === row.tier &&
            other.effectiveDate === row.endDate,
        );
        if (!next)
          gaps.push(`${jurisdiction} ${row.series} ${row.tier} ${row.endDate}`);
      }
    expect(gaps).toEqual([]);
  });

  it("income tax and Social Security are still withheld years after the opening, in a random place", () => {
    const state = pick(
      [...corePlaceStateIdentities()].map((s) => s.jurisdictionKey).sort(),
      "state",
    );
    const places = [
      ...searchCorePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state,
        scope: "locality",
      }),
    ].sort((a, b) => a.key.localeCompare(b.key));
    const place =
      process.env.GOLDEN_PATH_PLACE_KEY ?? pick(places, "place").key;
    const chain = lawChainForPlace(place);
    const rows = startingLawRows(chain);
    const law = (series: string, date: string) =>
      resolveLawInForce({
        series,
        chain,
        date,
        rows: rows.filter((r) => r.series === series),
      });
    for (const date of ["2027-01-01", "2029-06-15"]) {
      const lines = withholdingFor({
        // Two weeks of pay at $80,000 a year.
        paidMinor: 306_849,
        periodDays: 14,
        yearToDateMinor: 0,
        incomeTax: law("income-tax", date),
        socialSecurity: law("social-security-tax", date),
        medicare: law("medicare-tax", date),
      });
      const label = `${place} (${state}), seed ${seed}, ${date}`;
      expect(
        lines.some((l) => l.tax === "income"),
        label,
      ).toBe(true);
      expect(
        lines.some((l) => l.lawId.includes(":social-security-tax:")),
        label,
      ).toBe(true);
      // The rate in force is the latest one published, carried forward.
      expect(law("income-tax", date).levels[0]!.row?.id, label).toBe(
        law("income-tax", "2026-06-15").levels[0]!.row?.id,
      );
    }
  });
});
