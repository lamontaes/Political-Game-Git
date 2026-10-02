import type { EntityId, IsoDate } from "./types";

/** A work relationship's dated facts, never a copied wage amount. */
export interface WorkPayCoverageDeterminationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly workRelationshipId: EntityId;
  readonly personId: EntityId;
  readonly employerOrganizationId: EntityId;
  readonly workRoleId: EntityId;
  /** Null preserves an absent workplace; it never borrows the worker's home. */
  readonly jurisdictionId: EntityId | null;
  readonly determinedAt: IsoDate;
  readonly reason: "hire" | "opening";
  readonly defaultCategory: "standard";
  readonly factRecordIds: readonly EntityId[];
  readonly sources: readonly string[];
  readonly governingLaws: readonly {
    readonly questionKey: string;
    readonly governingLawKey: EntityId;
    readonly origin: "enacted" | "in-force-at-start";
  }[];
  /** Only a matching, authored canonical exception row overrides the standard. */
  readonly exceptions: readonly {
    readonly questionKey: string;
    readonly rowId: string;
    readonly factRecordIds: readonly EntityId[];
  }[];
}
