/**
 * The official institutions named for a place (its banks, hospitals, school
 * districts and large employers), from the places research corpus, with
 * county rows appended only when the place has no direct row of the same
 * kind. Ported from the old engine's `local-institutions.ts`; read by the
 * opening's town jobs so a bank, a hospital or a clinic enters the world only
 * under a real source name.
 */
import { countyGeoidsForPlace } from "./government-units";
import { groupedJsonTable } from "./lazy-data";
import { corePlaceByJurisdictionId } from "../place-lookup";
import type { EntityId, IsoDate } from "../kernel/brands";

/** Where an institution's name came from, kept on the organization it names. */
export interface InstitutionProvenance {
  readonly kind: "source-record";
  readonly reference: string;
  readonly asOf: IsoDate;
}

/** A sourced name for a real institution in one place. */
export interface LocalInstitutionRow {
  readonly name: string;
  readonly kind: string;
  readonly sourceKey: string;
  readonly sourceId: string;
  readonly asOf: string;
  /** The current directory name is back-carried before the directory vintage. */
  readonly historicalNameEstimated?: true;
}

export interface LocalInstitutionSet {
  readonly highSchools: readonly LocalInstitutionRow[];
  readonly districts: readonly LocalInstitutionRow[];
  readonly hospitals: readonly LocalInstitutionRow[];
  readonly banks: readonly LocalInstitutionRow[];
  readonly colleges: readonly LocalInstitutionRow[];
  readonly largeEmployers: readonly LocalInstitutionRow[];
}

export const EMPTY_LOCAL_INSTITUTIONS: LocalInstitutionSet = {
  highSchools: [],
  districts: [],
  hospitals: [],
  banks: [],
  colleges: [],
  largeEmployers: [],
};

const KEYS: readonly (keyof LocalInstitutionSet)[] = [
  "highSchools",
  "districts",
  "hospitals",
  "banks",
  "colleges",
  "largeEmployers",
];

/**
 * The one reader of the places research corpus's institutions file, read on
 * first use and only for the states a world asks about. The civic inputs
 * read the same table (`civic-inputs.ts`).
 */
export const LOCAL_INSTITUTIONS_TABLE = groupedJsonTable(
  new URL(
    "../../../data/research/places/local-institutions.json",
    import.meta.url,
  ),
  ["places", "counties"],
);
const corpusPlace =
  LOCAL_INSTITUTIONS_TABLE.section<LocalInstitutionSet>("places");
const corpusCounty =
  LOCAL_INSTITUTIONS_TABLE.section<Partial<LocalInstitutionSet>>("counties");

/** The institutions named for a place, by its jurisdiction. */
export function localInstitutionsFor(
  jurisdictionId: EntityId,
): LocalInstitutionSet {
  const geoid = corePlaceByJurisdictionId(jurisdictionId)?.sourceGeoid;
  if (!geoid) return EMPTY_LOCAL_INSTITUTIONS;
  const placeRows = corpusPlace(geoid) ?? EMPTY_LOCAL_INSTITUTIONS;
  const countyRows = countyGeoidsForPlace(geoid).map((county) =>
    corpusCounty(county),
  );
  return Object.fromEntries(
    KEYS.map((key) => {
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

/** Keep source identity on the organization and make back-carried names explicit. */
export function localInstitutionProvenance(
  row: LocalInstitutionRow,
  effectiveAt: IsoDate,
): InstitutionProvenance {
  return {
    kind: "source-record",
    reference: `${row.sourceKey}:${row.sourceId} (directory as of ${row.asOf})${row.historicalNameEstimated ? "; historical name estimated before directory vintage" : ""}`,
    asOf: effectiveAt,
  };
}
