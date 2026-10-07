import type { EntityId, IsoDate } from "./types";

export interface PermitApplicationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly personId: EntityId;
  readonly issuingAuthorityOrganizationId: EntityId;
  readonly permitKind: string;
  readonly governingLawKey: EntityId;
  readonly questionKey: string;
  readonly jurisdictionId: EntityId;
  readonly appliedAt: IsoDate;
  readonly decisionTraceId: EntityId;
  readonly ruleSourceUrl: string;
  readonly sourceRecordIds: readonly EntityId[];
}

export interface PermitStatusRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly applicationId: EntityId;
  readonly personId: EntityId;
  readonly issuingAuthorityOrganizationId: EntityId;
  readonly permitKind: string;
  readonly status: "issued" | "denied" | "revoked" | "expired";
  readonly effectiveAt: IsoDate;
  readonly expiresAt: IsoDate | null;
  readonly sourceRecordIds: readonly EntityId[];
}

/** Sourced legal rules are data; no issuer, age or deadline is inferred. */
export interface PermitRule {
  readonly jurisdictionId: EntityId;
  readonly questionKey: string;
  readonly permitKind: string;
  readonly issuingAuthorityOrganizationKey: string;
  readonly minimumAgeYears: number;
  readonly sourceUrl: string;
}
