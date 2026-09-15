import type { EntityId, IsoDate } from "../simulation";

/**
 * The saved-world orientation contract L reads, mirrored field for field from
 * ROLE W's `alive43-world/v1` (`src/simulation/living-world/contract.ts` and
 * `src/presentation/living-world-orientation.ts` on W's branch).
 *
 * This file exists only until W's module is on the receiving branch. It holds
 * no values and produces nothing; when W's commit lands it becomes a re-export
 * of W's types, and any reader need beyond these fields is a request to W.
 */
export const LIVING_WORLD_CONTRACT_VERSION = "alive43-world/v1";

export type ChamberKey = "us-house" | "us-senate";

export interface PublicHolderView {
  readonly personId: EntityId;
  readonly personName: string;
  readonly officeKey: string;
  readonly title: string;
  readonly stateUsps: string | null;
  /** Null: no public party affiliation is recorded. Never a belief or vote. */
  readonly partyOrganizationId: EntityId | null;
  readonly caucusOrganizationId: EntityId | null;
  readonly termId: EntityId;
  readonly startedAt: IsoDate | null;
  readonly endExclusive: IsoDate | null;
  /** First day of continuous service in this office, when recorded. */
  readonly serviceSince: IsoDate | null;
  readonly birthDate: IsoDate;
  readonly residenceJurisdictionId: EntityId;
  readonly residenceLabel: string | null;
}

export type SeatOccupant =
  | { readonly kind: "member"; readonly member: PublicHolderView }
  | {
      readonly kind: "vacancy";
      readonly since: IsoDate;
      readonly eventId: EntityId;
    }
  /** The recorded term ended and nothing records who holds the seat now. */
  | { readonly kind: "no-current-record"; readonly lastTermEnded: IsoDate };

export interface SeatView {
  readonly seatKey: string;
  readonly chamberKey: ChamberKey;
  readonly stateUsps: string;
  /** Two-digit district code; "00" is an at-large seat. Null for the Senate. */
  readonly district: string | null;
  readonly senateClass: 1 | 2 | 3 | null;
  readonly occupant: SeatOccupant;
}

export interface ChamberTotals {
  readonly seats: number;
  readonly members: number;
  readonly vacancies: number;
  readonly noCurrentRecord: number;
  readonly byParty: readonly {
    readonly partyOrganizationId: EntityId | null;
    readonly members: number;
  }[];
  readonly byCaucus: readonly {
    readonly caucusOrganizationId: EntityId | null;
    readonly members: number;
  }[];
}

export interface ChamberView {
  readonly chamberKey: ChamberKey;
  readonly organizationId: EntityId;
  readonly name: string;
  readonly seats: readonly SeatView[];
  readonly totals: ChamberTotals;
}

export interface CongressView {
  readonly asOf: IsoDate;
  readonly house: ChamberView;
  readonly senate: ChamberView;
  readonly sources: readonly string[];
}

export interface PartyView {
  readonly organizationId: EntityId;
  readonly partyKey: string;
  readonly name: string;
  readonly level: "national" | "state" | "local";
  readonly parentOrganizationId: EntityId | null;
  readonly jurisdictionId: EntityId | null;
  readonly affiliatedOfficeholders: number;
}

export interface LocalityGovernmentView {
  readonly organizationId: EntityId | null;
  readonly name: string;
  /** Empty when no holder is recorded; never an inferred mayor or council. */
  readonly holders: readonly PublicHolderView[];
  readonly membershipMissing: readonly string[];
}

export interface WorldOrientation {
  readonly version: typeof LIVING_WORLD_CONTRACT_VERSION;
  readonly asOf: IsoDate;
  readonly worldRevision: number;
  readonly executive: readonly PublicHolderView[];
  /** Null for a save whose public world was never established. */
  readonly congress: CongressView | null;
  readonly homeState: {
    readonly stateUsps: string;
    readonly jurisdictionId: EntityId | null;
    readonly governor: PublicHolderView | null;
  } | null;
  readonly locality: {
    readonly jurisdictionId: EntityId;
    readonly name: string | null;
    readonly governments: readonly LocalityGovernmentView[];
  } | null;
  readonly parties: readonly PartyView[];
  readonly publicMatters: readonly never[];
}
