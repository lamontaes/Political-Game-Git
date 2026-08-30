/**
 * 2024 ACS PUMS 1-Year Stage A Core Types.
 * Strictly implements authorized fields from empirical variable contract.
 * Missing or Not-In-Universe must remain explicitly `null` or `undefined`, never literal zero.
 */

export interface AcsHousingRecord {
  readonly SERIALNO: string;
  readonly STATE: string;
  readonly PUMA: string;
  readonly WGTP: number; // Household weight, NEVER substitute with PWGTP
  readonly NP: number;
  readonly TYPEHUGQ: number; // Universe: 1 for ordinary households
  readonly TEN: number | null;
  readonly HINCP: number | null;
  readonly ADJINC: number;

  readonly HHT?: number | null;
  readonly HHT2?: number | null;
  readonly HUGCL?: number | null;
  readonly HUPAC?: number | null;
  readonly HUPAOC?: number | null;
  readonly HUPARC?: number | null;
  readonly BLD?: number | null;
  readonly BDSP?: number | null;
  readonly VEH?: number | null;
}

export interface AcsPersonRecord {
  readonly SERIALNO: string;
  readonly SPORDER: number;
  readonly PWGTP: number; // Person weight
  readonly AGEP: number;
  readonly RELSHIPP: number;

  readonly SCH?: number | null;
  readonly SCHG?: number | null;
  readonly SCHL?: number | null;

  readonly ESR?: number | null;
  readonly COW?: number | null;
  readonly OCCP?: string | null;
  readonly WKHP?: number | null;
  readonly WKWN?: number | null;
  readonly PERNP?: number | null;
  readonly PINCP?: number | null;
  readonly POBP?: number | null;
}

export interface AcsHouseholdDonor {
  readonly housing: AcsHousingRecord;
  readonly persons: readonly AcsPersonRecord[];
}

export interface AcsStateDonorShard {
  readonly state: string;
  readonly puma: string;
  readonly donors: readonly AcsHouseholdDonor[];
}
