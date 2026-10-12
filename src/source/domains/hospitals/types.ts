/** One Medicare-certified hospital, joined by CCN to its Provider of Services row. */
export interface HospitalRecord {
  /** CMS certification number, the join key between the two files. */
  readonly ccn: string;
  readonly name: string;
  readonly address: string;
  readonly city: string;
  readonly state: string;
  readonly zip: string;
  readonly countyName: string;
  readonly hospitalType: string;
  readonly ownership: string;
  readonly emergencyServices: boolean | null;
  /** Five-digit county GEOID from the Provider of Services FIPS codes; null when the file has no row. */
  readonly countyGeoid: string | null;
  /** Certified beds from the Provider of Services file; null when the file has no row. */
  readonly certifiedBeds: number | null;
  readonly evidence: {
    readonly general: HospitalEvidence;
    readonly providerOfServices: HospitalEvidence | null;
  };
}

/** A line of a locked CSV. */
export interface HospitalEvidence {
  readonly artifactId: string;
  readonly line: number;
}
