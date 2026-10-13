/**
 * PW-5 step 1: the term and election rules are data, one row per state or
 * territory and office kind, every field tagged and cited; the take-office
 * rule turns into a date after the election in a randomly drawn place.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import rules from "./data/elections/term-rules.json" with { type: "json" };
import { takeOfficeDate, type TermRuleRow } from "./term-rules";
import { novemberGeneralElectionDay } from "./gov-rules/town-election-calendar";

const rows = (rules as unknown as { rows: TermRuleRow[]; kinds: string[] })
  .rows;
const kinds = (rules as unknown as { kinds: string[] }).kinds;
const states = [...new Set(rows.map((r) => r.state))].sort();
const seed =
  process.env.GOLDEN_PATH_SEED ??
  createHash("sha256").update(`term-rules:${Date.now()}`).digest("hex");
const pick = <T>(list: readonly T[], salt: string): T =>
  list[
    parseInt(
      createHash("sha256").update(`${seed}:${salt}`).digest("hex").slice(0, 8),
      16,
    ) % list.length
  ]!;
const FIELDS = [
  "termYears",
  "stagger",
  "cycle",
  "electionDay",
  "primary",
  "filing",
  "takeOffice",
] as const;

describe("PW-5 term and election rules for all 56 places", () => {
  it("has one row per place and office kind, each field tagged and cited", () => {
    expect(states).toHaveLength(56);
    expect(rows).toHaveLength(56 * kinds.length);
    for (const state of states)
      for (const kind of kinds) {
        const row = rows.find((r) => r.id === `${state}:${kind}`);
        expect(row, `${state}:${kind}`).toBeDefined();
        if (!row!.applies) {
          expect(row!.citation, row!.id).toBeTruthy();
          continue;
        }
        for (const field of FIELDS) {
          const value = row![field] as
            { tag: string; citation: string; spread?: unknown } | undefined;
          expect(value, `${row!.id} ${field}`).toBeDefined();
          expect(["SOURCED", "ESTIMATED"]).toContain(value!.tag);
          expect(value!.citation.length, `${row!.id} ${field}`).toBeGreaterThan(
            10,
          );
        }
        // An estimated take-office day carries its spread.
        if (row!.takeOffice!.tag === "ESTIMATED")
          expect(row!.takeOffice!.spread, row!.id).toBeDefined();
      }
  });

  it("matches the compiler's output from the research files", () => {
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/research/compile-term-rules.ts", "--check"],
      { stdio: "pipe" },
    );
  });

  it("dates the federal terms by the Constitution", () => {
    const election = novemberGeneralElectionDay(2028);
    const president = rows.find((r) => r.id === "US-DC:president")!;
    expect(takeOfficeDate(president, election)).toBe("2029-01-20");
    const house = rows.find(
      (r) => r.id === `${pick(states, "house")}:us-house`,
    )!;
    expect(takeOfficeDate(house, novemberGeneralElectionDay(2026))).toBe(
      "2027-01-03",
    );
  });

  it("puts every take-office day after the election and within its spread of a season", () => {
    // A random place, every kind it has; the place and seed are printed.
    const state = pick(states, "state");
    console.log(`term rules: ${state}, seed ${seed}`);
    for (const row of rows.filter((r) => r.state === state && r.applies))
      for (const year of [2026, 2027, 2028]) {
        const election = novemberGeneralElectionDay(year);
        const start = takeOfficeDate(row, election);
        const days =
          (Date.parse(`${start}T00:00:00Z`) -
            Date.parse(`${election}T00:00:00Z`)) /
          86_400_000;
        expect(days, `${row.id} ${year}: ${start}`).toBeGreaterThan(0);
        expect(days, `${row.id} ${year}: ${start}`).toBeLessThan(90);
      }
  });
});

describe("PW-5 day rules", () => {
  it("reads each primary rule kind the nomination research uses", async () => {
    const { dayInYear } = await import("./term-rules");
    // The second Tuesday after the first Monday in September, 2026.
    expect(
      dayInYear(
        {
          kind: "weekday-after",
          month: 9,
          weekday: 2,
          anchorWeekday: 1,
          anchorNth: 1,
          ordinal: 2,
        },
        2026,
      ),
    ).toBe("2026-09-15");
    // 140 days before the 2026 general election (November 3).
    expect(dayInYear({ kind: "days-before-general", days: 140 }, 2026)).toBe(
      "2026-06-16",
    );
    // The Tuesday before the last Monday in May (Memorial Day), 2026.
    expect(
      dayInYear(
        { kind: "nth-weekday", month: 5, weekday: 1, nth: -1, offsetDays: -6 },
        2026,
      ),
    ).toBe("2026-05-19");
  });
});
