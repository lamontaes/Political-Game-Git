/** A sourced name for a real institution in one place. */
export interface LocalInstitutionRow {
  readonly name: string;
  readonly kind: string;
  readonly sourceKey: string;
  readonly sourceId: string;
  readonly asOf: string;
  /** The current CCD name is back-carried before the directory vintage. */
  readonly historicalNameEstimated?: true;
}

export type InstitutionMatchMethod =
  "place-code" | "city-name" | "zip" | "point-in-boundary" | "county";

/** A public school (any grade) from the NCES Common Core of Data. */
export interface PublicSchoolRow extends LocalInstitutionRow {
  readonly sourceKey: "NCES-CCD";
  /** The CCD level as published, lower-cased (elementary, middle, high, ...). */
  readonly kind: string;
  /** A Census place GEOID, or a county GEOID when no place matched. */
  readonly geoid: string;
  readonly geoidKind: "place" | "county";
  readonly matchMethod: InstitutionMatchMethod;
  readonly lowestGrade: string;
  readonly highestGrade: string;
  readonly enrollment: number;
  /** "reported" from the CCD membership, or "estimated" from the state median. */
  readonly enrollmentBasis: "reported" | "estimated";
  readonly status: string;
}

/** A Medicare-certified hospital (CMS Hospital General Information + Provider of Services). */
export interface HospitalRow extends LocalInstitutionRow {
  readonly sourceKey: "CMS-HOSPITAL";
  /** The CMS certification number. */
  readonly sourceId: string;
  readonly kind: "hospital";
  readonly geoid: string;
  readonly geoidKind: "place" | "county";
  readonly matchMethod: InstitutionMatchMethod;
  readonly hospitalType: string;
  /** Certified beds from the Provider of Services file. */
  readonly beds: number;
  readonly bedsBasis: "reported" | "estimated";
}

export interface LocalInstitutionSet {
  readonly highSchools: readonly LocalInstitutionRow[];
  readonly districts: readonly LocalInstitutionRow[];
  readonly hospitals: readonly LocalInstitutionRow[];
  readonly banks: readonly LocalInstitutionRow[];
  readonly colleges: readonly LocalInstitutionRow[];
  readonly largeEmployers: readonly LocalInstitutionRow[];
}

export interface LocalInstitutionsCorpus {
  readonly asOf: string;
  readonly places: Readonly<Record<string, LocalInstitutionSet>>;
  readonly counties: Readonly<Record<string, Partial<LocalInstitutionSet>>>;
}

export const EMPTY_LOCAL_INSTITUTIONS: LocalInstitutionSet = {
  highSchools: [],
  districts: [],
  hospitals: [],
  banks: [],
  colleges: [],
  largeEmployers: [],
};

/** The columns of a school tuple in a state file, in order. */
export const SCHOOL_COLUMNS = [
  "id",
  "name",
  "kind",
  "matchMethod",
  "lowestGrade",
  "highestGrade",
  "enrollment",
  "enrollmentBasis",
  "status",
  "asOf",
] as const;

/** One school as stored: the place or county is the bucket key, `asOf` indexes `asOfs`. */
export type SchoolTuple = readonly [
  id: string,
  name: string,
  kind: string,
  matchMethod: InstitutionMatchMethod,
  lowestGrade: string,
  highestGrade: string,
  enrollment: number,
  enrollmentBasis: "reported" | "estimated",
  status: string,
  asOf: number,
];

/**
 * One state's public schools (and, once the hospital data lands, hospitals),
 * matched to places and counties, in `data/research/places/local-institutions/
 * <USPS>.json`. Nothing in the game reads these rows yet; the hookup comes with
 * the childhood-school and birth-hospital work.
 */
export interface StateInstitutionsFile {
  readonly state: string;
  readonly schools: {
    readonly source: "NCES-CCD";
    readonly enrollmentYear: string;
    readonly asOfs: readonly string[];
    readonly columns: typeof SCHOOL_COLUMNS;
    readonly places: Readonly<Record<string, readonly SchoolTuple[]>>;
    readonly counties: Readonly<Record<string, readonly SchoolTuple[]>>;
  };
}

/** Expand a state file's school tuples into rows. */
export function expandStateSchools(
  file: StateInstitutionsFile,
): PublicSchoolRow[] {
  const rows: PublicSchoolRow[] = [];
  for (const [kind, buckets] of [
    ["place", file.schools.places],
    ["county", file.schools.counties],
  ] as const) {
    for (const [geoid, tuples] of Object.entries(buckets)) {
      for (const t of tuples) {
        rows.push({
          sourceKey: "NCES-CCD",
          sourceId: t[0],
          name: t[1],
          kind: t[2],
          geoid,
          geoidKind: kind,
          matchMethod: t[3],
          lowestGrade: t[4],
          highestGrade: t[5],
          enrollment: t[6],
          enrollmentBasis: t[7],
          status: t[8],
          asOf: file.schools.asOfs[t[9]]!,
        });
      }
    }
  }
  return rows;
}
