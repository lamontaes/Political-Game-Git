/** Full retained loan servicing/standing/repayment/integrity math. Only ordered requests travel; existing writers own materialization. */
import { makeIsoDate } from "../../simulation/dates";
import { createStableId } from "../../simulation/ids";
import { money } from "./cost-money";
import { moneyText } from "./home-purchase-records";
import {
  resourcePositionAt as cashPosition,
  type CashFacts,
} from "./cash-positions";
import { recordsWithFieldValue } from "./raw-record-index";
import { amortizedMonthlyPaymentMinor } from "../laws/public-benefits";
import {
  monthlyInterestMinor,
  revolvingMinimumPaymentMinor,
} from "../laws/loan-arithmetic";
import {
  consumerLoanCapAt as capOf,
  type ConsumerCapFacts,
} from "../laws/consumer-cap";
import type {
  DebtChargeRecord,
  DebtStanding,
  DebtStandingRecord,
  EntityId,
  HouseholdLoanKind,
  HistoricalCutoff,
  IsoDate,
  LoanTermsRecord,
  LoanRepayment,
  MoneyAmount,
  ResourceEndpoint,
  ResourceFlow,
  ResourceObligation,
  ResourcePositionOwner,
  World,
  ResourceFlowTermsRecord,
  ResourceObligationStateRecord,
  ResourceTransferOutcome,
  CurrencyCode,
} from "../../simulation/types";
import type * as nativeResources from "../../simulation/resources";
import type { recordWorldEvent as nativeEvent } from "../../simulation/world";
import type { recordEventKnowledge as nativeKnowledge } from "../../simulation/records";
import type { recordLawExposure as nativeExposure } from "../../simulation/law-exposure";
import type { lifePlaceByJurisdictionId as nativePlace } from "../../simulation/life-places";
import type { peopleInHouseholdAt as nativeResidents } from "../../simulation/life-queries";
export interface LoanFacts {
  readonly id: EntityId;
  readonly onDate: IsoDate;
  readonly people: World["people"];
  readonly records: Pick<
    World["history"],
    | "nextSequence"
    | "resourceFlows"
    | "resourceFlowTerms"
    | "resourceObligations"
    | "resourceObligationStates"
    | "resourceTransferOutcomes"
    | "events"
    | "loanTerms"
    | "debtCharges"
    | "debtStandings"
    | "loanRepaymentAllocations"
    | "loanDischarges"
  >;
  readonly cash: CashFacts;
  readonly capSources: ReadonlyMap<IsoDate, ConsumerCapFacts>;
  readonly places: ReadonlyMap<EntityId, ReturnType<typeof nativePlace>>;
  readonly residents: ReadonlyMap<string, ReturnType<typeof nativeResidents>>;
}
export function loanReceiptKey(id: EntityId, date: IsoDate, sequence: number) {
  return JSON.stringify([id, date, sequence]);
}
function consumerLoanCapAt(
  facts: LoanFacts,
  kind: HouseholdLoanKind,
  onDate: IsoDate,
) {
  const source = facts.capSources.get(onDate);
  if (!source) throw Error("Missing dated cap source: " + onDate);
  return capOf(source, kind, onDate);
}
function peopleInHouseholdAt(
  facts: LoanFacts,
  id: EntityId,
  cutoff: HistoricalCutoff,
) {
  const key = loanReceiptKey(
    id,
    cutoff.asOfDate,
    cutoff.historySequenceExclusive,
  );
  if (!facts.residents.has(key)) throw Error("Missing dated residents: " + key);
  return facts.residents.get(key)!;
}
function lifePlaceByJurisdictionId(facts: LoanFacts, id: EntityId) {
  return facts.places.get(id) ?? null;
}
function resourcePositionAt(
  facts: LoanFacts,
  ...args: Parameters<typeof cashPosition> extends [unknown, ...infer R]
    ? R
    : never
) {
  return cashPosition(facts.cash, ...args);
}
type LoanKind =
  | "loan-terms"
  | "debt-charge"
  | "debt-standing"
  | "loan-repayment-allocation"
  | "loan-discharge";
export interface LoanWriteInputs {
  recordResourceFlowTerms: [
    Parameters<typeof nativeResources.recordResourceFlowTerms>[1],
  ];
  recordResourceObligationState: [
    Parameters<typeof nativeResources.recordResourceObligationState>[1],
  ];
  recordResourceTransferOutcome: [
    Parameters<typeof nativeResources.recordResourceTransferOutcome>[1],
  ];
  recordWorldEvent: [Parameters<typeof nativeEvent>[1]];
  recordEventKnowledge: [Parameters<typeof nativeKnowledge>[1]];
  recordLawExposure: [Parameters<typeof nativeExposure>[1]];
  append: [
    LoanField,
    LoanKind,
    {
      [K in LoanField]: Draft<NonNullable<World["history"][K]>[number]>;
    }[LoanField],
  ];
}
export type LoanWriteRequest = {
  [K in keyof LoanWriteInputs]: {
    readonly op: K;
    readonly args: LoanWriteInputs[K];
  };
}[keyof LoanWriteInputs];
export type LoanProcess = Generator<LoanWriteRequest, LoanFacts, LoanFacts>;
function writeRequest<K extends keyof LoanWriteInputs>(
  op: K,
  args: LoanWriteInputs[K],
): LoanWriteRequest {
  return { op, args } as LoanWriteRequest;
}
// stopgapId: "economy.loan-private-append-transport"
function* appendLoanTerms(
  _facts: LoanFacts,
  draft: Draft<LoanTermsRecord>,
): LoanProcess {
  return yield writeRequest("append", ["loanTerms", "loan-terms", draft]);
}
function* appendDebtCharge(
  _facts: LoanFacts,
  draft: Draft<DebtChargeRecord>,
): LoanProcess {
  return yield writeRequest("append", ["debtCharges", "debt-charge", draft]);
}
function* appendDebtStanding(
  _facts: LoanFacts,
  draft: Draft<DebtStandingRecord>,
): LoanProcess {
  return yield writeRequest("append", [
    "debtStandings",
    "debt-standing",
    draft,
  ]);
}
export const LOAN_PAYMENT_BASIS = "obligation:loan-payment" as const;
function nextFirstOfMonth(date: IsoDate): IsoDate {
  const [year, month] = date.split("-").map(Number) as [number, number];
  return makeIsoDate(
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`,
  );
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
export function* recordLoanRepaymentAllocation(
  facts: LoanFacts,
  resourceObligationId: EntityId,
  outcomeId: EntityId,
  stableKey: string,
): LoanProcess {
  const existing = (facts.records.loanRepaymentAllocations ?? []).find(
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
    return facts;
  }
  const debt = facts.records.resourceObligations.find(
    (row) => row.id === resourceObligationId,
  );
  const outcome = facts.records.resourceTransferOutcomes.find(
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
  const components = loanBalanceComponentsAt(facts, resourceObligationId, {
    asOfDate: outcome.occurredAt,
    historySequenceExclusive: outcome.sequence,
  });
  const paid = outcome.transferredAmount.minorUnits;
  if (!components && paid > 0)
    return yield writeRequest("append", [
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
    ]);
  const fees = Math.min(paid, components?.fees.minorUnits ?? 0);
  const interest = Math.min(paid - fees, components?.interest.minorUnits ?? 0);
  const principal = paid - fees - interest;
  if (principal > (components?.principal.minorUnits ?? 0))
    throw new Error("Repayment exceeds recorded loan components.");
  return yield writeRequest("append", [
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
  ]);
}
export function loanTermsAt(
  facts: LoanFacts,
  resourceObligationId: EntityId,
  date: IsoDate | HistoricalCutoff,
): LoanTermsRecord | undefined {
  const asOfDate = typeof date === "string" ? date : date.asOfDate;
  const frontier =
    typeof date === "string"
      ? facts.records.nextSequence
      : date.historySequenceExclusive;
  return (facts.records.loanTerms ?? [])
    .filter(
      (row) =>
        row.resourceObligationId === resourceObligationId &&
        row.effectiveAt <= asOfDate &&
        row.sequence < frontier,
    )
    .at(-1);
}
export function debtStandingAt(
  facts: LoanFacts,
  resourceObligationId: EntityId,
  date: IsoDate = facts.onDate,
): DebtStandingRecord | undefined {
  return (facts.records.debtStandings ?? [])
    .filter(
      (row) =>
        row.resourceObligationId === resourceObligationId &&
        row.effectiveAt <= date,
    )
    .at(-1);
}
// stopgapId: "economy.loan-servicing-standing-policy"
export function* settleHouseholdLoanPayments(
  facts: LoanFacts,
  personId?: EntityId,
): LoanProcess {
  let next = facts;
  const flows = new Map(
    facts.records.resourceFlows.map((row) => [row.id, row]),
  );
  for (const debt of facts.records.resourceObligations) {
    const flow = flows.get(debt.resourceFlowId);
    if (
      !debt.principal ||
      !flow ||
      (personId !== undefined &&
        (flow.source.kind !== "person" || flow.source.personId !== personId))
    )
      continue;
    const hasTerms = loanTermsAt(facts, debt.id, facts.onDate) !== undefined;
    if (!hasTerms && flow.basisKind !== "housing:mortgage") continue;
    let latest: IsoDate | null = null;
    for (const outcome of facts.records.resourceTransferOutcomes)
      if (
        outcome.resourceFlowId === flow.id &&
        outcome.periodStartsAt <= facts.onDate &&
        (latest === null || outcome.periodStartsAt > latest)
      )
        latest = outcome.periodStartsAt;
    let dueOn = nextFirstOfMonth(latest ?? flow.startsAt);
    for (let month = 0; month < 480 && dueOn <= next.onDate; month += 1) {
      const owed = outstandingDebtAt(next, debt.id);
      if (!owed || owed.minorUnits <= 0) break;
      next = hasTerms
        ? yield* serviceLoanMonth(next, debt, dueOn)
        : flow.source.kind === "person"
          ? yield* serviceLegacyMortgageMonth(
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
// stopgapId: "economy.loan-native-English"
function mortgageMoneyText(minor: number): string {
  return moneyText({ minorUnits: minor, currency: "USD" });
}
function monthName(date: IsoDate): string {
  return new Date(`${date}T12:00:00Z`).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
}
function* serviceLegacyMortgageMonth(
  facts: LoanFacts,
  personId: EntityId,
  flow: ResourceFlow,
  dueOn: IsoDate,
  owed: MoneyAmount,
): LoanProcess {
  let terms = resourceFlowTermsAt(facts, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: facts.records.nextSequence,
  })!;
  if (owed.minorUnits < terms.amount.minorUnits) {
    facts = yield writeRequest("recordResourceFlowTerms", [
      {
        stableKey: `${flow.stableKey}:terms:final:${dueOn}`,
        resourceFlowId: flow.id,
        effectiveAt: dueOn,
        status: "active",
        amount: owed,
        cadenceKind: terms.cadenceKind,
        reason: "The last payment is what is left on the loan.",
        provenance: flow.provenance,
        supersedesTermsId: terms.id,
      },
    ]);
    terms = resourceFlowTermsAt(facts, flow.id)!;
  }
  const scheduled = terms.amount;
  const owner = { kind: "person" as const, personId };
  const balanceOn = (asOfDate: IsoDate) =>
    resourcePositionAt(facts, owner, scheduled.currency, {
      asOfDate,
      historySequenceExclusive: facts.records.nextSequence,
    })?.liquidBalance.minorUnits ?? 0;
  const checkpoints = new Set<IsoDate>([dueOn, facts.onDate]);
  for (const outcome of facts.records.resourceTransferOutcomes)
    if (outcome.occurredAt > dueOn && outcome.occurredAt < facts.onDate)
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
  const next = yield writeRequest("recordResourceTransferOutcome", [
    {
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
    },
  ]);
  return paid < due
    ? yield* recordMortgageMissedPayment(next, personId, due, paid, dueOn)
    : next;
}
function* recordMortgageMissedPayment(
  facts: LoanFacts,
  personId: EntityId,
  owedMinor: number,
  paidMinor: number,
  dueOn: IsoDate,
): LoanProcess {
  if (
    facts.records.events.some(
      (event) =>
        event.involvedEntityIds.includes(personId) &&
        event.tags.includes("life.mortgage-missed"),
    )
  )
    return facts;
  const person = facts.people[personId]!;
  const place = lifePlaceByJurisdictionId(facts, person.homeJurisdictionId);
  const summary =
    paidMinor > 0
      ? `${monthName(dueOn)}'s mortgage payment was ${mortgageMoneyText(owedMinor)}, and you could pay ${mortgageMoneyText(paidMinor)} of it.`
      : `${monthName(dueOn)}'s mortgage payment was ${mortgageMoneyText(owedMinor)}, and you could not pay any of it.`;
  const stableKey = `mortgage-missed:${personId}:${dueOn}`;
  const next = yield writeRequest("recordWorldEvent", [
    {
      stableKey,
      type: "life.mortgage-missed",
      occurredAt: facts.onDate,
      recordedAt: facts.onDate,
      jurisdictionId: place?.context.jurisdiction.id ?? null,
      involvedEntityIds: [personId],
      participants: [
        {
          personId,
          role: "focus:subject",
          detail: "Missed a mortgage payment",
        },
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
    },
  ]);
  return yield writeRequest("recordEventKnowledge", [
    {
      stableKey: `${stableKey}:knowledge`,
      personId,
      eventId: next.records.events.at(-1)!.id,
      learnedAt: facts.onDate,
      believedSummary: summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    },
  ]);
}
function flowOf(
  facts: LoanFacts,
  obligation: ResourceObligation,
): ResourceFlow {
  return facts.records.resourceFlows.find(
    (row) => row.id === obligation.resourceFlowId,
  )!;
}
// stopgapId: "economy.loan-payment-cash-frontier"
function* serviceLoanMonth(
  facts: LoanFacts,
  obligation: ResourceObligation,
  dueOn: IsoDate,
): LoanProcess {
  const flow = flowOf(facts, obligation);
  if (
    facts.records.resourceTransferOutcomes.some(
      (row) =>
        row.resourceFlowId === flow.id &&
        row.periodStartsAt === dueOn &&
        row.periodEndsAt === dueOn,
    )
  )
    return facts;
  let terms = loanTermsAt(facts, obligation.id, dueOn)!;
  const key = `${obligation.stableKey}:${dueOn}`;
  let next = facts;
  const cap = consumerLoanCapAt(next, terms.kind, dueOn);
  if (cap && cap.capBasisPoints < terms.annualRateBasisPoints) {
    next = yield* appendLoanTerms(next, {
      ...terms,
      stableKey: `${key}:law-cap`,
      effectiveAt: dueOn,
      annualRateBasisPoints: cap.capBasisPoints,
      rateBasis: "capped",
      rateCapMeasureId: cap.measureId,
      rateBeforeCapBasisPoints:
        terms.rateCapMeasureId === cap.measureId
          ? (terms.rateBeforeCapBasisPoints ?? terms.annualRateBasisPoints)
          : terms.annualRateBasisPoints,
      supersedesTermsId: terms.id,
    });
    terms = loanTermsAt(next, obligation.id, dueOn)!;
  }
  const opening = outstandingDebtAt(next, obligation.id)!;
  if (opening.minorUnits <= 0)
    return yield* markPaidOff(next, obligation, flow, dueOn);
  const currency = opening.currency;
  const interest = monthlyInterestMinor(
    opening.minorUnits,
    terms.annualRateBasisPoints,
  );
  if (interest > 0)
    next = yield* appendDebtCharge(next, {
      stableKey: `${key}:interest`,
      resourceObligationId: obligation.id,
      chargedAt: dueOn,
      kind: "interest",
      amount: money(interest, currency),
      loanTermsId: terms.id,
    });
  next = yield* recordConsumerLoanCapSavings(next, flow, terms, opening, dueOn);
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
    historySequenceExclusive: next.records.nextSequence,
  })!;
  if (flowTerms.amount.minorUnits !== due)
    next = yield writeRequest("recordResourceFlowTerms", [
      {
        stableKey: `${key}:due`,
        resourceFlowId: flow.id,
        effectiveAt: dueOn,
        status: "active",
        amount: money(due, currency),
        cadenceKind: flowTerms.cadenceKind,
        reason: "This month's payment under the loan's terms.",
        provenance: terms.provenance,
        supersedesTermsId: flowTerms.id,
      },
    ]);
  const position = resourcePositionAt(
    next,
    endpointOwner(flow.source),
    currency,
  );
  if (!position) {
    next = yield writeRequest("recordResourceTransferOutcome", [
      {
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
      },
    ]);
    return yield* recordLoanRepaymentAllocation(
      next,
      obligation.id,
      next.records.resourceTransferOutcomes.at(-1)!.id,
      `${key}:allocation`,
    );
  }
  const paid = Math.max(0, Math.min(position.liquidBalance.minorUnits, due));
  next = yield writeRequest("recordResourceTransferOutcome", [
    {
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
    },
  ]);
  next = yield* recordLoanRepaymentAllocation(
    next,
    obligation.id,
    next.records.resourceTransferOutcomes.at(-1)!.id,
    `${key}:allocation`,
  );
  const previous = debtStandingAt(next, obligation.id, dueOn);
  if (paid === due) {
    if (outstandingDebtAt(next, obligation.id)!.minorUnits <= 0)
      return yield* markPaidOff(next, obligation, flow, dueOn);
    const stays =
      previous?.standing === "default" || previous?.standing === "collections";
    if (previous?.standing === "current" || stays) return next;
    return yield* appendDebtStanding(next, {
      stableKey: `${key}:standing`,
      resourceObligationId: obligation.id,
      effectiveAt: dueOn,
      standing: "current",
      consecutiveMissedPayments: 0,
      supersedesStandingId: previous?.id ?? null,
    });
  }
  if (terms.lateFee !== null && terms.lateFee.minorUnits > 0)
    next = yield* appendDebtCharge(next, {
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
  return yield* appendDebtStanding(next, {
    stableKey: `${key}:standing`,
    resourceObligationId: obligation.id,
    effectiveAt: dueOn,
    standing,
    consecutiveMissedPayments: missed,
    supersedesStandingId: previous?.id ?? null,
  });
}
function scheduledInstallment(
  facts: LoanFacts,
  flow: ResourceFlow,
  terms: LoanTermsRecord,
  balanceMinor: number,
  dueOn: IsoDate,
): number {
  if (terms.repayment.kind !== "installment")
    throw new Error("Not installment.");
  const paymentsMade = facts.records.resourceTransferOutcomes.filter(
    (row) => row.resourceFlowId === flow.id,
  ).length;
  const monthsLeft = Math.max(1, terms.repayment.termMonths - paymentsMade);
  const firstTerms = (facts.records.loanTerms ?? []).find(
    (row) => row.resourceObligationId === terms.resourceObligationId,
  )!;
  const current = resourceFlowTermsAt(facts, flow.id, {
    asOfDate: dueOn,
    historySequenceExclusive: facts.records.nextSequence,
  })!;
  if (terms.id === firstTerms.id && current.amount.minorUnits > 0)
    return current.amount.minorUnits;
  return amortizedMonthlyPaymentMinor(
    balanceMinor,
    terms.annualRateBasisPoints,
    monthsLeft,
  );
}
function* markPaidOff(
  facts: LoanFacts,
  obligation: ResourceObligation,
  flow: ResourceFlow,
  dueOn: IsoDate,
): LoanProcess {
  const previous = debtStandingAt(facts, obligation.id, dueOn);
  let next = yield* appendDebtStanding(facts, {
    stableKey: `${obligation.stableKey}:${dueOn}:paid-off`,
    resourceObligationId: obligation.id,
    effectiveAt: dueOn,
    standing: "paid-off",
    consecutiveMissedPayments: 0,
    supersedesStandingId: previous?.id ?? null,
  });
  const state = resourceObligationStateAt(next, obligation.id);
  if (state && state.status === "active")
    next = yield writeRequest("recordResourceObligationState", [
      {
        stableKey: `${obligation.stableKey}:${dueOn}:satisfied`,
        resourceObligationId: obligation.id,
        effectiveAt: dueOn,
        status: "satisfied",
        reason: "The loan is paid off.",
        provenance: flow.provenance,
        supersedesStateId: state.id,
      },
    ]);
  return next;
}
function endpointOwner(endpoint: ResourceEndpoint): ResourcePositionOwner {
  if (endpoint.kind === "person")
    return { kind: "person", personId: endpoint.personId };
  if (endpoint.kind === "household")
    return { kind: "household", householdId: endpoint.householdId };
  return { kind: "organization", organizationId: endpoint.organizationId };
}
type Draft<T> = Omit<T, "id" | "sequence" | "recordedAt">;
type LoanField =
  | "loanTerms"
  | "debtCharges"
  | "debtStandings"
  | "loanRepaymentAllocations"
  | "loanDischarges";
// stopgapId: "economy.loan-integrity-validation-boundaries"
export function assertHouseholdLoanIntegrity(
  facts: LoanFacts,
  ids: Set<EntityId>,
): void {
  const groups = [
    ["loan-terms", facts.records.loanTerms ?? []],
    ["debt-charge", facts.records.debtCharges ?? []],
    ["debt-standing", facts.records.debtStandings ?? []],
    ["loan-repayment-allocation", facts.records.loanRepaymentAllocations ?? []],
    ["loan-discharge", facts.records.loanDischarges ?? []],
  ] as const;
  for (const [kind, records] of groups) {
    let previous = -1;
    const keys = new Set<string>();
    for (const row of records) {
      if (
        !row.stableKey.trim() ||
        ids.has(row.id) ||
        row.id !== createStableId(kind, `${facts.id}:${row.stableKey}`) ||
        keys.has(row.stableKey) ||
        row.sequence <= previous ||
        row.recordedAt > facts.onDate
      )
        throw new Error("Invalid household loan identity, ordering or date.");
      ids.add(row.id);
      keys.add(row.stableKey);
      previous = row.sequence;
    }
  }
  const debts = new Map(
    facts.records.resourceObligations.map((row) => [row.id, row]),
  );
  const terms = new Map(
    (facts.records.loanTerms ?? []).map((row) => [row.id, row]),
  );
  const reductions = new Map<EntityId, number>();
  for (const row of facts.records.loanTerms ?? []) {
    assertTermsInput(row);
    const debt = debts.get(row.resourceObligationId);
    if (!debt?.principal || debt.sequence >= row.sequence)
      throw new Error("Loan terms must follow the debt they govern.");
    if (
      !Number.isFinite(row.annualRateBasisPoints) ||
      row.annualRateBasisPoints < 0 ||
      (row.rateBeforeCapBasisPoints !== undefined &&
        (!Number.isFinite(row.rateBeforeCapBasisPoints) ||
          row.rateBeforeCapBasisPoints < row.annualRateBasisPoints)) ||
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
  for (const row of facts.records.debtCharges ?? []) {
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
  for (const row of facts.records.loanRepaymentAllocations ?? []) {
    const debt = debts.get(row.resourceObligationId);
    const outcome = facts.records.resourceTransferOutcomes.find(
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
    const before = loanBalanceComponentsAt(facts, debt.id, {
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
  for (const row of facts.records.loanDischarges ?? []) {
    const debt = debts.get(row.resourceObligationId);
    const before = loanBalanceComponentsAt(facts, row.resourceObligationId, {
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
  for (const row of facts.records.debtStandings ?? []) {
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
export function currentResourceCutoff(facts: LoanFacts): HistoricalCutoff {
  return {
    asOfDate: facts.onDate,
    historySequenceExclusive: facts.records.nextSequence,
  };
}
export function resourceFlowTermsHistory(
  facts: LoanFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceFlowTermsRecord[] {
  return recordsWithFieldValue(
    facts.records.resourceFlowTerms,
    "resourceFlowId",
    resourceFlowId,
  ).filter((record) => available(record, cutoff));
}
export function resourceFlowTermsAt(
  facts: LoanFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): ResourceFlowTermsRecord | undefined {
  return resourceFlowTermsHistory(facts, resourceFlowId, cutoff).at(-1);
}
export function resourceTransferOutcomesForFlow(
  facts: LoanFacts,
  resourceFlowId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceTransferOutcome[] {
  return facts.records.resourceTransferOutcomes.filter(
    (record) =>
      record.resourceFlowId === resourceFlowId &&
      availableOn(record, record.occurredAt, cutoff),
  );
}
export function resourceObligationStateHistory(
  facts: LoanFacts,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): readonly ResourceObligationStateRecord[] {
  return facts.records.resourceObligationStates.filter(
    (record) =>
      record.resourceObligationId === resourceObligationId &&
      available(record, cutoff),
  );
}
export function resourceObligationStateAt(
  facts: LoanFacts,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): ResourceObligationStateRecord | undefined {
  return resourceObligationStateHistory(facts, resourceObligationId, cutoff).at(
    -1,
  );
}
export function outstandingDebtAt(
  facts: LoanFacts,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): MoneyAmount | null {
  const obligation = facts.records.resourceObligations.find(
    (record) => record.id === resourceObligationId,
  );
  if (
    !obligation?.principal ||
    !availableOn(obligation, obligation.establishedAt, cutoff)
  ) {
    return null;
  }
  let paid = 0;
  for (const outcome of resourceTransferOutcomesForFlow(
    facts,
    obligation.resourceFlowId,
    cutoff,
  )) {
    if (
      outcome.sequence <= obligation.sequence ||
      outcome.occurredAt < obligation.establishedAt
    ) {
      continue;
    }
    paid = addExact(paid, outcome.transferredAmount.minorUnits);
  }
  let charged = 0;
  for (const charge of facts.records.debtCharges ?? []) {
    if (
      charge.resourceObligationId === obligation.id &&
      availableOn(charge, charge.chargedAt, cutoff)
    )
      charged = addExact(charged, charge.amount.minorUnits);
  }
  let reduced = 0;
  for (const terms of facts.records.loanTerms ?? []) {
    if (
      terms.resourceObligationId === obligation.id &&
      terms.principalReduction &&
      availableOn(terms, terms.effectiveAt, cutoff)
    ) {
      reduced = addExact(reduced, terms.principalReduction.minorUnits);
    }
  }
  for (const discharge of facts.records.loanDischarges ?? []) {
    if (
      discharge.resourceObligationId === obligation.id &&
      availableOn(discharge, discharge.effectiveAt, cutoff)
    )
      reduced = addExact(
        reduced,
        addExact(discharge.principal.minorUnits, discharge.interest.minorUnits),
      );
  }
  return queryMoney(
    Math.max(0, obligation.principal.minorUnits + charged - paid - reduced),
    obligation.principal.currency,
  );
}
export function loanBalanceComponentsAt(
  facts: LoanFacts,
  resourceObligationId: EntityId,
  cutoff: HistoricalCutoff = currentResourceCutoff(facts),
): {
  principal: MoneyAmount;
  interest: MoneyAmount;
  fees: MoneyAmount;
} | null {
  const debt = facts.records.resourceObligations.find(
    (row) => row.id === resourceObligationId,
  );
  if (!debt?.principal || !availableOn(debt, debt.establishedAt, cutoff))
    return null;
  let principal = debt.principal.minorUnits;
  let interest = 0;
  let fees = 0;
  for (const charge of facts.records.debtCharges ?? []) {
    if (
      charge.resourceObligationId !== debt.id ||
      !availableOn(charge, charge.chargedAt, cutoff)
    )
      continue;
    if (charge.kind === "interest")
      interest = addExact(interest, charge.amount.minorUnits);
    else fees = addExact(fees, charge.amount.minorUnits);
  }
  for (const terms of facts.records.loanTerms ?? []) {
    if (
      terms.resourceObligationId === debt.id &&
      terms.principalReduction &&
      availableOn(terms, terms.effectiveAt, cutoff)
    )
      principal -= terms.principalReduction.minorUnits;
  }
  for (const discharge of facts.records.loanDischarges ?? []) {
    if (
      discharge.resourceObligationId !== debt.id ||
      !availableOn(discharge, discharge.effectiveAt, cutoff)
    )
      continue;
    principal -= discharge.principal.minorUnits;
    interest -= discharge.interest.minorUnits;
  }
  for (const outcome of resourceTransferOutcomesForFlow(
    facts,
    debt.resourceFlowId,
    cutoff,
  )) {
    if (
      outcome.sequence <= debt.sequence ||
      outcome.occurredAt < debt.establishedAt ||
      outcome.transferredAmount.minorUnits === 0
    )
      continue;
    const allocation = (facts.records.loanRepaymentAllocations ?? []).find(
      (row) =>
        row.resourceTransferOutcomeId === outcome.id &&
        row.resourceObligationId === debt.id &&
        availableOn(row, row.occurredAt, cutoff),
    );
    if (
      !allocation ||
      allocation.unsupportedReason ||
      !allocation.principal ||
      !allocation.interest ||
      !allocation.fees
    )
      return null;
    principal -= allocation.principal.minorUnits;
    interest -= allocation.interest.minorUnits;
    fees -= allocation.fees.minorUnits;
  }
  if (principal < 0 || interest < 0 || fees < 0)
    throw new Error("Recorded loan components cannot be negative.");
  const currency = debt.principal.currency;
  return {
    principal: queryMoney(principal, currency),
    interest: queryMoney(interest, currency),
    fees: queryMoney(fees, currency),
  };
}
function available(
  record: {
    readonly effectiveAt: string;
    readonly sequence: number;
  },
  cutoff: HistoricalCutoff,
): boolean {
  return availableOn(record, record.effectiveAt, cutoff);
}
function availableOn(
  record: {
    readonly sequence: number;
  },
  date: string,
  cutoff: HistoricalCutoff,
): boolean {
  return (
    date <= cutoff.asOfDate && record.sequence < cutoff.historySequenceExclusive
  );
}
function addExact(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Exact-money arithmetic exceeded the safe integer range.");
  }
  return result;
}
export function* recordConsumerLoanCapSavings(
  facts: LoanFacts,
  flow: ResourceFlow,
  terms: LoanTermsRecord,
  opening: MoneyAmount,
  dueOn: IsoDate,
): LoanProcess {
  const cap = consumerLoanCapAt(facts, terms.kind, dueOn);
  if (
    !cap ||
    cap.measureId !== terms.rateCapMeasureId ||
    terms.rateBeforeCapBasisPoints === undefined
  )
    return facts;
  const saved =
    monthlyInterestMinor(opening.minorUnits, terms.rateBeforeCapBasisPoints) -
    monthlyInterestMinor(opening.minorUnits, terms.annualRateBasisPoints);
  if (saved <= 0) return facts;
  const people =
    flow.source.kind === "person"
      ? [flow.source.personId]
      : flow.source.kind === "household"
        ? peopleInHouseholdAt(facts, flow.source.householdId, {
            asOfDate: dueOn,
            historySequenceExclusive: facts.records.nextSequence,
          })
        : [];
  let next = facts;
  for (const personId of people)
    next = yield writeRequest("recordLawExposure", [
      {
        stableKey: `consumer-loan-cap:${flow.id}:${dueOn}:${personId}`,
        personId,
        measureId: cap.measureId,
        channel: "business-rule",
        direction: "gain",
        amount: money(saved, opening.currency),
        cadence: "monthly",
        sourceRecordId: terms.id,
        includeFamily: false,
      },
    ]);
  return next;
}

function queryMoney(minorUnits: number, currency: CurrencyCode): MoneyAmount {
  return { minorUnits, currency };
}
