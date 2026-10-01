import { expect, it } from "vitest";
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
import { createLightweightPerson, personName } from "./people";
import { createProductionPolicyCatalog } from "./production-catalog";
import { recordedPayStubs } from "./resource-income";
import { resourcePositionAt } from "./resource-queries";
import {
  createResourceFlow,
  createResourcePosition,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
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
  return { world: ensurePaydaySchedule(world), person, employer, work, flow };
}
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
it("A37 preserves a legacy paid point date and begins the next interval the following day", () => {
  const f = fixture("1150000");
  let world = advanceWorld(f.world, 4, registry);
  world = recordResourceTransferOutcome(world, {
    stableKey: "fixture:legacy-paid",
    resourceFlowId: f.flow.id,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: "completed",
    attemptedAmount: money(500000, "USD"),
    transferredAmount: money(500000, "USD"),
    reasonKind: null,
    note: "Explicit saved legacy payment",
    provenance: authored,
  });
  const legacy = world.history.resourceTransferOutcomes.at(-1)!;
  const paid = advanceWorld(world, 11, registry);
  const outcomes = paid.history.resourceTransferOutcomes.filter(
    (x) => x.resourceFlowId === f.flow.id,
  );
  expect(outcomes).toHaveLength(2);
  expect(outcomes[0]).toEqual(legacy);
  expect(outcomes[1]).toMatchObject({
    periodStartsAt: "2026-01-21",
    periodEndsAt: "2026-01-31",
    occurredAt: "2026-01-31",
    transferredAmount: money(Math.round((500000 * 11) / 31), "USD"),
  });
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
