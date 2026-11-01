import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { placeLocalities, placeStateKeys } from "../../src/core2/places";
import { GROUP_QUARTERS_TYPES } from "./compile-group-quarters";

interface GroupQuartersFile {
  readonly columns: readonly string[];
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

describe("group quarters by locality (2020 Census P5 and P28)", () => {
  it("gives Storrs, Connecticut the fetched P5 row, type by type", () => {
    const cells = STORRS_P5.split("|").slice(5).map(Number);
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
    ] = cells;
    expect(file.sampleSourceRows["0973980"]).toBe(STORRS_P5);
    expect(rowByKey.get("0973980")).toEqual([
      "0973980",
      "P5",
      total,
      adult,
      juvenile,
      nursing,
      otherInst,
      college,
      military,
      otherNon,
    ]);
    // 11,378 of Storrs's 15,979 residents lived in college housing.
    expect(rowByKey.get("0973980")![7]).toBe(11_378);
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
