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
