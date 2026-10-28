/**
 * Each world's businesses per resident (owner, Oct 27: "realistic, not real";
 * audit row 23): a town's expected count of each kind of business opens off
 * its published County Business Patterns expectation and off another world's.
 */
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { seededUnit } from "../core2/seeded";
import { NATIONAL_PLACES_ROWS } from "./national-places.generated";
import { corePlaceByKey } from "../core2/place-lookup";
import {
  localBusinessSupplyFor,
  publishedLocalBusinessSupplyFor,
} from "./local-business-counts";

const seed = process.env.REALISTIC_SEED ?? randomBytes(8).toString("hex");
// A place drawn from every Census place the game holds, on the run's seed.
const rows = JSON.parse(NATIONAL_PLACES_ROWS) as [string, string, string][];
const drawn = rows
  .filter(([geoid]) => corePlaceByKey(geoid))
  .sort(([a], [b]) => a.localeCompare(b));
const place = drawn[Math.floor(seededUnit(seed, "place") * drawn.length)]!;
const where = `${place[1]} (${place[0]}), seed ${seed}`;

describe(`a town's businesses per resident (${where})`, () => {
  it("open off the published expectation and off another world's, for every kind", () => {
    const town = corePlaceByKey(place[0])!.context.jurisdiction.id;
    const real = publishedLocalBusinessSupplyFor(town);
    const a = localBusinessSupplyFor(town, `${seed}:a`);
    const b = localBusinessSupplyFor(town, `${seed}:b`);
    expect(real, where).not.toBeNull();
    let kinds = 0;
    real!.forEach((row, i) => {
      if (row.expected <= 0) return;
      kinds += 1;
      expect(a![i]!.expected, `${where} ${row.kind}: published`).not.toBe(
        row.expected,
      );
      expect(a![i]!.expected, `${where} ${row.kind}: other world`).not.toBe(
        b![i]!.expected,
      );
    });
    expect(kinds, where).toBeGreaterThan(0);
  });
});
