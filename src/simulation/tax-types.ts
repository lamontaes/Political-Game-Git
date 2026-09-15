import type {
  EntityId,
  IsoDate,
  MoneyAmount,
  ResourcePositionOwner,
} from "./types";

/** Legal power, never a claim that a tax currently exists at this rate. */
export interface TaxPowerEvidence {
  readonly key: string;
  readonly jurisdictionKey: string;
  readonly level: "STATE" | "COUNTY" | "MUNICIPALITY";
  readonly instrument: "selective-excise" | "sales" | "property";
  readonly asOf: IsoDate;
  readonly sourceArtifactId: string;
  readonly sourceSha256: string;
  readonly sourceUrl: string;
  readonly citations: readonly string[];
  readonly constraints: readonly string[];
}

export interface TaxTerms {
  readonly seriesKey: string;
  readonly baseKey: string;
  readonly baseLabel: string;
  /** Exact share; zero is an explicit repeal/zero rate, never missing data. */
  readonly rateNumerator: number;
  readonly rateDenominator: number;
  readonly exemptBaseKeys: readonly string[];
  readonly allowanceMinorUnits: number;
  readonly currency: MoneyAmount["currency"];
  readonly collectionLagDays: number;
  readonly publicPurpose: string;
  readonly assumptionNote: string;
  readonly legalBaselineAssumption: "carry-forward-acquired-baseline-in-game";
}

interface TaxHistoryRoot {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly recordedAt: IsoDate;
}

export interface TaxProposalRecord extends TaxHistoryRoot {
  readonly measureId: EntityId;
  readonly sponsorPersonId: EntityId;
  readonly jurisdictionId: EntityId;
  readonly publicOrganizationId: EntityId;
  readonly power: TaxPowerEvidence;
  readonly terms: TaxTerms;
  readonly levyProvisionId: EntityId;
}

export interface TaxPolicyRecord extends TaxHistoryRoot {
  readonly proposalId: EntityId;
  readonly enactmentId: EntityId;
  readonly effectiveAt: IsoDate;
  readonly supersedesPolicyId: EntityId | null;
  readonly outcomeEventId: EntityId;
}

/** One modeled taxable occurrence; identity is independent of policy versions. */
export interface TaxBaseRecord extends TaxHistoryRoot {
  readonly jurisdictionId: EntityId;
  readonly payer: ResourcePositionOwner;
  readonly baseKey: string;
  readonly occurredAt: IsoDate;
  readonly amount: MoneyAmount;
  readonly assumptionNote: string;
  readonly sourceEventId: EntityId;
}

/** A frozen application of a policy to an occurrence, due once on the clock. */
export interface TaxAssessmentRecord extends TaxHistoryRoot {
  readonly policyId: EntityId;
  readonly baseId: EntityId;
  readonly dueAt: IsoDate;
  readonly taxableAmount: MoneyAmount;
  readonly taxAmount: MoneyAmount;
  readonly exemptionReason: "excluded-base" | "allowance" | null;
}

export interface TaxCollectionRecord extends TaxHistoryRoot {
  readonly assessmentId: EntityId;
  readonly status: "collected" | "zero" | "blocked";
  readonly transferredAmount: MoneyAmount;
  readonly resourceOutcomeId: EntityId | null;
  readonly outcomeEventId: EntityId;
  readonly reason: "missing-payer-position" | "insufficient-funds" | null;
}
