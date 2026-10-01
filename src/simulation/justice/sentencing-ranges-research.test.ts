import { describe, expect, it } from "vitest";
import ranges from "../../../data/research/justice/sentencing-ranges-2026.json" with { type: "json" };
import { REPORTED_OFFENSE_PHRASE } from "../crime/contract";

const SOURCED = "SOURCED";
const ESTIMATED = "ESTIMATED FROM AVERAGE";

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
  readonly basis?: string;
  readonly method?: string;
  readonly fedByMin?: readonly string[];
  readonly fedByMax?: readonly string[];
}
interface PlaceRow {
  readonly name: string;
  readonly system: string;
  readonly basis: string;
  readonly unreadReason?: string;
  readonly classes: Readonly<Record<string, RangeFields>>;
  readonly offenses: Readonly<Record<string, OffenseRow>>;
  readonly pending?: readonly unknown[];
}

/** A lookup that must exist: fails the test, and narrows the type, when it does not. */
function defined<T>(value: T | undefined, label: string): T {
  expect(value, label).toBeDefined();
  if (value === undefined) throw new Error(`${label} is missing`);
  return value;
}

const places = ranges.places as unknown as Readonly<Record<string, PlaceRow>>;
const crimeKeys = Object.keys(REPORTED_OFFENSE_PHRASE).map(
  (offense) => `crime:${offense}`,
);
const sourcedCodes = Object.keys(places).filter(
  (code) => defined(places[code], code).basis === SOURCED,
);
const estimatedCodes = Object.keys(places).filter(
  (code) => defined(places[code], code).basis === ESTIMATED,
);

function wellFormedRange(row: RangeFields): void {
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

function wellSourced(row: RangeFields, label: string): void {
  expect(row.source, label).toMatch(/^https:\/\//);
  expect(row.citation.length, label).toBeGreaterThan(0);
  expect(row.quote.length, label).toBeGreaterThan(20);
  expect(row.quote.length, label).toBeLessThan(1200);
}

/** The range a row resolves to: its own, or its class's from the place's table. */
function resolve(place: PlaceRow, row: OffenseRow): RangeFields {
  if (row.maxMonths !== undefined || row.maxLife) return row;
  expect(row.class, `${row.offense} names a class`).toBeDefined();
  return defined(
    place.classes[row.class as string],
    `class ${row.class} is in the classes table`,
  );
}

function mean(values: readonly number[]): number {
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

describe("statutory sentencing ranges research (A103)", () => {
  it("covers all 56 places, each sourced or estimated from average, with none left unread", () => {
    expect(Object.keys(places)).toHaveLength(56);
    expect(ranges.remaining).toEqual([]);
    expect(sourcedCodes.length + estimatedCodes.length).toBe(56);
    expect(ranges.coverage).toEqual({
      places: 56,
      sourced: sourcedCodes.length,
      estimatedFromAverage: estimatedCodes.length,
      remaining: 0,
    });
  });

  it("gives every sourced place a cited, quoted range for each crime the game prosecutes", () => {
    expect(crimeKeys).toEqual(
      expect.arrayContaining([
        "crime:assault",
        "crime:robbery",
        "crime:burglary",
        "crime:vandalism",
      ]),
    );
    for (const code of sourcedCodes) {
      const place = defined(places[code], code);
      expect(place.pending, code).toBeUndefined();
      for (const key of crimeKeys) {
        const row = defined(place.offenses[key], `${code} ${key}`);
        wellSourced(row, `${code} ${key}`);
        wellFormedRange(resolve(place, row));
      }
      for (const [name, range] of Object.entries(place.classes)) {
        wellSourced(range, `${code} ${name}`);
        wellFormedRange(range);
      }
    }
  });

  it("estimates an unread place as the mean of the sourced places, cites no statute, and says why", () => {
    for (const key of crimeKeys) {
      const mins: number[] = [];
      const maxs: number[] = [];
      for (const code of sourcedCodes) {
        const place = defined(places[code], code);
        const range = resolve(
          place,
          defined(place.offenses[key], `${code} ${key}`),
        );
        mins.push(range.minMonths as number);
        if (!range.maxLife) maxs.push(range.maxMonths as number);
      }
      for (const code of estimatedCodes) {
        const place = defined(places[code], code);
        const row = defined(place.offenses[key], `${code} ${key}`);
        expect(place.unreadReason?.length, code).toBeGreaterThan(20);
        expect(row.basis).toBe(ESTIMATED);
        expect(row.method).toContain(ESTIMATED);
        expect(row).not.toHaveProperty("citation");
        expect(row).not.toHaveProperty("quote");
        expect(row.fedByMin).toEqual(sourcedCodes);
        expect(row.minMonths, `${code} ${key}`).toBe(mean(mins));
        expect(row.maxMonths, `${code} ${key}`).toBe(mean(maxs));
        wellFormedRange(row);
      }
    }
  });

  it("defines every offense key the game prosecutes, including the one not yet read", () => {
    for (const key of [...crimeKeys, "campaign-funds-personal-use"]) {
      expect(Object.keys(ranges.offenseDefinitions)).toContain(key);
    }
  });
});
