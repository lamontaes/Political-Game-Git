import { describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { createEducationEnrollment, createOrganization } from "./life";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "./national-election-geography";
import { publicGovernmentOrganizationKey } from "./public-government-identity";
import {
  householdLoansOf,
  reduceLoanPrincipal,
  reviseLoanTerms,
} from "./household-loans";
import { personName } from "./people";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { outstandingDebtAt, resourcePositionAt } from "./resource-queries";
import { deserializeWorld, serializeWorld } from "./serialization";
import { financeRecordedStudentTuition } from "./student-debt";
import type { RecordedStudentFinancingInput } from "./student-debt";

// Controlled accounting inputs, not empirical rates or admitted law terms.
const USD = money(0, "USD").currency;
function fixture(placeKey: string) {
  const created = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    placeKey,
    seed: `team4-x7-recorded-tuition:${placeKey}`,
    startAge: 25,
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
    stableKey: "x7-tuition",
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
    academicYearEndsAt: world.currentDate,
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

describe("recorded student tuition financing", () => {
  // Reuses five selections from the all-jurisdiction Team4 proof lane.
  for (const place of ["4752006", "3918000", "1150000", "1571550", "2836000"])
    it(`finances actual shortfall in ${place}, preserves records and repeat identity`, () => {
      const { world, personId, lenderId, openingCash, input } = fixture(place);
      const next = financeRecordedStudentTuition(world, input);
      const loans = householdLoansOf(next, { kind: "person", personId });
      expect(loans).toHaveLength(1);
      expect(loans[0]!.obligation.principal).toEqual(money(100_000, USD));
      expect(loans[0]!.terms.annualRateBasisPoints).toBe(600);
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
    ).toThrow("recorded debt");
    const corrupt = {
      ...saved,
      history: {
        ...saved.history,
        loanTerms: saved.history.loanTerms!.map((row) =>
          row.stableKey === "x7-credit-one"
            ? { ...row, principalReduction: { minorUnits: -1, currency: USD } }
            : row,
        ),
      },
    };
    expect(() => serializeWorld(corrupt)).toThrow("principal reductions");
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
