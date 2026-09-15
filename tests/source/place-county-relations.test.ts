import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { sha256Hex } from "../../src/source/core/index";
import {
  PL_STATES,
  archiveCachePath,
  cutPlaceCountyParts,
  slicePath,
} from "../../src/source/domains/place-county-relations/index";
import { parsePlaceCountyParts } from "../../src/source/domains/place-county-relations/parse";
import { normalizePlaceCountyParts } from "../../src/source/domains/place-county-relations/normalize";

const REPO = resolve(import.meta.dirname, "../..");

/** A 97-field summary-level-155 geoheader line with the fields that matter. */
function geoLine(
  state: string,
  place: string,
  county: string,
  land: number,
  water: number,
  flag: string,
): string {
  const fields = Array.from({ length: 97 }, () => "");
  const geocode = `${state}${place}${county}`;
  fields[0] = "PLST";
  fields[2] = "155";
  fields[3] = "00";
  fields[8] = `1550000US${geocode}`;
  fields[9] = geocode;
  fields[12] = state;
  fields[14] = county;
  fields[84] = String(land);
  fields[85] = String(water);
  fields[95] = flag;
  return fields.join("|");
}

describe("place-county-relations parser and parts", () => {
  it("keeps a multi-county place split by county, with the place's land as the sum of its parts", () => {
    const parsed = parsePlaceCountyParts(
      Buffer.from(
        [
          geoLine("40", "55000", "017", 300, 1, "P"),
          geoLine("40", "55000", "109", 700, 2, "P"),
          geoLine("40", "00100", "001", 50, 0, "P"),
          "",
        ].join("\n"),
      ),
    );
    expect(parsed.defects).toEqual([]);
    const normalized = normalizePlaceCountyParts(parsed.rows, "40", "fixture");
    expect(normalized.defects).toEqual([]);
    const okc = normalized.records.filter(
      (record) => record.placeGeoid === "4055000",
    );
    expect(okc.map((record) => record.countyGeoid)).toEqual(["40017", "40109"]);
    expect(
      okc.every(
        (record) =>
          record.placeLandAreaSquareMeters === 1000 &&
          record.placeCountyPartCount === 2,
      ),
    ).toBe(true);
  });

  it("refuses a blank area and a row from another state's file instead of guessing", () => {
    const parsed = parsePlaceCountyParts(
      Buffer.from(
        [
          geoLine("40", "55000", "017", 300, 1, "P").replace("|300|", "||"),
          geoLine("51", "14968", "540", 10, 0, "W"),
          "",
        ].join("\n"),
      ),
    );
    const normalized = normalizePlaceCountyParts(parsed.rows, "40", "fixture");
    expect(normalized.records).toEqual([]);
    expect(normalized.defects).toHaveLength(2);
  });

  it("re-cuts each state's slice from its cached archive when the archive is present", () => {
    let checked = 0;
    for (const [usps] of PL_STATES) {
      const committed = resolve(REPO, slicePath(usps));
      expect(existsSync(committed)).toBe(true);
      const cached = resolve(REPO, archiveCachePath(usps));
      // The archives are deliberately not committed. Where one is absent — a
      // fresh clone, or CI — its slice is taken on the lock's word.
      if (!existsSync(cached)) continue;
      expect(sha256Hex(cutPlaceCountyParts(readFileSync(cached), usps))).toBe(
        sha256Hex(readFileSync(committed)),
      );
      checked += 1;
      if (checked === 3) break;
    }
  });
});
