import { describe, expect, it } from "vitest";
import { stdout } from "node:process";
import incomeTables from "../../data/research/money/state-income-tax-2026.json" with { type: "json" };
import { smallWorld } from "../../tests/fixtures/small-world";
import { stableHash } from "./ids";
import { createOrganization, createWorkRelationship } from "./life";
import { lifePlaceStateIdentities, searchLifePlaces } from "./life-places";
import { placeReferencePopulation } from "./nationwide-world/place-population";
import { recordPaycheckTaxBases } from "./paycheck-tax-bases";
import {
  createResourcePosition,
  createWorkCompensation,
  money,
  recordResourceTransferOutcome,
} from "./resources";
import { serializeWorld, deserializeWorld } from "./serialization";
import { assessPaychecksTaxes } from "./statutory-tax";
import { assessTaxBase, taxBaseOccurrenceSource } from "./tax-policy";
import { advanceWorld, assertWorldIntegrity } from "./world";
import {
  observerSetup,
  openObserverWorld,
  advanceObservedWorld,
} from "../presentation/observer-world";

const places = [...lifePlaceStateIdentities()]
  .sort((a, b) =>
    stableHash(`a33-recorded-bases:${a.jurisdictionKey}`).localeCompare(
      stableHash(`a33-recorded-bases:${b.jurisdictionKey}`),
    ),
  )
  .slice(0, 5);

function paidFixture(place: string, actualMinor = 3600) {
  const f = smallWorld({
    place,
    seed: `a33-bases:${place}`,
    date: "2026-01-05",
  });
  let world = f.world;
  const provenance = {
    kind: "authored" as const,
    note: "Controlled partial-pay fixture, not a natural wage or employer.",
  };
  world = createOrganization(world, {
    stableKey: "a33-bases:employer",
    formedAt: world.currentDate,
    provenance,
    initialProfile: {
      name: "Controlled employer",
      classification: "enterprise:retail",
      locationJurisdictionId: f.jurisdictionId,
    },
  });
  const organizationId = world.history.organizations.at(-1)!.id;
  world = createWorkRelationship(world, {
    stableKey: "a33-bases:work",
    personId: f.personId,
    organizationId,
    startedAt: world.currentDate,
    kind: "employment:employee",
    compensation: "paid",
    authority: "directed",
    dependency: "dependent",
    economicRisk: "organization-borne",
    provenance,
    initialRole: {
      title: "Controlled worker",
      occupationClassification: null,
      locationJurisdictionId: f.jurisdictionId,
      timeDemand: {
        expectedWeekly: { minimumHours: 20, maximumHours: 20 },
        attention: "moderate",
        concurrency: "mostly-exclusive",
        scheduleRigidity: "rigid",
        interruptibility: "limited",
        locationJurisdictionId: f.jurisdictionId,
      },
    },
  });
  world = createWorkCompensation(world, {
    stableKey: "a33-bases:pay",
    workRelationshipId: world.history.workRelationships.at(-1)!.id,
    startsAt: world.currentDate,
    amount: money(7200, "USD"),
    cadenceKind: "schedule:weekly",
    restrictionKind: null,
    jurisdictionId: f.jurisdictionId,
    provenance,
  });
  const resourceFlowId = world.history.resourceFlows.at(-1)!.id;
  world = createResourcePosition(world, {
    stableKey: "a33-bases:worker-cash",
    owner: { kind: "person", personId: f.personId },
    openedAt: world.currentDate,
    openingBalance: money(0, "USD"),
    provenance,
  });
  world = recordResourceTransferOutcome(world, {
    stableKey: "a33-bases:actual-pay",
    resourceFlowId,
    periodStartsAt: world.currentDate,
    periodEndsAt: world.currentDate,
    occurredAt: world.currentDate,
    status: actualMinor > 0 ? "partial" : "missed",
    attemptedAmount: money(7200, "USD"),
    transferredAmount: money(actualMinor, "USD"),
    reasonKind: "custom:controlled-partial-pay",
    note: "Only actually transferred wages form the base.",
    provenance,
  });
  const outcomeId = world.history.resourceTransferOutcomes.at(-1)!.id;
  return { world: assessPaychecksTaxes(world, [outcomeId]), outcomeId, f };
}

describe("A33 automatic recorded gross-wage bases", () => {
  it.each(places)(
    "preserves the existing assessment and paid cash in $jurisdictionKey",
    ({ jurisdictionKey }) => {
      const { world, outcomeId } = paidFixture(jurisdictionKey);
      const next = recordPaycheckTaxBases(world, [outcomeId, outcomeId]);
      const bases = next.history.taxBases ?? [];
      expect(bases.length).toBeGreaterThan(0);
      for (const base of bases) {
        const source = taxBaseOccurrenceSource(next, base.sourceEventId)!;
        expect(source.kind).toBe("statutory-liability");
        expect(base).toMatchObject({
          baseKey: "tax-base:wages",
          amount: money(3600, "USD"),
          payer: source.kind === "event" ? undefined : source.payer,
          occurredAt: world.currentDate,
          jurisdictionId: source.jurisdictionId,
        });
        expect(() =>
          assessTaxBase(next, base.id, "existing-wage-levy"),
        ).toThrow("second assessment");
      }
      expect(next.history.statutoryTaxLiabilities).toBe(
        world.history.statutoryTaxLiabilities,
      );
      expect(next.history.statutoryTaxPayments).toBe(
        world.history.statutoryTaxPayments,
      );
      expect(next.history.resourceTransferOutcomes).toBe(
        world.history.resourceTransferOutcomes,
      );
      expect(next.history.resourcePositions).toBe(
        world.history.resourcePositions,
      );
      expect(next.history.taxAssessments ?? []).toEqual(
        world.history.taxAssessments ?? [],
      );
      expect(recordPaycheckTaxBases(next, [outcomeId])).toBe(next);
      const loaded = deserializeWorld(serializeWorld(next));
      expect(recordPaycheckTaxBases(loaded, [outcomeId])).toBe(loaded);
      expect(assessPaychecksTaxes(loaded, [outcomeId])).toBe(loaded);
      assertWorldIntegrity(loaded);
    },
  );

  it("keeps historical occurrence dates for catch-up without rescheduling collection", () => {
    const { world, outcomeId } = paidFixture(places[0]!.jurisdictionKey);
    const later = advanceWorld(world, 3);
    const next = recordPaycheckTaxBases(later, [outcomeId]);
    expect(
      next.history.taxBases!.every(
        (row) =>
          row.occurredAt === world.currentDate &&
          row.recordedAt === later.currentDate,
      ),
    ).toBe(true);
    expect(next.history.statutoryTaxPayments).toBe(
      later.history.statutoryTaxPayments,
    );
    expect(next.history.futureDueItems).toBe(later.history.futureDueItems);
  });

  it("creates no base for missed pay or an unassessed transfer", () => {
    const f = paidFixture(places[0]!.jurisdictionKey, 0);
    expect(recordPaycheckTaxBases(f.world, [f.outcomeId])).toBe(f.world);
    expect(recordPaycheckTaxBases(f.world, [])).toBe(f.world);
  });

  it("records bases through the actual payroll caller in a random native Begin locality", () => {
    const seed = "fiscal-starting-terms-new-game:natural-pay";
    const states = lifePlaceStateIdentities().filter(
      (place) =>
        incomeTables.places[
          place.jurisdictionKey as keyof typeof incomeTables.places
        ]?.wageIncomeTax === "flat",
    );
    const state =
      states[
        Number.parseInt(stableHash(seed).slice(0, 8), 16) % states.length
      ]!;
    const localities = searchLifePlaces("", 5000, {
      stateJurisdictionKey: state.jurisdictionKey,
      scope: "locality",
    }).filter((place) => {
      const population = place.sourceGeoid
        ? placeReferencePopulation(place.sourceGeoid)?.value
        : null;
      return (
        place.context.jurisdiction.kind === "census-place" &&
        population != null &&
        population > 0 &&
        population <= 1000
      );
    });
    const place =
      localities[
        Number.parseInt(stableHash(`${seed}:town`).slice(0, 8), 16) %
          localities.length
      ]!;
    const opened = openObserverWorld(observerSetup(seed, place.key));
    const next = advanceObservedWorld(opened.world, 14);
    const bases = next.history.taxBases ?? [];
    expect(bases.length).toBeGreaterThan(0);
    const liabilityIds = new Set(bases.map((row) => row.sourceEventId));
    const payments = next.history.statutoryTaxPayments!.filter(
      (row) => liabilityIds.has(row.liabilityId) && row.amount.minorUnits > 0,
    );
    expect(payments.length).toBeGreaterThan(0);
    const outcomes = new Set(
      next.history
        .statutoryTaxLiabilities!.filter((row) => liabilityIds.has(row.id))
        .map((row) => row.sourceOutcomeId),
    );
    expect(recordPaycheckTaxBases(next, [...outcomes])).toBe(next);
    const loaded = deserializeWorld(serializeWorld(next));
    expect(recordPaycheckTaxBases(loaded, [...outcomes])).toBe(loaded);
    expect(assessPaychecksTaxes(loaded, [...outcomes])).toBe(loaded);
    expect(loaded.history.statutoryTaxPayments).toEqual(
      next.history.statutoryTaxPayments,
    );
    for (const base of bases) {
      const source = taxBaseOccurrenceSource(next, base.sourceEventId)!;
      expect(source.kind).toBe("statutory-liability");
      if (source.kind !== "statutory-liability")
        throw new Error("Expected saved wages.");
      expect(base.amount).toEqual(source.liabilityRecord.wages);
      expect(base.payer).toEqual(source.payer);
      expect(base.occurredAt).toBe(source.occurredAt);
    }
    stdout.write(
      JSON.stringify({
        seed,
        place: place.key,
        state: state.jurisdictionKey,
        bases: bases.map((row) => ({
          id: row.id,
          sourceId: row.sourceEventId,
          payer: row.payer,
          wages: row.amount,
          occurredAt: row.occurredAt,
        })),
        actualPayments: payments.map((row) => ({
          id: row.id,
          liabilityId: row.liabilityId,
          transferId: row.resourceOutcomeId,
          amount: row.amount,
        })),
      }) + "\n",
    );
  });
});
