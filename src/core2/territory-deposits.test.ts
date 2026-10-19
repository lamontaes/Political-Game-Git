import { describe, expect, it } from "vitest";
import depositRows from "../../data/tables/town-deposits.json" with { type: "json" };

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
