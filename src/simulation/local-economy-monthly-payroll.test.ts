import { expect, it } from "vitest";
import legacyMonthlyPoint from "./fixtures/a37-legacy-monthly-point.json";
import legacyFirstMonthlyPoint from "./fixtures/a37-legacy-monthly-first.json";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { createFutureTransitionHandlerRegistry } from "./future-transitions";
import {
  createOrganization,
  createWorkRelationship,
  recordWorkStatus,
} from "./life";
import { requireLifePlace, stateJurisdictionForKey } from "./life-places";
import { ensurePaydaySchedule, PAYDAY_HANDLERS } from "./living-world/town-pay";
import {
  BUSINESS_REVENUE_BASIS,
  BUSINESS_WAGES_BASIS,
  settleBusinessMoney,
  settleTrackedBusinessPayroll,
} from "./local-economy";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import { legacyMonthlyPayCoverage, monthlyWorkPay } from "./monthly-work-pay";
import { createLightweightPerson, personName } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { recordedPayStubs } from "./resource-income";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceFlowTerms,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, ResourceTransferOutcome, World } from "./types";
import { recordPersonDeath } from "./vitality";
import { advanceWorld, createWorld, createWorldId } from "./world";
const authored = {
  kind: "authored" as const,
  note: "Explicit monthly contract/cash controls; not observed business income.",
};
const registry = createFutureTransitionHandlerRegistry(PAYDAY_HANDLERS);
function fixture(
  placeKey: string,
  nonbusiness = false,
  startingDate = "2026-01-16",
  schedule = true,
) {
  const place = requireLifePlace(placeKey);
  const seed = `a37-monthly:${placeKey}`;
  const currentDate = makeIsoDate(startingDate);
  const currentMoment = simulationMomentOnLocalDate(
    place.context.initialMoment,
    currentDate,
  );
  const person = createLightweightPerson({
    worldId: createWorldId(seed),
    worldSeed: seed,
    index: 0,
    currentDate,
    homeJurisdictionId: place.context.jurisdiction.id,
  });
  let world = createWorld({
    seed,
    currentDate,
    currentMoment,
    people: [person],
    jurisdictions: [
      place.context.jurisdiction,
      stateJurisdictionForKey(place.stateJurisdictionKey!)!,
      NATIONAL_ELECTION_JURISDICTION,
    ],
    policyCatalog: createProductionPolicyCatalog(),
  });
  world = createOrganization(world, {
    stableKey: nonbusiness
      ? "fixture:ordinary-employer"
      : `local-business:${place.context.jurisdiction.id}:fixture`,
    formedAt: currentDate,
    provenance: authored,
    initialProfile: {
      name: "Controlled monthly employer",
      classification: "sector:private",
      locationJurisdictionId: place.context.jurisdiction.id,
    },
  });
  const employer = world.history.organizations.at(-1)!;
  world = createWorkRelationship(world, {
    stableKey: "fixture:monthly:work",
    personId: person.id,
    organizationId: employer.id,
    startedAt: currentDate,
    kind: "employment:staff",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance: authored,
    initialRole: {
      title: "Controlled worker",
      occupationClassification: "occupation:retail-salesperson",
      locationJurisdictionId: place.context.jurisdiction.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 40, maximumHours: 40 },
        attention: "high",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: place.context.jurisdiction.id,
      },
    },
  });
  const work = world.history.workRelationships.at(-1)!;
  world = createResourceFlow(world, {
    stableKey: "fixture:monthly:wages",
    source: { kind: "organization", organizationId: employer.id },
    recipient: { kind: "person", personId: person.id },
    startsAt: currentDate,
    basisKind: BUSINESS_WAGES_BASIS,
    basisReference: { kind: "work", workRelationshipId: work.id },
    restrictionKind: null,
    amount: money(500000, "USD"),
    cadenceKind: "schedule:monthly",
    jurisdictionId: place.context.jurisdiction.id,
    provenance: authored,
  });
  const flow = world.history.resourceFlows.at(-1)!;
  for (const [owner, balance] of [
    [{ kind: "organization" as const, organizationId: employer.id }, 2000000],
    [{ kind: "person" as const, personId: person.id }, 0],
  ] as const)
    world = createResourcePosition(world, {
      stableKey: `fixture:monthly:cash:${owner.kind}`,
      owner,
      openedAt: currentDate,
      openingBalance: money(balance, "USD"),
      provenance: authored,
    });
  return {
    world: schedule ? ensurePaydaySchedule(world) : world,
    person,
    employer,
    work,
    flow,
  };
}

// Read-only query controls. These snapshots do not stand in for clock/payment proof.
function monthQueryWorld(world: World): World {
  const currentDate = makeIsoDate("2026-01-31");
  return {
    ...world,
    currentDate,
    currentMoment: simulationMomentOnLocalDate(
      world.currentMoment,
      currentDate,
    ),
  };
}
function monthlyQuery(
  world: World,
  resourceFlowId: EntityId,
  frontier = world.history.nextSequence,
) {
  return monthlyWorkPay(monthQueryWorld(world), {
    resourceFlowId,
    periodStartsAt: makeIsoDate("2026-01-16"),
    periodEndsAt: makeIsoDate("2026-01-31"),
    onDate: makeIsoDate("2026-01-31"),
    historySequenceExclusive: frontier,
  });
}
it("A37 monthly query includes the hire day and preserves its input", () => {
  const f = fixture("1150000");
  const before = serializeWorld(f.world);
  expect(monthlyQuery(f.world, f.flow.id)).toMatchObject({
    resourceFlowId: f.flow.id,
    workRelationshipId: f.work.id,
    personId: f.person.id,
    organizationId: f.employer.id,
    termsId: f.world.history.resourceFlowTerms.at(-1)!.id,
    heldDays: 16,
    calendarDays: 31,
    gross: money(258065, "USD"),
  });
  expect(serializeWorld(f.world)).toBe(before);
});
it("A37 monthly query excludes the end day only after its saved frontier", () => {
  const f = fixture("1150000");
  const before = advanceWorld(f.world, 9, registry);
  const ended = recordWorkStatus(before, {
    stableKey: "fixture:monthly:query-ended",
    workRelationshipId: f.work.id,
    effectiveAt: before.currentDate,
    status: "ended",
    reason: "Controlled actual end date",
    provenance: authored,
    supersedesStatusId: before.history.workStatuses.at(-1)!.id,
  });
  expect(monthlyQuery(ended, f.flow.id)).toMatchObject({
    heldDays: 9,
    gross: money(145161, "USD"),
  });
  expect(
    monthlyQuery(ended, f.flow.id, before.history.nextSequence),
  ).toMatchObject({ heldDays: 16, gross: money(258065, "USD") });
});
it("A37 monthly query excludes the death day only after its saved frontier", () => {
  const f = fixture("1150000");
  const before = advanceWorld(f.world, 9, registry);
  const died = recordPersonDeath(before, {
    stableKey: "fixture:monthly:query-death",
    personId: f.person.id,
    diedAt: before.currentDate,
    causeKey: "custom:controlled-death",
    sourceEntityIds: [f.person.id],
    summary: "Explicit controlled death; not a mortality mechanism.",
    provenance: authored,
  });
  expect(monthlyQuery(died, f.flow.id)).toMatchObject({
    heldDays: 9,
    gross: money(145161, "USD"),
  });
  expect(
    monthlyQuery(died, f.flow.id, before.history.nextSequence),
  ).toMatchObject({ heldDays: 16, gross: money(258065, "USD") });
});
it("A37 monthly query refuses a saved intra-period terms change", () => {
  const f = fixture("1150000");
  const before = advanceWorld(f.world, 9, registry);
  const changed = recordResourceFlowTerms(before, {
    stableKey: "fixture:monthly:query-terms",
    resourceFlowId: f.flow.id,
    effectiveAt: before.currentDate,
    status: "active",
    amount: money(600000, "USD"),
    cadenceKind: "schedule:monthly",
    reason: "Explicit controlled revision",
    provenance: authored,
    supersedesTermsId: before.history.resourceFlowTerms.at(-1)!.id,
  });
  expect(() => monthlyQuery(changed, f.flow.id)).toThrow(
    "cannot cross an unprorated terms change",
  );
  expect(
    monthlyQuery(changed, f.flow.id, before.history.nextSequence).gross,
  ).toEqual(money(258065, "USD"));
});
it("A37 monthly query refuses mismatched work and employer joins", () => {
  const f = fixture("1150000");
  const malformed = {
    ...f.world,
    history: {
      ...f.world.history,
      workRelationships: f.world.history.workRelationships.map((work) => ({
        ...work,
        organizationId: null,
      })),
    },
  };
  expect(() => monthlyQuery(malformed, f.flow.id)).toThrow(
    "must bind the actual worker and employer",
  );
});
it("A37 monthly query refuses a non-month-end payment or future frontier", () => {
  const f = fixture("1150000");
  const input = {
    resourceFlowId: f.flow.id,
    periodStartsAt: makeIsoDate("2026-01-16"),
    periodEndsAt: makeIsoDate("2026-01-31"),
    onDate: makeIsoDate("2026-01-30"),
    historySequenceExclusive: f.world.history.nextSequence,
  };
  expect(() => monthlyWorkPay(monthQueryWorld(f.world), input)).toThrow(
    "actual calendar-month end",
  );
  expect(() =>
    monthlyQuery(f.world, f.flow.id, f.world.history.nextSequence + 1),
  ).toThrow("actual saved history frontier");
});
it("A37 full calendar month reaches the existing payday and withholding writer", () => {
  const f = fixture("2836000", false, "2026-01-01");
  const paid = advanceWorld(f.world, 30, registry);
  const outcomes = paid.history.resourceTransferOutcomes.filter(
    (outcome) => outcome.resourceFlowId === f.flow.id,
  );
  expect(outcomes).toHaveLength(1);
  expect(outcomes[0]).toMatchObject({
    periodStartsAt: "2026-01-01",
    periodEndsAt: "2026-01-31",
    occurredAt: "2026-01-31",
    attemptedAmount: money(500000, "USD"),
    transferredAmount: money(500000, "USD"),
  });
  const stubs = recordedPayStubs(paid, f.person.id).filter(
    (stub) => stub.paycheck.resourceFlowId === f.flow.id,
  );
  expect(stubs).toHaveLength(1);
  expect(stubs[0]!.assessmentStatus).toBe("recorded");
  expect(stubs[0]!.withheld.minorUnits).toBeGreaterThan(0);
  expect(stubs[0]!.netPaid.minorUnits).toBe(
    500000 - stubs[0]!.withheld.minorUnits,
  );
  expect(
    resourcePositionAt(paid, f.flow.source, money(0, "USD").currency)!
      .liquidBalance,
  ).toEqual(money(1500000, "USD"));
  expect(
    serializeWorld(
      settleTrackedBusinessPayroll(deserializeWorld(serializeWorld(paid))),
    ),
  ).toBe(serializeWorld(paid));
  console.info("A37_FULL_MONTH_PAY", {
    placeKey: "2836000",
    seed: paid.seed,
    person: personName(paid.people[f.person.id]!),
    personId: f.person.id,
    workId: f.work.id,
    flowId: f.flow.id,
    grossMinor: outcomes[0]!.transferredAmount.minorUnits,
    withheldMinor: stubs[0]!.withheld.minorUnits,
    netMinor: stubs[0]!.netPaid.minorUnits,
  });
});
it.each(["1150000", "2836000", "5363000", "2938000", "3451000"])(
  "A37 %s month-end clock pays actual first partial and following calendar month once",
  (placeKey) => {
    const f = fixture(placeKey);
    const prior = advanceWorld(f.world, 14, registry);
    expect(
      prior.history.resourceTransferOutcomes.filter(
        (x) => x.resourceFlowId === f.flow.id,
      ),
    ).toHaveLength(0);
    const first = advanceWorld(prior, 1, registry);
    const outcomes = first.history.resourceTransferOutcomes.filter(
      (x) => x.resourceFlowId === f.flow.id,
    );
    expect(outcomes).toHaveLength(1);
    expect(outcomes[0]).toMatchObject({
      periodStartsAt: "2026-01-16",
      periodEndsAt: "2026-01-31",
      occurredAt: "2026-01-31",
      attemptedAmount: money(Math.round((500000 * 16) / 31), "USD"),
      transferredAmount: money(Math.round((500000 * 16) / 31), "USD"),
    });
    const stubs = recordedPayStubs(first, f.person.id).filter(
      (x) => x.paycheck.resourceFlowId === f.flow.id,
    );
    expect(stubs).toHaveLength(1);
    expect(stubs[0]!.assessmentStatus).toBe("recorded");
    expect(stubs[0]!.withheld.minorUnits).toBeGreaterThan(0);
    expect(stubs[0]!.netPaid.minorUnits).toBe(
      stubs[0]!.paidGross.minorUnits - stubs[0]!.withheld.minorUnits,
    );
    expect(
      resourcePositionAt(
        first,
        { kind: "organization", organizationId: f.employer.id },
        money(0, "USD").currency,
      )!.liquidBalance,
    ).toEqual(
      money(2000000 - outcomes[0]!.transferredAmount.minorUnits, "USD"),
    );
    expect(settleTrackedBusinessPayroll(first)).toBe(first);
    const next = advanceWorld(first, 28, registry);
    const both = next.history.resourceTransferOutcomes.filter(
      (x) => x.resourceFlowId === f.flow.id,
    );
    expect(both).toHaveLength(2);
    expect(both[0]).toEqual(outcomes[0]);
    expect(both[1]).toMatchObject({
      periodStartsAt: "2026-02-01",
      periodEndsAt: "2026-02-28",
      occurredAt: "2026-02-28",
      transferredAmount: money(500000, "USD"),
    });
    expect(
      serializeWorld(
        settleTrackedBusinessPayroll(deserializeWorld(serializeWorld(next))),
      ),
    ).toBe(serializeWorld(next));
    expect(
      serializeWorld(
        advanceWorld(deserializeWorld(serializeWorld(first)), 28, registry),
      ),
    ).toBe(serializeWorld(next));
    console.info("A37_MONTHLY_PAY", {
      placeKey,
      person: personName(first.people[f.person.id]!),
      personId: f.person.id,
      workId: f.work.id,
      flowId: f.flow.id,
      firstGrossMinor: outcomes[0]!.transferredAmount.minorUnits,
      withheldMinor: stubs[0]!.withheld.minorUnits,
      nextGrossMinor: both[1]!.transferredAmount.minorUnits,
    });
  },
);
it("A37 month-end pay counts only actual active days before the job ended", () => {
  const f = fixture("1150000");
  let world = advanceWorld(f.world, 9, registry);
  world = recordWorkStatus(world, {
    stableKey: "fixture:monthly:ended",
    workRelationshipId: f.work.id,
    effectiveAt: world.currentDate,
    status: "ended",
    reason: "Explicit controlled end date",
    provenance: authored,
    supersedesStatusId: world.history.workStatuses
      .filter((x) => x.workRelationshipId === f.work.id)
      .at(-1)!.id,
  });
  const paid = advanceWorld(world, 6, registry);
  const outcome = paid.history.resourceTransferOutcomes.find(
    (x) => x.resourceFlowId === f.flow.id,
  )!;
  expect(outcome.transferredAmount).toEqual(
    money(Math.round((500000 * 9) / 31), "USD"),
  );
  expect(settleBusinessMoney(paid, f.employer.id)).toBe(paid);
});
it("A37 Ruling20 refuses the retained January20 historical point outside first-day coverage", async () => {
  const f = fixture("1150000");
  const world = advanceWorld(f.world, 4, registry);
  // Actual pre-change canonical-writer output, not a new off-payday transfer.
  expect(world.id).toBe(legacyMonthlyPoint.worldId);
  expect(f.flow.id).toBe(legacyMonthlyPoint.resourceFlowId);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(world.history)),
  );
  expect(
    Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join(""),
  ).toBe(legacyMonthlyPoint.baseHistorySha256);
  const historical = {
    ...world,
    history: {
      ...world.history,
      nextSequence: legacyMonthlyPoint.nextSequence,
      resourceTransferOutcomes: [
        ...world.history.resourceTransferOutcomes,
        legacyMonthlyPoint.outcome as ResourceTransferOutcome,
      ],
    },
  };
  const before = JSON.stringify(historical.history);
  expect(
    legacyMonthlyPayCoverage(
      historical,
      legacyMonthlyPoint.outcome.id as EntityId,
    ),
  ).toBeNull();
  expect(() => serializeWorld(historical)).toThrow(
    "Monthly work pay requires its actual calendar-month end.",
  );
  expect(JSON.stringify(historical.history)).toBe(before);
  expect(historical.history.resourceTransferOutcomes.at(-1)).toEqual(
    legacyMonthlyPoint.outcome,
  );
});
it("A37 retains actual revenue dates and records due revenue before the month's wage", () => {
  const f = fixture("1150000");
  let world = createOrganization(f.world, {
    stableKey: "fixture:monthly:customers",
    formedAt: f.world.currentDate,
    provenance: authored,
    initialProfile: {
      name: "Controlled customers",
      classification: "sector:private",
      locationJurisdictionId: f.world.jurisdictions[f.flow.jurisdictionId!]!.id,
    },
  });
  const customerId = world.history.organizations.at(-1)!.id;
  world = createResourceFlow(world, {
    stableKey: "fixture:monthly:revenue",
    source: { kind: "organization", organizationId: customerId },
    recipient: { kind: "organization", organizationId: f.employer.id },
    startsAt: f.world.currentDate,
    basisKind: BUSINESS_REVENUE_BASIS,
    basisReference: { kind: "general" },
    restrictionKind: null,
    amount: money(1000000, "USD"),
    cadenceKind: "schedule:monthly",
    jurisdictionId: null,
    provenance: authored,
  });
  const revenueFlow = world.history.resourceFlows.at(-1)!;
  world = advanceWorld(world, 43, registry);
  const revenue = world.history.resourceTransferOutcomes.find(
    (x) => x.resourceFlowId === revenueFlow.id,
  )!;
  const wage = world.history.resourceTransferOutcomes.find(
    (x) => x.resourceFlowId === f.flow.id && x.periodEndsAt === "2026-02-28",
  )!;
  expect(revenue.occurredAt).toBe("2026-02-01");
  expect(revenue.sequence).toBeLessThan(wage.sequence);
  expect(wage.occurredAt).toBe("2026-02-28");
  expect(
    resourcePositionAt(
      world,
      { kind: "organization", organizationId: f.employer.id },
      money(0, "USD").currency,
    )!.liquidBalance,
  ).toEqual(money(3000000 - Math.round((500000 * 16) / 31) - 500000, "USD"));
});
it("A37 business payday hook leaves other monthly employers untouched", () => {
  const f = fixture("1150000", true);
  expect(settleTrackedBusinessPayroll(f.world)).toBe(f.world);
});

it("A37 Ruling20 preserves actual first-day historical payment and resumes on the first without losing a day", async () => {
  const f = fixture("1150000", false, "2026-01-01", false);
  let world = advanceWorld(
    f.world,
    31,
    createFutureTransitionHandlerRegistry([]),
  );
  expect(world.id).toBe(legacyFirstMonthlyPoint.worldId);
  expect(f.flow.id).toBe(legacyFirstMonthlyPoint.resourceFlowId);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(world.history)),
  );
  expect(
    Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join(""),
  ).toBe(legacyFirstMonthlyPoint.baseHistorySha256);
  world = deserializeWorld(
    serializeWorld({
      ...world,
      history: {
        ...world.history,
        nextSequence: legacyFirstMonthlyPoint.nextSequence,
        resourceTransferOutcomes: [
          ...world.history.resourceTransferOutcomes,
          legacyFirstMonthlyPoint.outcome as ResourceTransferOutcome,
        ],
      },
    }),
  );
  const before = serializeWorld(world);
  const legacy = world.history.resourceTransferOutcomes.at(-1)!;
  const paid = advanceWorld(ensurePaydaySchedule(world), 27, registry);
  const outcomes = paid.history.resourceTransferOutcomes.filter(
    (x) => x.resourceFlowId === f.flow.id,
  );
  expect(outcomes).toHaveLength(2);
  expect(outcomes[0]).toEqual(legacy);
  expect(serializeWorld(world)).toBe(before);
  expect(outcomes[1]).toMatchObject({
    periodStartsAt: "2026-02-01",
    periodEndsAt: "2026-02-28",
    occurredAt: "2026-02-28",
    transferredAmount: money(500000, "USD"),
  });
  expect(resourcePositionAt(paid, f.flow.source, "USD")!.liquidBalance).toEqual(
    money(1000000, "USD"),
  );
  const stub = recordedPayStubs(paid, f.person.id).find(
    (x) => x.paycheck.id === outcomes[1]!.id,
  )!;
  expect(stub.assessmentStatus).toBe("recorded");
  expect(stub.withheld.minorUnits).toBeGreaterThan(0);
  expect(stub.netPaid.minorUnits).toBe(
    stub.paidGross.minorUnits - stub.withheld.minorUnits,
  );
  expect(
    paid.history.statutoryTaxLiabilities!.some(
      (x) => x.sourceOutcomeId === legacy.id,
    ),
  ).toBe(false);
  expect(
    serializeWorld(
      settleTrackedBusinessPayroll(deserializeWorld(serializeWorld(paid))),
    ),
  ).toBe(serializeWorld(paid));
});
