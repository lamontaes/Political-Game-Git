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
  preparePaycheckTaxAssessment,
  matchRecordedPaycheckLevy,
  preparePaycheckLevyPartition,
  recordedPaycheckTaxInput,
} from "./tax-policy";
import {
  advanceWorld,
  assertWorldIntegrity,
  createWorld,
  createWorldId,
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
      expect(
        matchRecordedPaycheckLevy(paid, {
          outcomeId: f.outcomeId,
          authorityKey: income.authorityKey,
          taxKey: income.taxKey,
          payer: income.payer,
        }),
      ).toMatchObject({
        kind: "recorded-levy",
        liabilityId: income.id,
        status: income.status,
        liability: income.liability,
      });
      const prepared = preparePaycheckTaxAssessment(
        paid,
        f.outcomeId,
        `US-${place}`,
      );
      expect(prepared).toMatchObject({
        kind: "existing-wage-liability",
        liabilityId: income.id,
        status: income.status,
        liability: income.liability,
        paymentIds: (paid.history.statutoryTaxPayments ?? [])
          .filter((row) => row.liabilityId === income.id)
          .map((row) => row.id),
      });
      expect(serializeWorld(paid)).toBe(before);
      const reloaded = deserializeWorld(before);
      expect(recordedPaycheckTaxInput(reloaded, f.outcomeId)).toEqual(input);
      expect(
        preparePaycheckTaxAssessment(reloaded, f.outcomeId, `US-${place}`),
      ).toEqual(prepared);
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
          prepared.kind === "existing-wage-liability"
            ? prepared.paymentIds
            : [],
      });
    },
  );
  it("joins positive income-tax collection to its actual transfer, preserving the completed liability on repeat", () => {
    const f = fixture(places[0], 120_000, true, 240_000);
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const input = recordedPaycheckTaxInput(paid, f.outcomeId);
    if (input.kind !== "recorded") throw new Error(input.reason);
    const prepared = preparePaycheckTaxAssessment(
      paid,
      f.outcomeId,
      `US-${places[0]!}`,
    );
    if (prepared.kind !== "existing-wage-liability")
      throw new Error("Expected the existing wage-income liability.");
    expect(prepared.status).toBe("assessed");
    expect(prepared.liability!.minorUnits).toBeGreaterThan(0);
    expect(prepared.paymentIds).toHaveLength(1);
    const collection = input.statutoryCollections.find(
      (row) => row.paymentId === prepared.paymentIds[0],
    )!;
    expect(collection.liabilityId).toBe(prepared.liabilityId);
    expect(collection.amount).toEqual(prepared.liability);
    const transfer = paid.history.resourceTransferOutcomes.find(
      (row) => row.id === collection.resourceOutcomeId,
    )!;
    expect(transfer.status).toBe("completed");
    expect(transfer.transferredAmount).toEqual(collection.amount);
    const before = serializeWorld(paid);
    const loaded = deserializeWorld(before);
    expect(
      preparePaycheckTaxAssessment(loaded, f.outcomeId, `US-${places[0]!}`),
    ).toEqual(prepared);
    expect(assessPaychecksTaxes(loaded, [f.outcomeId])).toBe(loaded);
    expect(serializeWorld(loaded)).toBe(before);
    console.info("A33 existing positive collection", {
      seed,
      place: places[0],
      person: personName(f.person),
      payOutcomeId: f.outcomeId,
      actualPaidMinor: input.amount.minorUnits,
      liabilityId: prepared.liabilityId,
      liabilityMinor: prepared.liability!.minorUnits,
      paymentId: collection.paymentId,
      transferOutcomeId: collection.resourceOutcomeId,
      collectedMinor: collection.amount.minorUnits,
    });
  });
  it("partitions exact levy and payer identities without suppressing other paycheck taxes", () => {
    const f = fixture(places[0], 120_000, true, 240_000);
    const paid = assessPaychecksTaxes(f.world, [f.outcomeId]);
    const input = recordedPaycheckTaxInput(paid, f.outcomeId);
    if (input.kind !== "recorded") throw new Error(input.reason);
    const liabilities = paid.history.statutoryTaxLiabilities!.filter(
      (row) => row.sourceOutcomeId === f.outcomeId,
    );
    const requests = liabilities.map((row) => ({
      outcomeId: row.sourceOutcomeId,
      authorityKey: row.authorityKey,
      taxKey: row.taxKey,
      payer: row.payer,
    }));
    const before = serializeWorld(paid);
    const partition = preparePaycheckLevyPartition(
      paid,
      [f.outcomeId],
      requests,
    );
    expect(partition.existing.map((row) => row.liabilityId)).toEqual(
      liabilities.map((row) => row.id),
    );
    expect(partition.missing).toEqual([]);
    expect(partition.refused).toEqual([]);
    const employee = requests.find(
      (row) => row.taxKey === "us-federal:social-security-employee",
    )!;
    const employer = requests.find(
      (row) => row.taxKey === "us-federal:social-security-employer",
    )!;
    expect(employee.payer.kind).toBe("person");
    expect(employer.payer.kind).toBe("organization");
    expect(
      matchRecordedPaycheckLevy(paid, { ...employee, payer: employer.payer })
        .kind,
    ).toBe("not-recorded");
    const missing = { ...employee, taxKey: "test:unadmitted-levy" };
    expect(
      preparePaycheckLevyPartition(paid, [f.outcomeId], [missing]),
    ).toMatchObject({
      existing: [],
      refused: [],
      missing: [{ kind: "not-recorded", identity: missing }],
    });
    const duplicate = preparePaycheckLevyPartition(
      paid,
      [f.outcomeId],
      [employee, employee],
    );
    expect(duplicate.existing).toHaveLength(1);
    expect(duplicate.refused).toHaveLength(1);
    const outside = preparePaycheckLevyPartition(paid, [], [employee]);
    expect(outside.existing).toEqual([]);
    expect(outside.refused).toHaveLength(1);
    const loaded = deserializeWorld(before);
    expect(
      preparePaycheckLevyPartition(loaded, [f.outcomeId], requests),
    ).toEqual(partition);
    expect(serializeWorld(loaded)).toBe(before);
  });
  it("does not turn an outcome ID into an event or admit an arbitrary wage base", () => {
    const f = fixture();
    const saved = serializeWorld(f.world);
    expect(
      preparePaycheckTaxAssessment(f.world, f.outcomeId, `US-${places[0]!}`),
    ).toMatchObject({
      kind: "unsupported",
      reason: expect.stringContaining("No admitted wage TaxTerms"),
    });
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
    expect(
      preparePaycheckTaxAssessment(later, f.outcomeId, `US-${places[0]!}`),
    ).toMatchObject({
      kind: "unsupported",
      reason: expect.stringContaining("Catch-up payment"),
    });
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
