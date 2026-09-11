import { DISTRICT_IDENTITY_VINTAGE, type DistrictChamber } from "./types";
import type {
  DistrictBindingResolution,
  DistrictIdentity,
  DistrictSeatBinding,
} from "./types";

export const DISTRICT_MEMBERSHIP_REFUSAL =
  "Gazetteer interior points are not district boundaries or home membership. The game will not assign a district from a coordinate, a nearest centroid, a city, a county, or statewide residence.";

export function gazetteerChamberForOfficeChamberKey(
  chamberKey: string,
): DistrictChamber | null {
  if (chamberKey === "house" || chamberKey === "assembly") return "state-lower";
  if (chamberKey === "senate" || chamberKey === "legislature") {
    return "state-upper";
  }
  if (chamberKey === "congressional") return "congressional";
  return null;
}

export function gazetteerChamberForOfficeFamily(
  officeFamily:
    "LOWER_CHAMBER" | "UPPER_CHAMBER" | "UNICAMERAL_CHAMBER" | string,
): DistrictChamber | null {
  if (officeFamily === "LOWER_CHAMBER") return "state-lower";
  if (
    officeFamily === "UPPER_CHAMBER" ||
    officeFamily === "UNICAMERAL_CHAMBER"
  ) {
    return "state-upper";
  }
  return null;
}

export function districtRecordId(
  chamber: DistrictChamber,
  geoid: string,
): string {
  return `${chamber}:${geoid}`;
}

export function listDistrictIdentities(
  catalog: readonly DistrictIdentity[],
  query: {
    readonly stateUsps?: string;
    readonly chamber?: DistrictChamber;
    readonly includeResiduals?: boolean;
  },
): readonly DistrictIdentity[] {
  return catalog.filter((record) => {
    if (query.stateUsps && record.stateUsps !== query.stateUsps) return false;
    if (query.chamber && record.chamber !== query.chamber) return false;
    if (!query.includeResiduals && record.isUnassignedResidual) return false;
    return true;
  });
}

export function districtIdentityByRecordId(
  catalog: readonly DistrictIdentity[],
  recordId: string,
): DistrictIdentity | null {
  return catalog.find((record) => record.recordId === recordId) ?? null;
}

/**
 * Always withheld. A published interior point is a Gazetteer attribute, not a
 * point-in-polygon test and not a nearest-centroid assignment.
 */
export function districtMembershipFromInteriorPoint(input: {
  readonly latitude: number;
  readonly longitude: number;
  readonly catalog: readonly DistrictIdentity[];
}): { readonly kind: "refused"; readonly reason: string } {
  void input;
  return { kind: "refused", reason: DISTRICT_MEMBERSHIP_REFUSAL };
}

export function resolveDistrictBinding(
  catalog: readonly DistrictIdentity[],
  candidate: DistrictSeatBinding,
  expected?: {
    readonly chamber?: DistrictChamber;
    readonly stateUsps?: string;
  },
): DistrictBindingResolution {
  if (
    candidate.recordId !== districtRecordId(candidate.chamber, candidate.geoid)
  ) {
    return {
      kind: "refused",
      refusalKind: "malformed-key",
      reason:
        "The district binding's record id does not reassemble from its chamber and GEOID, so the game will not use it.",
    };
  }
  if (candidate.vintage !== DISTRICT_IDENTITY_VINTAGE) {
    return {
      kind: "refused",
      refusalKind: "vintage-mismatch",
      reason: `The district binding cites vintage "${candidate.vintage}", which is not the accepted Gazetteer vintage ${DISTRICT_IDENTITY_VINTAGE}.`,
    };
  }
  const identity = districtIdentityByRecordId(catalog, candidate.recordId);
  if (!identity) {
    return {
      kind: "refused",
      refusalKind: "unknown-identity",
      reason: `No accepted district identity is published as ${candidate.recordId}.`,
    };
  }
  if (identity.compilerVersion !== candidate.compilerVersion) {
    return {
      kind: "refused",
      refusalKind: "compiler-mismatch",
      reason:
        "The district binding names a compiler version that does not match the accepted identity catalog.",
    };
  }
  if (
    identity.chamber !== candidate.chamber ||
    identity.geoid !== candidate.geoid
  ) {
    return {
      kind: "refused",
      refusalKind: "malformed-key",
      reason:
        "The district binding does not match the chamber and GEOID on the published identity.",
    };
  }
  if (identity.stateUsps !== candidate.stateUsps) {
    return {
      kind: "refused",
      refusalKind: "state-mismatch",
      reason: `The district binding names ${candidate.stateUsps}, but the published identity is in ${identity.stateUsps}.`,
    };
  }
  if (identity.isUnassignedResidual) {
    return {
      kind: "refused",
      refusalKind: "residual-unassigned",
      reason:
        "Census residual codes ZZ and ZZZ mark territory assigned to no district. They are not a seat and not a home district.",
    };
  }
  if (expected?.chamber && identity.chamber !== expected.chamber) {
    return {
      kind: "refused",
      refusalKind: "chamber-mismatch",
      reason: `This office is a ${expected.chamber} seat; ${identity.recordId} is a ${identity.chamber} district.`,
    };
  }
  if (expected?.stateUsps && identity.stateUsps !== expected.stateUsps) {
    return {
      kind: "refused",
      refusalKind: "state-mismatch",
      reason: `This office is in ${expected.stateUsps}; ${identity.recordId} is in ${identity.stateUsps}.`,
    };
  }
  return {
    kind: "accepted",
    identity,
    binding: {
      vintage: identity.vintage,
      compilerVersion: identity.compilerVersion,
      chamber: identity.chamber,
      geoid: identity.geoid,
      recordId: identity.recordId,
      stateUsps: identity.stateUsps,
    },
  };
}

export function bindingFromIdentity(
  identity: DistrictIdentity,
): DistrictSeatBinding {
  return {
    vintage: identity.vintage,
    compilerVersion: identity.compilerVersion,
    chamber: identity.chamber,
    geoid: identity.geoid,
    recordId: identity.recordId,
    stateUsps: identity.stateUsps,
  };
}
