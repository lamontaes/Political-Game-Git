import corpusText from "../../data/research/places/local-institutions.json?raw";
import { countyGeoidsForPlace } from "./government-units";
import { lifePlaceByJurisdictionId } from "./life-places";
import {
  EMPTY_LOCAL_INSTITUTIONS,
  type LocalInstitutionSet,
  type LocalInstitutionsCorpus,
} from "./local-institutions-data";
import type { EntityId, World } from "./types";

const corpus = JSON.parse(corpusText) as LocalInstitutionsCorpus;

/**
 * The official institutions named for a playable place, with county rows
 * appended only when that place has no direct row of the same kind.
 * `world` is part of the reader seam so consumers always ask in world context;
 * geography is resolved through the stable place identity carried by the
 * jurisdiction, never by display-name matching.
 */
export function localInstitutionsFor(
  _world: World,
  jurisdictionId: EntityId,
): LocalInstitutionSet {
  const geoid = lifePlaceByJurisdictionId(jurisdictionId)?.sourceGeoid;
  if (!geoid) return EMPTY_LOCAL_INSTITUTIONS;

  const placeRows = corpus.places[geoid] ?? EMPTY_LOCAL_INSTITUTIONS;
  const countyRows = countyGeoidsForPlace(geoid).map(
    (county) => corpus.counties[county],
  );
  const keys: (keyof LocalInstitutionSet)[] = [
    "highSchools",
    "districts",
    "hospitals",
    "banks",
    "colleges",
    "largeEmployers",
  ];
  return Object.fromEntries(
    keys.map((key) => {
      const direct = placeRows[key];
      const directIds = new Set(
        direct.map((row) => `${row.sourceKey}:${row.sourceId}`),
      );
      const county = countyRows.flatMap((rows) => rows?.[key] ?? []);
      const fallback = county.filter(
        (row) => !directIds.has(`${row.sourceKey}:${row.sourceId}`),
      );
      return [key, [...direct, ...fallback]];
    }),
  ) as unknown as LocalInstitutionSet;
}
