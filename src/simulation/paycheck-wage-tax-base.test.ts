import { describe, expect, it } from "vitest";
import { makeIsoDate } from "./dates";
import { createStableId } from "./ids";
import { createOrganization, createWorkRelationship } from "./life";
import { stateJurisdictionForKey } from "./life-places";
import { createLightweightPerson, personName } from "./people";
import {
  createResourceFlow,
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { deserializeWorld, serializeWorld } from "./serialization";
import { STATES } from "./state-reference";
import { assessPaychecksTaxes } from "./statutory-tax";
import { settleTownCompensations } from "./living-world/town-pay";
import { taxBaseOccurrenceSource } from "./tax-policy";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  createWorldId,
} from "./world";
import {
  WAGE_TAX_BASE_KEY,
  recordPaycheckWageTaxBases,
  paycheckWageTaxBase,
} from "./paycheck-wage-tax-base";

const seed = "team6-a33-one-wage-base";
// Test-place sampling among all 56 saved reference places, not a money draw.
const places = Object.keys(STATES)
  .sort((a, b) =>
    createStableId("decision", `${seed}:${a}`).localeCompare(
      createStableId("decision", `${seed}:${b}`),
    ),
  )
  .slice(0, 5);

function fixture(
  usps = places[0]!,
  actual = 3600,
  workBasis = true,
  gross = 7200,
) {
  const date = makeIsoDate("2026-01-05");
  const state = stateJurisdictionForKey(`US-${usps}`)!;
  const worldSeed = `${seed}:${usps}`;
  const person = createLightweightPerson({
    worldId: createWorldId(worldSeed),
    worldSeed,
    index: 0,
    currentDate: date,
    homeJurisdictionId: state.id,
  });
  let world = createWorld({
    seed: worldSeed,
    currentDate: date,
    jurisdictions: [state],
    people: [person],
  });
  const provenance = {
    kind: "authored" as const,
    note: "Controlled recorded-pay fixture, not natural work or a researched wage.",
  };
  world = createOrganization(world, {
    stableKey: "a33:employer",
    formedAt: date,
    provenance,
    initialProfile: {
      name: "Authored saved employer",
      classification: "enterprise:retail",
      locationJurisdictionId: state.id,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "a33:work",
    personId: person.id,
    organizationId,
    startedAt: date,
    kind: "employment:employee",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Authored saved worker",
      occupationClassification: null,
      locationJurisdictionId: state.id,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 20 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: state.id,
      },
    },
  });
  const workId = world.history.workRelationships.at(-1)!.id;
  world = workBasis
    ? createWorkCompensation(world, {
        stableKey: "a33:pay-flow",
        workRelationshipId: workId,
        startsAt: date,
        amount: money(gross, "USD"),
        cadenceKind: "schedule:weekly",
        restrictionKind: null,
        jurisdictionId: state.id,
        provenance,
      })
    : createResourceFlow(world, {
        stableKey: "a33:not-work",
        source: { kind: "organization", organizationId },
        recipient: { kind: "person", personId: person.id },
        startsAt: date,
        amount: money(gross, "USD"),
        cadenceKind: "schedule:weekly",
        basisKind: "custom:gift",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: state.id,
        provenance,
      });
  const flowId = world.history.resourceFlows.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "a33:worker-account",
    owner: { kind: "person", personId: person.id },
    openedAt: date,
    openingBalance: money(0, "USD"),
    provenance,
  });
  const beforePayment = world;
  world = recordResourceTransferOutcome(world, {
    stableKey: "a33:actual-pay",
    resourceFlowId: flowId,
    periodStartsAt: date,
    periodEndsAt: date,
    occurredAt: date,
    status:
      actual === 0 ? "missed" : actual === gross ? "completed" : "partial",
    attemptedAmount: money(gross, "USD"),
    transferredAmount: money(actual, "USD"),
    reasonKind: actual === gross ? null : "custom:authored-partial-payment",
    note: "Authored recorded transfer; only the amount actually paid is an input.",
    provenance,
  });
  const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
  return {
    world,
    beforePayment,
    person,
    state,
    organizationId,
    workId,
    flowId,
    outcomeId,
  };
}

function workerSources(
  world: ReturnType<typeof fixture>["world"],
  outcomeId: ReturnType<typeof fixture>["outcomeId"],
) {
  return (world.history.statutoryTaxLiabilities ?? []).flatMap((liability) => {
    if (
      liability.sourceOutcomeId !== outcomeId ||
      liability.payer.kind !== "person"
    )
      return [];
    const source = taxBaseOccurrenceSource(world, liability.id);
    return source?.kind === "statutory-liability" ? [source] : [];
  });
}

function expectOnlyBaseAdded(
  before: ReturnType<typeof fixture>["world"],
  after: ReturnType<typeof fixture>["world"],
) {
  expect(after.history.statutoryTaxLiabilities).toBe(
    before.history.statutoryTaxLiabilities,
  );
  expect(after.history.statutoryTaxPayments).toBe(
    before.history.statutoryTaxPayments,
  );
  expect(after.history.resourcePositions).toBe(
    before.history.resourcePositions,
  );
  expect(after.history.resourceTransferOutcomes).toBe(
    before.history.resourceTransferOutcomes,
  );
  expect(after.history.taxAssessments).toBe(before.history.taxAssessments);
  expect(after.history.events).toBe(before.history.events);
  expect(after.history.futureDueItems).toBe(before.history.futureDueItems);
}

describe("one wage tax base per actual saved paycheck", () => {
  it.each(places)(
    "records partial actual gross once in %s without changing money or taxes",
    (place) => {
      const f = fixture(place);
      const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
      const sources = workerSources(paid, f.outcomeId);
      expect(sources.length).toBeGreaterThan(1);
      const anchor = sources[0]!;
      const before = serializeWorld(paid);
      const recorded = recordPaycheckWageTaxBases(paid, [
        f.outcomeId,
        f.outcomeId,
      ]);
      const bases = (recorded.history.taxBases ?? []).filter(
        (base) => base.baseKey === WAGE_TAX_BASE_KEY,
      );
      expect(WAGE_TAX_BASE_KEY).toBe("tax-base:wages");
      expect(bases).toHaveLength(1);
      const base = bases[0]!;
      expect(base).toMatchObject({
        sourceEventId: anchor.liabilityRecord.id,
        occurredAt: anchor.occurredAt,
        jurisdictionId: anchor.jurisdictionId,
        payer: anchor.payer,
        amount: money(3600, "USD"),
      });
      expect(base.amount).toEqual(anchor.liabilityRecord.wages);
      expect(base.amount.minorUnits).not.toBe(7200);
      for (const liability of paid.history.statutoryTaxLiabilities ?? []) {
        if (liability.sourceOutcomeId === f.outcomeId) {
          expect(paycheckWageTaxBase(recorded, liability.id)).toEqual(base);
        }
      }
      expectOnlyBaseAdded(paid, recorded);
      expect(serializeWorld(paid)).toBe(before);
      expect(recordPaycheckWageTaxBases(recorded, [f.outcomeId])).toBe(
        recorded,
      );
      const snapshot = serializeWorld(recorded);
      const loaded = deserializeWorld(snapshot);
      expect(recordPaycheckWageTaxBases(loaded, [f.outcomeId])).toBe(loaded);
      expect(paycheckWageTaxBase(loaded, anchor.liabilityRecord.id)).toEqual(
        base,
      );
      expect(serializeWorld(loaded)).toBe(snapshot);
      assertWorldIntegrity(loaded);
      console.info("A33 one wage base", {
        seed,
        place,
        worker: personName(f.person),
        outcomeId: f.outcomeId,
        sourceLiabilityId: anchor.liabilityRecord.id,
        sourceAuthority: anchor.liabilityRecord.authorityKey,
        actualMinor: base.amount.minorUnits,
        attemptedMinor: 7200,
        baseId: base.id,
      });
    },
  );

  it.each(places)(
    "records the base through the real payroll caller in %s",
    (place) => {
      const f = fixture(place);
      const funded = createResourcePosition(f.beforePayment, {
        stableKey: "a33:funded-employer-account",
        owner: { kind: "organization", organizationId: f.organizationId },
        openedAt: f.beforePayment.currentDate,
        openingBalance: money(1_000_000, "USD"),
        provenance: {
          kind: "authored",
          note: "Explicit employer cash for the saved payroll fixture.",
        },
      });
      const period = {
        payFlowId: f.flowId,
        activityId: f.flowId,
        stableKey: "a33:caller-pay-period",
        periodStartsAt: funded.currentDate,
        periodEndsAt: funded.currentDate,
        onDate: funded.currentDate,
      };
      const paid = settleTownCompensations(funded, [period]);
      const paycheck = paid.history.resourceTransferOutcomes.find(
        (row) => row.stableKey === period.stableKey,
      )!;
      expect(paycheck).toBeDefined();
      expect(paycheck.status).toBe("completed");
      const liabilities = (paid.history.statutoryTaxLiabilities ?? []).filter(
        (row) => row.sourceOutcomeId === paycheck.id,
      );
      expect(liabilities.length).toBeGreaterThan(0);
      const bases = (paid.history.taxBases ?? []).filter(
        (row) => row.baseKey === WAGE_TAX_BASE_KEY,
      );
      expect(bases).toHaveLength(1);
      expect(bases[0]!.amount).toEqual(paycheck.transferredAmount);
      expect(bases[0]!.payer).toEqual({
        kind: "person",
        personId: f.person.id,
      });
      for (const liability of liabilities)
        expect(paycheckWageTaxBase(paid, liability.id)).toEqual(bases[0]);
      expect(paid.history.taxAssessments ?? []).toHaveLength(0);
      const repeated = settleTownCompensations(paid, [period]);
      expect(repeated).toBe(paid);
      expect(repeated.history.statutoryTaxLiabilities).toBe(
        paid.history.statutoryTaxLiabilities,
      );
      expect(repeated.history.statutoryTaxPayments).toBe(
        paid.history.statutoryTaxPayments,
      );
      expect(repeated.history.resourceTransferOutcomes).toBe(
        paid.history.resourceTransferOutcomes,
      );
      const loaded = deserializeWorld(serializeWorld(paid));
      expect(settleTownCompensations(loaded, [period])).toBe(loaded);
      expect(loaded.history.taxBases).toEqual(paid.history.taxBases);
      assertWorldIntegrity(loaded);
    },
  );

  it("catches up a saved historical paycheck after Continue using its source date", () => {
    const f = fixture();
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const later = advanceWorld(paid, 5);
    const loaded = deserializeWorld(serializeWorld(later));
    const anchor = workerSources(loaded, f.outcomeId)[0]!;
    const recorded = recordPaycheckWageTaxBases(loaded, [f.outcomeId]);
    const base = paycheckWageTaxBase(recorded, anchor.liabilityRecord.id)!;
    expect(base).toMatchObject({
      occurredAt: anchor.liabilityRecord.occurredAt,
      recordedAt: loaded.currentDate,
      sourceEventId: anchor.liabilityRecord.id,
      amount: anchor.liabilityRecord.wages,
      jurisdictionId: anchor.jurisdictionId,
      payer: anchor.payer,
    });
    expect(base.occurredAt).not.toBe(loaded.currentDate);
    expectOnlyBaseAdded(loaded, recorded);
    const continued = deserializeWorld(serializeWorld(recorded));
    expect(recordPaycheckWageTaxBases(continued, [f.outcomeId])).toBe(
      continued,
    );
    assertWorldIntegrity(continued);
  });

  it("refuses missed, nonwork and unassessed saved outcomes", () => {
    for (const f of [
      fixture(places[0], 0),
      fixture(places[0], 3600, false),
      fixture(),
    ]) {
      const world = f.world;
      const snapshot = serializeWorld(world);
      expect(recordPaycheckWageTaxBases(world, [f.outcomeId])).toBe(world);
      expect(recordPaycheckWageTaxBases(world, [])).toBe(world);
      expect(serializeWorld(world)).toBe(snapshot);
      expect(world.history.taxBases ?? []).toEqual([]);
    }
  });

  it("does not mistake payment IDs or collection transfers for paycheck outcomes", () => {
    const f = fixture(places[0], 120_000, true, 240_000);
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const payments = paid.history.statutoryTaxPayments ?? [];
    expect(payments.length).toBeGreaterThan(0);
    const snapshot = serializeWorld(paid);
    expect(
      recordPaycheckWageTaxBases(
        paid,
        payments.flatMap((payment) => [payment.id, payment.resourceOutcomeId]),
      ),
    ).toBe(paid);
    for (const payment of payments)
      expect(paycheckWageTaxBase(paid, payment.id)).toBeNull();
    expect(serializeWorld(paid)).toBe(snapshot);
    expect(paid.history.taxBases ?? []).toEqual([]);
  });
});
