import { describe, expect, it } from "vitest";
import { addDays, makeIsoDate } from "./dates";
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
import {
  taxBaseOccurrenceSource,
  recordTaxBase,
  assessTaxBase,
  assertTaxIntegrity,
  recordedPaycheckTaxInput,
} from "./tax-policy";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  createWorldId,
  recordWorldEvent,
} from "./world";

const seed = "team6-a33-actual-paycheck-lineage";
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
  return { world, person, state, organizationId, workId, flowId, outcomeId };
}

describe("A33 saved paycheck and existing withholding lineage", () => {
  it.each(places)(
    "reads actual partial pay and existing liabilities once in %s, including after Continue",
    (place) => {
      const f = fixture(place);
      const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
      const before = serializeWorld(paid);
      const input = recordedPaycheckTaxInput(paid, f.outcomeId);
      expect(input).toMatchObject({
        kind: "recorded",
        outcomeId: f.outcomeId,
        resourceFlowId: f.flowId,
        workRelationshipId: f.workId,
        personId: f.person.id,
        organizationId: f.organizationId,
        occurredAt: paid.currentDate,
        amount: money(3600, "USD"),
      });
      if (input.kind !== "recorded") throw new Error(input.reason);
      const existing = paid.history.statutoryTaxLiabilities!.filter(
        (row) => row.sourceOutcomeId === f.outcomeId,
      );
      expect(input.statutoryLiabilityIds).toEqual(
        existing.map((row) => row.id),
      );
      expect(existing.every((row) => row.wages.minorUnits === 3600)).toBe(true);
      const income = existing.find(
        (row) => row.taxKey === `us-${place.toLowerCase()}:wage-income-tax`,
      )!;
      expect(income).toBeDefined();
      const prepared = taxBaseOccurrenceSource(paid, income.id);
      expect(prepared).toMatchObject({
        kind: "statutory-liability",
        liabilityRecord: income,
        paymentIds: (paid.history.statutoryTaxPayments ?? [])
          .filter((row) => row.liabilityId === income.id)
          .map((row) => row.id),
      });
      expect(serializeWorld(paid)).toBe(before);
      const reloaded = deserializeWorld(before);
      expect(recordedPaycheckTaxInput(reloaded, f.outcomeId)).toEqual(input);
      expect(taxBaseOccurrenceSource(reloaded, income.id)).toEqual(prepared);
      expect(assessPaychecksTaxes(reloaded, [f.outcomeId])).toBe(reloaded);
      expect(serializeWorld(reloaded)).toBe(before);
      assertWorldIntegrity(reloaded);
      console.info("A33 saved-pay proof", {
        place,
        seed,
        person: personName(f.person),
        outcomeId: f.outcomeId,
        actualMinor: input.amount.minorUnits,
        attemptedMinor: 7200,
        incomeLiabilityId: income.id,
        incomeStatus: income.status,
        liabilityMinor: income.liability?.minorUnits ?? null,
        paymentIds:
          prepared?.kind === "statutory-liability" ? prepared.paymentIds : [],
      });
    },
  );
  it("joins positive income-tax collection to its actual transfer, preserving the completed liability on repeat", () => {
    const f = fixture(places[0], 120_000, true, 240_000);
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const input = recordedPaycheckTaxInput(paid, f.outcomeId);
    if (input.kind !== "recorded") throw new Error(input.reason);
    const income = paid.history.statutoryTaxLiabilities!.find(
      (row) =>
        row.sourceOutcomeId === f.outcomeId &&
        row.authorityKey === `US-${places[0]!}` &&
        row.taxKey === `us-${places[0]!.toLowerCase()}:wage-income-tax`,
    )!;
    const prepared = taxBaseOccurrenceSource(paid, income.id);
    if (prepared?.kind !== "statutory-liability")
      throw new Error("Expected the existing wage-income liability.");
    expect(prepared.liabilityRecord.status).toBe("assessed");
    expect(prepared.liabilityRecord.liability!.minorUnits).toBeGreaterThan(0);
    expect(prepared.paymentIds).toHaveLength(1);
    const collection = input.statutoryCollections.find(
      (row) => row.paymentId === prepared.paymentIds[0],
    )!;
    expect(collection.liabilityId).toBe(prepared.liabilityRecord.id);
    expect(collection.amount).toEqual(prepared.liabilityRecord.liability);
    const transfer = paid.history.resourceTransferOutcomes.find(
      (row) => row.id === collection.resourceOutcomeId,
    )!;
    expect(transfer.status).toBe("completed");
    expect(transfer.transferredAmount).toEqual(collection.amount);
    const before = serializeWorld(paid);
    const loaded = deserializeWorld(before);
    expect(taxBaseOccurrenceSource(loaded, income.id)).toEqual(prepared);
    expect(assessPaychecksTaxes(loaded, [f.outcomeId])).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(before);
    console.info("A33 existing positive collection", {
      seed,
      place: places[0],
      person: personName(f.person),
      payOutcomeId: f.outcomeId,
      actualPaidMinor: input.amount.minorUnits,
      liabilityId: prepared.liabilityRecord.id,
      liabilityMinor: prepared.liabilityRecord.liability!.minorUnits,
      paymentId: collection.paymentId,
      transferOutcomeId: collection.resourceOutcomeId,
      collectedMinor: collection.amount.minorUnits,
    });
  });
  it("preserves every statutory levy and payer identity across duplicate assessment and Continue", () => {
    const f = fixture(places[0], 120_000, true, 240_000);
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const liabilities = paid.history.statutoryTaxLiabilities!.filter(
      (row) => row.sourceOutcomeId === f.outcomeId,
    );
    const employee = liabilities.find(
      (row) => row.taxKey === "us-federal:social-security-employee",
    )!;
    const employer = liabilities.find(
      (row) => row.taxKey === "us-federal:social-security-employer",
    )!;
    expect(employee.payer.kind).toBe("person");
    expect(employer.payer.kind).toBe("organization");
    expect(employee.id).not.toBe(employer.id);
    expect(
      liabilities.some((row) => row.taxKey === "test:unadmitted-levy"),
    ).toBe(false);
    for (const row of liabilities) {
      const source = taxBaseOccurrenceSource(paid, row.id);
      expect(source).toMatchObject({
        kind: "statutory-liability",
        liabilityRecord: row,
        payer: row.payer,
      });
    }
    const before = serializeWorld(paid);
    expect(assessPaychecksTaxes(paid, [f.outcomeId, f.outcomeId])).toBe(paid);
    expect(assessPaychecksTaxes(paid, [])).toBe(paid);
    const loaded = deserializeWorld(before);
    expect(assessPaychecksTaxes(loaded, [f.outcomeId])).toBe(loaded);
    expect(loaded.history.statutoryTaxLiabilities).toEqual(
      paid.history.statutoryTaxLiabilities,
    );
    expect(loaded.history.statutoryTaxPayments).toEqual(
      paid.history.statutoryTaxPayments,
    );
    expect(serializeWorld(loaded)).toBe(before);
  });
  it("admits an existing historical liability source without an event or another assessment", () => {
    const f = fixture(places[0], 120_000, true, 240_000);
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const liability = paid.history.statutoryTaxLiabilities!.find(
      (row) =>
        row.authorityKey === `US-${places[0]!}` &&
        row.taxKey.endsWith(":wage-income-tax"),
    )!;
    const later = advanceWorld(paid, 5);
    const source = taxBaseOccurrenceSource(later, liability.id);
    expect(source).toMatchObject({
      kind: "statutory-liability",
      occurredAt: liability.occurredAt,
      amount: liability.wages,
      payer: liability.payer,
    });
    expect(
      taxBaseOccurrenceSource(later, liability.id, {
        asOfDate: liability.recordedAt,
        historySequenceExclusive: liability.sequence,
      }),
    ).toBeNull();
    const input = {
      stableKey: "a33:liability-reference",
      jurisdictionId: f.state.id,
      payer: liability.payer,
      baseKey: "tax-base:authored-source-reference",
      occurredAt: liability.occurredAt,
      amount: liability.wages,
      sourceEventId: liability.id,
      assumptionNote:
        "Reference to saved wages and existing liability, not admission of a new tax or rate.",
    };
    expect(() =>
      recordTaxBase(later, { ...input, amount: money(240_000, "USD") }),
    ).toThrow(/exact visible occurrence/);
    expect(() =>
      recordTaxBase(later, { ...input, occurredAt: later.currentDate }),
    ).toThrow(/exact visible occurrence/);
    expect(() =>
      recordTaxBase(later, {
        ...input,
        payer: { kind: "organization", organizationId: f.organizationId },
      }),
    ).toThrow(/exact visible occurrence/);
    const recorded = recordTaxBase(later, input);
    const base = recorded.history.taxBases!.at(-1)!;
    expect(base).toMatchObject({
      occurredAt: liability.occurredAt,
      recordedAt: later.currentDate,
      sourceEventId: liability.id,
      amount: liability.wages,
    });
    expect(recorded.history.events).toEqual(later.history.events);
    expect(recorded.history.statutoryTaxLiabilities).toBe(
      later.history.statutoryTaxLiabilities,
    );
    expect(recorded.history.statutoryTaxPayments).toBe(
      later.history.statutoryTaxPayments,
    );
    expect(() =>
      assessTaxBase(recorded, base.id, "tax:unadmitted-wage-series"),
    ).toThrow(/second assessment or collection schedule is forbidden/);
    expect(recorded.history.taxAssessments ?? []).toEqual([]);
    expect(recorded.history.futureDueItems).toEqual(
      later.history.futureDueItems,
    );
    expect(() =>
      recordTaxBase(recorded, { ...input, stableKey: "a33:duplicate" }),
    ).toThrow(/already has a recorded tax base/);
    const reloaded = deserializeWorld(serializeWorld(recorded));
    expect(taxBaseOccurrenceSource(reloaded, liability.id)).toEqual(source);
    assertWorldIntegrity(reloaded);
    expect(() =>
      assertTaxIntegrity(
        {
          ...reloaded,
          history: {
            ...reloaded.history,
            taxBases: [
              { ...base, amount: money(base.amount.minorUnits + 1, "USD") },
            ],
          },
        },
        new Set(),
      ),
    ).toThrow(/Invalid tax base occurrence/);
  });
  it("admits the actual historical withholding transfer and its allocations without recollection", () => {
    const f = fixture(places[0], 120_000, true, 240_000);
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const payment = paid.history.statutoryTaxPayments![0]!;
    const later = advanceWorld(paid, 5);
    const source = taxBaseOccurrenceSource(later, payment.resourceOutcomeId);
    if (source?.kind !== "statutory-payment")
      throw new Error("Expected the actual saved withholding transfer.");
    expect(source.paymentRecords.length).toBeGreaterThan(1);
    expect(source.amount.minorUnits).toBeGreaterThan(payment.amount.minorUnits);
    expect(
      source.paymentRecords.reduce(
        (sum, row) => sum + row.amount.minorUnits,
        0,
      ),
    ).toBe(source.amount.minorUnits);
    expect(
      taxBaseOccurrenceSource(later, payment.resourceOutcomeId, {
        asOfDate: later.currentDate,
        historySequenceExclusive: source.sequence,
      }),
    ).toBeNull();
    const input = {
      stableKey: "a33:payment-reference",
      jurisdictionId: source.jurisdictionId,
      payer: source.payer,
      baseKey: "tax-base:authored-payment-reference",
      occurredAt: source.occurredAt,
      amount: source.amount,
      sourceEventId: payment.resourceOutcomeId,
      assumptionNote:
        "Existing aggregate withholding transfer, not a taxable wage base or permission to tax a tax payment.",
    };
    expect(() =>
      recordTaxBase(later, { ...input, amount: payment.amount }),
    ).toThrow(/exact visible occurrence/);
    expect(() =>
      recordTaxBase(later, { ...input, jurisdictionId: f.state.id }),
    ).toThrow(/exact visible occurrence/);
    const recorded = recordTaxBase(later, input);
    const base = recorded.history.taxBases!.at(-1)!;
    expect(base.occurredAt).toBe(source.transferRecord.occurredAt);
    expect(base.recordedAt).toBe(later.currentDate);
    expect(() =>
      assessTaxBase(recorded, base.id, "tax:unadmitted-payment-series"),
    ).toThrow(/second assessment or collection schedule is forbidden/);
    expect(recorded.history.resourceTransferOutcomes).toBe(
      later.history.resourceTransferOutcomes,
    );
    expect(recorded.history.statutoryTaxPayments).toBe(
      later.history.statutoryTaxPayments,
    );
    expect(recorded.history.taxAssessments ?? []).toEqual([]);
    expect(recorded.history.futureDueItems).toEqual(
      later.history.futureDueItems,
    );
    const reloaded = deserializeWorld(serializeWorld(recorded));
    expect(
      taxBaseOccurrenceSource(reloaded, payment.resourceOutcomeId),
    ).toEqual(source);
    expect(serializeWorld(reloaded)).toBe(serializeWorld(recorded));
    assertWorldIntegrity(reloaded);
  });
  it("keeps the ordinary event source current-only and rejects a missing saved source", () => {
    const f = fixture();
    const eventWorld = recordWorldEvent(f.world, {
      stableKey: "a33:ordinary-current-event",
      type: "tax.test-occurrence",
      occurredAt: f.world.currentDate,
      recordedAt: f.world.currentDate,
      jurisdictionId: f.state.id,
      involvedEntityIds: [f.person.id],
      participants: [],
      personFactConstraints: [],
      visibility: "private",
      tags: ["tax"],
      summary: "Authored ordinary occurrence for backward compatibility.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const event = eventWorld.history.events.at(-1)!;
    const input = {
      stableKey: "a33:ordinary-base",
      jurisdictionId: f.state.id,
      payer: { kind: "person" as const, personId: f.person.id },
      baseKey: "tax-base:ordinary-test",
      occurredAt: event.occurredAt,
      amount: money(12, "USD"),
      sourceEventId: event.id,
      assumptionNote:
        "Authored ordinary event base; no tax rate or collection.",
    };
    const recorded = recordTaxBase(eventWorld, input);
    assertWorldIntegrity(deserializeWorld(serializeWorld(recorded)));
    expect(() => recordTaxBase(advanceWorld(eventWorld, 1), input)).toThrow(
      /exact visible occurrence/,
    );
    expect(() =>
      recordTaxBase(eventWorld, { ...input, sourceEventId: f.workId }),
    ).toThrow(/exact visible occurrence/);
    expect(taxBaseOccurrenceSource(eventWorld, f.workId)).toBeNull();
  });
  it("does not turn an outcome ID into an event or admit an arbitrary wage base", () => {
    const f = fixture();
    const saved = serializeWorld(f.world);
    expect(taxBaseOccurrenceSource(f.world, f.outcomeId)).toBeNull();
    expect(
      f.world.history.events.some((event) => event.id === f.outcomeId),
    ).toBe(false);
    expect(serializeWorld(f.world)).toBe(saved);
    expect(f.world.history.taxBases ?? []).toHaveLength(0);
    expect(f.world.history.taxAssessments ?? []).toHaveLength(0);
  });
  it("retains catch-up payment facts but refuses a backdated occurrence", () => {
    const f = fixture();
    const later = advanceWorld(f.world, 1);
    const before = serializeWorld(later);
    expect(recordedPaycheckTaxInput(later, f.outcomeId)).toMatchObject({
      kind: "recorded",
      occurredAt: f.world.currentDate,
      amount: money(3600, "USD"),
    });
    expect(later.currentDate).toBe(addDays(f.world.currentDate, 1));
    expect(taxBaseOccurrenceSource(later, f.outcomeId)).toBeNull();
    expect(serializeWorld(later)).toBe(before);
  });
  it("rejects an unpaid attempt, a non-work transfer and an unavailable outcome", () => {
    for (const f of [fixture(places[0], 0), fixture(places[0], 3600, false)]) {
      expect(recordedPaycheckTaxInput(f.world, f.outcomeId).kind).toBe(
        "unavailable",
      );
    }
    const f = fixture();
    expect(recordedPaycheckTaxInput(f.world, f.workId).kind).toBe(
      "unavailable",
    );
  });
});
