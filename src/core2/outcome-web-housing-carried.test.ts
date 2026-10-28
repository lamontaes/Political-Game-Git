/**
 * The housing links the housing engine already decides from its own records:
 * a new building's units lower renewing rents through the vacancy they add,
 * and an eviction judgment puts the household with kin, in a shelter or on
 * the street. A web link on top would count each twice, so each link names
 * the function that carries it and the web does not run it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import unwired from "./data/outcome-web/unwired.json" with { type: "json" };
import { linkCoverage, WEB_LINKS, WIRED_INTO } from "./outcome-web-model";

const link = (key: string) => WEB_LINKS.find((row) => row.key === key)!;
const read = (path: string) => readFileSync(path, "utf8");

function expectCarried(key: string, file: string, fn: string) {
  const row = link(key);
  expect(row.carriedBy, key).toContain(file);
  expect(row.carriedBy, key).toContain(fn);
  expect("carriedBy" in linkCoverage(row), key).toBe(true);
  expect((WIRED_INTO.get(row.to) ?? []).map((one) => one.key)).not.toContain(
    key,
  );
  expect(unwired.links.find((one) => one.link === key)).toBeUndefined();
}

describe("housing links the housing engine carries", () => {
  it("carries new apartments' effect on nearby rent by the lease renewal's vacancy response", () => {
    expectCarried(
      "new-apartments-to-nearby-rent",
      "src/core2/housing-occupancy.ts",
      "renewRentalLeases",
    );
    const occupancy = read("src/core2/housing-occupancy.ts");
    expect(occupancy).toMatch(/export function renewRentalLeases\(/);
    // Each renewing lease moves by the vacancy change raised to the elasticity.
    expect(occupancy).toMatch(/vacancyFactor/);
    expect(occupancy).toMatch(/stock\.vacantRental \/ stock\.rentalUnits/);
  });

  it("carries eviction's effect on homelessness by where each evicted household goes", () => {
    expectCarried(
      "eviction-to-homelessness",
      "src/core2/housing-homeless.ts",
      "placeRemovedHousehold",
    );
    expect(read("src/core2/housing-homeless.ts")).toMatch(
      /export function placeRemovedHousehold\(/,
    );
    // The eviction judgment calls it for the household it removes.
    expect(read("src/core2/modules/housing.ts")).toMatch(
      /Where they go: a relative with room, a shelter bed, else the street\.\n\s+placeRemovedHousehold\(api, \{/,
    );
  });
});
