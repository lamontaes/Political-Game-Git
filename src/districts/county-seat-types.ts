/** County seat evidence is separate from Gazetteer chamber geography. */
export interface CountySeatSource {
  readonly version: string;
  readonly url: string;
  readonly documentId: string;
  readonly readOn: string;
  readonly effectiveFrom: string;
  readonly effectiveUntil: string | null;
  readonly status: "adopted" | "proposed" | "superseded" | "enjoined";
}

export interface CountySeatIdentity {
  readonly recordId: string;
  readonly governmentUnitId: string;
  readonly countyGeoid: string;
  readonly stateUsps: string;
  readonly officeKey: string;
  readonly seatKey: string;
  readonly source: CountySeatSource;
  /** Only sourced whole-place home joins; absent and split homes stay unknown. */
  readonly homeMembership?: {
    readonly source: CountySeatSource;
    readonly wholePlaceGeoids: readonly string[];
  };
  /** Election electorate and legal domicile can describe different territories. */
  readonly electorate:
    | { readonly kind: "countywide"; readonly countyGeoid: string }
    | { readonly kind: "district"; readonly districtRecordId: string }
    | null;
  readonly domicile:
    | { readonly kind: "county"; readonly countyGeoid: string }
    | { readonly kind: "district"; readonly districtRecordId: string }
    | null;
}

export interface CountySeatBinding {
  readonly vintage: "county-seat-source-v1";
  readonly compilerVersion: "county-seat-binding-v1";
  readonly chamber: "county-governing-body";
  readonly geoid: string;
  readonly recordId: string;
  readonly stateUsps: string;
  readonly governmentUnitId: string;
  readonly officeKey: string;
  readonly seatKey: string;
  readonly sourceVersion: string;
}
