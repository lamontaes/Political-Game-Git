import type {
  EntityId,
  IsoDate,
  SimulationMoment,
  ElectionContestProvenance,
  TimeDemandProfile,
} from "./types";

export interface PresidentialTicket {
  readonly presidentPersonId: EntityId;
  readonly vicePresidentPersonId: EntityId;
  /** Declared fictional residence facts; never inferred from names/home locality. */
  readonly presidentState: string;
  readonly vicePresidentState: string;
}
export interface NationalElection {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly cycle: 2024 | 2028;
  readonly ruleVersion: "nara-2020-census-v1";
  readonly tickets: readonly PresidentialTicket[];
  readonly provenance: ElectionContestProvenance;
}
interface NationalRecordBase {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
  readonly electionId: EntityId;
  readonly provenance: ElectionContestProvenance;
}
export interface NationalContestLink extends NationalRecordBase {
  readonly kind: "contest-link";
  readonly unitKey: string;
  readonly contestId: EntityId;
}
export interface NationalUnitResult extends NationalRecordBase {
  readonly kind: "unit-result";
  /** USPS state/DC or ME-1/ME-2/NE-1/NE-2/NE-3. */
  readonly unitKey: string;
  readonly tallies: readonly {
    readonly candidatePersonId: EntityId;
    readonly votes: number;
  }[];
  readonly sourceContestResultId: EntityId | null;
  /** Lawfully resolved unit winner supplied by its state counting authority; raw totals do not select it. */
  readonly allocationWinnerPersonId: EntityId | null;
}
export interface NationalCertification extends NationalRecordBase {
  readonly kind: "certification";
  readonly resultId: EntityId;
  readonly disposition: "certified" | "contested";
  readonly authorityNote: string;
  readonly allocationWinnerPersonId: EntityId | null;
}
export interface NationalElectoralBallot extends NationalRecordBase {
  readonly kind: "ballot";
  /** Stable slot in the certified allocation, e.g. CA:1 or ME-1:1. */
  readonly electorKey: string;
  readonly presidentPersonId: EntityId | null;
  readonly vicePresidentPersonId: EntityId | null;
  readonly disposition: "accepted" | "contested";
}
export interface NationalElectoralCount extends NationalRecordBase {
  readonly kind: "count";
  readonly ballotIds: readonly EntityId[];
  readonly appointedElectors: number;
  /** Supplied constitutional choice lists from the count receiver; not a model rating. */
  readonly presidentialChoicePersonIds: readonly EntityId[];
  readonly vicePresidentialChoicePersonIds: readonly EntityId[];
  readonly presidentPersonId: EntityId | null;
  readonly vicePresidentPersonId: EntityId | null;
}
export interface NationalContingentChoice extends NationalRecordBase {
  readonly kind: "contingent-choice";
  readonly office: "president" | "vice-president";
  readonly countId: EntityId;
  readonly votes: readonly {
    readonly voterKey: string;
    readonly candidatePersonId: EntityId | null;
  }[];
  /** Senate whole-number membership is explicitly supplied by its canonical body receiver. */
  readonly wholeNumber: number;
  /** Canonical membership snapshot supplied by the Senate receiver; absent for House. */
  readonly senatorPersonIds: readonly EntityId[];
  readonly chosenPersonId: EntityId | null;
}
export interface NationalOfficeQualification extends NationalRecordBase {
  readonly kind: "qualification";
  readonly planId: EntityId;
  readonly personId: EntityId;
  readonly effectiveAt: SimulationMoment;
  readonly disposition: "qualified-and-sworn" | "refused";
  readonly authorityNote: string;
}
export interface NationalTermPlan extends NationalRecordBase {
  readonly kind: "term-plan";
  readonly office: "president" | "vice-president";
  readonly outcomeId: EntityId;
  readonly personId: EntityId;
  readonly startsAt: SimulationMoment;
  readonly endsAt: SimulationMoment;
  /** Separate recorded qualification/oath disposition; count alone grants no possession. */
  readonly qualificationNote: string;
  /** Explicit authored office-work demand supplied by the receiver, not a legal workload claim. */
  readonly workTimeDemand: TimeDemandProfile;
}
export interface NationalTermState extends NationalRecordBase {
  readonly kind: "term-state";
  readonly planId: EntityId;
  readonly effectiveAt: SimulationMoment;
  readonly status: "entered" | "ended" | "blocked";
  readonly workRelationshipId: EntityId | null;
  readonly outcomeEventId: EntityId | null;
  readonly reason: string | null;
}
/**
 * U.S. Const. amend. XXV, § 1: on the President's death the Vice President
 * becomes President. Written once, by GOVERNING, from a recorded death.
 */
export interface NationalSuccession extends NationalRecordBase {
  readonly kind: "succession";
  readonly vacatedPlanId: EntityId;
  readonly successorPlanId: EntityId;
  readonly personId: EntityId;
  readonly deathRecordId: EntityId;
  readonly effectiveAt: SimulationMoment;
  readonly basis: "us-const-amend-xxv-s1";
}
export type NationalElectionRecord =
  | NationalSuccession
  | NationalContestLink
  | NationalUnitResult
  | NationalCertification
  | NationalElectoralBallot
  | NationalElectoralCount
  | NationalContingentChoice
  | NationalTermPlan
  | NationalTermState
  | NationalOfficeQualification;
