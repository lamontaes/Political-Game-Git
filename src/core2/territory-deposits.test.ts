import { describe, expect, it } from "vitest";
import depositRows from "../../data/tables/town-deposits.json" with { type: "json" };
import villages from "./data/places/territory-places.json" with { type: "json" };

// The town bank's deposits come from the FDIC Summary of Deposits by county
// (SG-WORLD-credit-island-deposits): the territories with FDIC branches are in
// the county table, so only American Samoa, which has none, falls back to the
// nation's deposits per resident.
const table = new Map(
  depositRows.FDIC_COUNTY_DEPOSITS.split(";").map((row) => {
    const at = row.indexOf(":");
    return [row.slice(0, at), Number(row.slice(at + 1))] as const;
  }),
);
const inTerritory = (prefix: string) =>
  [...table].filter(([county]) => county.startsWith(prefix));

describe("territory deposits", () => {
  it.each([
    ["Guam", "66", 1],
    ["the Northern Mariana Islands", "69", 1],
    ["Puerto Rico", "72", 50],
    ["the U.S. Virgin Islands", "78", 1],
  ])("has FDIC branch deposits for %s", (_name, prefix, least) => {
    const rows = inTerritory(prefix);
    expect(rows.length).toBeGreaterThanOrEqual(least);
    for (const [county, thousands] of rows)
      expect(thousands, county).toBeGreaterThan(0);
  });

  it("has none for American Samoa, which has no FDIC branch", () => {
    expect(inTerritory("60")).toEqual([]);
  });
});

// An island village's Census GEOID starts with its territory's FIPS code, and
// its county code (the first five digits of a ten-digit GEOID) is the Census's,
// not the FDIC's: the FDIC table above numbers its counties differently, so a
// village never finds its own county there. Every island village therefore
// takes its territory's FDIC deposits per resident (American Samoa, with none,
// the nation's), as SG-WORLD-credit-island-deposits says.
describe("island villages", () => {
  const rows = villages.rows as unknown as [
    string,
    string,
    string,
    string | null,
    string,
    number,
  ][];
  it.each([
    ["AS", "60"],
    ["GU", "66"],
    ["MP", "69"],
    ["VI", "78"],
  ])("%s villages carry a GEOID in the territory", (usps, fips) => {
    const own = rows.filter(([, , state]) => state === usps);
    expect(own.length, `${usps} has villages`).toBeGreaterThan(0);
    for (const [key, , , , geoid] of own)
      expect(geoid.startsWith(fips), key).toBe(true);
  });
  it("finds no village's county code in the FDIC table except by chance of numbering", () => {
    // Guam's one county (66010) is the only match: the other territories'
    // villages use their territory's per-resident deposits.
    const matched = rows
      .filter(([, , , , geoid]) => geoid.length === 10)
      .filter(([, , , , geoid]) => table.has(geoid.slice(0, 5)))
      .map(([, , state]) => state);
    expect([...new Set(matched)].sort()).toEqual(["GU"]);
  });
});
