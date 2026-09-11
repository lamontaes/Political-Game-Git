/**
 * Compact whole-place membership for runtime use.
 *
 * Split places are listed so a join can distinguish CONFLICTING from UNKNOWN.
 * Interior points are not copied. County and statewide homes are not in this
 * file; they remain unknown.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { toCanonicalJson } from "../../src/source/core/index";
import {
  SLD_PLACE_COMPILER_VERSION,
  SLD_PLACE_CORPUS_AS_OF,
  SLD_PLACE_RELATION_VINTAGE,
} from "../../src/source/domains/sld-place-relations/index";
import type { PlaceDistrictRelationRecord } from "../../src/source/domains/sld-place-relations/index";
import { DISTRICT_IDENTITY_VINTAGE } from "../../src/districts/types";

const ROOT = resolve(import.meta.dirname, "../..");
const CORPUS = resolve(ROOT, "data/source/sld-place-relations/corpus.json");
const OUT_FILE = resolve(ROOT, "src/districts/place-membership.generated.json");

const records = JSON.parse(
  readFileSync(CORPUS, "utf8"),
) as PlaceDistrictRelationRecord[];

const wholePlaceByKey: Record<string, string> = {};
const splitPlaceChambers: Record<string, string[]> = {};

for (const record of records) {
  const key = `${record.placeGeoid}:${record.chamber}`;
  if (record.membership === "whole-place" && record.districtGeoid) {
    wholePlaceByKey[key] = record.districtGeoid;
    continue;
  }
  const chambers = splitPlaceChambers[record.placeGeoid] ?? [];
  chambers.push(record.chamber);
  splitPlaceChambers[record.placeGeoid] = chambers;
}

for (const placeGeoid of Object.keys(splitPlaceChambers)) {
  splitPlaceChambers[placeGeoid] = [
    ...new Set(splitPlaceChambers[placeGeoid]),
  ].sort();
}

const payload = {
  relationVintage: SLD_PLACE_RELATION_VINTAGE,
  identityVintage: DISTRICT_IDENTITY_VINTAGE,
  asOf: SLD_PLACE_CORPUS_AS_OF,
  compilerVersion: SLD_PLACE_COMPILER_VERSION,
  wholePlaceCount: Object.keys(wholePlaceByKey).length,
  splitPlaceCount: Object.keys(splitPlaceChambers).length,
  wholePlaceByKey,
  splitPlaceChambers,
};

mkdirSync(resolve(ROOT, "src/districts"), { recursive: true });
writeFileSync(OUT_FILE, `${toCanonicalJson(payload)}\n`);
console.log(
  `Exported ${payload.wholePlaceCount} whole-place and ${payload.splitPlaceCount} split-place keys to ${OUT_FILE}`,
);
