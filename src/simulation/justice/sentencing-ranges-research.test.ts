import { describe, expect, it } from "vitest";
import ranges from "../../../data/research/justice/sentencing-ranges-2026.json" with { type: "json" };
import { REPORTED_OFFENSE_PHRASE } from "../crime/contract";

interface RangeFields {
  readonly minMonths?: number;
  readonly maxMonths?: number | null;
  readonly maxLife?: boolean;
  readonly presumptiveMonths?: number;
  readonly citation: string;
  readonly source: string;
  readonly quote: string;
}
interface OffenseRow extends RangeFields {
  readonly offense: string;
  readonly class?: string;
}
interface PlaceRow {
  readonly name: string;
  readonly system: string;
  readonly basis: string;
  readonly classes: Readonly<Record<string, RangeFields>>;
  readonly offenses: Readonly<Record<string, OffenseRow>>;
  readonly pending?: readonly {
    readonly offenseKey: string;
    readonly reason: string;
  }[];
}

const places = ranges.places as unknown as Readonly<Record<string, PlaceRow>>;
const remaining = ranges.remaining as readonly {
  place: string;
  name: string;
  status: string;
}[];
const crimeKeys = Object.keys(REPORTED_OFFENSE_PHRASE).map(
  (offense) => `crime:${offense}`,
);

function wellFormedRange(row: RangeFields): void {
  expect(row.source).toMatch(/^https:\/\//);
  expect(row.citation.length).toBeGreaterThan(0);
  expect(row.quote.length).toBeGreaterThan(20);
  expect(row.minMonths).toBeGreaterThanOrEqual(0);
  if (row.maxLife) {
    expect(row.maxMonths).toBeNull();
    return;
  }
  expect(typeof row.maxMonths).toBe("number");
  expect(row.minMonths).toBeLessThanOrEqual(row.maxMonths as number);
  if (row.presumptiveMonths !== undefined) {
    expect(row.presumptiveMonths).toBeGreaterThanOrEqual(
      row.minMonths as number,
    );
    expect(row.presumptiveMonths).toBeLessThanOrEqual(row.maxMonths as number);
  }
}

/** The range a row resolves to: its own, or its class's from the place's table. */
function resolve(place: PlaceRow, row: OffenseRow): RangeFields {
  if (row.maxMonths !== undefined || row.maxLife) return row;
  expect(row.class, `${row.offense} names a class`).toBeDefined();
  const range = place.classes[row.class as string];
  expect(range, `class ${row.class} is in the classes table`).toBeDefined();
  return range;
}

describe("statutory sentencing ranges research (A103)", () => {
  it("accounts for all 56 places exactly once, read or listed as remaining", () => {
    const read = Object.keys(places);
    const left = remaining.map((row) => row.place);
    expect(read.length + left.length).toBe(56);
    expect(new Set([...read, ...left]).size).toBe(56);
    expect(ranges.coverage).toEqual({
      places: 56,
      sourced: read.length,
      estimatedFromAverage: 0,
      remaining: left.length,
    });
    for (const row of remaining) expect(row.status.length).toBeGreaterThan(0);
  });

  it("gives every read place a sourced range for each crime the game prosecutes", () => {
    expect(crimeKeys).toEqual(
      expect.arrayContaining([
        "crime:assault",
        "crime:robbery",
        "crime:burglary",
        "crime:vandalism",
      ]),
    );
    for (const [code, place] of Object.entries(places)) {
      expect(place.basis, code).toBe("SOURCED");
      const pending = new Set(
        (place.pending ?? []).map((row) => row.offenseKey),
      );
      for (const key of crimeKeys) {
        const row = place.offenses[key];
        if (!row) {
          expect(
            pending.has(key),
            `${code} ${key} is read or pending with a reason`,
          ).toBe(true);
          continue;
        }
        expect(row.source, `${code} ${key}`).toMatch(/^https:\/\//);
        expect(row.citation.length, `${code} ${key}`).toBeGreaterThan(0);
        expect(row.quote.length, `${code} ${key}`).toBeGreaterThan(20);
        wellFormedRange(resolve(place, row));
      }
      for (const range of Object.values(place.classes)) wellFormedRange(range);
    }
  });

  it("defines every offense key the game prosecutes, including the one not yet read", () => {
    for (const key of [...crimeKeys, "campaign-funds-personal-use"]) {
      expect(Object.keys(ranges.offenseDefinitions)).toContain(key);
    }
  });
});
