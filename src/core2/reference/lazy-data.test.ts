import { randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { geoidGroup, groupedJsonTable } from "./lazy-data";

const FILE = new URL(
  "../../../data/research/places/local-institutions.json",
  import.meta.url,
);
const whole = JSON.parse(readFileSync(FILE, "utf8")) as {
  asOf: string;
  places: Record<string, unknown>;
  counties: Record<string, unknown>;
};

describe("groupedJsonTable", () => {
  it("loads a random place's rows and keeps only that state", () => {
    const keys = Object.keys(whole.places);
    const key = keys[randomInt(keys.length)]!;
    const table = groupedJsonTable(FILE, ["places", "counties"]);
    expect(table.heldGroups()).toEqual([]);
    expect(table.section("places")(key)).toEqual(whole.places[key]);
    expect(table.heldGroups()).toEqual([key.slice(0, 2)]);
    expect(table.rest<{ asOf: string }>().asOf).toBe(whole.asOf);
    expect(table.rest<Record<string, unknown>>().places).toBeUndefined();
  });

  it("reads a county of another random state", () => {
    const keys = Object.keys(whole.counties);
    const key = keys[randomInt(keys.length)]!;
    const table = groupedJsonTable(FILE, ["places", "counties"]);
    expect(table.section("counties")(key)).toEqual(whole.counties[key]);
  });

  it("treats a malformed key or unknown section as an error, not a miss", () => {
    const table = groupedJsonTable(FILE, ["places", "counties"]);
    expect(() => table.section("places")("not-a-geoid")).toThrow(
      /Not a place, county or school key/,
    );
    expect(() => table.section("schools")).toThrow(/Unknown data section/);
    expect(() => geoidGroup("")).toThrow();
    expect(geoidGroup("0100100:voting-precinct")).toBe("01");
    expect(geoidGroup("territory:GU:agana-heights")).toBe("territory:GU");
  });
});
