/**
 * Runtime district identity. Geography identity is not election outcome,
 * legal power, or proof that a home sits inside the district.
 *
 * The Gazetteer interior point is deliberately absent. A coordinate is not a
 * boundary and is not home membership.
 */

export const DISTRICT_IDENTITY_VINTAGE = "census-gazetteer-2025" as const;

export type DistrictChamber = "congressional" | "state-lower" | "state-upper";

export interface DistrictIdentity {
  readonly vintage: typeof DISTRICT_IDENTITY_VINTAGE;
  readonly asOf: string;
  readonly compilerVersion: string;
  readonly recordId: string;
  readonly chamber: DistrictChamber;
  readonly geoid: string;
  readonly geoidFq: string;
  readonly stateFips: string;
  readonly stateUsps: string;
  readonly districtCode: string;
  readonly sourceName: string | null;
  readonly isUnassignedResidual: boolean;
}

/**
 * Versioned seat-to-district binding. Chamber stays in the key because the
 * three Gazetteer files reuse GEOIDs across congressional, upper and lower.
 */
export interface DistrictSeatBinding {
  readonly vintage: typeof DISTRICT_IDENTITY_VINTAGE;
  readonly compilerVersion: string;
  readonly chamber: DistrictChamber;
  readonly geoid: string;
  readonly recordId: string;
  readonly stateUsps: string;
}

export type DistrictBindingRefusalKind =
  | "residual-unassigned"
  | "unknown-identity"
  | "vintage-mismatch"
  | "chamber-mismatch"
  | "state-mismatch"
  | "compiler-mismatch"
  | "malformed-key";

export interface DistrictBindingAcceptance {
  readonly kind: "accepted";
  readonly identity: DistrictIdentity;
  readonly binding: DistrictSeatBinding;
}

export interface DistrictBindingRefusal {
  readonly kind: "refused";
  readonly reason: string;
  readonly refusalKind: DistrictBindingRefusalKind;
}

export type DistrictBindingResolution =
  DistrictBindingAcceptance | DistrictBindingRefusal;
