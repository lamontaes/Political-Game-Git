import { recordEventKnowledge } from "./records";
import { recordWorldEvent } from "./world";
import { lifePlaceByJurisdictionId } from "./life-places";
import { moneyText } from "./money-text";
import { createStableId } from "./ids";
import { makeIsoDate } from "./dates";
import { createOrganization } from "./life";
import {
  createResourceFlow,
  createResourceObligation,
  money,
  recordResourceFlowTerms,
  recordResourceObligationState,
  recordResourceTransferOutcome,
} from "./resources";
import {
  outstandingDebtAt,
  loanBalanceComponentsAt,
  resourceFlowTermsAt,
  resourceObligationStateAt,
  resourcePositionAt,
} from "./resource-queries";
import { scheduleFutureDueItem } from "./future-transitions";
import {
  amortizedMonthlyPaymentMinor,
  cappedAnnualRateBasisPoints,
  monthlyInterestMinor,
  revolvingMinimumPaymentMinor,
} from "./public-benefit-formulas";
import type {
  DebtChargeRecord,
  DebtStanding,
  DebtStandingRecord,
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  HouseholdLoanKind,
  HistoricalCutoff,
  IsoDate,
  LenderKind,
  LifeRecordProvenance,
  LoanRepayment,
  LoanTermsRecord,
  MoneyAmount,
  ResourceEndpoint,
  ResourceFlow,
  ResourceObligation,
  ResourcePositionOwner,
  World,
} from "./types";

/**
 * Household loans (spec 11): a loan is the existing debt record (a monthly
 * resource flow from the borrower to the lender with a principal) plus the
 * terms it is owed under. Once a month every loan with terms is serviced:
 * interest is charged on the balance, the payment is taken from the
 * borrower's money, and a missed payment brings a late fee, then default,
 * then collections. Every rate and fee is an input from whoever writes the
 * loan; this module invents none.
 */
export const HOUSEHOLD_LOANS_VERSION = "household-loans/v1" as const;
export const HOUSEHOLD_LOAN_MONTH_KEY = "debt:monthly-servicing" as const;
const MONTH_PREFIX = `${HOUSEHOLD_LOANS_VERSION}:month:`;
/** The flow basis every serviced loan payment uses. */
export const LOAN_PAYMENT_BASIS = "obligation:loan-payment" as const;

export interface OpenHouseholdLoanInput {
  readonly stableKey: string;
  readonly borrower: ResourceEndpoint & {
    readonly kind: "person" | "household";
  };
  /** An existing lender, or null for the place's aggregate lender of this kind. */
  readonly lenderOrganizationId: EntityId | null;
  readonly lenderKind: LenderKind;
  readonly kind: HouseholdLoanKind;
  readonly principal: MoneyAmount;
  /** The rate the market offers this borrower for this kind of loan. */
  readonly marketAnnualRateBasisPoints: number;
  /** A rate cap in force for this loan, with the measure that set it. */
  readonly rateCap: {
    readonly capBasisPoints: number;
    readonly measureId: EntityId;
  } | null;
  readonly repayment: LoanRepayment;
  readonly lateFee: MoneyAmount | null;
  readonly missedPaymentsToDefault: number | null;
  readonly missedPaymentsToCollections: number | null;
  readonly jurisdictionId: EntityId;
  readonly housingTenureId: EntityId | null;
  readonly provenance: LifeRecordProvenance;
}

const LENDER_LABEL: Record<LenderKind, string> = {
  bank: "Bank",
  "credit-union": "Credit union",
  "federal-government": "Federal student aid",
  "payday-lender": "Payday lender",
  other: "Lender",
};

function nextFirstOfMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
}

function lenderFor(
  world: World,
  input: OpenHouseholdLoanInput,
): { world: World; organizationId: EntityId } {
  if (input.lenderOrganizationId !== null)
    return { world, organizationId: input.lenderOrganizationId };
  const stableKey = `lender:${input.lenderKind}:${input.jurisdictionId}`;
  const existing = world.history.organizations.find(
    (organization) => organization.stableKey === stableKey,
  );
  if (existing) return { world, organizationId: existing.id };
  const next = createOrganization(world, {
    stableKey,
    formedAt: world.currentDate,
    detailLevel: "lightweight",
    provenance: {
      kind: "authored",
      note: "An aggregate lender for household loans in this place. The game does not model individual banks.",
    },
    initialProfile: {
      name: LENDER_LABEL[input.lenderKind],
      classification: "enterprise:consumer-finance",
      locationJurisdictionId: input.jurisdictionId,
    },
  });
  return { world: next, organizationId: next.history.organizations.at(-1)!.id };
}

function assertTermsInput(input: {
  readonly repayment: LoanRepayment;
  readonly missedPaymentsToDefault: number | null;
  readonly missedPaymentsToCollections: number | null;
}): void {
  if (
    input.repayment.kind === "installment" &&
    !(
      Number.isSafeInteger(input.repayment.termMonths) &&
      input.repayment.termMonths > 0
    )
  )
    throw new Error("An installment loan needs a positive whole term.");
  for (const threshold of [
    input.missedPaymentsToDefault,
    input.missedPaymentsToCollections,
  ])
    if (
      threshold !== null &&
      !(Number.isSafeInteger(threshold) && threshold > 0)
    )
      throw new Error(
        "A recorded escalation threshold must be a positive whole missed-payment count.",
      );
  if (
    input.missedPaymentsToDefault !== null &&
    input.missedPaymentsToCollections !== null &&
    input.missedPaymentsToCollections < input.missedPaymentsToDefault
  )
    throw new Error(
      "Collections cannot precede the recorded default threshold.",
    );
}

/**
 * Writes a new loan today: the borrower owes the lender the principal, paid
 * on the first of each month from next month. The rate is the market rate, held at the cap when
 * a cap in force is lower. Schedules monthly servicing if nothing has yet.
 */
export function openHouseholdLoan(
  world: World,
  input: OpenHouseholdLoanInput,
): World {
  assertTermsInput(input);
  if (input.principal.minorUnits <= 0)
    throw new Error("A loan needs a positive principal.");
  const firstDue = nextFirstOfMonth(world.currentDate);
  const rate = cappedAnnualRateBasisPoints(
    input.marketAnnualRateBasisPoints,
    input.rateCap?.capBasisPoints ?? null,
  );
  const capped =
    input.rateCap !== null && rate < input.marketAnnualRateBasisPoints;
  const firstPayment =
    input.repayment.kind === "installment"
      ? amortizedMonthlyPaymentMinor(
          input.principal.minorUnits,
          rate,
          input.repayment.termMonths,
        )
      : revolvingMinimumPaymentMinor(
          input.principal.minorUnits,
          rate,
          input.repayment.principalShareBasisPoints,
          input.repayment.minimumPaymentFloor.minorUnits,
        );
  const lender = lenderFor(world, input);
  let next = lender.world;
  next = createResourceFlow(next, {
    stableKey: `${input.stableKey}:payments`,
    source: input.borrower,
    recipient: { kind: "organization", organizationId: lender.organizationId },
    startsAt: world.currentDate,
    initialStatus: "active",
    amount: money(firstPayment, input.principal.currency),
    cadenceKind: "schedule:monthly",
    basisKind: LOAN_PAYMENT_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: input.jurisdictionId,
    provenance: input.provenance,
  });
  const flowId = next.history.resourceFlows.at(-1)!.id;
  next = createResourceObligation(next, {
    stableKey: `${input.stableKey}:debt`,
    resourceFlowId: flowId,
    establishedAt: next.currentDate,
    basisKind: `debt:${input.kind}`,
    principal: input.principal,
    careResponsibilityId: null,
    housingTenureId: input.housingTenureId,
    provenance: input.provenance,
  });
  const obligationId = next.history.resourceObligations.at(-1)!.id;
  next = appendLoanTerms(next, {
    stableKey: `${input.stableKey}:terms`,
    resourceObligationId: obligationId,
    effectiveAt: next.currentDate,
    kind: input.kind,
    lenderKind: input.lenderKind,
    annualRateBasisPoints: rate,
    rateBasis: capped ? "capped" : "written",
    rateCapMeasureId: capped ? input.rateCap!.measureId : null,
    repayment: input.repayment,
    lateFee: input.lateFee,
    missedPaymentsToDefault: input.missedPaymentsToDefault,
    missedPaymentsToCollections: input.missedPaymentsToCollections,
    provenance: input.provenance,
    supersedesTermsId: null,
  });
  next = appendDebtStanding(next, {
    stableKey: `${input.stableKey}:standing:opened`,
    resourceObligationId: obligationId,
    effectiveAt: next.currentDate,
    standing: "current",
    consecutiveMissedPayments: 0,
    supersedesStandingId: null,
  });
  return ensureHouseholdLoanServicing(next, firstDue);
}

/**
 * Supersedes a loan's terms from today, as a law or a new agreement does:
 * a new rate, a new plan. The payment is recomputed on the next servicing.
 */
export function reviseLoanTerms(
  world: World,
  resourceObligationId: EntityId,
  change: Partial<
    Pick<
      LoanTermsRecord,
      | "annualRateBasisPoints"
      | "rateBasis"
      | "rateCapMeasureId"
      | "repayment"
      | "lateFee"
    >
  >,
  stableKey: string,
  provenance: LifeRecordProvenance,
): World {
  const current = loanTermsAt(world, resourceObligationId, world.currentDate);
  if (!current) throw new Error("This debt has no loan terms to revise.");
  const revised = { ...current, ...change };
  assertTermsInput(revised);
  return appendLoanTerms(world, {
    stableKey,
    resourceObligationId,
    effectiveAt: world.currentDate,
    kind: current.kind,
    lenderKind: current.lenderKind,
    annualRateBasisPoints: revised.annualRateBasisPoints,
    rateBasis: revised.rateBasis,
    rateCapMeasureId: revised.rateCapMeasureId,
    repayment: revised.repayment,
    lateFee: revised.lateFee,
    missedPaymentsToDefault: current.missedPaymentsToDefault,
    missedPaymentsToCollections: current.missedPaymentsToCollections,
    provenance,
    supersedesTermsId: current.id,
  });
}

/** A separate noncash discharge, never a terms revision or a forged payment. */
export function recordLoanDischarge(
  world: World,
  resourceObligationId: EntityId,
  amounts: { readonly principal: MoneyAmount; readonly interest: MoneyAmount },
  stableKey: string,
  provenance: LifeRecordProvenance,
): World {
  const existing = (world.history.loanDischarges ?? []).find(
    (row) => row.stableKey === stableKey,
  );
  if (existing) {
    if (
      existing.resourceObligationId !== resourceObligationId ||
      existing.principal.minorUnits !== amounts.principal.minorUnits ||
      existing.interest.minorUnits !== amounts.interest.minorUnits ||
      existing.principal.currency !== amounts.principal.currency ||
      existing.interest.currency !== amounts.interest.currency
    )
      throw new Error(
        "A discharge identity cannot be reused for another credit.",
      );
    return world;
  }
  if (!loanTermsAt(world, resourceObligationId, world.currentDate))
    throw new Error("This debt has no recorded loan terms.");
  const components = loanBalanceComponentsAt(world, resourceObligationId);
  if (!components)
    throw new Error("Loan discharge needs recorded repayment allocations.");
  for (const key of ["principal", "interest"] as const) {
    const amount = amounts[key];
    if (
      !Number.isSafeInteger(amount.minorUnits) ||
      amount.minorUnits < 0 ||
      amount.currency !== components[key].currency ||
      amount.minorUnits > components[key].minorUnits
    )
      throw new Error("A loan discharge must fit its recorded component.");
  }
  if (amounts.principal.minorUnits + amounts.interest.minorUnits <= 0)
    throw new Error("A discharge needs a positive credit.");
  return append(world, "loanDischarges", "loan-discharge", {
    stableKey,
    resourceObligationId,
    effectiveAt: world.currentDate,
    principal: { ...amounts.principal },
    interest: { ...amounts.interest },
    provenance,
  });
}

/** Retains the old primitive API while writing the approved separate record. */
export function reduceLoanPrincipal(
  world: World,
  resourceObligationId: EntityId,
  amount: MoneyAmount,
  stableKey: string,
  provenance: LifeRecordProvenance,
): World {
  const legacy = (world.history.loanTerms ?? []).find(
    (row) => row.stableKey === stableKey && row.principalReduction,
  );
  if (legacy) {
    if (
      legacy.resourceObligationId !== resourceObligationId ||
      legacy.principalReduction!.minorUnits !== amount.minorUnits ||
      legacy.principalReduction!.currency !== amount.currency
    )
      throw new Error("A legacy principal credit identity cannot be reused.");
    return world;
  }
  return recordLoanDischarge(
    world,
    resourceObligationId,
    { principal: amount, interest: money(0, amount.currency) },
    stableKey,
    provenance,
  );
}

/** The actual cash outcome is split fees, then accrued interest, then principal. */
export function recordLoanRepaymentAllocation(
  world: World,
  resourceObligationId: EntityId,
  outcomeId: EntityId,
  stableKey: string,
): World {
  const existing = (world.history.loanRepaymentAllocations ?? []).find(
    (row) =>
      row.resourceTransferOutcomeId === outcomeId ||
      row.stableKey === stableKey,
  );
  if (existing) {
    if (
      existing.resourceObligationId !== resourceObligationId ||
      existing.resourceTransferOutcomeId !== outcomeId ||
      existing.stableKey !== stableKey
    )
      throw new Error("A repayment allocation identity cannot be reused.");
    return world;
  }
  const debt = world.history.resourceObligations.find(
    (row) => row.id === resourceObligationId,
  );
  const outcome = world.history.resourceTransferOutcomes.find(
    (row) => row.id === outcomeId,
  );
  if (
    !debt?.principal ||
    !outcome ||
    outcome.resourceFlowId !== debt.resourceFlowId ||
    outcome.sequence <= debt.sequence
  )
    throw new Error("A repayment allocation needs the loan's actual outcome.");
  const currency = debt.principal.currency;
  if (outcome.transferredAmount.currency !== currency)
    throw new Error("Loan repayment currency must agree.");
  const components = loanBalanceComponentsAt(world, resourceObligationId, {
    asOfDate: outcome.occurredAt,
    historySequenceExclusive: outcome.sequence,
  });
  const paid = outcome.transferredAmount.minorUnits;
  if (!components && paid > 0)
    return append(
      world,
      "loanRepaymentAllocations",
      "loan-repayment-allocation",
      {
        stableKey,
        resourceObligationId,
        resourceTransferOutcomeId: outcome.id,
        occurredAt: outcome.occurredAt,
        fees: null,
        interest: null,
        principal: null,
        unsupportedReason: "missing-prior-repayment-allocation",
      },
    );
  const fees = Math.min(paid, components?.fees.minorUnits ?? 0);
  const interest = Math.min(paid - fees, components?.interest.minorUnits ?? 0);
  const principal = paid - fees - interest;
  if (principal > (components?.principal.minorUnits ?? 0))
    throw new Error("Repayment exceeds recorded loan components.");
  return append(
    world,
    "loanRepaymentAllocations",
    "loan-repayment-allocation",
    {
      stableKey,
      resourceObligationId,
      resourceTransferOutcomeId: outcome.id,
      occurredAt: outcome.occurredAt,
      fees: money(fees, currency),
      interest: money(interest, currency),
      principal: money(principal, currency),
      unsupportedReason: null,
    },
  );
}

export function loanTermsAt(
  world: World,
  resourceObligationId: EntityId,
  date: IsoDate | HistoricalCutoff,
): LoanTermsRecord | undefined {
  const asOfDate = typeof date === "string" ? date : date.asOfDate;
  const frontier =
    typeof date === "string"
      ? world.history.nextSequence
      : date.historySequenceExclusive;
  return (world.history.loanTerms ?? [])
    .filter(
      (row) =>
        row.resourceObligationId === resourceObligationId &&
        row.effectiveAt <= asOfDate &&
        row.sequence < frontier,
    )
    .at(-1);
}

export function debtStandingAt(
  world: World,
  resourceObligationId: EntityId,
  date: IsoDate = world.currentDate,
): DebtStandingRecord | undefined {
  return (world.history.debtStandings ?? [])
    .filter(
      (row) =>
        row.resourceObligationId === resourceObligationId &&
        row.effectiveAt <= date,
    )
    .at(-1);
}

export interface HouseholdLoanReading {
  readonly obligation: ResourceObligation;
  readonly terms: LoanTermsRecord;
  readonly balance: MoneyAmount | null;
  readonly standing: DebtStanding;
  readonly monthlyPayment: MoneyAmount | null;
}

/** Every loan a person or household owes, with its balance and standing. */
export function householdLoansOf(
  world: World,
  owner: ResourcePositionOwner,
): readonly HouseholdLoanReading[] {
  const readings: HouseholdLoanReading[] = [];
  for (const obligation of world.history.resourceObligations) {
    const terms = loanTermsAt(world, obligation.id, world.currentDate);
    if (!terms) continue;
    const flow = flowOf(world, obligation);
    if (!sameOwner(flow.source, owner)) continue;
    readings.push({
      obligation,
      terms,
      balance: outstandingDebtAt(world, obligation.id),
      standing: debtStandingAt(world, obligation.id)?.standing ?? "current",
      monthlyPayment: resourceFlowTermsAt(world, flow.id)?.amount ?? null,
    });
  }
  return readings;
}

/** Counts for a watched world: loans by standing, and money moved. */
export function householdLoanTotals(world: World): {
  readonly loans: number;
  readonly byStanding: Readonly<Record<DebtStanding, number>>;
  readonly interestChargedMinor: number;
  readonly lateFeesMinor: number;
  readonly paymentsMinor: number;
} {
  const byStanding: Record<DebtStanding, number> = {
    current: 0,
    late: 0,
    default: 0,
    collections: 0,
    "paid-off": 0,
  };
  const obligations = new Set(
    (world.history.loanTerms ?? []).map((row) => row.resourceObligationId),
  );
  for (const id of obligations)
    byStanding[debtStandingAt(world, id)?.standing ?? "current"] += 1;
  let interest = 0;
  let fees = 0;
  for (const charge of world.history.debtCharges ?? [])
    if (charge.kind === "interest") interest += charge.amount.minorUnits;
    else fees += charge.amount.minorUnits;
  const flows = new Set(
    world.history.resourceObligations
      .filter((row) => obligations.has(row.id))
      .map((row) => row.resourceFlowId),
  );
  let payments = 0;
  for (const outcome of world.history.resourceTransferOutcomes)
    if (flows.has(outcome.resourceFlowId))
      payments += outcome.transferredAmount.minorUnits;
  return {
    loans: obligations.size,
    byStanding,
    interestChargedMinor: interest,
    lateFeesMinor: fees,
    paymentsMinor: payments,
  };
}

function monthStableKey(dueOn: IsoDate): string {
  return `${MONTH_PREFIX}${dueOn.slice(0, 7)}`;
}

/** Schedules the servicing run on `dueOn` unless one is already there. */
export function ensureHouseholdLoanServicing(
  world: World,
  dueOn: IsoDate,
): World {
  const stableKey = monthStableKey(dueOn);
  if (world.history.futureDueItems.some((item) => item.stableKey === stableKey))
    return world;
  return scheduleFutureDueItem(world, {
    stableKey,
    dueAt: dueOn,
    transitionKey: HOUSEHOLD_LOAN_MONTH_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: stableKey },
  });
}

/**
 * The monthly servicing run: every loan whose first payment has come due is
 * serviced for this month, then next month's run is scheduled while any loan
 * is still owed.
 */
export function householdLoanMonthHandler(
  world: World,
  dueItem: FutureDueItem,
): FutureTransitionHandlerResult {
  if (
    dueItem.transitionKey !== HOUSEHOLD_LOAN_MONTH_KEY ||
    !dueItem.stableKey.startsWith(MONTH_PREFIX)
  )
    throw new Error("The loan servicing handler received another transition.");
  let next = settleHouseholdLoanPayments(world);
  const open = next.history.resourceObligations.some((debt) => {
    const flow = next.history.resourceFlows.find(
      (row) => row.id === debt.resourceFlowId,
    );
    return (
      debt.principal !== null &&
      flow &&
      (flow.basisKind === LOAN_PAYMENT_BASIS ||
        flow.basisKind === "housing:mortgage") &&
      (outstandingDebtAt(next, debt.id)?.minorUnits ?? 0) > 0
    );
  });
  if (open)
    next = ensureHouseholdLoanServicing(
      next,
      nextFirstOfMonth(world.currentDate),
    );
  return {
    world: next,
    status: "resolved",
    reasonKey: "debt:month-serviced",
    context:
      "Household loans serviced through their recorded terms and due periods.",
    outcomeEventId: null,
  };
}

/** One due-period runner for scheduled loans and old saved mortgage flows. */
export function settleHouseholdLoanPayments(
  world: World,
  personId?: EntityId,
): World {
  let next = world;
  const flows = new Map(
    world.history.resourceFlows.map((row) => [row.id, row]),
  );
  for (const debt of world.history.resourceObligations) {
    const flow = flows.get(debt.resourceFlowId);
    if (
      !debt.principal ||
      !flow ||
      (personId !== undefined &&
        (flow.source.kind !== "person" || flow.source.personId !== personId))
    )
      continue;
    const hasTerms =
      loanTermsAt(world, debt.id, world.currentDate) !== undefined;
    if (!hasTerms && flow.basisKind !== "housing:mortgage") continue;
    let latest: IsoDate | null = null;
    for (const outcome of world.history.resourceTransferOutcomes)
      if (
        outcome.resourceFlowId === flow.id &&
        outcome.periodStartsAt <= world.currentDate &&
        (latest === null || outcome.periodStartsAt > latest)
      )
        latest = outcome.periodStartsAt;
    let dueOn = nextFirstOfMonth(latest ?? flow.startsAt);
    // Preserve the old save catch-up boundary; no new payment forecast or level.
    for (let month = 0; month < 480 && dueOn <= next.currentDate; month += 1) {
      const owed = outstandingDebtAt(next, debt.id);
      if (!owed || owed.minorUnits <= 0) break;
      next = hasTerms
        ? serviceLoanMonth(next, debt, dueOn)
        : flow.source.kind === "person"
          ? serviceLegacyMortgageMonth(
              next,
              flow.source.personId,
              flow,
              dueOn,
              owed,
            )
          : next;
      dueOn = nextFirstOfMonth(dueOn);
    }
  }
  return next;
}

function mortgageMoneyText(minor: number): string {
  return moneyText({ minorUnits: minor, currency: "USD" });
}

function monthName(date: IsoDate): string {
  return new Date(`${date}T12:00:00Z`).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}

function serviceLegacyMortgageMonth(
  world: World,
  personId: EntityId,
  flow: ResourceFlow,
  dueOn: IsoDate,
  owed: MoneyAmount,
): World {
  let terms = resourceFlowTermsAt(world, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: world.history.nextSequence,
  })!;
  // The last payment is only what is left on the loan, recorded as the terms
  // for that month so the payment reads as paid in full.
  if (owed.minorUnits < terms.amount.minorUnits) {
    world = recordResourceFlowTerms(world, {
      stableKey: `${flow.stableKey}:terms:final:${dueOn}`,
      resourceFlowId: flow.id,
      effectiveAt: dueOn,
      status: "active",
      amount: owed,
      cadenceKind: terms.cadenceKind,
      reason: "The last payment is what is left on the loan.",
      provenance: flow.provenance,
      supersedesTermsId: terms.id,
    });
    terms = resourceFlowTermsAt(world, flow.id)!;
  }
  const scheduled = terms.amount;
  const owner = { kind: "person" as const, personId };
  const balanceOn = (asOfDate: IsoDate) =>
    resourcePositionAt(world, owner, scheduled.currency, {
      asOfDate,
      historySequenceExclusive: world.history.nextSequence,
    })?.liquidBalance.minorUnits ?? 0;
  const checkpoints = new Set<IsoDate>([dueOn, world.currentDate]);
  for (const outcome of world.history.resourceTransferOutcomes)
    if (outcome.occurredAt > dueOn && outcome.occurredAt < world.currentDate)
      checkpoints.add(outcome.occurredAt);
  const available = Math.max(0, Math.min(...[...checkpoints].map(balanceOn)));
  const due = scheduled.minorUnits;
  const paid = Math.min(available, due);
  const status =
    paid === scheduled.minorUnits
      ? "completed"
      : paid > 0
        ? "partial"
        : "missed";
  const next = recordResourceTransferOutcome(world, {
    stableKey: `${flow.stableKey}:${dueOn}`,
    resourceFlowId: flow.id,
    periodStartsAt: dueOn,
    periodEndsAt: dueOn,
    occurredAt: dueOn,
    status,
    attemptedAmount: scheduled,
    transferredAmount: money(paid, scheduled.currency),
    reasonKind: status === "completed" ? null : "capacity:insufficient-funds",
    note: `Mortgage for ${monthName(dueOn)}.`,
    provenance: flow.provenance,
  });
  return paid < due
    ? recordMortgageMissedPayment(next, personId, due, paid, dueOn)
    : next;
}

function recordMortgageMissedPayment(
  world: World,
  personId: EntityId,
  owedMinor: number,
  paidMinor: number,
  dueOn: IsoDate,
): World {
  if (
    world.history.events.some(
      (event) =>
        event.involvedEntityIds.includes(personId) &&
        event.tags.includes("life.mortgage-missed"),
    )
  )
    return world;
  const person = world.people[personId]!;
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const summary =
    paidMinor > 0
      ? `${monthName(dueOn)}'s mortgage payment was ${mortgageMoneyText(owedMinor)}, and you could pay ${mortgageMoneyText(paidMinor)} of it.`
      : `${monthName(dueOn)}'s mortgage payment was ${mortgageMoneyText(owedMinor)}, and you could not pay any of it.`;
  const stableKey = `mortgage-missed:${personId}:${dueOn}`;
  const next = recordWorldEvent(world, {
    stableKey,
    type: "life.mortgage-missed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: place?.context.jurisdiction.id ?? null,
    involvedEntityIds: [personId],
    participants: [
      { personId, role: "focus:subject", detail: "Missed a mortgage payment" },
    ],
    personFactConstraints: [],
    visibility: "private",
    tags: ["life.mortgage-missed"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
  return recordEventKnowledge(next, {
    stableKey: `${stableKey}:knowledge`,
    personId,
    eventId: next.history.events.at(-1)!.id,
    learnedAt: world.currentDate,
    believedSummary: summary,
    accuracy: "accurate",
    confidence: "high",
    source: { kind: "direct" },
  });
}

function flowOf(world: World, obligation: ResourceObligation): ResourceFlow {
  return world.history.resourceFlows.find(
    (row) => row.id === obligation.resourceFlowId,
  )!;
}

function serviceLoanMonth(
  world: World,
  obligation: ResourceObligation,
  dueOn: IsoDate,
): World {
  const flow = flowOf(world, obligation);
  if (
    world.history.resourceTransferOutcomes.some(
      (row) =>
        row.resourceFlowId === flow.id &&
        row.periodStartsAt === dueOn &&
        row.periodEndsAt === dueOn,
    )
  )
    return world;
  const terms = loanTermsAt(world, obligation.id, dueOn)!;
  const key = `${obligation.stableKey}:${dueOn}`;
  let next = world;
  const opening = outstandingDebtAt(next, obligation.id)!;
  if (opening.minorUnits <= 0)
    return markPaidOff(next, obligation, flow, dueOn);
  const currency = opening.currency;

  const interest = monthlyInterestMinor(
    opening.minorUnits,
    terms.annualRateBasisPoints,
  );
  if (interest > 0)
    next = appendDebtCharge(next, {
      stableKey: `${key}:interest`,
      resourceObligationId: obligation.id,
      chargedAt: dueOn,
      kind: "interest",
      amount: money(interest, currency),
      loanTermsId: terms.id,
    });
  const owed = opening.minorUnits + interest;
  const scheduled =
    terms.repayment.kind === "installment"
      ? scheduledInstallment(next, flow, terms, opening.minorUnits, dueOn)
      : revolvingMinimumPaymentMinor(
          opening.minorUnits,
          terms.annualRateBasisPoints,
          terms.repayment.principalShareBasisPoints,
          terms.repayment.minimumPaymentFloor.minorUnits,
        );
  const due = Math.min(owed, scheduled);
  const flowTerms = resourceFlowTermsAt(next, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: next.history.nextSequence,
  })!;
  if (flowTerms.amount.minorUnits !== due)
    next = recordResourceFlowTerms(next, {
      stableKey: `${key}:due`,
      resourceFlowId: flow.id,
      effectiveAt: dueOn,
      status: "active",
      amount: money(due, currency),
      cadenceKind: flowTerms.cadenceKind,
      reason: "This month's payment under the loan's terms.",
      provenance: terms.provenance,
      supersedesTermsId: flowTerms.id,
    });

  const position = resourcePositionAt(
    next,
    endpointOwner(flow.source),
    currency,
  );
  if (!position) {
    // The borrower's money is not tracked, so whether they could pay is
    // unknown. The payment is recorded as blocked, not missed; standing holds.
    next = recordResourceTransferOutcome(next, {
      stableKey: `${key}:payment`,
      resourceFlowId: flow.id,
      periodStartsAt: dueOn,
      periodEndsAt: dueOn,
      occurredAt: dueOn,
      status: "blocked",
      attemptedAmount: money(due, currency),
      transferredAmount: money(0, currency),
      reasonKind: "capacity:money-unknown",
      note: "The borrower's money is not tracked.",
      provenance: terms.provenance,
    });
    return recordLoanRepaymentAllocation(
      next,
      obligation.id,
      next.history.resourceTransferOutcomes.at(-1)!.id,
      `${key}:allocation`,
    );
  }
  const paid = Math.max(0, Math.min(position.liquidBalance.minorUnits, due));
  next = recordResourceTransferOutcome(next, {
    stableKey: `${key}:payment`,
    resourceFlowId: flow.id,
    periodStartsAt: dueOn,
    periodEndsAt: dueOn,
    occurredAt: dueOn,
    status: paid === due ? "completed" : paid > 0 ? "partial" : "missed",
    attemptedAmount: money(due, currency),
    transferredAmount: money(paid, currency),
    reasonKind: paid === due ? null : "capacity:insufficient-funds",
    note: null,
    provenance: terms.provenance,
  });
  next = recordLoanRepaymentAllocation(
    next,
    obligation.id,
    next.history.resourceTransferOutcomes.at(-1)!.id,
    `${key}:allocation`,
  );

  const previous = debtStandingAt(next, obligation.id, dueOn);
  if (paid === due) {
    if (outstandingDebtAt(next, obligation.id)!.minorUnits <= 0)
      return markPaidOff(next, obligation, flow, dueOn);
    // A loan in default or collections stays there: one payment does not cure it.
    const stays =
      previous?.standing === "default" || previous?.standing === "collections";
    if (previous?.standing === "current" || stays) return next;
    return appendDebtStanding(next, {
      stableKey: `${key}:standing`,
      resourceObligationId: obligation.id,
      effectiveAt: dueOn,
      standing: "current",
      consecutiveMissedPayments: 0,
      supersedesStandingId: previous?.id ?? null,
    });
  }
  if (terms.lateFee !== null && terms.lateFee.minorUnits > 0)
    next = appendDebtCharge(next, {
      stableKey: `${key}:late-fee`,
      resourceObligationId: obligation.id,
      chargedAt: dueOn,
      kind: "late-fee",
      amount: terms.lateFee,
      loanTermsId: terms.id,
    });
  const missed = (previous?.consecutiveMissedPayments ?? 0) + 1;
  const standing: DebtStanding =
    (terms.missedPaymentsToCollections !== null &&
      missed >= terms.missedPaymentsToCollections) ||
    previous?.standing === "collections"
      ? "collections"
      : (terms.missedPaymentsToDefault !== null &&
            missed >= terms.missedPaymentsToDefault) ||
          previous?.standing === "default"
        ? "default"
        : "late";
  return appendDebtStanding(next, {
    stableKey: `${key}:standing`,
    resourceObligationId: obligation.id,
    effectiveAt: dueOn,
    standing,
    consecutiveMissedPayments: missed,
    supersedesStandingId: previous?.id ?? null,
  });
}

/**
 * An installment loan's level payment, recomputed from the balance and the
 * months left whenever its rate has changed since the payment was set.
 */
function scheduledInstallment(
  world: World,
  flow: ResourceFlow,
  terms: LoanTermsRecord,
  balanceMinor: number,
  dueOn: IsoDate,
): number {
  if (terms.repayment.kind !== "installment")
    throw new Error("Not installment.");
  const paymentsMade = world.history.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === flow.id,
  ).length;
  const monthsLeft = Math.max(1, terms.repayment.termMonths - paymentsMade);
  const firstTerms = (world.history.loanTerms ?? []).find(
    (row) => row.resourceObligationId === terms.resourceObligationId,
  )!;
  const current = resourceFlowTermsAt(world, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: world.history.nextSequence,
  })!;
  if (terms.id === firstTerms.id && current.amount.minorUnits > 0)
    return current.amount.minorUnits;
  return amortizedMonthlyPaymentMinor(
    balanceMinor,
    terms.annualRateBasisPoints,
    monthsLeft,
  );
}

function markPaidOff(
  world: World,
  obligation: ResourceObligation,
  flow: ResourceFlow,
  dueOn: IsoDate,
): World {
  const previous = debtStandingAt(world, obligation.id, dueOn);
  let next = appendDebtStanding(world, {
    stableKey: `${obligation.stableKey}:${dueOn}:paid-off`,
    resourceObligationId: obligation.id,
    effectiveAt: dueOn,
    standing: "paid-off",
    consecutiveMissedPayments: 0,
    supersedesStandingId: previous?.id ?? null,
  });
  const state = resourceObligationStateAt(next, obligation.id);
  if (state && state.status === "active")
    next = recordResourceObligationState(next, {
      stableKey: `${obligation.stableKey}:${dueOn}:satisfied`,
      resourceObligationId: obligation.id,
      effectiveAt: dueOn,
      status: "satisfied",
      reason: "The loan is paid off.",
      provenance: flow.provenance,
      supersedesStateId: state.id,
    });
  return next;
}

function endpointOwner(endpoint: ResourceEndpoint): ResourcePositionOwner {
  if (endpoint.kind === "person")
    return { kind: "person", personId: endpoint.personId };
  if (endpoint.kind === "household")
    return { kind: "household", householdId: endpoint.householdId };
  return { kind: "organization", organizationId: endpoint.organizationId };
}

function sameOwner(
  endpoint: ResourceEndpoint,
  owner: ResourcePositionOwner,
): boolean {
  const a = endpointOwner(endpoint);
  if (a.kind !== owner.kind) return false;
  if (a.kind === "person") return a.personId === (owner as typeof a).personId;
  if (a.kind === "household")
    return a.householdId === (owner as typeof a).householdId;
  return a.organizationId === (owner as typeof a).organizationId;
}

type Draft<T> = Omit<T, "id" | "sequence" | "recordedAt">;

function appendLoanTerms(world: World, draft: Draft<LoanTermsRecord>): World {
  return append(world, "loanTerms", "loan-terms", draft);
}

function appendDebtCharge(world: World, draft: Draft<DebtChargeRecord>): World {
  return append(world, "debtCharges", "debt-charge", draft);
}

function appendDebtStanding(
  world: World,
  draft: Draft<DebtStandingRecord>,
): World {
  return append(world, "debtStandings", "debt-standing", draft);
}

type LoanField =
  | "loanTerms"
  | "debtCharges"
  | "debtStandings"
  | "loanRepaymentAllocations"
  | "loanDischarges";

function append<K extends LoanField>(
  world: World,
  field: K,
  kind:
    | "loan-terms"
    | "debt-charge"
    | "debt-standing"
    | "loan-repayment-allocation"
    | "loan-discharge",
  draft: Draft<NonNullable<World["history"][K]>[number]>,
): World {
  const record = {
    ...draft,
    id: createStableId(kind, `${world.id}:${draft.stableKey}`),
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
  } as NonNullable<World["history"][K]>[number];
  if (
    (world.history[field] ?? []).some(
      (row) => row.id === record.id || row.stableKey === record.stableKey,
    )
  )
    throw new Error(`Duplicate ${kind} identity.`);
  return {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      [field]: [...(world.history[field] ?? []), record],
    },
  };
}

/**
 * Saved loan records must reconcile: stable identities in order, terms and
 * charges tied to a real debt, charges positive, a standing's missed count
 * consistent with its standing, and interest charged only on a date the
 * terms were in force.
 */
export function assertHouseholdLoanIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const groups = [
    ["loan-terms", world.history.loanTerms ?? []],
    ["debt-charge", world.history.debtCharges ?? []],
    ["debt-standing", world.history.debtStandings ?? []],
    ["loan-repayment-allocation", world.history.loanRepaymentAllocations ?? []],
    ["loan-discharge", world.history.loanDischarges ?? []],
  ] as const;
  for (const [kind, records] of groups) {
    let previous = -1;
    const keys = new Set<string>();
    for (const row of records) {
      if (
        !row.stableKey.trim() ||
        ids.has(row.id) ||
        row.id !== createStableId(kind, `${world.id}:${row.stableKey}`) ||
        keys.has(row.stableKey) ||
        row.sequence <= previous ||
        row.recordedAt > world.currentDate
      )
        throw new Error("Invalid household loan identity, ordering or date.");
      ids.add(row.id);
      keys.add(row.stableKey);
      previous = row.sequence;
    }
  }
  const debts = new Map(
    world.history.resourceObligations.map((row) => [row.id, row]),
  );
  const terms = new Map(
    (world.history.loanTerms ?? []).map((row) => [row.id, row]),
  );
  const reductions = new Map<EntityId, number>();
  for (const row of world.history.loanTerms ?? []) {
    assertTermsInput(row);
    const debt = debts.get(row.resourceObligationId);
    if (!debt?.principal || debt.sequence >= row.sequence)
      throw new Error("Loan terms must follow the debt they govern.");
    if (
      !Number.isFinite(row.annualRateBasisPoints) ||
      row.annualRateBasisPoints < 0 ||
      (row.rateBasis === "capped") !== (row.rateCapMeasureId !== null)
    )
      throw new Error("Loan terms carry an invalid rate.");
    if (row.principalReduction) {
      const amount = row.principalReduction;
      const total = (reductions.get(debt.id) ?? 0) + amount.minorUnits;
      if (
        !Number.isSafeInteger(amount.minorUnits) ||
        amount.minorUnits <= 0 ||
        amount.currency !== debt.principal.currency ||
        !Number.isSafeInteger(total) ||
        total > debt.principal.minorUnits ||
        !row.supersedesTermsId ||
        row.effectiveAt < debt.establishedAt
      )
        throw new Error(
          "Loan principal reductions must be positive, dated credits within original principal.",
        );
      reductions.set(debt.id, total);
    }
  }
  for (const row of world.history.debtCharges ?? []) {
    const governing = terms.get(row.loanTermsId);
    if (
      !governing ||
      governing.resourceObligationId !== row.resourceObligationId ||
      governing.effectiveAt > row.chargedAt ||
      row.amount.minorUnits <= 0
    )
      throw new Error("A debt charge must follow terms in force.");
  }
  const allocatedOutcomes = new Set<EntityId>();
  for (const row of world.history.loanRepaymentAllocations ?? []) {
    const debt = debts.get(row.resourceObligationId);
    const outcome = world.history.resourceTransferOutcomes.find(
      (record) => record.id === row.resourceTransferOutcomeId,
    );
    if (
      !debt?.principal ||
      !outcome ||
      outcome.resourceFlowId !== debt.resourceFlowId ||
      outcome.sequence >= row.sequence ||
      outcome.sequence <= debt.sequence ||
      row.occurredAt !== outcome.occurredAt ||
      allocatedOutcomes.has(outcome.id)
    )
      throw new Error(
        "A loan allocation must follow its unique actual repayment.",
      );
    allocatedOutcomes.add(outcome.id);
    const before = loanBalanceComponentsAt(world, debt.id, {
      asOfDate: outcome.occurredAt,
      historySequenceExclusive: outcome.sequence,
    });
    const paid = outcome.transferredAmount.minorUnits;
    if (!before && paid > 0) {
      if (
        row.unsupportedReason !== "missing-prior-repayment-allocation" ||
        row.fees !== null ||
        row.interest !== null ||
        row.principal !== null
      )
        throw new Error(
          "An unsupported legacy loan allocation cannot invent components.",
        );
      continue;
    }
    const fees = Math.min(paid, before?.fees.minorUnits ?? 0);
    const interest = Math.min(paid - fees, before?.interest.minorUnits ?? 0);
    const principal = paid - fees - interest;
    if (
      row.unsupportedReason !== null ||
      !row.fees ||
      !row.interest ||
      !row.principal ||
      row.fees.minorUnits !== fees ||
      row.interest.minorUnits !== interest ||
      row.principal.minorUnits !== principal ||
      row.fees.currency !== debt.principal.currency ||
      row.interest.currency !== debt.principal.currency ||
      row.principal.currency !== debt.principal.currency ||
      !Number.isSafeInteger(principal) ||
      principal < 0 ||
      principal > (before?.principal.minorUnits ?? 0)
    )
      throw new Error(
        "Loan repayment must allocate actual cash fees first, then interest, then principal.",
      );
  }
  for (const row of world.history.loanDischarges ?? []) {
    const debt = debts.get(row.resourceObligationId);
    const before = loanBalanceComponentsAt(world, row.resourceObligationId, {
      asOfDate: row.effectiveAt,
      historySequenceExclusive: row.sequence,
    });
    if (
      !debt?.principal ||
      debt.sequence >= row.sequence ||
      !before ||
      row.effectiveAt < debt.establishedAt ||
      row.effectiveAt > row.recordedAt ||
      !Number.isSafeInteger(row.principal.minorUnits) ||
      !Number.isSafeInteger(row.interest.minorUnits) ||
      row.principal.minorUnits < 0 ||
      row.interest.minorUnits < 0 ||
      row.principal.minorUnits + row.interest.minorUnits <= 0 ||
      row.principal.currency !== debt.principal.currency ||
      row.interest.currency !== debt.principal.currency ||
      row.principal.minorUnits > before.principal.minorUnits ||
      row.interest.minorUnits > before.interest.minorUnits
    )
      throw new Error(
        "Loan discharges must fit recorded principal and interest without cash.",
      );
  }
  for (const row of world.history.debtStandings ?? []) {
    if (!debts.has(row.resourceObligationId))
      throw new Error("A debt standing must name a debt.");
    const missedStanding =
      row.standing === "late" ||
      row.standing === "default" ||
      row.standing === "collections";
    if (row.standing === "late" && row.consecutiveMissedPayments < 1)
      throw new Error("A late debt has missed a payment.");
    if (
      !missedStanding &&
      row.standing !== "current" &&
      row.consecutiveMissedPayments !== 0
    )
      throw new Error("A paid-off debt has no missed payments.");
  }
}
