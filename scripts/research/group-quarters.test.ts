import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placeLocalities, placeStateKeys } from "../../src/core2/places";
import { GROUP_QUARTERS_TYPES } from "./compile-group-quarters";

type Totals = Readonly<
  Record<"total" | (typeof GROUP_QUARTERS_TYPES)[number], number>
>;

interface GroupQuartersFile {
  readonly columns: readonly string[];
  readonly nationalTotals: {
    readonly fiftyStatesAndDc: Totals;
    readonly islandAreas: Readonly<Record<string, Totals>>;
  };
  readonly tables: Readonly<Record<string, { readonly tag: string }>>;
  readonly sampleSourceRows: Readonly<Record<string, string>>;
  readonly renamed: readonly { readonly key: string }[];
  readonly estimated: readonly {
    readonly key: string;
    readonly low: number;
    readonly high: number;
  }[];
  readonly rows: readonly (readonly [string, string, ...number[]])[];
}

const file = JSON.parse(
  readFileSync(
    join(
      import.meta.dirname,
      "../../data/research/group-quarters/census-2020-group-quarters.json",
    ),
    "utf8",
  ),
) as GroupQuartersFile;
const rowByKey = new Map(file.rows.map((row) => [row[0], row]));

/**
 * Storrs, Connecticut's P5 row as fetched on Nov 1, 2026: ct2020.pl.zip,
 * file 03 (ct000032020.pl), LOGRECNO 0004177, which the geographic header
 * (ctgeo2020.pl) gives as summary level 160, GEOID 1600000US0973980, "Storrs
 * CDP". After the five linking fields come P0050001 to P0050010.
 */
const STORRS_P5 = "PLST|CT|000|03|0004177|11452|73|0|0|73|0|11379|11378|0|1";

/**
 * Aurora, Colorado's P5 row, fetched the same way: co2020.pl.zip, file 03,
 * LOGRECNO 0006314, "Aurora city", a place in three counties.
 */
const AURORA_P5 =
  "PLST|CO|000|03|0006314|3499|2089|598|53|1431|7|1410|0|334|1076";

/**
 * The United States row of the national PL file, fetched Nov 1, 2026:
 * us2020.npl.zip, file 03 (us000032020.npl), LOGRECNO 0000001, summary level
 * 010. It is published apart from the state files the national totals are
 * summed from.
 */
const US_P5 =
  "PLUS|US|000|03|0000001|8239016|3753401|1967297|88115|1627046|70943|4485615|2792097|328372|1365146";

/** P5's ten cells as the row's total and seven types. */
function p5Types(line: string): number[] {
  const [
    total,
    ,
    adult,
    juvenile,
    nursing,
    otherInst,
    ,
    college,
    military,
    otherNon,
  ] = line.split("|").slice(5).map(Number);
  return [
    total!,
    adult!,
    juvenile!,
    nursing!,
    otherInst!,
    college!,
    military!,
    otherNon!,
  ];
}

describe("group quarters by locality (2020 Census P5 and P28)", () => {
  it("gives Storrs, Connecticut the fetched P5 row, type by type", () => {
    expect(file.sampleSourceRows["0973980"]).toBe(STORRS_P5);
    expect(rowByKey.get("0973980")).toEqual([
      "0973980",
      "P5",
      ...p5Types(STORRS_P5),
    ]);
    // 11,378 of Storrs's 15,979 residents lived in college housing.
    expect(rowByKey.get("0973980")![7]).toBe(11_378);
  });

  it("gives Aurora, Colorado the fetched P5 row, type by type", () => {
    expect(file.sampleSourceRows["0804000"]).toBe(AURORA_P5);
    expect(rowByKey.get("0804000")).toEqual([
      "0804000",
      "P5",
      ...p5Types(AURORA_P5),
    ]);
    // 598 in adult correctional, 1,431 in nursing, 334 in military quarters.
    expect(rowByKey.get("0804000")!.slice(2)).toEqual([
      3499, 598, 53, 1431, 7, 0, 334, 1076,
    ]);
  });

  it("sums the 50 states and D.C. to the national file's United States row", () => {
    const totals = file.nationalTotals.fiftyStatesAndDc;
    expect(
      ["total", ...GROUP_QUARTERS_TYPES].map(
        (name) => totals[name as keyof Totals],
      ),
    ).toEqual(p5Types(US_P5));
    expect(totals.total).toBe(8_239_016);
    expect(totals.adultCorrectional).toBe(1_967_297);
    expect(totals.college).toBe(2_792_097);
  });

  it("keeps a prison outside town out of the town's row", () => {
    // Kenedy, Texas: the 2025 boundary takes in the internal point of 2020
    // block 482559703011040, whose 2,036 residents are the Connally Unit, a
    // prison outside the city. The ACS on the same land (60 plus or minus 3)
    // rules the block out, so the row is the 2020 row.
    expect(rowByKey.get("4838860")).toEqual([
      "4838860",
      "blocks",
      40,
      0,
      0,
      40,
      0,
      0,
      0,
      0,
    ]);
    const kenedy = file.estimated.find((row) => row.key === "4838860")!;
    expect(kenedy.low).toBe(40);
    expect(kenedy.high).toBe(2076);
  });

  it("gives Guam its P28 territory row", () => {
    // gu2020.dhc.zip, segment 12, LOGRECNO 0000001 (summary level 040):
    // P0280001 is 4,392; the six military cells sum to 1,467.
    const guam = file.nationalTotals.islandAreas.guam!;
    expect(guam.total).toBe(4_392);
    expect(guam.military).toBe(1_467);
    expect(
      GROUP_QUARTERS_TYPES.reduce((sum, name) => sum + guam[name], 0),
    ).toBe(guam.total);
  });

  it("has exactly one row for every locality the game can draw, in all 56 places", () => {
    const drawable = placeStateKeys().flatMap((state) =>
      placeLocalities(state).map((place) => place.key),
    );
    expect(placeStateKeys()).toHaveLength(56);
    const missing = drawable.filter((key) => !rowByKey.has(key));
    expect(missing).toEqual([]);
    expect(file.rows).toHaveLength(drawable.length);
    expect(rowByKey.size).toBe(file.rows.length);
    for (const state of placeStateKeys())
      expect(
        placeLocalities(state).some((place) => rowByKey.has(place.key)),
        state,
      ).toBe(true);
  });

  it("names each row's table, sums its types to its total and tags it", () => {
    expect(file.columns).toEqual([
      "key",
      "table",
      "total",
      ...GROUP_QUARTERS_TYPES,
    ]);
    const estimated = new Map(file.estimated.map((row) => [row.key, row]));
    for (const [key, table, total, ...types] of file.rows) {
      expect(file.tables[table], key).toBeDefined();
      expect(types, key).toHaveLength(GROUP_QUARTERS_TYPES.length);
      expect(
        [total, ...types].every((n) => Number.isInteger(n) && n! >= 0),
        key,
      ).toBe(true);
      expect(
        types.reduce((a, b) => a! + b!, 0),
        key,
      ).toBe(total);
      const spread = estimated.get(key);
      if (file.tables[table]!.tag === "ESTIMATED") {
        expect(spread, key).toBeDefined();
        expect(spread!.low, key).toBeLessThanOrEqual(total!);
        expect(spread!.high, key).toBeGreaterThanOrEqual(total!);
      } else expect(spread, key).toBeUndefined();
    }
    for (const { key } of file.renamed)
      expect(rowByKey.get(key)?.[1], key).toBe("P5");
  });

  it("reads the island-area villages from P28", () => {
    for (const state of ["US-AS", "US-GU", "US-MP", "US-VI"])
      for (const place of placeLocalities(state))
        expect(rowByKey.get(place.key)?.[1], place.key).toBe("P28");
  });
});
