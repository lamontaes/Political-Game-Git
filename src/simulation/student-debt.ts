import { openHouseholdLoan, householdLoansOf } from "./household-loans";
import type { OpenHouseholdLoanInput } from "./household-loans";
import { educationEnrollmentStateAt } from "./life-queries";
import { publicGovernmentOrganizationKey } from "./public-government-identity";
import debtResearch from "../../data/research/money/debt-and-credit-2026.json" with { type: "json" };
import {
  resourceFlowTermsAt,
  resourcePositionAt,
  resourceTransferOutcomesForFlow,
} from "./resource-queries";
import {
  createResourceFlow,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import type {
  EntityId,
  IsoDate,
  LifeRecordProvenance,
  MoneyAmount,
  World,
} from "./types";

/** Published program inputs; the adapter invents neither limits nor rates. */
export interface RecordedStudentFinancingInput {
  readonly enrollmentId: EntityId;
  readonly tuitionFlowId: EntityId;
  readonly annualLimit: MoneyAmount;
  readonly academicYearStartsAt: IsoDate;
  readonly academicYearEndsAt: IsoDate;
  readonly source: Extract<LifeRecordProvenance, { kind: "source-record" }>;
  readonly loan: Pick<
    OpenHouseholdLoanInput,
    | "marketAnnualRateBasisPoints"
    | "repayment"
    | "lateFee"
    | "missedPaymentsToDefault"
    | "missedPaymentsToCollections"
  >;
}

const STUDENT_LOAN_RATE_ROW = debtResearch.rates.federalStudentLoans2026_27;

/**
 * Published Federal Direct undergraduate rates are fixed for the award year.
 * The research pack currently has one published row; callers outside that
 * award year use the nearest row with estimated provenance until more years
 * are added. Keep this selector as the seam for the expanding sourced table.
 */
export function studentLoanRateFor(asOf: IsoDate): {
  readonly annualRateBasisPoints: number;
  readonly awardYear: string;
  readonly source: string;
  readonly publishedWindow: boolean;
  readonly estimated: boolean;
} {
  const start = STUDENT_LOAN_RATE_ROW.firstDisbursedBetween[0]!;
  const end = STUDENT_LOAN_RATE_ROW.firstDisbursedBetween[1]!;
  const rate = STUDENT_LOAN_RATE_ROW.undergraduateDirect.value;
  const publishedWindow = asOf >= start && asOf <= end;
  return {
    annualRateBasisPoints: Math.round(rate * 100),
    awardYear: "2026-27",
    source: debtResearch.sources.find(
      (source) => source.key === "fsa-rates-2026-27",
    )!.url,
    publishedWindow,
    // The checked-in evidence is snippet-derived; outside its award window,
    // this is additionally the nearest published row rather than a match.
    estimated: true,
  };
}

/** Shared validation for the existing shortfall writer and its saved-fact adapter. */
export function validateRecordedStudentFinancingInput(
  world: World,
  input: RecordedStudentFinancingInput,
): void {
  if (!input.source.reference.trim() || input.source.asOf > world.currentDate)
    throw new Error("Student financing needs an available published source.");
  if (
    !Number.isSafeInteger(input.annualLimit.minorUnits) ||
    input.annualLimit.minorUnits <= 0
  )
    throw new Error(
      "Student financing needs a positive published annual limit.",
    );
  if (
    input.academicYearStartsAt > world.currentDate ||
    input.academicYearEndsAt < world.currentDate
  )
    throw new Error(
      "Student financing needs the current academic-year window.",
    );
}

/**
 * Finance only a saved, still-unpaid tuition charge's actual cash shortfall.
 * The existing tuition writer remains responsible for paying the school.
 * Missing lender cash or an exhausted annual limit leaves the world unchanged.
 */
export function financeRecordedStudentTuition(
  world: World,
  input: RecordedStudentFinancingInput,
): World {
  validateRecordedStudentFinancingInput(world, input);
  const enrollment = world.history.educationEnrollments.find(
    (record) => record.id === input.enrollmentId,
  );
  const tuition = world.history.resourceFlows.find(
    (record) => record.id === input.tuitionFlowId,
  );
  if (
    !enrollment ||
    !enrollment.programKind.startsWith("postsecondary:") ||
    educationEnrollmentStateAt(world, enrollment.id)?.status !== "active" ||
    !tuition ||
    tuition.basisKind !== "obligation:tuition" ||
    tuition.source.kind !== "person" ||
    tuition.source.personId !== enrollment.personId ||
    tuition.recipient.kind !== "organization" ||
    tuition.recipient.organizationId !== enrollment.organizationId
  )
    throw new Error(
      "Student financing needs the enrolled person's actual postsecondary tuition charge.",
    );
  const terms = resourceFlowTermsAt(world, tuition.id);
  if (
    !terms ||
    terms.status !== "active" ||
    terms.cadenceKind !== "schedule:one-time" ||
    tuition.startsAt > world.currentDate
  )
    throw new Error(
      "Student financing needs a current one-time tuition charge.",
    );
  if (terms.amount.currency !== input.annualLimit.currency)
    throw new Error("Student tuition and annual limit currencies must agree.");
  const stableKey = `student-tuition-financing:${tuition.id}`;
  if (
    world.history.resourceObligations.some(
      (record) => record.stableKey === `${stableKey}:debt`,
    )
  )
    return world;
  // A completed tuition payment is immutable evidence, never new debt.
  if (resourceTransferOutcomesForFlow(world, tuition.id).length > 0)
    return world;
  const borrower = { kind: "person", personId: enrollment.personId } as const;
  const cash = resourcePositionAt(world, borrower, terms.amount.currency);
  if (!cash) return world;
  const shortfall = Math.max(
    0,
    terms.amount.minorUnits - Math.max(0, cash.liquidBalance.minorUnits),
  );
  if (shortfall === 0) return world;
  const federal = Object.values(world.jurisdictions).find(
    (record) => record.kind === "federal",
  );
  if (!federal) return world;
  const lender = world.history.organizations.find(
    (record) =>
      record.stableKey ===
      publicGovernmentOrganizationKey({
        kind: "jurisdiction",
        jurisdictionId: federal.id,
      }),
  );
  if (!lender) return world;
  let borrowed = 0;
  for (const reading of householdLoansOf(world, borrower)) {
    if (
      reading.terms.kind !== "student" ||
      reading.terms.lenderKind !== "federal-government" ||
      reading.obligation.establishedAt < input.academicYearStartsAt ||
      reading.obligation.establishedAt > input.academicYearEndsAt
    )
      continue;
    if (reading.obligation.principal?.currency !== terms.amount.currency)
      throw new Error(
        "Student annual borrowing records have incompatible currencies.",
      );
    borrowed += reading.obligation.principal.minorUnits;
    if (!Number.isSafeInteger(borrowed))
      throw new Error("Student annual borrowing exceeds exact arithmetic.");
  }
  const amount = Math.min(
    shortfall,
    Math.max(0, input.annualLimit.minorUnits - borrowed),
  );
  const lenderEndpoint = {
    kind: "organization",
    organizationId: lender.id,
  } as const;
  const lenderCash = resourcePositionAt(
    world,
    lenderEndpoint,
    terms.amount.currency,
  );
  if (
    amount === 0 ||
    !lenderCash ||
    lenderCash.liquidBalance.minorUnits < amount
  )
    return world;
  const principal = money(amount, terms.amount.currency);
  const rate = studentLoanRateFor(world.currentDate);
  const rateSource = {
    ...input.source,
    reference: `${input.source.reference}; ESTIMATED FROM AVERAGE: Federal Direct undergraduate award-year rate ${rate.annualRateBasisPoints} basis points from ${rate.awardYear} (${rate.source}); ${rate.publishedWindow ? "date falls in its published disbursement window" : "nearest published row; date is outside its disbursement window"}`,
  } as const;
  let next = openHouseholdLoan(world, {
    ...input.loan,
    marketAnnualRateBasisPoints: rate.annualRateBasisPoints,
    stableKey,
    borrower,
    lenderOrganizationId: lender.id,
    lenderKind: "federal-government",
    kind: "student",
    principal,
    rateCap: null,
    jurisdictionId: federal.id,
    housingTenureId: null,
    provenance: rateSource,
  });
  next = createResourceFlow(next, {
    stableKey: `${stableKey}:disbursement`,
    source: lenderEndpoint,
    recipient: borrower,
    startsAt: world.currentDate,
    amount: principal,
    cadenceKind: "schedule:one-time",
    basisKind: "obligation:student-loan-disbursement",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: federal.id,
    provenance: rateSource,
  });
  return recordResourceTransferOutcome(next, {
    stableKey: `${stableKey}:disbursed`,
    resourceFlowId: next.history.resourceFlows.at(-1)!.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: principal,
    transferredAmount: principal,
    reasonKind: null,
    note: "Federal loan finances this recorded tuition shortfall.",
    provenance: rateSource,
  });
}
