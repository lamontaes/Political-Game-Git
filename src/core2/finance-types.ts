import type { IsoDate, PersonId, Source, WorkResult } from "./types";

/** Standing terms describe obligations or a budget; they never supply cash. */
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
  };
  source: Source;
}

export interface FinanceContractState extends FinanceContractInput {
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
  lastWagePriceFactor: number;
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
  cause: FinanceReceipt | Omit<WorkResult, "decision">;
  endedJobIds: readonly string[];
  affectedPersonIds: readonly PersonId[];
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

export interface FinanceRuntime {
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
}

export interface FinancePolicyData {
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
