import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  createEducationEnrollment,
  createOrganization,
  createPartnership,
  recordPartnershipState,
} from "./life";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { publicGovernmentOrganizationKey } from "./public-government-identity";
import {
  householdLoansOf,
  openHouseholdLoan,
  loanTermsAt,
  recordLoanRepaymentAllocation,
  recordLoanDischarge,
  reduceLoanPrincipal,
  reviseLoanTerms,
} from "./household-loans";
import { personName } from "./people";
import { addDays, ageOnDate, makeIsoDate } from "./dates";
import { advanceWorld } from "./world";
import { createCampaignElectionTransitionRegistry } from "./campaigns";
import {
  completeStudyPeriod,
  completedStudyPeriods,
} from "./education-study-progression";
import { lifePathDefinition } from "./life-paths2-catalog";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
  recordResourceFlowTerms,
} from "./resources";
import {
  outstandingDebtAt,
  loanBalanceComponentsAt,
  resourcePositionAt,
} from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  financeRecordedStudentTuition,
  studentLoanRateFor,
} from "./student-debt";
import type { RecordedStudentFinancingInput } from "./student-debt";
import {
  recordedStudentAidFacts,
  financeStudentTuitionWithSavedAidFacts,
} from "./student-aid-facts";

// Controlled accounting inputs, not empirical rates or admitted law terms.
const USD = money(0, "USD").currency;
function fixture(placeKey: string, studyCaller = false, startAge = 25) {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey,
    seed: `team4-x7-recorded-tuition:${placeKey}`,
    startAge,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    priors: [],
  });
  let world = ensureNationalElectionJurisdiction(created.world);
  const personId = created.playerPersonId;
  const provenance = {
    kind: "authored",
    note: "Controlled X7 bookkeeping fixture.",
  } as const;
  const owner = { kind: "person", personId } as const;
  if (!resourcePositionAt(world, owner, USD))
    world = createResourcePosition(world, {
      stableKey: "x7-cash",
      owner,
      openedAt: world.currentDate,
      openingBalance: money(20_000, USD),
      provenance,
    });
  const openingCash = resourcePositionAt(world, owner, USD)!.liquidBalance
    .minorUnits;
  world = createOrganization(world, {
    stableKey: "x7-school",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded test college",
      classification: "service:education",
      locationJurisdictionId: null,
    },
  });
  const schoolId = world.history.organizations.at(-1)!.id;
  world = createEducationEnrollment(world, {
    stableKey: "x7-enrollment",
    personId,
    organizationId: schoolId,
    startedAt: world.currentDate,
    programKind: "postsecondary:college",
    contextKind: "program:college",
    provenance,
  });
  const enrollmentId = world.history.educationEnrollments.at(-1)!.id;
  world = createOrganization(world, {
    stableKey: publicGovernmentOrganizationKey({
      kind: "jurisdiction",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    }),
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Recorded federal lender",
      classification: "sector:government",
      locationJurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    },
  });
  const lenderId = world.history.organizations.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "x7-federal-cash",
    owner: { kind: "organization", organizationId: lenderId },
    openedAt: world.currentDate,
    openingBalance: money(1_000_000, USD),
    provenance,
  });
  world = createResourceFlow(world, {
    stableKey: studyCaller
      ? `life-paths2.study-period:${enrollmentId}:1`
      : "x7-tuition",
    source: owner,
    recipient: { kind: "organization", organizationId: schoolId },
    startsAt: world.currentDate,
    amount: money(openingCash + 100_000, USD),
    cadenceKind: "schedule:one-time",
    basisKind: "obligation:tuition",
    basisReference: { kind: "general" },
    restrictionKind: null,
    jurisdictionId: null,
    provenance,
  });
  const tuitionFlowId = world.history.resourceFlows.at(-1)!.id;
  const input: RecordedStudentFinancingInput = {
    enrollmentId,
    tuitionFlowId,
    annualLimit: money(100_000, USD),
    academicYearStartsAt: world.currentDate,
    academicYearEndsAt: addDays(world.currentDate, 365),
    source: {
      kind: "source-record",
      reference:
        "Controlled test inputs; not a published federal loan program.",
      asOf: world.currentDate,
    },
    loan: {
      marketAnnualRateBasisPoints: 600,
      repayment: { kind: "installment", termMonths: 120 },
      lateFee: null,
      missedPaymentsToDefault: 3,
      missedPaymentsToCollections: 6,
    },
  };
  return { world, personId, lenderId, openingCash, input };
}

function advanceLoanMonth(world: ReturnType<typeof fixture>["world"]) {
  const [year, month] = world.currentDate.split("-").map(Number);
  const nextMonth =
    month === 12
      ? `${year! + 1}-01-01`
      : `${year}-${String(month! + 1).padStart(2, "0")}-01`;
  let days = 0;
  while (addDays(world.currentDate, days) < nextMonth) days++;
  return advanceWorld(world, days, createCampaignElectionTransitionRegistry());
}

describe("recorded student tuition financing", () => {
  it("uses the published award-year federal rate and marks nearest-year estimates", () => {
    expect(studentLoanRateFor(makeIsoDate("2026-07-01"))).toMatchObject({
      annualRateBasisPoints: 652,
      awardYear: "2026-27",
      publishedWindow: true,
      estimated: true,
    });
    expect(studentLoanRateFor(makeIsoDate("2027-06-30")).publishedWindow).toBe(
      true,
    );
    expect(studentLoanRateFor(makeIsoDate("2027-07-01"))).toMatchObject({
      annualRateBasisPoints: 652,
      publishedWindow: false,
      estimated: true,
    });
  });

  // Reuses five selections from the all-jurisdiction Team4 proof lane.
  for (const place of ["4752006", "3918000", "1150000", "1571550", "2836000"])
    it(`finances actual shortfall in ${place}, preserves records and repeat identity`, () => {
      const { world, personId, lenderId, openingCash, input } = fixture(place);
      const next = financeRecordedStudentTuition(world, input);
      const loans = householdLoansOf(next, { kind: "person", personId });
      expect(loans).toHaveLength(1);
      expect(loans[0]!.obligation.principal).toEqual(money(100_000, USD));
      expect(loans[0]!.terms.annualRateBasisPoints).toBe(652);
      expect(
        resourcePositionAt(next, { kind: "person", personId }, USD)!
          .liquidBalance.minorUnits,
      ).toBe(openingCash + 100_000);
      expect(
        resourcePositionAt(
          next,
          { kind: "organization", organizationId: lenderId },
          USD,
        )!.liquidBalance.minorUnits,
      ).toBe(900_000);
      expect(next.people).toEqual(world.people);
      expect(
        next.history.resourceTransferOutcomes.filter(
          (r) => r.resourceFlowId === input.tuitionFlowId,
        ),
      ).toHaveLength(0);
      expect(financeRecordedStudentTuition(next, input)).toBe(next);
      const saved = deserializeWorld(serializeWorld(next));
      expect(financeRecordedStudentTuition(saved, input)).toBe(saved);
      const tuition = recordResourceTransferOutcome(next, {
        stableKey: "x7-paid",
        resourceFlowId: input.tuitionFlowId,
        periodStartsAt: next.currentDate,
        periodEndsAt: next.currentDate,
        occurredAt: next.currentDate,
        status: "completed",
        attemptedAmount: money(openingCash + 100_000, USD),
        transferredAmount: money(openingCash + 100_000, USD),
        reasonKind: null,
        note: "Actual recorded tuition payment after financing.",
        provenance: { kind: "authored", note: "Test tuition payment." },
      });
      expect(
        resourcePositionAt(tuition, { kind: "person", personId }, USD)!
          .liquidBalance.minorUnits,
      ).toBe(0);
      expect(financeRecordedStudentTuition(tuition, input)).toBe(tuition);
      console.log(
        `X7 ${place}: ${personName(world.people[personId]!)}, recorded tuition ${input.tuitionFlowId}, principal ${loans[0]!.obligation.id}; 100000 cents lender cash disbursed, repeat/SaveContinue unchanged.`,
      );
    });
  for (const place of ["4752006", "3918000", "1150000", "1571550", "2836000"])
    it(`allocates real monthly cash and reuses one tuition charge in ${place}`, () => {
      const { world, personId, input } = fixture(place, true);
      const funded = financeRecordedStudentTuition(world, input);
      const debt = householdLoansOf(funded, { kind: "person", personId })[0]!
        .obligation;
      const monthly = advanceLoanMonth(funded);
      const allocation = monthly.history.loanRepaymentAllocations!.find(
        (row) => row.resourceObligationId === debt.id,
      )!;
      const actual = monthly.history.resourceTransferOutcomes.find(
        (row) => row.id === allocation.resourceTransferOutcomeId,
      )!;
      expect(allocation.unsupportedReason).toBeNull();
      expect(allocation.fees!.minorUnits).toBe(0);
      expect(allocation.interest!.minorUnits).toBe(500);
      expect(allocation.principal!.minorUnits).toBe(
        actual.transferredAmount.minorUnits - 500,
      );
      expect(
        loanBalanceComponentsAt(monthly, debt.id)!.principal.minorUnits,
      ).toBe(100_000 - allocation.principal!.minorUnits);
      expect(outstandingDebtAt(monthly, debt.id)!.minorUnits).toBe(
        100_000 + 500 - actual.transferredAmount.minorUnits,
      );
      expect(
        recordLoanRepaymentAllocation(
          monthly,
          debt.id,
          actual.id,
          allocation.stableKey,
        ),
      ).toBe(monthly);
      const saved = deserializeWorld(serializeWorld(monthly));
      expect(loanBalanceComponentsAt(saved, debt.id)).toEqual(
        loanBalanceComponentsAt(monthly, debt.id),
      );
      // Explicit test program inputs, not an automatic eligibility award.
      const path = {
        ...lifePathDefinition("college-bachelors"),
        daysPerPeriod: 1,
        minimumElapsedDays: 8,
        periodCostMinor: world.history.resourceFlowTerms.find(
          (row) => row.resourceFlowId === input.tuitionFlowId,
        )!.amount.minorUnits,
      };
      const due = advanceWorld(
        world,
        1,
        createCampaignElectionTransitionRegistry(),
      );
      const unfunded = completeStudyPeriod(due, input.enrollmentId, path);
      expect(completedStudyPeriods(unfunded, input.enrollmentId, path)).toBe(0);
      expect(
        unfunded.history.resourceFlows.filter((row) =>
          row.stableKey.startsWith(
            `life-paths2.study-period:${input.enrollmentId}:`,
          ),
        ),
      ).toHaveLength(1);
      const enrollmentId = input.enrollmentId;
      const financing = input;
      const completed = completeStudyPeriod(
        unfunded,
        enrollmentId,
        path,
        financing,
      );
      expect(completedStudyPeriods(completed, enrollmentId, path)).toBe(1);
      const payments = completed.history.resourceTransferOutcomes.filter(
        (row) => row.resourceFlowId === input.tuitionFlowId,
      );
      expect(payments).toHaveLength(1);
      expect(payments[0]!.status).toBe("completed");
      expect(
        completed.history.resourceFlows.filter((row) =>
          row.stableKey.startsWith(
            `life-paths2.study-period:${input.enrollmentId}:`,
          ),
        ),
      ).toHaveLength(1);
      const afterSave = deserializeWorld(serializeWorld(completed));
      expect(
        completeStudyPeriod(afterSave, enrollmentId, path, financing),
      ).toBe(afterSave);
      console.log(
        `X7 ${place}: ${personName(world.people[personId]!)} actual repayment ${actual.id} allocated fee/interest/principal; tuition payment ${payments[0]!.id} reused ${input.tuitionFlowId}.`,
      );
    });
  it("caps principal at remaining annual authorization without inventing the balance", () => {
    const { world, personId, input } = fixture("3918000");
    const next = financeRecordedStudentTuition(world, {
      ...input,
      annualLimit: money(60_000, USD),
    });
    expect(
      householdLoansOf(next, { kind: "person", personId })[0]!.obligation
        .principal,
    ).toEqual(money(60_000, USD));
    expect(financeRecordedStudentTuition(next, input)).toBe(next);
  });
  it("pays saved fees before interest and principal; discharges without cash or a terms rewrite", () => {
    const { world, personId, lenderId, openingCash, input } =
      fixture("3918000");
    const funded = financeRecordedStudentTuition(world, {
      ...input,
      loan: { ...input.loan, lateFee: money(3_000, USD) },
    });
    const debt = householdLoansOf(funded, { kind: "person", personId })[0]!
      .obligation;
    const provenance = {
      kind: "authored",
      note: "Controlled repayment allocation fixture.",
    } as const;
    const paidTuition = recordResourceTransferOutcome(funded, {
      stableKey: "x7-fees-school-paid",
      resourceFlowId: input.tuitionFlowId,
      periodStartsAt: funded.currentDate,
      periodEndsAt: funded.currentDate,
      occurredAt: funded.currentDate,
      status: "completed",
      attemptedAmount: money(openingCash + 100_000, USD),
      transferredAmount: money(openingCash + 100_000, USD),
      reasonKind: null,
      note: "Actual tuition payment empties test cash.",
      provenance,
    });
    const missed = advanceLoanMonth(paidTuition);
    expect(loanBalanceComponentsAt(missed, debt.id)!.fees.minorUnits).toBe(
      3_000,
    );
    let cashFunded = createResourceFlow(missed, {
      stableKey: "x7-fees-cash",
      source: { kind: "organization", organizationId: lenderId },
      recipient: { kind: "person", personId },
      startsAt: missed.currentDate,
      amount: money(50_000, USD),
      cadenceKind: "schedule:one-time",
      basisKind: "support:test-fixture",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    cashFunded = recordResourceTransferOutcome(cashFunded, {
      stableKey: "x7-fees-cash-paid",
      resourceFlowId: cashFunded.history.resourceFlows.at(-1)!.id,
      periodStartsAt: missed.currentDate,
      periodEndsAt: missed.currentDate,
      occurredAt: missed.currentDate,
      status: "completed",
      attemptedAmount: money(50_000, USD),
      transferredAmount: money(50_000, USD),
      reasonKind: null,
      note: "Recorded test funds from the existing lender.",
      provenance,
    });
    const repaid = advanceLoanMonth(cashFunded);
    const allocation = repaid.history
      .loanRepaymentAllocations!.filter(
        (row) => row.resourceObligationId === debt.id,
      )
      .at(-1)!;
    const actual = repaid.history.resourceTransferOutcomes.find(
      (row) => row.id === allocation.resourceTransferOutcomeId,
    )!;
    expect(actual.transferredAmount.minorUnits).toBeGreaterThan(0);
    expect(allocation.fees!.minorUnits).toBe(
      actual.transferredAmount.minorUnits,
    );
    expect(allocation.interest!.minorUnits).toBe(0);
    expect(allocation.principal!.minorUnits).toBe(0);
    const before = loanBalanceComponentsAt(repaid, debt.id)!;
    const discharged = recordLoanDischarge(
      repaid,
      debt.id,
      { principal: money(40_000, USD), interest: before.interest },
      "x7-separate-discharge",
      input.source,
    );
    expect(discharged.history.loanTerms).toBe(repaid.history.loanTerms);
    expect(discharged.history.resourceTransferOutcomes).toBe(
      repaid.history.resourceTransferOutcomes,
    );
    expect(loanBalanceComponentsAt(discharged, debt.id)).toEqual({
      principal: money(60_000, USD),
      interest: money(0, USD),
      fees: before.fees,
    });
    expect(outstandingDebtAt(discharged, debt.id)!.minorUnits).toBe(
      60_000 + before.fees.minorUnits,
    );
    const saved = deserializeWorld(serializeWorld(discharged));
    expect(
      recordLoanDischarge(
        saved,
        debt.id,
        { principal: money(40_000, USD), interest: before.interest },
        "x7-separate-discharge",
        input.source,
      ),
    ).toBe(saved);
    const oldSave = {
      ...repaid,
      history: { ...repaid.history, loanRepaymentAllocations: undefined },
    };
    expect(outstandingDebtAt(oldSave, debt.id)).toEqual(
      outstandingDebtAt(repaid, debt.id),
    );
    expect(loanBalanceComponentsAt(oldSave, debt.id)).toBeNull();
    expect(() =>
      reduceLoanPrincipal(
        oldSave,
        debt.id,
        money(1, USD),
        "x7-unknown-old-principal",
        input.source,
      ),
    ).toThrow("recorded repayment allocations");
  });
  it("rejects enrollment alone and mismatched school charges without writing", () => {
    const { world, input } = fixture("3918000");
    expect(() =>
      financeRecordedStudentTuition(world, {
        ...input,
        tuitionFlowId: input.enrollmentId,
      }),
    ).toThrow("actual postsecondary tuition charge");
  });
  it("records dated principal credits without transfers, carried-forward duplication or historical rewrite", () => {
    const { world, personId, input } = fixture("3918000");
    const funded = financeRecordedStudentTuition(world, input);
    const debt = householdLoansOf(funded, { kind: "person", personId })[0]!
      .obligation;
    const cutoff = {
      asOfDate: funded.currentDate,
      historySequenceExclusive: funded.history.nextSequence,
    };
    const credited = reduceLoanPrincipal(
      funded,
      debt.id,
      money(40_000, USD),
      "x7-credit-one",
      input.source,
    );
    expect(outstandingDebtAt(credited, debt.id)).toEqual(money(60_000, USD));
    expect(outstandingDebtAt(credited, debt.id, cutoff)).toEqual(
      money(100_000, USD),
    );
    expect(loanTermsAt(credited, debt.id, cutoff)).toBe(
      funded.history.loanTerms!.at(-1),
    );
    expect(loanTermsAt(credited, debt.id, credited.currentDate)).toBe(
      credited.history.loanTerms!.at(-1),
    );
    expect(credited.history.resourceTransferOutcomes).toBe(
      funded.history.resourceTransferOutcomes,
    );
    expect(credited.history.resourceObligations).toBe(
      funded.history.resourceObligations,
    );
    expect(
      reduceLoanPrincipal(
        credited,
        debt.id,
        money(40_000, USD),
        "x7-credit-one",
        input.source,
      ),
    ).toBe(credited);
    const repriced = reviseLoanTerms(
      credited,
      debt.id,
      { annualRateBasisPoints: 500 },
      "x7-new-rate",
      input.source,
    );
    expect(
      repriced.history.loanTerms!.at(-1)!.principalReduction,
    ).toBeUndefined();
    expect(outstandingDebtAt(repriced, debt.id)).toEqual(money(60_000, USD));
    expect(loanTermsAt(repriced, debt.id, cutoff)!.annualRateBasisPoints).toBe(
      600,
    );
    expect(
      loanTermsAt(repriced, debt.id, repriced.currentDate)!
        .annualRateBasisPoints,
    ).toBe(500);
    const saved = deserializeWorld(serializeWorld(repriced));
    expect(outstandingDebtAt(saved, debt.id)).toEqual(money(60_000, USD));
    expect(
      reduceLoanPrincipal(
        saved,
        debt.id,
        money(40_000, USD),
        "x7-credit-one",
        input.source,
      ),
    ).toBe(saved);
    expect(() =>
      reduceLoanPrincipal(
        saved,
        debt.id,
        money(70_000, USD),
        "x7-too-large",
        input.source,
      ),
    ).toThrow("recorded component");
    const corrupt = {
      ...saved,
      history: {
        ...saved.history,
        loanDischarges: saved.history.loanDischarges!.map((row) =>
          row.stableKey === "x7-credit-one"
            ? { ...row, principal: { minorUnits: -1, currency: USD } }
            : row,
        ),
      },
    };
    expect(() => serializeWorld(corrupt)).toThrow("Loan discharges");
  });
  it("does not convert cash-paid tuition or cash sufficient for tuition into debt", () => {
    const { world: opening, personId, lenderId, input } = fixture("3918000");
    const provenance = {
      kind: "authored",
      note: "Controlled small tuition charge.",
    } as const;
    let world = createResourceFlow(opening, {
      stableKey: "x7-fixture-cash-support",
      source: { kind: "organization", organizationId: lenderId },
      recipient: { kind: "person", personId },
      startsAt: opening.currentDate,
      amount: money(10_000, USD),
      cadenceKind: "schedule:one-time",
      basisKind: "support:test-fixture",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "x7-fixture-cash-supported",
      resourceFlowId: world.history.resourceFlows.at(-1)!.id,
      periodStartsAt: world.currentDate,
      periodEndsAt: world.currentDate,
      occurredAt: world.currentDate,
      status: "completed",
      attemptedAmount: money(10_000, USD),
      transferredAmount: money(10_000, USD),
      reasonKind: null,
      note: "Controlled cash-paid tuition fixture funding.",
      provenance,
    });
    const original = world.history.resourceFlows.find(
      (r) => r.id === input.tuitionFlowId,
    )!;
    const cash = resourcePositionAt(world, { kind: "person", personId }, USD)!
      .liquidBalance.minorUnits;
    const charged = createResourceFlow(world, {
      stableKey: "x7-cash-paid-tuition",
      source: original.source,
      recipient: original.recipient,
      startsAt: world.currentDate,
      amount: money(cash, USD),
      cadenceKind: "schedule:one-time",
      basisKind: "obligation:tuition",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: null,
      provenance,
    });
    const tuitionFlowId = charged.history.resourceFlows.at(-1)!.id;
    const paidInput = { ...input, tuitionFlowId };
    expect(financeRecordedStudentTuition(charged, paidInput)).toBe(charged);
    const paid = recordResourceTransferOutcome(charged, {
      stableKey: "x7-cash-paid",
      resourceFlowId: tuitionFlowId,
      periodStartsAt: charged.currentDate,
      periodEndsAt: charged.currentDate,
      occurredAt: charged.currentDate,
      status: "completed",
      attemptedAmount: money(cash, USD),
      transferredAmount: money(cash, USD),
      reasonKind: null,
      note: "Cash tuition, never borrowed.",
      provenance,
    });
    expect(
      resourcePositionAt(paid, { kind: "person", personId }, USD)!.liquidBalance
        .minorUnits,
    ).toBe(0);
    expect(financeRecordedStudentTuition(paid, paidInput)).toBe(paid);
    expect(householdLoansOf(paid, { kind: "person", personId })).toHaveLength(
      0,
    );
  });
});

describe("saved-fact undergraduate loan constraints", () => {
  it.each([
    { age: 23, cap: 550_000 },
    { age: 24, cap: 950_000 },
  ])(
    "applies actual age $age to a recorded shortfall with cap $cap",
    ({ age, cap }) => {
      const { world, personId, lenderId, input } = fixture(
        "4752006",
        false,
        age,
      );
      const terms = world.history.resourceFlowTerms.find(
        (row) => row.resourceFlowId === input.tuitionFlowId,
      )!;
      const openingCash = resourcePositionAt(
        world,
        { kind: "person", personId },
        USD,
      )!.liquidBalance.minorUnits;
      const priced = recordResourceFlowTerms(world, {
        stableKey: `fixture:large-tuition:${age}`,
        resourceFlowId: input.tuitionFlowId,
        effectiveAt: world.currentDate,
        status: "active",
        amount: money(openingCash + 1_000_000, USD),
        cadenceKind: terms.cadenceKind,
        supersedesTermsId: terms.id,
        reason:
          "Controlled recorded tuition above the published borrowing ceiling.",
        provenance: input.source,
      });
      const path = lifePathDefinition("college-bachelors");
      const facts = recordedStudentAidFacts(priced, input.enrollmentId, path)!;
      expect(
        ageOnDate(priced.people[personId]!.birthDate, priced.currentDate),
      ).toBe(age);
      expect(facts.annualLimit.minorUnits).toBe(cap);
      const financing = { ...input, annualLimit: money(1_200_000, USD) };
      const funded = financeStudentTuitionWithSavedAidFacts(
        priced,
        financing,
        path,
      );
      const debt = householdLoansOf(funded, { kind: "person", personId })[0]!;
      expect(debt.obligation.principal!.minorUnits).toBe(cap);
      expect(
        resourcePositionAt(
          funded,
          { kind: "organization", organizationId: lenderId },
          USD,
        )!.liquidBalance.minorUnits,
      ).toBe(1_000_000 - cap);
      expect(
        financeStudentTuitionWithSavedAidFacts(funded, financing, path),
      ).toBe(funded);
      const reopened = deserializeWorld(serializeWorld(funded));
      expect(
        financeStudentTuitionWithSavedAidFacts(reopened, financing, path),
      ).toBe(reopened);
      console.log(
        `X7 saved age ${age}: ${personName(priced.people[personId]!)}, ${facts.dependency}, actual principal ${debt.obligation.id} ${cap} USD cents, no automatic award.`,
      );
    },
  );

  it("reads actual marriage and its ending without inferring it from cohabitation", () => {
    const { world, personId, input } = fixture("3918000", false, 23);
    const path = lifePathDefinition("college-bachelors");
    expect(
      recordedStudentAidFacts(world, input.enrollmentId, path)!.dependency,
    ).toBe("dependent");
    const spouse = Object.values(world.people).find(
      (person) =>
        person.id !== personId &&
        ageOnDate(person.birthDate, world.currentDate) >= 24,
    )!;
    const married = createPartnership(world, {
      stableKey: "fixture:x7-married",
      personIds: [personId, spouse.id],
      startedAt: world.currentDate,
      kind: "legal:marriage",
      provenance: {
        kind: "authored",
        note: "Controlled actual saved marriage fixture.",
      },
    });
    const partnership = married.history.partnerships.at(-1)!;
    expect(
      recordedStudentAidFacts(married, input.enrollmentId, path)!
        .sourceRecordIds,
    ).toContain(partnership.id);
    expect(
      recordedStudentAidFacts(married, input.enrollmentId, path)!.annualLimit
        .minorUnits,
    ).toBe(950_000);
    const ended = recordPartnershipState(married, {
      stableKey: "fixture:x7-marriage-ended",
      partnershipId: partnership.id,
      effectiveAt: world.currentDate,
      status: "ended",
      supersedesStateId: married.history.partnershipStates.at(-1)!.id,
      provenance: {
        kind: "authored",
        note: "Controlled saved marriage ending.",
      },
    });
    expect(
      recordedStudentAidFacts(ended, input.enrollmentId, path)!.annualLimit
        .minorUnits,
    ).toBe(550_000);
    expect(
      recordedStudentAidFacts(ended, input.enrollmentId, path)!
        .unsupportedExceptionFacts,
    ).toEqual(["financial-dependents", "veteran-status"]);
  });

  it("advances program year only after two actual paid study periods", () => {
    const { world, personId, input } = fixture("1150000", true);
    const path = {
      ...lifePathDefinition("college-bachelors"),
      daysPerPeriod: 1,
      minimumElapsedDays: 8,
      periodCostMinor: world.history.resourceFlowTerms.find(
        (row) => row.resourceFlowId === input.tuitionFlowId,
      )!.amount.minorUnits,
    };
    const financing = { ...input, annualLimit: money(950_000, USD) };
    let next = world;
    for (let period = 0; period < 2; period++) {
      next = advanceWorld(next, 1, createCampaignElectionTransitionRegistry());
      next = completeStudyPeriod(next, input.enrollmentId, path, financing);
    }
    expect(completedStudyPeriods(next, input.enrollmentId, path)).toBe(2);
    const facts = recordedStudentAidFacts(next, input.enrollmentId, path)!;
    expect(facts.academicYear).toBe(2);
    expect(facts.annualLimit.minorUnits).toBe(1_050_000);
    const outcomes = next.history.resourceTransferOutcomes.filter((record) =>
      next.history.resourceFlows.some(
        (flow) =>
          flow.id === record.resourceFlowId &&
          flow.basisKind === "obligation:tuition",
      ),
    );
    expect(
      outcomes.filter((record) => record.status === "completed"),
    ).toHaveLength(2);
    const reopened = deserializeWorld(serializeWorld(next));
    expect(recordedStudentAidFacts(reopened, input.enrollmentId, path)).toEqual(
      facts,
    );
    console.log(
      `X7 actual paid program-year progression: ${personName(next.people[personId]!)}, two real school payments, year2 from saved study outcomes.`,
    );
  });
});

it("caps new financing by recorded principal, without mistaking accrued interest for principal", () => {
  const { world, personId, lenderId, input } = fixture("1571550");
  const prior = openHouseholdLoan(world, {
    ...input.loan,
    stableKey: "fixture:x7-prior-year-principal",
    borrower: { kind: "person", personId },
    lenderOrganizationId: lenderId,
    lenderKind: "federal-government",
    kind: "student",
    principal: money(5_700_000, USD),
    rateCap: null,
    jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
    housingTenureId: null,
    provenance: {
      kind: "authored",
      note: "Controlled existing prior-year debt contract; not drawn or inferred tuition.",
    },
  });
  const oldDebt = householdLoansOf(prior, { kind: "person", personId })[0]!;
  const serviced = advanceLoanMonth(prior);
  const oldComponents = loanBalanceComponentsAt(
    serviced,
    oldDebt.obligation.id,
  )!;
  expect(oldComponents.principal.minorUnits).toBe(5_700_000);
  expect(oldComponents.interest.minorUnits).toBeGreaterThan(0);
  // An explicitly supplied financial-year boundary, not an inferred academic calendar.
  // Use the actual serviced date; no yearly clock jump or skipped future jobs.
  const today = serviced.currentDate;
  const snapshot = serviced;
  const financing = {
    ...input,
    academicYearStartsAt: today,
    academicYearEndsAt: addDays(today, 365),
    annualLimit: money(950_000, USD),
  };
  const path = lifePathDefinition("college-bachelors");
  expect(
    recordedStudentAidFacts(snapshot, input.enrollmentId, path)!.academicYear,
  ).toBe(1);
  const funded = financeStudentTuitionWithSavedAidFacts(
    snapshot,
    financing,
    path,
  );
  const fresh = householdLoansOf(funded, { kind: "person", personId }).find(
    (loan) => loan.obligation.id !== oldDebt.obligation.id,
  )!;
  expect(fresh.obligation.principal!.minorUnits).toBe(50_000);
  expect(loanBalanceComponentsAt(funded, oldDebt.obligation.id)).toEqual(
    oldComponents,
  );
  expect(
    outstandingDebtAt(funded, oldDebt.obligation.id)!.minorUnits,
  ).toBeGreaterThan(5_700_000);
  const resumed = deserializeWorld(serializeWorld(funded));
  expect(financeStudentTuitionWithSavedAidFacts(resumed, financing, path)).toBe(
    resumed,
  );
  const allPrincipal = householdLoansOf(resumed, {
    kind: "person",
    personId,
  }).reduce(
    (sum, loan) =>
      sum +
      loanBalanceComponentsAt(resumed, loan.obligation.id)!.principal
        .minorUnits,
    0,
  );
  expect(allPrincipal).toBe(5_750_000);
  console.log(
    `X7 ${personName(resumed.people[personId]!)}: real prior repayment interest allocation retained; aggregate principal5750000 USD cents includes new actual50000 financing, accrued interest excluded. Supplied financial-year fixture, not an inferred calendar.`,
  );
});
