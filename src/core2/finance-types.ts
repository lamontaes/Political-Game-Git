import type { LivingPlan } from "./cost-of-living";
import type { IsoDate, PersonId, Source, WorkResult } from "./types";
import type { CashJournalSourceRef } from "./journal";
import type { CashJournalPostedMarker } from "./journal-state";
import type { WorkPayrollJournalReceipt } from "./work-payroll-cash";

export interface FinanceContractInput {
  id: string;
  householdId?: string;
  payerIds: readonly string[];
  payeeId: string;
  kind: string;
  amountMinor: number;
  dueAt: IsoDate;
  /** Exclusive end of a finite purchase/funding budget; accrued debt cannot expire here. */
  endsAt?: IsoDate;
  periodMonths: number;
  /** A purchase budget can go unfilled without becoming a debt. */
  accruesArrears: boolean;
  creditFacilityId?: string;
  interestFacilityId?: string;
  /** A dated standing budget can follow the bound firm's prices and demand. */
  marketAdjusted?: boolean;
  /** Procurement budget proportional to already received sales; never legal arrears. */
  salesReceiptBudget?: boolean;
  /** Actual payment for a purchase; funding/capital/loan receipts are distinct. */
  salesReceipt?: boolean;
  settlementPhaseId?: string;
  recipientIncome?: {
    personId: PersonId;
    householdId: string;
    kindId: string;
    sourceFactId: string;
    /**
     * A benefit level in force changed this award's amount from the date it
     * names: the amount the saved award fact is checked against now, the
     * measure behind it and the day it took effect.
     */
    adjustedMinor?: number;
    adjustedBy?: string;
    adjustedOn?: string;
    /**
     * The household the saved award names, kept when the person's home
     * changes (`householdId` then names where they live now) and the day.
     */
    recordedHouseholdId?: string;
    movedOn?: string;
  };
  externalInflow?: FinanceExternalInflow;
  source: Source;
}

/** A payer died or left the household and the obligation changed hands or ended, or a person joined the household and began paying it. */
export interface PayerHandover {
  readonly on: IsoDate;
  /** The payer who died, left or joined. */
  readonly from: string;
  readonly to: readonly string[];
  readonly outcome: "kept-by-co-payers" | "taken-over" | "ended" | "joined";
}

export interface FinanceContractState extends FinanceContractInput {
  /** Dated record of each payer who died, left or joined and what became of the obligation. */
  payerHandovers?: readonly PayerHandover[];
  /** Original admission date; dueAt advances and cannot define source validity. */
  firstDueAt: IsoDate;
  billingDay: number;
  lastSettledAt?: IsoDate;
  endedAt?: IsoDate;
  arrearsMinor: number;
  firstUnpaidAt?: IsoDate;
}

/** Approval is a recorded contract; the lender's actual cash remains binding. */
export interface CreditFacilityInput {
  id: string;
  borrowerId: string;
  lenderId: string;
  limitMinor: number;
  active: boolean;
  annualInterestParameter: string;
  interestDayCountParameter?: string;
  source: Source;
}

export interface CreditFacilityState extends CreditFacilityInput {
  principalMinor: number;
  interestArrearsMinor: number;
  lastInterestAt: IsoDate;
  interestRemainderMinor: number;
  unbilledInterestMinor: number;
  lastAccruedAt: IsoDate;
  /** Dated repricing: replaces the parameter rate from ratedAt on. */
  annualInterestRate?: number;
  ratedAt?: IsoDate;
  rateSource?: Source;
  /** Set when the borrower closes: the line takes no draw, accrues nothing and is never repriced or billed again. */
  closedAt?: IsoDate;
  /** What the borrower's remaining cash repaid at closing, and what the lender wrote off. */
  settledMinor?: number;
  writtenOffMinor?: number;
}

/** Cash has one authority: OrganizationInput.liquidMinor, never a second book. */
export interface BusinessBooksInput {
  organizationId: string;
  kindId: string;
  annualPayrollMinor: number;
  annualDemandMinor: number;
  annualOtherCostsMinor: number;
  openingTownIncomeMinor: number;
  capacityMinor: number;
  price: number;
  costContractIds: readonly string[];
  creditFacilityId?: string;
  source: Source;
}

export interface BusinessBooksState extends BusinessBooksInput {
  lastReviewedAt: IsoDate;
  reachedIncomeRatio: number;
  anchorAnnualDemandMinor: number;
  anchorAnnualOtherCostsMinor: number;
  anchorPrice: number;
  lastGeneralPriceFactor: number;
  /** The outcome web's factor on household prices in the place at the last review (absent reads as one). */
  lastWebPriceFactor?: number;
  lastWagePriceFactor: number;
  /**
   * Each current job's hourly pay at the last review, so the next review
   * prices a raise in and leaves a hire's different pay out.
   */
  lastHourlyByJob?: Record<string, number>;
  /**
   * The town's measured income in the first full month the book saw, a
   * year's worth: later months are read against it, so the opening's narrower
   * payroll anchor never compares with income it didn't count.
   */
  incomeBasisMinor?: number;
  nextReviewedAt: IsoDate;
  receivedMinor: number;
  salesReceivedMinor: number;
  operatingPaidMinor: number;
  wagesRequestedMinor: number;
  wagesPaidMinor: number;
  wagesUnpaidMinor: number;
  closedAt?: IsoDate;
  closingReasonKey?: string;
}

export interface FinanceInput {
  contracts: readonly FinanceContractInput[];
  facilities: readonly CreditFacilityInput[];
  businesses: readonly BusinessBooksInput[];
  gaps: readonly string[];
  conditions?: readonly FinanceConditionInput[];
}

/** Dated world-level economic input, never a future actor fact or a cash credit. */
export interface FinanceConditionInput {
  id: string;
  placeId: string;
  at: IsoDate;
  generalPriceFactor: number;
  wagePriceFactor: number;
  macroDemandFactor: number;
  source: Source;
}

export interface FinancePayment {
  payerId: string;
  requestedMinor: number;
  paidMinor: number;
  payerBeforeMinor: number;
  payerAfterMinor: number;
}

export interface FinanceReceipt {
  id: string;
  contractId: string;
  date: IsoDate;
  kind: string;
  payeeId: string;
  requestedMinor: number;
  paidMinor: number;
  unfundedMinor: number;
  arrearsMinor: number;
  payments: readonly FinancePayment[];
  payeeBeforeMinor: number;
  payeeAfterMinor: number;
  creditReceiptId?: string;
  salesBudget?: {
    payerId: string;
    previousReceivedMinor: number;
    receivedThroughMinor: number;
    receiptsMinor: number;
    routeCostShare: number;
    allocatedMinor: number;
    /** The dated pool is shared; these fields identify this route's due budget. */
    allocatedForContractMinor: number;
    pendingBeforeMinor: number;
    consumedBudgetMinor: number;
    budgetFirstAllocatedAt: IsoDate;
    budgetPreviousReceivedMinor: number;
    budgetReceivedThroughMinor: number;
  };
  source: Source;
}

export interface CreditReceipt {
  id: string;
  facilityId: string;
  date: IsoDate;
  reasonKey: string;
  requestedMinor: number;
  transferredMinor: number;
  principalBeforeMinor: number;
  principalAfterMinor: number;
  borrowerBeforeMinor: number;
  borrowerAfterMinor: number;
  lenderBeforeMinor: number;
  lenderAfterMinor: number;
  source: Source;
}

export interface EmployerClosure {
  organizationId: string;
  date: IsoDate;
  reasonKey: string;
  sourceReceiptId: string;
  /** Decision-free actual evidence survives superseded routine receipt compaction. */
  cause:
    | FinanceReceipt
    | Omit<WorkResult, "decision">
    | WorkPayrollJournalReceipt
    | ResidentWageShortfall
    | OwnerClosureChoice;
  endedJobIds: readonly string[];
  affectedPersonIds: readonly PersonId[];
  /** Counted workers' jobs end with the firm too; they live in the residents' books, not in the full jobs table. */
  endedCountedJobIds: readonly string[];
  affectedCountedPersonIds: readonly string[];
  /** Each credit line the firm held, as settled from its cash or written off by the lender. */
  creditLines: readonly {
    facilityId: string;
    settledMinor: number;
    writtenOffMinor: number;
  }[];
  source: Source;
}

/** An owner's choice to close a solvent business, and what they took out. */
export interface OwnerClosureChoice {
  kind: "owner.choice";
  id: string;
  date: IsoDate;
  organizationId: string;
  ownerAccountId: string;
  paidOutMinor: number;
  source: Source;
}

/** A missed count-worker payday (two-level population): wages owed and unpaid. */
export interface ResidentWageShortfall {
  kind: "residents.wages";
  id: string;
  date: IsoDate;
  organizationId: string;
  requestedMinor: number;
  paidMinor: number;
  shortfallMinor: number;
  workerCount: number;
  source: Source;
}

export interface FinanceTotals {
  requestedMinor: number;
  paidMinor: number;
  unfundedMinor: number;
  borrowedMinor: number;
  repaidMinor: number;
}

export interface SalesReceiptBudgetAllocation {
  payerId: string;
  date: IsoDate;
  previousReceivedMinor: number;
  receivedThroughMinor: number;
  receiptsMinor: number;
  routeCostShare: number;
  allocatedMinor: number;
  allocatedByContract: ReadonlyMap<string, number>;
}

/** An unspent purchasing allowance, never earmarked cash or a legal liability. */
export interface SalesReceiptPendingBudget {
  payerId: string;
  amountMinor: number;
  firstAllocatedAt: IsoDate;
  previousReceivedMinor: number;
  receivedThroughMinor: number;
}

export interface SalesReceiptBudgetPool extends SalesReceiptBudgetAllocation {
  /** Only due routes consume their accrued allocation in this dated phase. */
  requestedByContract: ReadonlyMap<string, number>;
  basisByContract: ReadonlyMap<string, SalesReceiptPendingBudget>;
  pendingBeforeByContract: ReadonlyMap<string, number>;
}

export interface FinanceRuntime extends FinanceCashRuntimeFields {
  creditRequestsAt: IsoDate;
  creditRequestIds: Set<string>;
  contracts: Map<string, FinanceContractState>;
  contractsDueAt: Map<IsoDate, Set<string>>;
  contractsEndingAt: Map<IsoDate, Set<string>>;
  contractsByBusiness: Map<string, Set<string>>;
  incomeContractsByPerson: Map<string, Set<string>>;
  facilities: Map<string, CreditFacilityState>;
  facilitiesByBorrower: Map<string, Set<string>>;
  businesses: Map<string, BusinessBooksState>;
  businessesByPlace: Map<string, Set<string>>;
  reviewsDueAt: Map<IsoDate, Set<string>>;
  paidIncomeByPlaceMonth: Map<string, number>;
  paidIncomeByPlaceMonthKind: Map<string, number>;
  salesReceivedThroughByPayer: Map<
    string,
    { date: IsoDate; receivedMinor: number }
  >;
  salesBudgetPoolsByPayer: Map<string, SalesReceiptBudgetPool>;
  salesPendingBudgetByContract: Map<string, SalesReceiptPendingBudget>;
  unfundedBusinessReceipts: Map<string, { date: IsoDate; id: string }>;
  repaymentDueFacilityIds: Set<string>;
  conditionsByPlace: Map<string, readonly FinanceConditionInput[]>;
  jobsByOrganization: Map<string, Set<string>>;
  latestReceiptsByContract: Map<string, FinanceReceipt>;
  latestCreditByFacility: Map<string, CreditReceipt>;
  detailedReceipts: Map<string, FinanceReceipt>;
  closures: Map<string, EmployerClosure>;
  totalsByKind: Map<string, FinanceTotals>;
  /** Each household's everyday spending (cost-of-living.ts), by household. */
  livingPlans: Map<string, LivingPlan>;
  livingDueAt: Map<IsoDate, Set<string>>;
  /** A household's housing and other owed bills, kept back before everyday spending. */
  obligationsByHousehold: Map<string, Set<string>>;
}

export interface FinancePolicyData {
  cashJournal: FinanceCashPolicy;
  version: string;
  reviewPeriodMonthsParameter: string;
  interestDayCountParameter: string;
  kinds: { purchase: string; operating: string; interest: string };
  reasons: { borrowing: string; repayment: string; closure: string };
  stopgapIds: readonly string[];
  stopgapId: string;
  salesReceiptBudgetStopgapId: string;
  settlementPhases: readonly { id: string; operation: "settle" | "procure" }[];
  defaultPhases: {
    funding: string;
    income: string;
    household: string;
    procurement: string;
    other: string;
  };
  wageIncomeKindId: string;
  recipientIncomeKinds: readonly {
    id: string;
    sourceKinds: readonly string[];
    status: string;
    contractKind: string;
    qualifyingFactsBySourceKind?: Readonly<
      Record<string, Readonly<Record<string, string>>>
    >;
  }[];
  gaps: { conditions: string; income: string };
}

/** Owning adapters enforce the exact supported descriptor shape before access. */
export interface FinanceExternalInflow {
  kind: string;
  ownerId: string;
  source: Source;
  incomeContractIds?: readonly string[];
  sourceAwardIds?: readonly string[];
  authorityRecordId?: string;
  appropriationRecordId?: string;
  agreementRecordId?: string;
  identityRecordId?: string;
  visitAgreementRecordId?: string;
  marketId?: string;
}
export interface FinanceRetirementExternalInflow extends FinanceExternalInflow {
  incomeContractIds: readonly string[];
  sourceAwardIds: readonly string[];
}
export interface FinancePublicProcurementExternalInflow extends FinanceExternalInflow {
  kind: "external.public-procurement";
  authorityRecordId: string;
  appropriationRecordId: string;
  agreementRecordId: string;
}
export interface FinanceVisitorLodgingExternalInflow extends FinanceExternalInflow {
  kind: "external.customer.visitor-lodging";
  identityRecordId: string;
  visitAgreementRecordId: string;
  marketId: string;
}
/** Immutable original agreement terms; advancing sibling dueAt changes no allocation. */
export interface FinanceCustomerOriginalTerms {
  payerIds: readonly string[];
  payeeId: string;
  kind: string;
  amountMinor: number;
  firstDueAt: IsoDate;
  periodMonths: number;
  endsAt?: IsoDate;
  settlementPhaseId: string;
}
/** Add externalInflow?: FinanceExternalInflow to FinanceContractInput. */
export interface FinanceCashCreditRequest {
  facilityId: string;
  requestedMinor: number;
  reasonKey: string;
  triggerId: string;
  repayment: boolean;
}
export interface FinanceCashSourceState extends CashJournalPostedMarker {
  id: string;
  kind: string;
  date: IsoDate;
  mode: "contract" | "credit" | "composite-credit";
  contractId?: string;
  facilityId?: string;
  trigger: CashJournalSourceRef;
  request?: Readonly<FinanceCashCreditRequest>;
  /** Bounded related occurrences in this one actual payment, never an ID history. */
  creditIds: readonly string[];
}
/** Add these maps to FinanceRuntime and initialize them in emptyFinanceRuntime. */
export interface FinanceCashRuntimeFields {
  cashSources: Map<string, FinanceCashSourceState>;
  cashLatestContractSource: Map<string, string>;
  cashLatestCreditSource: Map<string, string>;
  /** Only canonical current/open statement payloads needed before release. */
  cashRequiredReceipts: Map<string, FinanceReceipt | CreditReceipt>;
}
export interface FinanceCashPolicy {
  moduleId: string;
  sourceKinds: { contract: string; credit: string };
  relatedKinds: {
    terms: string;
    facility: string;
    award: string;
    procurement: string;
    authority: string;
    appropriation: string;
    agreement: string;
    job: string;
    provider: string;
    identity: string;
    visit: string;
    market: string;
    customerBudget: string;
  };
  financeReceiptPrefix: string;
  creditReceiptPrefix: string;
  interestContractPrefix: string;
  standaloneDrawRequestPrefix: string;
  externalInflowKinds: readonly string[];
  externalInflowContracts: readonly {
    inflowKind: string;
    contractKind: string;
    phaseId: string;
    validation: "retirement" | "public-procurement" | "visitor-lodging";
  }[];
  visitorLodging: {
    identityMetadataPrefix: string;
    visitMetadataPrefix: string;
    marketMetadataPrefix: string;
    ownerBudgetMetadataPrefix: string;
    identityKind: string;
    visitKind: string;
    serviceKey: string;
    supplierClassifications: readonly string[];
    supplierOccupations: readonly string[];
    providerMetadataPrefix: string;
  };
  procurement: readonly {
    contractKind: string;
    agreementContractSeparator: string;
    authorityFieldPrefix: string;
    appropriationFieldPrefix: string;
    agreementFieldPrefix: string;
    serviceKey: string;
    supplierClassifications: readonly string[];
    supplierOccupations: readonly string[];
    providerMetadataPrefix: string;
  }[];
}
/** Add cashJournal: FinanceCashPolicy to FinancePolicyData. */
