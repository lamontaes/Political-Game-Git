import { describe, expect, it } from "vitest";

import {
  activeDwellingOccupanciesAt,
  activeHousingTenuresAt,
  advanceWorld,
  applyCharacterHistoryPlan,
  assessAffordability,
  assessRelationshipContinuity,
  assertWorldIntegrity,
  assertLifeHistorySourceAvailable,
  characterHistoryContextPersonId,
  composeApprenticeshipPlan,
  createCareResponsibility,
  createDemoWorld,
  createExactQuantity,
  createFutureTransitionHandlerRegistry,
  createDwelling,
  createHousehold,
  createHousingTenure,
  createOrganization,
  createPartnership,
  createResourceFlow,
  createResourceObligation,
  createResourcePosition,
  createWorkCompensation,
  createWorkRelationship,
  createWorld,
  currentResourceCutoff,
  deserializeWorld,
  evaluateDecision,
  generateQuickCharacterHistory,
  householdMembershipsAt,
  materializePerson,
  money,
  outstandingDebtAt,
  recordDwellingOccupancyState,
  recordEventKnowledge,
  recordHouseholdLocation,
  recordHousingTenureState,
  recordPerception,
  recordRelationshipMoment,
  recordResourceFlowTerms,
  recordResourceObligationState,
  recordResourcePressure,
  recordResourceTransferOutcome,
  recordWorkCompensationTerms,
  recordWorldEvent,
  recordWorldMetricObservation,
  recordWorldMetricState,
  resolveWorkCompensationPeriod,
  resourceFlowTermsAt,
  resourcePositionAt,
  resourceTransferOutcomesForFlow,
  serializeWorld,
  scheduleFutureDueItem,
  startDwellingOccupancy,
  startHouseholdMembership,
  futureDueItemStateAt,
  latestObservationForSeriesAt,
  worldMetricStateForPeriodAt,
} from "./index";
import type {
  CharacterHistoryMode,
  CharacterHistoryPlan,
  EntityId,
  EventContext,
  LifeRecordProvenance,
  Person,
  TimeDemandProfile,
  World,
} from "./index";

const AUTHORED: LifeRecordProvenance = {
  kind: "authored",
  note: "Synthetic Stage 5 Run C semantic fixture.",
};

const SMALL_TIME: TimeDemandProfile = {
  expectedWeekly: { minimumHours: 1, maximumHours: 3 },
  attention: "moderate",
  concurrency: "partly-concurrent",
  scheduleRigidity: "flexible",
  interruptibility: "interruptible",
  locationJurisdictionId: null,
};

function bareWorld(seed: string): World {
  const demo = createDemoWorld(seed);
  return createWorld({
    seed,
    currentDate: demo.currentDate,
    jurisdictions: demo.jurisdictionOrder.map((id) => demo.jurisdictions[id]!),
    people: demo.personOrder.map((id) => demo.people[id] as Person),
  });
}

function personId(world: World, index = 0): EntityId {
  const id = world.personOrder[index];
  if (!id) throw new Error("Missing test person.");
  return id;
}

function addOrganization(world: World, key: string): [World, EntityId] {
  const next = createOrganization(world, {
    stableKey: key,
    formedAt: "2000-01-01",
    provenance: AUTHORED,
    initialProfile: {
      name: `Organization ${key}`,
      classification: "custom:run-c-organization",
      locationJurisdictionId: world.jurisdictionOrder[0]!,
    },
  });
  return [next, next.history.organizations.at(-1)!.id];
}

function addPaidWork(
  world: World,
  person: EntityId,
  organization: EntityId,
  key: string,
): [World, EntityId] {
  const next = createWorkRelationship(world, {
    stableKey: key,
    personId: person,
    organizationId: organization,
    startedAt: "2020-01-01",
    kind: "employment:run-c-work",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: AUTHORED,
    initialRole: {
      title: "Run C worker",
      occupationClassification: "custom:run-c-worker",
      locationJurisdictionId: world.jurisdictionOrder[0]!,
      timeDemand: {
        ...SMALL_TIME,
        expectedWeekly: { minimumHours: 32, maximumHours: 40 },
      },
    },
  });
  return [next, next.history.workRelationships.at(-1)!.id];
}

function addHousehold(
  world: World,
  key: string,
  residentIds: readonly EntityId[],
): [World, EntityId] {
  let next = createHousehold(world, {
    stableKey: key,
    formedAt: "2010-01-01",
    label: `Household ${key}`,
    provenance: AUTHORED,
  });
  const householdId = next.history.households.at(-1)!.id;
  next = recordHouseholdLocation(next, {
    stableKey: `${key}:location`,
    householdId,
    effectiveAt: "2010-01-01",
    jurisdictionId: next.jurisdictionOrder[0]!,
    label: "Run C household location",
    kind: "residence:ordinary",
    provenance: AUTHORED,
    supersedesLocationId: null,
  });
  for (const [index, residentId] of residentIds.entries()) {
    next = startHouseholdMembership(next, {
      stableKey: `${key}:member:${index}`,
      personId: residentId,
      householdId,
      startedAt: "2010-01-01",
      residenceRole: index === 0 ? "primary" : "shared",
      kind: "resident:household-member",
      provenance: AUTHORED,
    });
  }
  return [next, householdId];
}

function relationshipContext(label: string): EventContext {
  return {
    location: null,
    socialContext: label,
    pressure: null,
    choice: null,
    motivation: null,
    immediateReaction: label,
  };
}

describe("Stage 5 Run C resource flows and work compensation", () => {
  it("turns salary terms into exact actual money, preserves a raise, and composes concurrent jobs", () => {
    let world = bareWorld("run-c-salary");
    const worker = personId(world);
    const [withOrganizationA, organizationA] = addOrganization(
      world,
      "salary:employer:a",
    );
    world = withOrganizationA;
    const [withWorkA, workA] = addPaidWork(
      world,
      worker,
      organizationA,
      "salary:work:a",
    );
    world = withWorkA;
    const [withOrganizationB, organizationB] = addOrganization(
      world,
      "salary:employer:b",
    );
    world = withOrganizationB;
    const [withWorkB, workB] = addPaidWork(
      world,
      worker,
      organizationB,
      "salary:work:b",
    );
    world = withWorkB;
    world = createResourcePosition(world, {
      stableKey: "salary:position",
      owner: { kind: "person", personId: worker },
      openedAt: "2023-01-01",
      openingBalance: money(0, "USD"),
      provenance: AUTHORED,
    });
    world = createWorkCompensation(world, {
      stableKey: "salary:flow:a",
      workRelationshipId: workA,
      startsAt: "2024-01-01",
      amount: money(500_000, "USD"),
      cadenceKind: "work:monthly-salary",
      restrictionKind: null,
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    world = createWorkCompensation(world, {
      stableKey: "salary:flow:b",
      workRelationshipId: workB,
      startsAt: "2024-01-01",
      amount: money(100_000, "USD"),
      cadenceKind: "work:monthly-stipend",
      restrictionKind: null,
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const firstFlow = world.history.resourceFlows.find(
      (flow) => flow.stableKey === "salary:flow:a",
    )!;
    const oldTerms = resourceFlowTermsAt(world, firstFlow.id)!;
    world = resolveWorkCompensationPeriod(world, {
      stableKey: "salary:outcome:a:2024-01",
      workRelationshipId: workA,
      periodStartsAt: "2024-01-01",
      periodEndsAt: "2024-01-31",
      occurredAt: "2024-01-31",
      status: "completed",
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    world = resolveWorkCompensationPeriod(world, {
      stableKey: "salary:outcome:b:2024-01",
      workRelationshipId: workB,
      periodStartsAt: "2024-01-01",
      periodEndsAt: "2024-01-31",
      occurredAt: "2024-01-31",
      status: "completed",
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    world = recordWorkCompensationTerms(world, {
      stableKey: "salary:terms:a:raise",
      workRelationshipId: workA,
      effectiveAt: "2025-01-01",
      status: "active",
      amount: money(600_000, "USD"),
      cadenceKind: "work:monthly-salary",
      reason: "Effective-dated raise.",
      provenance: AUTHORED,
      supersedesTermsId: oldTerms.id,
    });
    world = resolveWorkCompensationPeriod(world, {
      stableKey: "salary:outcome:a:2024-12-paid-late",
      workRelationshipId: workA,
      periodStartsAt: "2024-12-01",
      periodEndsAt: "2024-12-31",
      occurredAt: "2025-01-05",
      status: "completed",
      reasonKind: null,
      note: "December pay settled after the January raise took effect.",
      provenance: AUTHORED,
    });
    const lateDecemberOutcome = world.history.resourceTransferOutcomes.at(-1)!;
    world = resolveWorkCompensationPeriod(world, {
      stableKey: "salary:outcome:a:2025-01",
      workRelationshipId: workA,
      periodStartsAt: "2025-01-01",
      periodEndsAt: "2025-01-31",
      occurredAt: "2025-01-31",
      status: "completed",
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });

    expect(
      resourceFlowTermsAt(world, firstFlow.id, {
        asOfDate: "2024-12-31" as never,
        historySequenceExclusive: world.history.nextSequence,
      })?.amount.minorUnits,
    ).toBe(500_000);
    expect(resourceFlowTermsAt(world, firstFlow.id)?.amount.minorUnits).toBe(
      600_000,
    );
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: worker },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(1_700_000);
    expect(world.history.workRelationships).toHaveLength(2);
    expect(world.history.resourceTransferOutcomes).toHaveLength(4);
    expect(lateDecemberOutcome.attemptedAmount).toStrictEqual(
      money(500_000, "USD"),
    );
    expect(lateDecemberOutcome.transferredAmount).toStrictEqual(
      money(500_000, "USD"),
    );
    expect(oldTerms.amount.minorUnits).toBe(500_000);
  });

  it("distinguishes expected terms and completed, partial, missed, and blocked outcomes with reconciled positions", () => {
    let world = bareWorld("run-c-outcomes");
    const source = personId(world, 0);
    const recipient = personId(world, 1);
    world = createResourcePosition(world, {
      stableKey: "outcome:source-position",
      owner: { kind: "person", personId: source },
      openedAt: "2024-01-01",
      openingBalance: money(100_000, "USD"),
      provenance: AUTHORED,
    });
    world = createResourcePosition(world, {
      stableKey: "outcome:recipient-position",
      owner: { kind: "person", personId: recipient },
      openedAt: "2024-01-01",
      openingBalance: money(0, "USD"),
      provenance: AUTHORED,
    });
    world = createResourceFlow(world, {
      stableKey: "outcome:flow",
      source: { kind: "person", personId: source },
      recipient: { kind: "person", personId: recipient },
      startsAt: "2025-01-01",
      amount: money(25_000, "USD"),
      cadenceKind: "support:monthly",
      basisKind: "support:cross-household",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:family-support",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: source },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(100_000);
    world = recordResourceTransferOutcome(world, {
      stableKey: "outcome:partial",
      resourceFlowId: flow.id,
      periodStartsAt: "2025-01-01",
      periodEndsAt: "2025-01-31",
      occurredAt: "2025-01-31",
      status: "partial",
      attemptedAmount: money(25_000, "USD"),
      transferredAmount: money(10_000, "USD"),
      reasonKind: "capacity:limited-liquid",
      note: "Only part of the support was paid.",
      provenance: AUTHORED,
    });
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: source },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(90_000);
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: recipient },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(10_000);
    const afterFirstPeriod = world;
    expect(() =>
      recordResourceTransferOutcome(world, {
        stableKey: "outcome:duplicate-period",
        resourceFlowId: flow.id,
        periodStartsAt: "2025-01-01",
        periodEndsAt: "2025-01-31",
        occurredAt: "2025-01-31",
        status: "completed",
        attemptedAmount: money(25_000, "USD"),
        transferredAmount: money(25_000, "USD"),
        reasonKind: null,
        note: null,
        provenance: AUTHORED,
      }),
    ).toThrow(/overlapping committed settlement periods/);
    expect(world).toBe(afterFirstPeriod);
    expect(world.history.resourceTransferOutcomes).toHaveLength(1);
    expect(() =>
      recordResourceTransferOutcome(world, {
        stableKey: "outcome:overlapping-period",
        resourceFlowId: flow.id,
        periodStartsAt: "2025-01-15",
        periodEndsAt: "2025-02-15",
        occurredAt: "2025-02-15",
        status: "completed",
        attemptedAmount: money(25_000, "USD"),
        transferredAmount: money(25_000, "USD"),
        reasonKind: null,
        note: null,
        provenance: AUTHORED,
      }),
    ).toThrow(/overlapping committed settlement periods/);
    for (const [status, month, reason] of [
      ["missed", "02", "timing:missed-date"],
      ["blocked", "03", "authorization:disputed"],
    ] as const) {
      world = recordResourceTransferOutcome(world, {
        stableKey: `outcome:${status}`,
        resourceFlowId: flow.id,
        periodStartsAt: `2025-${month}-01`,
        periodEndsAt: `2025-${month}-${month === "02" ? "28" : "31"}`,
        occurredAt: `2025-${month}-${month === "02" ? "28" : "31"}`,
        status,
        attemptedAmount: money(25_000, "USD"),
        transferredAmount: money(0, "USD"),
        reasonKind: reason,
        note: null,
        provenance: AUTHORED,
      });
    }
    expect(
      resourceTransferOutcomesForFlow(world, flow.id).map(
        (item) => item.status,
      ),
    ).toStrictEqual(["partial", "missed", "blocked"]);
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: source },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(90_000);
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: recipient },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(10_000);
    const corruptedDuplicatePeriod = deserializeWorld(serializeWorld(world));
    (
      corruptedDuplicatePeriod.history
        .resourceTransferOutcomes[1] as unknown as {
        periodStartsAt: string;
        periodEndsAt: string;
      }
    ).periodStartsAt = "2025-01-01";
    (
      corruptedDuplicatePeriod.history
        .resourceTransferOutcomes[1] as unknown as {
        periodStartsAt: string;
        periodEndsAt: string;
      }
    ).periodEndsAt = "2025-01-31";
    expect(() => assertWorldIntegrity(corruptedDuplicatePeriod)).toThrow(
      /overlapping settlement period/,
    );
  });

  it("anchors general transfer terms to the settled period and rejects unprorated term changes inside it", () => {
    let world = bareWorld("run-c-general-settlement-terms");
    const source = personId(world, 0);
    const recipient = personId(world, 1);
    world = createResourceFlow(world, {
      stableKey: "general-terms:flow",
      source: { kind: "person", personId: source },
      recipient: { kind: "person", personId: recipient },
      startsAt: "2025-12-01",
      amount: money(10_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "custom:settlement-term-regression",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    const oldTerms = resourceFlowTermsAt(world, flow.id)!;
    world = recordResourceFlowTerms(world, {
      stableKey: "general-terms:january-raise",
      resourceFlowId: flow.id,
      effectiveAt: "2026-01-01",
      status: "active",
      amount: money(20_000, "USD"),
      cadenceKind: "schedule:monthly",
      reason: "The new amount applies from January.",
      provenance: AUTHORED,
      supersedesTermsId: oldTerms.id,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "general-terms:december-paid-late",
      resourceFlowId: flow.id,
      periodStartsAt: "2025-12-01",
      periodEndsAt: "2025-12-31",
      occurredAt: "2026-01-05",
      status: "completed",
      attemptedAmount: money(10_000, "USD"),
      transferredAmount: money(10_000, "USD"),
      reasonKind: null,
      note: "The December obligation settled after the January change.",
      provenance: AUTHORED,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "general-terms:january",
      resourceFlowId: flow.id,
      periodStartsAt: "2026-01-01",
      periodEndsAt: "2026-01-05",
      occurredAt: "2026-01-05",
      status: "completed",
      attemptedAmount: money(20_000, "USD"),
      transferredAmount: money(20_000, "USD"),
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    expect(
      world.history.resourceTransferOutcomes.map(
        (outcome) => outcome.attemptedAmount.minorUnits,
      ),
    ).toStrictEqual([10_000, 20_000]);

    let ambiguous = bareWorld("run-c-ambiguous-settlement-terms");
    const ambiguousSource = personId(ambiguous, 0);
    const ambiguousRecipient = personId(ambiguous, 1);
    ambiguous = createResourceFlow(ambiguous, {
      stableKey: "ambiguous-terms:flow",
      source: { kind: "person", personId: ambiguousSource },
      recipient: { kind: "person", personId: ambiguousRecipient },
      startsAt: "2025-12-01",
      amount: money(10_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "custom:ambiguous-settlement-terms",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: ambiguous.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const ambiguousFlow = ambiguous.history.resourceFlows.at(-1)!;
    const ambiguousOldTerms = resourceFlowTermsAt(ambiguous, ambiguousFlow.id)!;
    ambiguous = recordResourceFlowTerms(ambiguous, {
      stableKey: "ambiguous-terms:mid-period-change",
      resourceFlowId: ambiguousFlow.id,
      effectiveAt: "2025-12-15",
      status: "active",
      amount: money(20_000, "USD"),
      cadenceKind: "schedule:monthly",
      reason: "This change would require payroll prorating.",
      provenance: AUTHORED,
      supersedesTermsId: ambiguousOldTerms.id,
    });
    const beforeAmbiguousAttempt = ambiguous;
    expect(() =>
      recordResourceTransferOutcome(ambiguous, {
        stableKey: "ambiguous-terms:december-outcome",
        resourceFlowId: ambiguousFlow.id,
        periodStartsAt: "2025-12-01",
        periodEndsAt: "2025-12-31",
        occurredAt: "2026-01-05",
        status: "completed",
        attemptedAmount: money(10_000, "USD"),
        transferredAmount: money(10_000, "USD"),
        reasonKind: null,
        note: null,
        provenance: AUTHORED,
      }),
    ).toThrow(/cross an unprorated terms change/);
    expect(ambiguous).toBe(beforeAmbiguousAttempt);
  });

  it("keeps unpaid work unpaid and requires explicit activation and resolution for future compensation", () => {
    let world = bareWorld("run-c-unpaid-and-expected");
    const worker = personId(world);
    const [withEmployer, employer] = addOrganization(
      world,
      "expected:employer",
    );
    world = withEmployer;
    world = createWorkRelationship(world, {
      stableKey: "expected:unpaid-work",
      personId: worker,
      organizationId: employer,
      startedAt: "2020-01-01",
      kind: "volunteer:actual-service",
      compensation: "unpaid",
      authority: "directed",
      dependency: "independent",
      economicRisk: "organization-borne",
      provenance: AUTHORED,
      initialRole: {
        title: "Volunteer",
        occupationClassification: "custom:community-service",
        locationJurisdictionId: world.jurisdictionOrder[0]!,
        timeDemand: SMALL_TIME,
      },
    });
    const unpaidWork = world.history.workRelationships.at(-1)!;
    expect(() =>
      createWorkCompensation(world, {
        stableKey: "expected:invalid-unpaid-compensation",
        workRelationshipId: unpaidWork.id,
        startsAt: "2026-01-01",
        amount: money(10_000, "USD"),
        cadenceKind: "work:monthly-stipend",
        restrictionKind: null,
        jurisdictionId: world.jurisdictionOrder[0]!,
        provenance: AUTHORED,
      }),
    ).toThrow(/Unpaid or in-kind work/);

    const [withPaidWork, paidWork] = addPaidWork(
      world,
      worker,
      employer,
      "expected:paid-work",
    );
    world = withPaidWork;
    world = createResourcePosition(world, {
      stableKey: "expected:position",
      owner: { kind: "person", personId: worker },
      openedAt: "2026-01-01",
      openingBalance: money(0, "USD"),
      provenance: AUTHORED,
    });
    world = createWorkCompensation(world, {
      stableKey: "expected:future-compensation",
      workRelationshipId: paidWork,
      startsAt: "2027-01-01",
      initialStatus: "expected",
      amount: money(200_000, "USD"),
      cadenceKind: "work:monthly-salary",
      restrictionKind: null,
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const futureFlow = world.history.resourceFlows.at(-1)!;
    const expectedTerms = resourceFlowTermsAt(world, futureFlow.id)!;
    expect(expectedTerms.status).toBe("expected");
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: worker },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(0);
    expect(() =>
      resolveWorkCompensationPeriod(world, {
        stableKey: "expected:premature-outcome",
        workRelationshipId: paidWork,
        periodStartsAt: "2027-01-01",
        periodEndsAt: "2027-01-31",
        occurredAt: "2027-01-31",
        status: "completed",
        reasonKind: null,
        note: null,
        provenance: AUTHORED,
      }),
    ).toThrow();

    world = advanceWorld(world, 361);
    world = recordWorkCompensationTerms(world, {
      stableKey: "expected:activated-terms",
      workRelationshipId: paidWork,
      effectiveAt: "2027-01-01",
      status: "active",
      amount: money(200_000, "USD"),
      cadenceKind: "work:monthly-salary",
      reason: "The planned job began.",
      provenance: AUTHORED,
      supersedesTermsId: expectedTerms.id,
    });
    world = advanceWorld(world, 30);
    world = resolveWorkCompensationPeriod(world, {
      stableKey: "expected:resolved-outcome",
      workRelationshipId: paidWork,
      periodStartsAt: "2027-01-01",
      periodEndsAt: "2027-01-31",
      occurredAt: "2027-01-31",
      status: "completed",
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: worker },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(200_000);
  });

  it("derives materially different capacity from equal salary but different housing, support, and debt obligations", () => {
    let world = bareWorld("run-c-capacity");
    const constrained = personId(world, 0);
    const unconstrained = personId(world, 1);
    const [withEmployer, employer] = addOrganization(
      world,
      "capacity:employer",
    );
    world = withEmployer;
    const [withPayee, payee] = addOrganization(world, "capacity:payee");
    world = withPayee;
    for (const [index, person] of [constrained, unconstrained].entries()) {
      let workId: EntityId;
      [world, workId] = addPaidWork(
        world,
        person,
        employer,
        `capacity:work:${index}`,
      );
      world = createResourcePosition(world, {
        stableKey: `capacity:position:${index}`,
        owner: { kind: "person", personId: person },
        openedAt: "2024-01-01",
        openingBalance: money(1_000_000, "USD"),
        provenance: AUTHORED,
      });
      world = createWorkCompensation(world, {
        stableKey: `capacity:salary:${index}`,
        workRelationshipId: workId,
        startsAt: "2025-01-01",
        amount: money(500_000, "USD"),
        cadenceKind: "work:monthly-salary",
        restrictionKind: null,
        jurisdictionId: world.jurisdictionOrder[0]!,
        provenance: AUTHORED,
      });
      world = resolveWorkCompensationPeriod(world, {
        stableKey: `capacity:salary-outcome:${index}`,
        workRelationshipId: workId,
        periodStartsAt: "2025-01-01",
        periodEndsAt: "2025-01-31",
        occurredAt: "2025-01-31",
        status: "completed",
        reasonKind: null,
        note: null,
        provenance: AUTHORED,
      });
    }
    world = createResourceFlow(world, {
      stableKey: "capacity:housing-flow",
      source: { kind: "person", personId: constrained },
      recipient: { kind: "organization", organizationId: payee },
      startsAt: "2025-01-01",
      amount: money(600_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "housing:rent",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:housing",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const housingFlow = world.history.resourceFlows.at(-1)!;
    world = createResourceObligation(world, {
      stableKey: "capacity:housing-obligation",
      resourceFlowId: housingFlow.id,
      establishedAt: "2025-01-01",
      basisKind: "housing:rent",
      principal: null,
      careResponsibilityId: null,
      housingTenureId: null,
      provenance: AUTHORED,
    });
    world = createResourceFlow(world, {
      stableKey: "capacity:debt-flow",
      source: { kind: "person", personId: constrained },
      recipient: { kind: "organization", organizationId: payee },
      startsAt: "2025-01-01",
      amount: money(100_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "obligation:debt-payment",
      basisReference: { kind: "general" },
      restrictionKind: "restricted:debt-repayment",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const debtFlow = world.history.resourceFlows.at(-1)!;
    world = createResourceObligation(world, {
      stableKey: "capacity:debt",
      resourceFlowId: debtFlow.id,
      establishedAt: "2025-01-01",
      basisKind: "debt:education-balance",
      principal: money(2_000_000, "USD"),
      careResponsibilityId: null,
      housingTenureId: null,
      provenance: AUTHORED,
    });
    const debt = world.history.resourceObligations.at(-1)!;
    world = createResourceFlow(world, {
      stableKey: "capacity:support-flow",
      source: { kind: "person", personId: constrained },
      recipient: { kind: "organization", organizationId: payee },
      startsAt: "2025-01-01",
      amount: money(50_000, "USD"),
      cadenceKind: "support:weekly",
      basisKind: "support:cross-household-family",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:family-support",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const supportFlow = world.history.resourceFlows.at(-1)!;
    world = createResourceObligation(world, {
      stableKey: "capacity:support-obligation",
      resourceFlowId: supportFlow.id,
      establishedAt: "2025-01-01",
      basisKind: "support:cross-household-family",
      principal: null,
      careResponsibilityId: null,
      housingTenureId: null,
      provenance: AUTHORED,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "capacity:debt-payment",
      resourceFlowId: debtFlow.id,
      periodStartsAt: "2025-01-01",
      periodEndsAt: "2025-01-31",
      occurredAt: "2025-01-31",
      status: "completed",
      attemptedAmount: money(100_000, "USD"),
      transferredAmount: money(100_000, "USD"),
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });

    const monthlyComparison = { cadenceKind: "schedule:monthly" } as const;
    const constrainedAssessment = assessAffordability(
      world,
      { kind: "person", personId: constrained },
      money(900_000, "USD"),
      monthlyComparison,
    );
    expect(constrainedAssessment.status).toBe("strained");
    expect(constrainedAssessment.liquidPositionId).not.toBeNull();
    expect(
      constrainedAssessment.comparableScheduledMajorObligations,
    ).toStrictEqual(money(700_000, "USD"));
    expect(constrainedAssessment.scheduledMajorObligationBuckets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cadenceKind: "schedule:monthly",
          scheduledAmount: money(700_000, "USD"),
        }),
        expect.objectContaining({
          cadenceKind: "support:weekly",
          scheduledAmount: money(50_000, "USD"),
        }),
      ]),
    );
    expect(
      assessAffordability(
        world,
        { kind: "person", personId: unconstrained },
        money(900_000, "USD"),
        monthlyComparison,
      ).status,
    ).toBe("available");
    expect(
      assessAffordability(
        world,
        { kind: "person", personId: constrained },
        money(1_600_000, "USD"),
        monthlyComparison,
      ).status,
    ).toBe("blocked");
    expect(outstandingDebtAt(world, debt.id)?.minorUnits).toBe(1_900_000);
    assertWorldIntegrity(world);
    const overpaid = deserializeWorld(serializeWorld(world));
    const corruptPrincipal = overpaid.history.resourceObligations.find(
      (record) => record.id === debt.id,
    )!.principal as { minorUnits: number };
    corruptPrincipal.minorUnits = 50_000;
    expect(() => assertWorldIntegrity(overpaid)).toThrow(/overpaid/);
    expect(world.people[constrained]).not.toHaveProperty("financialHealth");
  });
});

describe("Stage 5 Run C care/support and housing separation", () => {
  it("moves support across households and links care cost without inferring or ending structural relationships", () => {
    let world = bareWorld("run-c-cross-household-support");
    const supporter = personId(world, 0);
    const recipient = personId(world, 1);
    const [withSupporterHousehold, supporterHousehold] = addHousehold(
      world,
      "support:household:a",
      [supporter],
    );
    world = withSupporterHousehold;
    const [withRecipientHousehold, recipientHousehold] = addHousehold(
      world,
      "support:household:b",
      [recipient],
    );
    world = withRecipientHousehold;
    world = createCareResponsibility(world, {
      stableKey: "support:care",
      caregiverPersonId: supporter,
      recipientPersonId: recipient,
      startedAt: "2020-01-01",
      kind: "supportive:cross-household-care",
      share: "supporting",
      context: "Care exists independently of payment.",
      timeDemand: SMALL_TIME,
      provenance: AUTHORED,
    });
    const care = world.history.careResponsibilities.at(-1)!;
    world = createResourcePosition(world, {
      stableKey: "support:position:a",
      owner: { kind: "person", personId: supporter },
      openedAt: "2024-01-01",
      openingBalance: money(100_000, "USD"),
      provenance: AUTHORED,
    });
    world = createResourcePosition(world, {
      stableKey: "support:position:b",
      owner: { kind: "person", personId: recipient },
      openedAt: "2024-01-01",
      openingBalance: money(0, "USD"),
      provenance: AUTHORED,
    });
    const structuralBefore = {
      households: world.history.households.length,
      memberships: world.history.householdMemberships.length,
      kinship: world.history.kinshipRelationships.length,
      partnerships: world.history.partnerships.length,
      care: world.history.careResponsibilities.length,
      authority: world.history.childAuthorities.length,
    };
    world = createResourceFlow(world, {
      stableKey: "support:flow",
      source: { kind: "person", personId: supporter },
      recipient: { kind: "person", personId: recipient },
      startsAt: "2025-01-01",
      amount: money(20_000, "USD"),
      cadenceKind: "support:monthly",
      basisKind: "care:cross-household-support",
      basisReference: { kind: "care", careResponsibilityId: care.id },
      restrictionKind: "purpose:care-cost",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    expect(() =>
      createResourceObligation(world, {
        stableKey: "open:malformed-obligation",
        resourceFlowId: flow.id,
        establishedAt: "2025-01-01",
        basisKind: "invalid obligation" as never,
        principal: null,
        careResponsibilityId: null,
        housingTenureId: null,
        provenance: AUTHORED,
      }),
    ).toThrow(/semantic namespace/);
    world = createResourceObligation(world, {
      stableKey: "support:obligation",
      resourceFlowId: flow.id,
      establishedAt: "2025-01-01",
      basisKind: "care:cross-household-cost",
      principal: null,
      careResponsibilityId: care.id,
      housingTenureId: null,
      provenance: AUTHORED,
    });
    const obligation = world.history.resourceObligations.at(-1)!;
    world = recordResourceTransferOutcome(world, {
      stableKey: "support:payment",
      resourceFlowId: flow.id,
      periodStartsAt: "2025-01-01",
      periodEndsAt: "2025-01-31",
      occurredAt: "2025-01-31",
      status: "completed",
      attemptedAmount: money(20_000, "USD"),
      transferredAmount: money(20_000, "USD"),
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    world = recordResourceObligationState(world, {
      stableKey: "support:obligation:ended",
      resourceObligationId: obligation.id,
      effectiveAt: "2025-02-01",
      status: "ended",
      reason: "The payment arrangement changed.",
      provenance: AUTHORED,
      supersedesStateId: world.history.resourceObligationStates.at(-1)!.id,
    });

    expect({
      households: world.history.households.length,
      memberships: world.history.householdMemberships.length,
      kinship: world.history.kinshipRelationships.length,
      partnerships: world.history.partnerships.length,
      care: world.history.careResponsibilities.length,
      authority: world.history.childAuthorities.length,
    }).toStrictEqual(structuralBefore);
    expect(
      householdMembershipsAt(world, supporter).map((item) => item.household.id),
    ).toContain(supporterHousehold);
    expect(
      householdMembershipsAt(world, recipient).map((item) => item.household.id),
    ).toContain(recipientHousehold);
    expect(world.history.careResponsibilityStates.at(-1)?.status).toBe(
      "active",
    );
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: recipient },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(20_000);
  });

  it("preserves one household through rent, hosted movement, ownership, non-tenure residence, owner non-occupancy, assignment, and secondary residence", () => {
    let world = bareWorld("run-c-housing");
    const primary = personId(world, 0);
    const familyResident = personId(world, 1);
    const nonresidentOwner = personId(world, 2);
    const [withHousehold, household] = addHousehold(
      world,
      "housing:household",
      [primary, familyResident],
    );
    world = withHousehold;
    const dwellingIds: EntityId[] = [];
    for (const [key, classification] of [
      ["a", "residential:apartment"],
      ["b", "custom:kin-hosted-cottage"],
      ["c", "residential:owned-home"],
      ["d", "assigned:institutional-quarters"],
    ] as const) {
      world = createDwelling(world, {
        stableKey: `housing:dwelling:${key}`,
        establishedAt: "2000-01-01",
        jurisdictionId: world.jurisdictionOrder[0]!,
        locationLabel: `Dwelling ${key.toUpperCase()}`,
        classification,
        provenance: AUTHORED,
      });
      dwellingIds.push(world.history.dwellings.at(-1)!.id);
    }
    const [a, b, c, d] = dwellingIds as [
      EntityId,
      EntityId,
      EntityId,
      EntityId,
    ];
    world = startDwellingOccupancy(world, {
      stableKey: "housing:occupancy:a",
      occupant: { kind: "household", householdId: household },
      dwellingId: a,
      startedAt: "2018-01-01",
      residenceRole: "primary",
      kind: "residence:rented-home",
      provenance: AUTHORED,
    });
    const occupancyA = world.history.dwellingOccupancies.at(-1)!;
    world = createHousingTenure(world, {
      stableKey: "housing:tenure:a:lease",
      holder: { kind: "household", householdId: household },
      dwellingId: a,
      startedAt: "2018-01-01",
      kind: "lease:residential",
      context: "Household lease.",
      provenance: AUTHORED,
    });
    const leaseA = world.history.housingTenures.at(-1)!;
    world = createHousingTenure(world, {
      stableKey: "housing:tenure:a:owner",
      holder: { kind: "person", personId: nonresidentOwner },
      dwellingId: a,
      startedAt: "2018-01-01",
      kind: "ownership:fee-simple",
      context: "Owner does not reside in the dwelling.",
      provenance: AUTHORED,
    });
    world = recordDwellingOccupancyState(world, {
      stableKey: "housing:occupancy:a:ended",
      dwellingOccupancyId: occupancyA.id,
      effectiveAt: "2021-01-01",
      status: "ended",
      residenceRole: "primary",
      kind: "residence:rented-home",
      reason: "Household moved.",
      provenance: AUTHORED,
      supersedesStateId: world.history.dwellingOccupancyStates.find(
        (item) => item.dwellingOccupancyId === occupancyA.id,
      )!.id,
    });
    world = recordHousingTenureState(world, {
      stableKey: "housing:tenure:a:lease-ended",
      housingTenureId: leaseA.id,
      effectiveAt: "2021-01-01",
      status: "ended",
      context: "Lease ended when the household moved.",
      provenance: AUTHORED,
      supersedesStateId: world.history.housingTenureStates.find(
        (item) => item.housingTenureId === leaseA.id,
      )!.id,
    });
    world = startDwellingOccupancy(world, {
      stableKey: "housing:occupancy:b",
      occupant: { kind: "household", householdId: household },
      dwellingId: b,
      startedAt: "2021-01-01",
      residenceRole: "primary",
      kind: "hosted:family-arrangement",
      provenance: AUTHORED,
    });
    const occupancyB = world.history.dwellingOccupancies.at(-1)!;
    world = recordDwellingOccupancyState(world, {
      stableKey: "housing:occupancy:b:ended",
      dwellingOccupancyId: occupancyB.id,
      effectiveAt: "2024-01-01",
      status: "ended",
      residenceRole: "primary",
      kind: "hosted:family-arrangement",
      reason: "Household acquired another home.",
      provenance: AUTHORED,
      supersedesStateId: world.history.dwellingOccupancyStates.at(-1)!.id,
    });
    world = startDwellingOccupancy(world, {
      stableKey: "housing:occupancy:c",
      occupant: { kind: "household", householdId: household },
      dwellingId: c,
      startedAt: "2024-01-01",
      residenceRole: "primary",
      kind: "residence:owned-home",
      provenance: AUTHORED,
    });
    world = createHousingTenure(world, {
      stableKey: "housing:tenure:c",
      holder: { kind: "household", householdId: household },
      dwellingId: c,
      startedAt: "2024-01-01",
      kind: "ownership:shared-household-title",
      context: "Household owns the dwelling it occupies.",
      provenance: AUTHORED,
    });
    expect(() =>
      startDwellingOccupancy(world, {
        stableKey: "housing:invalid-overlapping-primary",
        occupant: { kind: "household", householdId: household },
        dwellingId: d,
        startedAt: "2025-01-01",
        residenceRole: "primary",
        kind: "institutional:assigned-quarters",
        provenance: AUTHORED,
      }),
    ).toThrow(/overlapping primary dwelling occupancy/);
    world = startDwellingOccupancy(world, {
      stableKey: "housing:occupancy:d",
      occupant: { kind: "person", personId: primary },
      dwellingId: d,
      startedAt: "2025-01-01",
      residenceRole: "secondary",
      kind: "institutional:assigned-quarters",
      provenance: AUTHORED,
    });
    world = createHousingTenure(world, {
      stableKey: "housing:tenure:d",
      holder: { kind: "person", personId: primary },
      dwellingId: d,
      startedAt: "2025-01-01",
      kind: "assignment:institutional",
      context: "Assigned through ordinary institutional housing.",
      provenance: AUTHORED,
    });

    expect(world.history.households).toHaveLength(1);
    expect(
      activeDwellingOccupanciesAt(world).map((item) => item.dwellingId),
    ).toEqual(expect.arrayContaining([c, d]));
    expect(
      activeHousingTenuresAt(world).some(
        (item) =>
          item.holder.kind === "person" &&
          item.holder.personId === nonresidentOwner &&
          item.dwellingId === a,
      ),
    ).toBe(true);
    expect(
      activeHousingTenuresAt(world).some(
        (item) =>
          item.holder.kind === "person" &&
          item.holder.personId === familyResident,
      ),
    ).toBe(false);
    expect(
      activeDwellingOccupanciesAt(world).some(
        (item) =>
          item.occupant.kind === "person" &&
          item.occupant.personId === nonresidentOwner,
      ),
    ).toBe(false);
    expect(
      activeHousingTenuresAt(world).find((item) => item.dwellingId === d)?.kind,
    ).toBe("assignment:institutional");
  });
});

describe("Stage 5 Run C relationship and subjective integration", () => {
  it("records contact, a missed opportunity, and years-later reconnection as ordinary history without a timer or meter", () => {
    let world = bareWorld("run-c-reconnection");
    const pair = [personId(world, 0), personId(world, 1)] as const;
    let result = recordRelationshipMoment(world, {
      stableKey: "relationship:early-call",
      personIds: pair,
      occurredAt: "2010-06-01" as never,
      eventType: "life.relationship-contact",
      jurisdictionId: world.jurisdictionOrder[0]!,
      visibility: "private",
      interactionKind: "contact:call",
      change: "strengthened",
      significance: "meaningful",
      summary: "Two friends made time for a meaningful call.",
      tags: ["relationship.contact"],
      context: relationshipContext("A deliberate call."),
      subjective: [],
      timeUse: {
        personId: pair[0],
        endsAt: "2010-06-02" as never,
        label: "Time set aside for a friend",
        timeDemand: SMALL_TIME,
      },
    });
    world = result.world;
    result = recordRelationshipMoment(world, {
      stableKey: "relationship:missed-opportunity",
      personIds: pair,
      occurredAt: "2018-09-01" as never,
      eventType: "life.relationship-missed-opportunity",
      jurisdictionId: world.jurisdictionOrder[0]!,
      visibility: "private",
      interactionKind: "contact:missed-opportunity",
      change: "strained",
      significance: "meaningful",
      summary: "A meaningful request for contact went unanswered.",
      tags: ["relationship.missed-opportunity"],
      context: {
        ...relationshipContext("A real opportunity existed."),
        choice: "The request was not answered.",
      },
      subjective: [],
      timeUse: null,
    });
    world = result.world;
    expect(
      assessRelationshipContinuity(world, pair, currentResourceCutoff(world))
        .continuity,
    ).toBe("tension-context");
    result = recordRelationshipMoment(world, {
      stableKey: "relationship:reconnection",
      personIds: pair,
      occurredAt: "2025-08-01" as never,
      eventType: "life.relationship-reconnection",
      jurisdictionId: world.jurisdictionOrder[0]!,
      visibility: "private",
      interactionKind: "contact:reconnection",
      change: "strengthened",
      significance: "major",
      summary: "Old friends reconnected after a long gap.",
      tags: ["relationship.reconnection"],
      context: relationshipContext("Earlier shared history remained relevant."),
      subjective: pair.map((id) => ({
        personId: id,
        rememberedSummary: "We found our way back to an old friendship.",
        interpretation: "The gap did not erase the relationship.",
        memoryStrength: "strong" as const,
        appraisalMeanings: [
          {
            key: "renewed-connection",
            label: "Renewed connection",
            valence: "positive" as const,
            intensity: "strong" as const,
          },
        ],
        appraisalConfidence: "high" as const,
      })),
      timeUse: null,
    });
    world = result.world;
    const assessment = assessRelationshipContinuity(
      world,
      pair,
      currentResourceCutoff(world),
    );
    expect(assessment.continuity).toBe("reconnected");
    expect(assessment.priorInteractionIds).toHaveLength(3);
    expect(world.history.memories).toHaveLength(2);
    expect(world.history.appraisals).toHaveLength(2);
    expect(world).not.toHaveProperty("relationshipMaintenance");
    expect(world.people[pair[0]]).not.toHaveProperty("closeness");
  });

  it("routes a missed major obligation through typed life evidence, knowledge, appraisal, temporary context, perception, and decision explanation", () => {
    let world = bareWorld("run-c-resource-pressure");
    const actor = personId(world, 0);
    const [withPayee, payee] = addOrganization(world, "pressure:payee");
    world = withPayee;
    world = createResourcePosition(world, {
      stableKey: "pressure:position",
      owner: { kind: "person", personId: actor },
      openedAt: "2024-01-01",
      openingBalance: money(10_000, "USD"),
      provenance: AUTHORED,
    });
    world = createResourceFlow(world, {
      stableKey: "pressure:flow",
      source: { kind: "person", personId: actor },
      recipient: { kind: "organization", organizationId: payee },
      startsAt: "2026-01-01",
      amount: money(50_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "housing:rent",
      basisReference: { kind: "general" },
      restrictionKind: "purpose:housing",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    world = createResourceObligation(world, {
      stableKey: "pressure:obligation",
      resourceFlowId: flow.id,
      establishedAt: "2026-01-01",
      basisKind: "housing:rent",
      principal: null,
      careResponsibilityId: null,
      housingTenureId: null,
      provenance: AUTHORED,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "pressure:missed-outcome",
      resourceFlowId: flow.id,
      periodStartsAt: "2026-01-01",
      periodEndsAt: "2026-01-02",
      occurredAt: "2026-01-02",
      status: "missed",
      attemptedAmount: money(50_000, "USD"),
      transferredAmount: money(0, "USD"),
      reasonKind: "capacity:insufficient-liquid",
      note: "The major obligation was not met.",
      provenance: AUTHORED,
    });
    const outcome = world.history.resourceTransferOutcomes.at(-1)!;
    const pressure = recordResourcePressure(world, {
      stableKey: "pressure:subjective",
      personId: actor,
      resourceTransferOutcomeId: outcome.id,
      temporaryStateIntensity: "strong",
      durationDays: 14,
      interpretation: "The missed payment threatens housing stability.",
    });
    world = pressure.world;
    const source = {
      family: "resource-transfer-outcome" as const,
      recordId: outcome.id,
    };
    world = recordPerception(world, {
      stableKey: "pressure:perception",
      personId: actor,
      perceivedAt: world.currentDate,
      subjectKind: "context:resource-capacity",
      subjectKey: "housing-payment-risk",
      subjectEntityId: flow.id,
      assertion: "The unresolved payment constrains a near-term move.",
      confidence: "high",
      sourceCredibility: "high",
      source: { kind: "life-history", reference: source },
      supersedesPerceptionId: null,
    });
    const temporary = world.history.temporaryStates.find(
      (record) => record.id === pressure.temporaryStateId,
    )!;
    const evaluation = evaluateDecision(world, {
      stableKey: "pressure:decision",
      decisionType: "life.housing-choice",
      actorPersonId: actor,
      cutoff: currentResourceCutoff(world),
      subject: {
        kind: "context:resource-capacity",
        key: "housing-choice",
        entityId: flow.id,
      },
      options: [
        { key: "move", label: "Move", description: "Take on a move now." },
        {
          key: "wait",
          label: "Wait",
          description: "Preserve liquid capacity.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: "pressure:consideration",
          optionKey: "wait",
          sourceType: "domain:resource-pressure",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation: "A concrete missed obligation constrains capacity.",
          sourceRefs: [
            { kind: "life-history", reference: source },
            { kind: "temporary-state", temporaryStateId: temporary.id },
          ],
        },
      ],
      perceptionIds: [world.history.perceptions.at(-1)!.id],
      randomness: "none",
      retention: "ephemeral",
    });
    expect(evaluation.selectedOptionKey).toBe("wait");
    expect(
      evaluation.sourceSnapshots.map((item) => item.reference.kind),
    ).toEqual(expect.arrayContaining(["life-history", "temporary-state"]));
    expect(
      world.history.knowledge.some((item) => item.id === pressure.knowledgeId),
    ).toBe(true);
    expect(
      world.history.appraisals.some((item) => item.id === pressure.appraisalId),
    ).toBe(true);
    expect(world.people[actor]).not.toHaveProperty("financialStress");
  });
});

describe("Stage 5 Run C history, plans, persistence, and end-to-end life", () => {
  it("keeps later-appended backdated resource and housing records out of earlier sequence cutoffs", () => {
    let world = bareWorld("run-c-backdated");
    const actor = personId(world, 0);
    const [withPayee, payee] = addOrganization(world, "backdated:payee");
    world = withPayee;
    world = createResourcePosition(world, {
      stableKey: "backdated:position",
      owner: { kind: "person", personId: actor },
      openedAt: "2020-01-01",
      openingBalance: money(100_000, "USD"),
      provenance: AUTHORED,
    });
    world = createResourceFlow(world, {
      stableKey: "backdated:flow",
      source: { kind: "person", personId: actor },
      recipient: { kind: "organization", organizationId: payee },
      startsAt: "2020-01-01",
      amount: money(10_000, "USD"),
      cadenceKind: "custom:backdated-period",
      basisKind: "custom:backdated-basis",
      basisReference: { kind: "general" },
      restrictionKind: null,
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    world = createDwelling(world, {
      stableKey: "backdated:dwelling",
      establishedAt: "2010-01-01",
      jurisdictionId: world.jurisdictionOrder[0]!,
      locationLabel: "Backdated source dwelling",
      classification: "residential:ordinary-home",
      provenance: AUTHORED,
    });
    const dwelling = world.history.dwellings.at(-1)!;
    const earlierCutoff = currentResourceCutoff(world);
    world = recordResourceTransferOutcome(world, {
      stableKey: "backdated:outcome",
      resourceFlowId: flow.id,
      periodStartsAt: "2020-01-01",
      periodEndsAt: "2020-01-31",
      occurredAt: "2020-01-31",
      status: "completed",
      attemptedAmount: money(10_000, "USD"),
      transferredAmount: money(10_000, "USD"),
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    const outcome = world.history.resourceTransferOutcomes.at(-1)!;
    world = startDwellingOccupancy(world, {
      stableKey: "backdated:occupancy",
      occupant: { kind: "person", personId: actor },
      dwellingId: dwelling.id,
      startedAt: "2020-01-01",
      residenceRole: "secondary",
      kind: "custom:backfilled-secondary-residence",
      provenance: AUTHORED,
    });
    const occupancy = world.history.dwellingOccupancies.at(-1)!;
    expect(() =>
      assertLifeHistorySourceAvailable(world, actor, earlierCutoff, {
        family: "resource-transfer-outcome",
        recordId: outcome.id,
      }),
    ).toThrow(/Unavailable life-history source/);
    expect(() =>
      assertLifeHistorySourceAvailable(world, actor, earlierCutoff, {
        family: "dwelling-occupancy",
        recordId: occupancy.id,
      }),
    ).toThrow(/Unavailable life-history source/);
    expect(
      assertLifeHistorySourceAvailable(
        world,
        actor,
        currentResourceCutoff(world),
        {
          family: "resource-transfer-outcome",
          recordId: outcome.id,
        },
      ).sequence,
    ).toBe(outcome.sequence);
    expect(
      assertLifeHistorySourceAvailable(
        world,
        actor,
        currentResourceCutoff(world),
        {
          family: "dwelling-occupancy",
          recordId: occupancy.id,
        },
      ).sequence,
    ).toBe(occupancy.sequence);
  });

  it("accepts unprompted valid Run C keys, rejects malformed keys, and persists exact money and sources", () => {
    let world = bareWorld("run-c-open-persistence");
    const actor = personId(world, 0);
    const [withOrganization, organization] = addOrganization(
      world,
      "open:organization",
    );
    world = withOrganization;
    world = createDwelling(world, {
      stableKey: "open:dwelling",
      establishedAt: "2010-01-01",
      jurisdictionId: world.jurisdictionOrder[0]!,
      locationLabel: "Floating cooperative residence",
      classification: "custom:floating-cooperative-residence",
      provenance: AUTHORED,
    });
    const dwelling = world.history.dwellings.at(-1)!;
    world = startDwellingOccupancy(world, {
      stableKey: "open:occupancy",
      occupant: { kind: "person", personId: actor },
      dwellingId: dwelling.id,
      startedAt: "2020-01-01",
      residenceRole: "shared",
      kind: "custom:rotating-cohousing-presence",
      provenance: AUTHORED,
    });
    world = createHousingTenure(world, {
      stableKey: "open:tenure",
      holder: { kind: "person", personId: actor },
      dwellingId: dwelling.id,
      startedAt: "2020-01-01",
      kind: "custom:cooperative-use-license",
      context: "An unprompted but valid open-set tenure.",
      provenance: AUTHORED,
    });
    world = createResourcePosition(world, {
      stableKey: "open:position",
      owner: { kind: "person", personId: actor },
      openedAt: "2020-01-01",
      openingBalance: money(9_007_199_254_000, "USD"),
      provenance: AUTHORED,
    });
    world = createResourceFlow(world, {
      stableKey: "open:flow",
      source: { kind: "person", personId: actor },
      recipient: { kind: "organization", organizationId: organization },
      startsAt: "2025-01-01",
      amount: money(123_457, "USD"),
      cadenceKind: "custom:lunar-settlement-window",
      basisKind: "custom:mutual-aid-reimbursement",
      basisReference: { kind: "general" },
      restrictionKind: "custom:cooperative-repair-only",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const flow = world.history.resourceFlows.at(-1)!;
    world = createResourceObligation(world, {
      stableKey: "open:obligation",
      resourceFlowId: flow.id,
      establishedAt: "2025-01-01",
      basisKind: "custom:cooperative-repair-pledge",
      principal: null,
      careResponsibilityId: null,
      housingTenureId: world.history.housingTenures.at(-1)!.id,
      provenance: AUTHORED,
    });
    const payload = serializeWorld(world);
    expect(deserializeWorld(payload)).toStrictEqual(world);
    expect(
      (JSON.parse(payload) as { formatVersion: number }).formatVersion,
    ).toBe(9);
    expect(() =>
      createResourceFlow(world, {
        stableKey: "open:malformed",
        source: { kind: "person", personId: actor },
        recipient: { kind: "organization", organizationId: organization },
        startsAt: "2025-01-01",
        amount: money(100, "USD"),
        cadenceKind: "monthly" as never,
        basisKind: "bad key" as never,
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: null,
        provenance: AUTHORED,
      }),
    ).toThrow(/semantic namespace/);
    expect(() => money(1.25, "USD")).toThrow(/integer minor units/);
    expect(() =>
      createDwelling(world, {
        stableKey: "open:malformed-dwelling",
        establishedAt: "2020-01-01",
        jurisdictionId: world.jurisdictionOrder[0]!,
        locationLabel: "Malformed dwelling",
        classification: "house" as never,
        provenance: AUTHORED,
      }),
    ).toThrow(/semantic namespace/);
    const corrupted = deserializeWorld(serializeWorld(world));
    (
      corrupted.history.dwellingOccupancies[0] as unknown as {
        dwellingId: EntityId;
      }
    ).dwellingId = "dwelling_missing" as EntityId;
    expect(() => assertWorldIntegrity(corrupted)).toThrow(
      /Dwelling occupancy has invalid dwelling/,
    );
  });

  it("converges played, quick-generated, and authored initialization on canonical writers and keeps materialization neutral", () => {
    for (const mode of [
      "played",
      "quick-generated",
      "authored",
    ] as const satisfies readonly CharacterHistoryMode[]) {
      let world = bareWorld(`run-c-plan-${mode}`);
      const actor = personId(world, 0);
      const [withOrganization, organization] = addOrganization(
        world,
        `plan:${mode}:organization`,
      );
      world = withOrganization;
      const [withWork, work] = addPaidWork(
        world,
        actor,
        organization,
        `plan:${mode}:work`,
      );
      world = withWork;
      const provenance =
        mode === "quick-generated"
          ? ({ kind: "generated", generatorKey: `plan:${mode}` } as const)
          : ({ kind: "authored", note: `Plan mode ${mode}.` } as const);
      const plan: CharacterHistoryPlan = {
        stableKey: `plan:${mode}`,
        mode,
        personId: actor,
        transitions: [
          {
            kind: "resource-position",
            input: {
              stableKey: `plan:${mode}:position`,
              owner: { kind: "person", personId: actor },
              openedAt: "2024-01-01",
              openingBalance: money(50_000, "USD"),
              provenance,
            },
          },
          {
            kind: "work-compensation",
            input: {
              stableKey: `plan:${mode}:compensation`,
              workStableKey: `plan:${mode}:work`,
              startsAt: "2025-01-01",
              amount: money(300_000, "USD"),
              cadenceKind: "work:monthly-salary",
              restrictionKind: null,
              jurisdictionId: world.jurisdictionOrder[0]!,
              provenance,
            },
          },
          {
            kind: "dwelling",
            input: {
              stableKey: `plan:${mode}:dwelling`,
              establishedAt: "2010-01-01",
              jurisdictionId: world.jurisdictionOrder[0]!,
              locationLabel: `Plan dwelling ${mode}`,
              classification: "residential:ordinary-home",
              provenance,
            },
          },
          {
            kind: "dwelling-occupancy",
            input: {
              stableKey: `plan:${mode}:occupancy`,
              dwellingStableKey: `plan:${mode}:dwelling`,
              occupant: { kind: "person", personId: actor },
              startedAt: "2025-01-01",
              residenceRole: "primary",
              kind: "residence:direct",
              provenance,
            },
          },
          {
            kind: "housing-tenure",
            input: {
              stableKey: `plan:${mode}:tenure`,
              dwellingStableKey: `plan:${mode}:dwelling`,
              holder: { kind: "person", personId: actor },
              startedAt: "2025-01-01",
              kind: "lease:direct",
              context: "Canonical plan-authored lease.",
              provenance,
            },
          },
        ],
      };
      const actorBefore = world.people[actor]!;
      const applied = applyCharacterHistoryPlan(world, plan).world;
      expect(applied.history.resourcePositions).toHaveLength(1);
      expect(applied.history.resourceFlows).toHaveLength(1);
      expect(applied.history.dwellings).toHaveLength(1);
      expect(applied.history.dwellingOccupancies).toHaveLength(1);
      expect(applied.history.housingTenures).toHaveLength(1);
      expect(applied.history.resourceFlows[0]).not.toHaveProperty(
        "workStableKey",
      );
      expect(applied.history.dwellingOccupancies[0]).not.toHaveProperty(
        "dwellingStableKey",
      );
      expect(applied.people[actor]).toStrictEqual(actorBefore);
      const before = applied.history.nextSequence;
      const materialized = materializePerson(applied, personId(applied, 1));
      expect(materialized.history.nextSequence).toBe(before);
      expect(materialized.history.resourcePositions).toStrictEqual(
        applied.history.resourcePositions,
      );
      expect(work).toBeDefined();
    }
  });

  it("proves one continuous Stage 5 life through formative context, education, work, family/care, resources, housing, and reconnection", () => {
    let world = bareWorld("run-c-stage-5-end-to-end");
    const actor = personId(world, 0);
    world = applyCharacterHistoryPlan(
      world,
      generateQuickCharacterHistory(world, {
        stableKey: "end-to-end:formative",
        personId: actor,
        jurisdictionId: world.jurisdictionOrder[0]!,
      }),
    ).world;
    const [withTrainingOrganization, trainingOrganization] = addOrganization(
      world,
      "end-to-end:training",
    );
    world = withTrainingOrganization;
    const mentor = characterHistoryContextPersonId(
      world,
      "end-to-end:formative:teacher",
    );
    world = applyCharacterHistoryPlan(
      world,
      composeApprenticeshipPlan({
        stableKey: "end-to-end:apprenticeship",
        mode: "authored",
        personId: actor,
        mentorPersonId: mentor,
        organizationId: trainingOrganization,
        startsAt: "2021-01-01" as never,
        completesAt: "2024-01-01" as never,
        jurisdictionId: world.jurisdictionOrder[0]!,
      }),
    ).world;
    const peer = characterHistoryContextPersonId(
      world,
      "end-to-end:formative:peer",
    );
    world = createPartnership(world, {
      stableKey: "end-to-end:partnership",
      personIds: [actor, peer],
      startedAt: "2024-02-01",
      kind: "romantic:adult-partnership",
      provenance: AUTHORED,
    });
    const work = world.history.workRelationships.find(
      (record) => record.stableKey === "end-to-end:apprenticeship:work",
    )!;
    world = createResourcePosition(world, {
      stableKey: "end-to-end:position",
      owner: { kind: "person", personId: actor },
      openedAt: "2021-01-01",
      openingBalance: money(20_000, "USD"),
      provenance: AUTHORED,
    });
    world = createWorkCompensation(world, {
      stableKey: "end-to-end:compensation",
      workRelationshipId: work.id,
      startsAt: "2021-01-01",
      amount: money(250_000, "USD"),
      cadenceKind: "work:monthly-apprenticeship-pay",
      restrictionKind: null,
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    world = resolveWorkCompensationPeriod(world, {
      stableKey: "end-to-end:pay-outcome",
      workRelationshipId: work.id,
      periodStartsAt: "2021-01-01",
      periodEndsAt: "2021-01-31",
      occurredAt: "2021-01-31",
      status: "completed",
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    const household = world.history.households.find(
      (record) => record.stableKey === "end-to-end:formative:household",
    )!;
    world = createDwelling(world, {
      stableKey: "end-to-end:dwelling",
      establishedAt: "2010-01-01",
      jurisdictionId: world.jurisdictionOrder[0]!,
      locationLabel: "Adult household dwelling",
      classification: "residential:adult-home",
      provenance: AUTHORED,
    });
    const dwelling = world.history.dwellings.at(-1)!;
    world = startDwellingOccupancy(world, {
      stableKey: "end-to-end:occupancy",
      occupant: { kind: "household", householdId: household.id },
      dwellingId: dwelling.id,
      startedAt: "2024-01-01",
      residenceRole: "primary",
      kind: "residence:adult-home",
      provenance: AUTHORED,
    });
    world = createHousingTenure(world, {
      stableKey: "end-to-end:tenure",
      holder: { kind: "household", householdId: household.id },
      dwellingId: dwelling.id,
      startedAt: "2024-01-01",
      kind: "lease:adult-household",
      context: "Adult household lease.",
      provenance: AUTHORED,
    });
    const tenure = world.history.housingTenures.at(-1)!;
    world = createResourceFlow(world, {
      stableKey: "end-to-end:housing-flow",
      source: { kind: "person", personId: actor },
      recipient: {
        kind: "organization",
        organizationId: trainingOrganization,
      },
      startsAt: "2024-01-01",
      amount: money(50_000, "USD"),
      cadenceKind: "schedule:monthly",
      basisKind: "housing:rent",
      basisReference: {
        kind: "housing",
        housingTenureId: tenure.id,
      },
      restrictionKind: "purpose:housing",
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: AUTHORED,
    });
    const housingFlow = world.history.resourceFlows.at(-1)!;
    world = createResourceObligation(world, {
      stableKey: "end-to-end:housing-obligation",
      resourceFlowId: housingFlow.id,
      establishedAt: "2024-01-01",
      basisKind: "housing:lease-payment",
      principal: null,
      careResponsibilityId: null,
      housingTenureId: tenure.id,
      provenance: AUTHORED,
    });
    world = recordResourceTransferOutcome(world, {
      stableKey: "end-to-end:housing-payment",
      resourceFlowId: housingFlow.id,
      periodStartsAt: "2024-01-01",
      periodEndsAt: "2024-01-31",
      occurredAt: "2024-01-31",
      status: "completed",
      attemptedAmount: money(50_000, "USD"),
      transferredAmount: money(50_000, "USD"),
      reasonKind: null,
      note: null,
      provenance: AUTHORED,
    });
    const beforeMissedHousingOutcome = currentResourceCutoff(world);
    world = recordResourceTransferOutcome(world, {
      stableKey: "end-to-end:missed-housing-payment",
      resourceFlowId: housingFlow.id,
      periodStartsAt: "2026-01-01",
      periodEndsAt: "2026-01-02",
      occurredAt: "2026-01-02",
      status: "missed",
      attemptedAmount: money(50_000, "USD"),
      transferredAmount: money(0, "USD"),
      reasonKind: "capacity:insufficient-liquid",
      note: "A consequential housing obligation was missed.",
      provenance: AUTHORED,
    });
    const missedHousingOutcome = world.history.resourceTransferOutcomes.at(-1)!;
    const missedHousingSource = {
      family: "resource-transfer-outcome" as const,
      recordId: missedHousingOutcome.id,
    };
    expect(() =>
      assertLifeHistorySourceAvailable(
        world,
        actor,
        beforeMissedHousingOutcome,
        missedHousingSource,
      ),
    ).toThrow(/Unavailable life-history source/);
    const resourcePressure = recordResourcePressure(world, {
      stableKey: "end-to-end:resource-pressure",
      personId: actor,
      resourceTransferOutcomeId: missedHousingOutcome.id,
      temporaryStateIntensity: "strong",
      durationDays: 14,
      interpretation:
        "The missed housing payment makes a discretionary move unsafe.",
    });
    world = resourcePressure.world;
    world = recordPerception(world, {
      stableKey: "end-to-end:resource-perception",
      personId: actor,
      perceivedAt: world.currentDate,
      subjectKind: "context:resource-capacity",
      subjectKey: "housing-obligation-risk",
      subjectEntityId: housingFlow.id,
      assertion: "The missed housing obligation constrains the near-term move.",
      confidence: "high",
      sourceCredibility: "high",
      source: { kind: "life-history", reference: missedHousingSource },
      supersedesPerceptionId: null,
    });
    const temporaryState = world.history.temporaryStates.find(
      (record) => record.id === resourcePressure.temporaryStateId,
    )!;
    const housingDecision = evaluateDecision(world, {
      stableKey: "end-to-end:housing-decision",
      decisionType: "life.housing-choice",
      actorPersonId: actor,
      cutoff: currentResourceCutoff(world),
      subject: {
        kind: "context:resource-capacity",
        key: "housing-choice",
        entityId: housingFlow.id,
      },
      options: [
        { key: "move", label: "Move", description: "Move immediately." },
        {
          key: "wait",
          label: "Wait",
          description: "Preserve capacity while resolving the obligation.",
        },
      ],
      constraints: [],
      considerations: [
        {
          stableKey: "end-to-end:resource-consideration",
          optionKey: "wait",
          sourceType: "domain:resource-pressure",
          direction: "supports",
          importance: "strong",
          confidence: "high",
          explanation:
            "A concrete missed housing obligation changes this choice.",
          sourceRefs: [
            { kind: "life-history", reference: missedHousingSource },
            { kind: "temporary-state", temporaryStateId: temporaryState.id },
          ],
        },
      ],
      perceptionIds: [world.history.perceptions.at(-1)!.id],
      randomness: "none",
      retention: "ephemeral",
    });
    const reconnect = recordRelationshipMoment(world, {
      stableKey: "end-to-end:reconnect",
      personIds: [actor, peer],
      occurredAt: "2025-06-01" as never,
      eventType: "life.relationship-reconnection",
      jurisdictionId: world.jurisdictionOrder[0]!,
      visibility: "private",
      interactionKind: "contact:reconnection",
      change: "strengthened",
      significance: "major",
      summary: "A formative peer relationship remained part of adult life.",
      tags: ["relationship.reconnection", "life.continuity"],
      context: relationshipContext("Earlier formative history mattered."),
      subjective: [],
      timeUse: null,
    });
    world = reconnect.world;

    const populationMetric = Object.values(
      world.metricCatalog.definitions,
    ).find(
      (definition) => definition.stableKey === "population.resident-count",
    )!;
    const populationScope = {
      jurisdictionId: world.jurisdictionOrder[0]!,
      segmentKey: null,
    };
    const populationPeriod = {
      kind: "point" as const,
      at: world.currentDate,
    };
    world = recordWorldMetricState(world, {
      stableKey: "end-to-end:population-truth",
      metricId: populationMetric.id,
      scope: populationScope,
      referencePeriod: populationPeriod,
      value: {
        kind: "quantity",
        quantity: createExactQuantity(100_000, 1, "count:people"),
      },
      recordedAt: world.currentDate,
      provenance: {
        kind: "authored",
        note: "Synthetic maximum-current canonical metric truth.",
      },
      supersedesStateId: null,
    });
    const populationTruth = world.history.metricStates.at(-1)!;
    const beforeObservation = currentResourceCutoff(world);
    const knowledgeCountBeforeObservation = world.history.knowledge.length;
    world = recordWorldMetricObservation(world, {
      stableKey: "end-to-end:population-observation",
      metricId: populationMetric.id,
      scope: populationScope,
      referencePeriod: populationPeriod,
      value: {
        kind: "quantity",
        quantity: createExactQuantity(99_500, 1, "count:people"),
      },
      sourceSeriesKey: "series.end-to-end-public-estimate",
      sourceLabel: "Synthetic public statistical office",
      sourceReference: {
        title: "Synthetic population release",
        locator: "fixture:end-to-end-population",
      },
      methodologyKey: "method.end-to-end-estimate",
      releaseDate: world.currentDate,
      recordedAt: world.currentDate,
      vintageKey: "vintage.end-to-end-initial",
      uncertainty: {
        kind: "range",
        lower: {
          kind: "quantity",
          quantity: createExactQuantity(99_000, 1, "count:people"),
        },
        upper: {
          kind: "quantity",
          quantity: createExactQuantity(100_000, 1, "count:people"),
        },
      },
      supersedesObservationId: null,
      underlyingStateId: populationTruth.id,
    });
    const populationObservation = world.history.metricObservations.at(-1)!;
    const beforeReleaseEvent = currentResourceCutoff(world);
    world = recordWorldEvent(world, {
      stableKey: "end-to-end:population-release",
      type: "statistics.public-release",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: world.jurisdictionOrder[0]!,
      involvedEntityIds: [populationObservation.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["statistics.release", "life.continuity"],
      summary:
        "A public observation of the jurisdiction population was released.",
      context: relationshipContext(
        "The public estimate remains distinct from canonical world truth.",
      ),
    });
    const populationRelease = world.history.events.at(-1)!;
    const beforePopulationKnowledge = currentResourceCutoff(world);
    world = recordEventKnowledge(world, {
      stableKey: "end-to-end:population-release-knowledge",
      personId: actor,
      eventId: populationRelease.id,
      learnedAt: world.currentDate,
      believedSummary: "The public estimate reported a population of 99,500.",
      accuracy: "accurate",
      confidence: "medium",
      source: {
        kind: "public-record",
        reference: populationObservation.sourceReference!.locator!,
      },
    });
    world = scheduleFutureDueItem(world, {
      stableKey: "end-to-end:future-transition",
      dueAt: "2026-01-10",
      transitionKey: "custom:end-to-end-transition",
      entityIds: [populationTruth.id],
      jurisdictionId: world.jurisdictionOrder[0]!,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [populationTruth.id],
      },
    });
    const dueItem = world.history.futureDueItems.at(-1)!;
    const beforeDueTransition = currentResourceCutoff(world);
    const transitionHandlers = createFutureTransitionHandlerRegistry([
      [
        "custom:end-to-end-transition",
        (handlerWorld, item) => {
          const withEvent = recordWorldEvent(handlerWorld, {
            stableKey: "end-to-end:future-transition:outcome",
            type: "simulation.synthetic-transition-resolved",
            occurredAt: item.dueAt,
            recordedAt: item.dueAt,
            jurisdictionId: item.jurisdictionId,
            involvedEntityIds: [item.id, ...item.entityIds].sort(),
            participants: [],
            personFactConstraints: [],
            visibility: "public",
            tags: ["simulation.future-transition", "life.continuity"],
            summary: "The scheduled synthetic transition resolved once.",
            context: relationshipContext(
              "The generic future-transition handler wrote ordinary history.",
            ),
          });
          return {
            world: withEvent,
            status: "resolved" as const,
            reasonKey: null,
            context: "Maximum-current integration transition resolved.",
            outcomeEventId: withEvent.history.events.at(-1)!.id,
          };
        },
      ],
    ]);
    world = advanceWorld(world, 5, transitionHandlers);

    expect(world.history.childAuthorities.length).toBeGreaterThan(0);
    expect(world.history.careResponsibilities.length).toBeGreaterThan(0);
    expect(world.history.educationEnrollments.length).toBeGreaterThan(1);
    expect(world.history.organizationParticipations.length).toBeGreaterThan(0);
    expect(
      world.history.workRelationships.some((record) => record.id === work.id),
    ).toBe(true);
    expect(world.history.partnerships).toHaveLength(1);
    expect(world.history.resourceObligations).toHaveLength(1);
    expect(
      world.history.knowledge.some(
        (record) => record.id === resourcePressure.knowledgeId,
      ),
    ).toBe(true);
    expect(
      world.history.appraisals.some(
        (record) => record.id === resourcePressure.appraisalId,
      ),
    ).toBe(true);
    expect(housingDecision.selectedOptionKey).toBe("wait");
    expect(
      housingDecision.sourceSnapshots.map(
        (snapshot) => snapshot.reference.kind,
      ),
    ).toEqual(expect.arrayContaining(["life-history", "temporary-state"]));
    expect(
      resourcePositionAt(
        world,
        { kind: "person", personId: actor },
        money(0, "USD").currency,
      )?.liquidBalance.minorUnits,
    ).toBe(220_000);
    expect(
      activeDwellingOccupanciesAt(world).some(
        (record) => record.dwellingId === dwelling.id,
      ),
    ).toBe(true);
    expect(
      assessRelationshipContinuity(
        world,
        [actor, peer],
        currentResourceCutoff(world),
      ).continuity,
    ).toBe("reconnected");
    expect(world.history.knowledge.length).toBe(
      knowledgeCountBeforeObservation + 1,
    );
    expect(
      worldMetricStateForPeriodAt(
        world,
        populationMetric.id,
        populationScope,
        populationPeriod,
        beforeObservation,
      )?.id,
    ).toBe(populationTruth.id);
    expect(
      latestObservationForSeriesAt(
        world,
        populationMetric.id,
        populationScope,
        "series.end-to-end-public-estimate",
        beforeObservation,
      ),
    ).toBeNull();
    expect(
      latestObservationForSeriesAt(
        world,
        populationMetric.id,
        populationScope,
        "series.end-to-end-public-estimate",
        beforeReleaseEvent,
      )?.id,
    ).toBe(populationObservation.id);
    expect(
      world.history.knowledge.some(
        (record) =>
          record.eventId === populationRelease.id &&
          record.sequence < beforePopulationKnowledge.historySequenceExclusive,
      ),
    ).toBe(false);
    expect(
      futureDueItemStateAt(world, dueItem.id, beforeDueTransition)?.status,
    ).toBe("scheduled");
    const resolvedDueState = futureDueItemStateAt(
      world,
      dueItem.id,
      currentResourceCutoff(world),
    );
    expect(resolvedDueState?.status).toBe("resolved");
    expect(
      world.history.events.some(
        (event) => event.id === resolvedDueState?.outcomeEventId,
      ),
    ).toBe(true);
    expect(serializeWorld(world)).toBe(
      serializeWorld(deserializeWorld(serializeWorld(world))),
    );
  });
});
