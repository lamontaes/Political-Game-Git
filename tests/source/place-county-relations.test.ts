import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { sha256Hex } from "../../src/source/core/index";
import type { ArtifactLock } from "../../src/source/core/index";
import {
  PL_STATES,
  archiveCachePath,
  cutPlaceCountyParts,
  slicePath,
  openPlaceCountyProduction,
  compilePlaceCountyRelations,
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
  population: number | string = 0,
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
  fields[90] = String(population);
  fields[95] = flag;
  return fields.join("|");
}

describe("place-county-relations parser and parts", () => {
  it("keeps a multi-county place split by county, with the place's land as the sum of its parts", () => {
    const parsed = parsePlaceCountyParts(
      Buffer.from(
        [
          geoLine("40", "55000", "017", 300, 1, "P", 70),
          geoLine("40", "55000", "109", 700, 2, "P", 30),
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
    expect(okc.map((record) => record.partPopulationCount)).toEqual([70, 30]);
    expect(
      okc.every(
        (record) =>
          record.placeLandAreaSquareMeters === 1000 &&
          record.placeCountyPartCount === 2,
      ),
    ).toBe(true);
  });

  it("refuses missing, negative, fractional and unsafe population counts, preserving measured zero", () => {
    const lines = ["", "-1", "1.5", "9007199254740992", "0"].map(
      (population, index) =>
        geoLine(
          "40",
          "55000",
          `${index + 1}`.padStart(3, "0"),
          10,
          0,
          "P",
          population,
        ),
    );
    const parsed = parsePlaceCountyParts(Buffer.from(lines.join("\n")));
    const result = normalizePlaceCountyParts(parsed.rows, "40", "fixture");
    expect(result.defects).toHaveLength(4);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]!.partPopulationCount).toBe(0);
  });

  it("replays the population-extended existing corpus from all locked source slices", () => {
    const lock = JSON.parse(
      readFileSync(
        resolve(REPO, "data/source/place-county-relations/artifact-lock.json"),
        "utf8",
      ),
    ) as ArtifactLock;
    const compiled = compilePlaceCountyRelations(
      openPlaceCountyProduction(lock),
    );
    const records = JSON.parse(
      readFileSync(
        resolve(REPO, "data/source/place-county-relations/corpus.json"),
        "utf8",
      ),
    );
    const manifest = JSON.parse(
      readFileSync(
        resolve(
          REPO,
          "data/source/place-county-relations/corpus-manifest.json",
        ),
        "utf8",
      ),
    );
    expect(compiled.records).toEqual(records);
    expect(compiled.corpus.canonicalSha256).toBe(manifest.canonicalSha256);
    expect(compiled.corpus.inputs).toHaveLength(51);
    expect(compiled.records).toHaveLength(33037);
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
