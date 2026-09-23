/**
 * Compact whole-place membership for runtime use.
 *
 * Split places are listed so a join can distinguish CONFLICTING from UNKNOWN.
 * Interior points are not copied. County and statewide homes are not in this
 * file; they remain unknown.
 *
 * Congressional membership comes from the separate 119th CD–2020 place corpus:
 * a place the file lists with exactly one district is whole-place; a split
 * place carries its intersecting (non-residual) districts as candidates, so a
 * reader can offer those and nothing else in the state.
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
import {
  CD_PLACE_COMPILER_VERSION,
  CD_PLACE_CORPUS_AS_OF,
  CD_PLACE_RELATION_VINTAGE,
  isUnassignedResidualGeoid,
} from "../../src/source/domains/cd-place-relations/index";
import type { CongressionalPlaceRelationRecord } from "../../src/source/domains/cd-place-relations/index";
import { DISTRICT_IDENTITY_VINTAGE } from "../../src/districts/types";

const ROOT = resolve(import.meta.dirname, "../..");
const CORPUS = resolve(ROOT, "data/source/sld-place-relations/corpus.json");
const CD_CORPUS = resolve(ROOT, "data/source/cd-place-relations/corpus.json");
const OUT_FILE = resolve(ROOT, "src/districts/place-membership.generated.json");

const records = JSON.parse(
  readFileSync(CORPUS, "utf8"),
) as PlaceDistrictRelationRecord[];

const wholePlaceByKey: Record<string, string> = {};
const splitPlaceChambers: Record<string, string[]> = {};
// Which districts a split place overlaps, keyed like `wholePlaceByKey`. The
// runtime needs the list to offer a split town's resident only the districts
// that actually cross their town.
const splitDistrictsByKey: Record<string, string[]> = {};

for (const record of records) {
  const key = `${record.placeGeoid}:${record.chamber}`;
  if (record.membership === "whole-place" && record.districtGeoid) {
    wholePlaceByKey[key] = record.districtGeoid;
    continue;
  }
  splitDistrictsByKey[key] = [...record.intersectingDistrictGeoids].sort();
  const chambers = splitPlaceChambers[record.placeGeoid] ?? [];
  chambers.push(record.chamber);
  splitPlaceChambers[record.placeGeoid] = chambers;
}

for (const placeGeoid of Object.keys(splitPlaceChambers)) {
  splitPlaceChambers[placeGeoid] = [
    ...new Set(splitPlaceChambers[placeGeoid]),
  ].sort();
}

const congressionalRecords = JSON.parse(
  readFileSync(CD_CORPUS, "utf8"),
) as CongressionalPlaceRelationRecord[];
const congressionalWholePlace: Record<string, string> = {};
const congressionalSplitCandidates: Record<string, string[]> = {};
for (const record of congressionalRecords) {
  if (record.membership === "whole-place" && record.districtGeoid) {
    congressionalWholePlace[record.placeGeoid] = record.districtGeoid;
    continue;
  }
  congressionalSplitCandidates[record.placeGeoid] =
    record.intersectingDistrictGeoids.filter(
      (geoid) => !isUnassignedResidualGeoid(geoid),
    );
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
  splitDistrictsByKey,
  congressional: {
    relationVintage: CD_PLACE_RELATION_VINTAGE,
    asOf: CD_PLACE_CORPUS_AS_OF,
    compilerVersion: CD_PLACE_COMPILER_VERSION,
    wholePlaceCount: Object.keys(congressionalWholePlace).length,
    splitPlaceCount: Object.keys(congressionalSplitCandidates).length,
    wholePlace: congressionalWholePlace,
    splitPlaceCandidates: congressionalSplitCandidates,
  },
};

mkdirSync(resolve(ROOT, "src/districts"), { recursive: true });
writeFileSync(OUT_FILE, `${toCanonicalJson(payload)}\n`);
console.log(
  `Exported ${payload.wholePlaceCount} whole-place and ${payload.splitPlaceCount} split-place keys, and ${payload.congressional.wholePlaceCount} whole-place and ${payload.congressional.splitPlaceCount} split congressional places, to ${OUT_FILE}`,
);
