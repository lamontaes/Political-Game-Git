import { describe, expect, it } from "vitest";
import limits from "../../../data/research/legislature/member-bill-limits-2026.json" with { type: "json" };

const PLACE_KEYS = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC",
  "PR",
  "GU",
  "VI",
  "AS",
  "MP",
].map((code) => `US-${code}`);

const CHAMBERS = ["house", "senate", "unicameral", "joint"] as const;
const PERIODS = ["session", "year", "biennium"] as const;
const SUBJECT_TOKENS = ["general-policy", "appropriation", "revenue"] as const;
const UNICAMERAL = ["US-NE", "US-DC", "US-GU", "US-VI"];

interface LimitRow {
  readonly place: string;
  readonly chamber: string;
  readonly limit: number | null;
  readonly period: string | null;
  readonly exempts: readonly string[];
  readonly unboundExemptions: readonly string[];
  readonly status: string;
  readonly citation: string;
  readonly url: string;
  readonly quote: string | null;
  readonly note: string | null;
}

/** A lookup that must exist: fails the test, and narrows the type, when it does not. */
function defined<T>(value: T | undefined, label: string): T {
  expect(value, label).toBeDefined();
  if (value === undefined) throw new Error(`${label} is missing`);
  return value;
}

const rows = limits.rows as unknown as readonly LimitRow[];
const withStatus = (status: string): readonly LimitRow[] =>
  rows.filter((row) => row.status === status);

describe("member bill limits research file", () => {
  it("names its version and the date it was read", () => {
    expect(limits.version).toBe("member-bill-limits-2026-v1");
    expect(limits.asOf).toBe("2026-10-01");
  });

  it("covers all 56 places, each with at least one row", () => {
    expect(PLACE_KEYS).toHaveLength(56);
    const present = new Set(rows.map((row) => row.place));
    for (const key of PLACE_KEYS) expect(present.has(key), key).toBe(true);
    for (const place of present) expect(PLACE_KEYS, place).toContain(place);
  });

  it("gives every row a known chamber, status, citation and subject tokens", () => {
    for (const row of rows) {
      const label = `${row.place} ${row.chamber}`;
      expect(CHAMBERS, label).toContain(row.chamber);
      expect(["sourced", "no-limit-found", "unread"], label).toContain(
        row.status,
      );
      expect(row.citation.length, label).toBeGreaterThan(0);
      expect(Array.isArray(row.unboundExemptions), label).toBe(true);
      for (const token of row.exempts) {
        expect(SUBJECT_TOKENS, label).toContain(token);
      }
    }
  });

  it("gives every sourced row a positive integer limit, a period and a short verbatim quote", () => {
    const sourced = withStatus("sourced");
    expect(sourced.length).toBeGreaterThan(0);
    for (const row of sourced) {
      const label = `${row.place} ${row.chamber} ${row.limit}`;
      expect(Number.isInteger(row.limit), label).toBe(true);
      expect(row.limit as number, label).toBeGreaterThan(0);
      expect(PERIODS, label).toContain(row.period);
      expect(row.url.startsWith("https://"), label).toBe(true);
      expect(row.citation.length, label).toBeGreaterThan(0);
      const quote = defined(row.quote ?? undefined, `${label} quote`);
      expect(quote.length, label).toBeGreaterThan(0);
      expect(quote.length, label).toBeLessThan(1200);
    }
  });

  it("says in a note how a biennium window is defined", () => {
    for (const row of rows.filter((entry) => entry.period === "biennium")) {
      const note = defined(row.note ?? undefined, `${row.place} note`);
      expect(note.toLowerCase(), row.place).toMatch(/two[- ]year|two calendar/);
    }
  });

  it("gives every no-limit-found row a null limit and the official rules url checked", () => {
    const none = withStatus("no-limit-found");
    expect(none.length).toBeGreaterThan(0);
    for (const row of none) {
      const label = `${row.place} ${row.chamber}`;
      expect(row.limit, label).toBeNull();
      expect(row.period, label).toBeNull();
      expect(row.url.startsWith("https://"), label).toBe(true);
    }
  });

  it("gives every unread row a null limit and a reason", () => {
    for (const row of withStatus("unread")) {
      const label = `${row.place} ${row.chamber}`;
      expect(row.limit, label).toBeNull();
      expect(
        defined(row.note ?? undefined, label).length,
        label,
      ).toBeGreaterThan(10);
    }
  });

  it("uses one unicameral row for one-chamber legislatures and two chamber rows elsewhere", () => {
    for (const place of PLACE_KEYS) {
      const chambers = new Set(
        rows.filter((row) => row.place === place).map((row) => row.chamber),
      );
      if (UNICAMERAL.includes(place)) {
        expect([...chambers], place).toContain("unicameral");
        expect(chambers.has("house") || chambers.has("senate"), place).toBe(
          false,
        );
      } else if (!chambers.has("joint")) {
        expect(chambers.has("house") && chambers.has("senate"), place).toBe(
          true,
        );
      }
    }
  });
});
