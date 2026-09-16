import type { EntityId, IsoDate } from "../types";

/**
 * ALIVE43 living-world contract. W owns the writers and these read shapes;
 * L's readers consume them. Additive changes keep the version; a changed or
 * removed field bumps it.
 */
export const LIVING_WORLD_CONTRACT_VERSION = "alive43-world/v1";

/**
 * The bounded authored setting a new save's public world is drawn from.
 *
 * It is setting data for a fictional save, not an estimate of the real
 * Congress, a forecast, or a claim about any party. No seat carries a
 * regional lean: state partisan geography is not modeled, so seats are
 * assigned without one rather than from an unsourced guess.
 */
export const LIVING_WORLD_SCENARIO_PROFILE = {
  id: "alive43-contemporary-us-v1",
  provenanceClass: "authored-setting",
  note: "Bounded authored starting variation for a fictional save; not an empirical estimate or description of any real body.",
  majorParties: [
    { key: "democratic", name: "Democratic Party" },
    { key: "republican", name: "Republican Party" },
  ],
  /** Permille of filled, party-affiliated seats held by the first party. */
  firstPartySharePermille: { min: 440, max: 560 },
  independents: { "us-house": [0, 2], "us-senate": [0, 3] },
  vacancies: { "us-house": [0, 3], "us-senate": [0, 1] },
  priorTermsMax: { "us-house": 8, "us-senate": 3 },
  /** Recent-past bound for when a represented vacancy began. */
  vacancyAgeDays: [7, 120],
} as const;

export type ChamberKey = "us-house" | "us-senate";
export type MajorPartyKey =
  (typeof LIVING_WORLD_SCENARIO_PROFILE.majorParties)[number]["key"];

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
  /**
   * The recorded term ended and nothing in the save records who, if anyone,
   * holds the seat now. Not a vacancy and not a member.
   */
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
  /** Derived from seats and participations on every read; never stored. */
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
  readonly partyKey: MajorPartyKey;
  readonly name: string;
  readonly level: "national" | "state" | "local";
  readonly parentOrganizationId: EntityId | null;
  readonly jurisdictionId: EntityId | null;
  /** Current officeholders in this save with a public affiliation to it. */
  readonly affiliatedOfficeholders: number;
}
