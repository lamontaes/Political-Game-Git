import { describe, expect, it } from "vitest";
import { createStartingPerson } from "./people";
import type { World } from "./types";
import { smallWorld } from "../../tests/fixtures/small-world";
import { createHousehold, startHouseholdMembership } from "./life";
import { lifePlaceStateIdentities } from "./life-places";
import {
  createResourcePosition,
  money,
  recordResourceFlowTerms,
} from "./resources";
import { resourceFlowTermsAt, resourcePositionAt } from "./resource-queries";
import { makeIsoDate, simulationMomentOnLocalDate } from "./dates";
import { SeededRng, pickDistinct } from "./rng";
import { deserializeWorld, serializeWorld } from "./serialization";
import {
  initializeLivingCostsFlow,
  estimatedHouseholdLivingCostsAt,
  livingCostsFlowFor,
  settleLivingCosts,
} from "./cost-of-living";
import {
  livingCostsRegionForState,
  estimatedMonthlyHouseholdLivingCosts,
  representativeMonthlyLivingCostsMinor,
} from "./living-costs-data";

const seed = "team4-a52-current-bills-20261001";
const catalog = lifePlaceStateIdentities();
const places = pickDistinct(new SeededRng(seed), catalog, 3);
const provenance = {
  kind: "authored" as const,
  note: "Controlled A52 household and funds; not observed expenditure.",
};

function household(place: string, date = "2026-01-01") {
  expect(catalog).toHaveLength(56);
  const small = smallWorld({ place, seed, date });
  let world = createHousehold(small.world, {
    stableKey: "a52-small:household",
    formedAt: small.world.currentDate,
    label: "Bill fixture household",
    provenance,
  });
  const householdId = world.history.households.at(-1)!.id;
  world = startHouseholdMembership(world, {
    stableKey: "a52-small:member",
    householdId,
    personId: small.personId,
    startedAt: world.currentDate,
    residenceRole: "primary",
    kind: "resident:member",
    provenance,
  });
  const owner = { kind: "person" as const, personId: small.personId };
  const amount = representativeMonthlyLivingCostsMinor(
    livingCostsRegionForState(small.place.stateJurisdictionKey),
  );
  return { world, small, householdId, owner, amount };
}

describe.each(places)(
  "A52 actual bill records in $jurisdictionKey",
  (place) => {
    it(`charges the sourced nonhousing amount once and preserves payment on reload (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      let world = createResourcePosition(fixture.world, {
        stableKey: "a52-small:funds",
        owner: fixture.owner,
        openedAt: fixture.world.currentDate,
        openingBalance: money(fixture.amount * 3, "USD"),
        provenance,
      });
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const flow = livingCostsFlowFor(world, fixture.small.personId)!;
      expect(flow.recipient).toEqual({
        kind: "household",
        householdId: fixture.householdId,
      });
      const terms = resourceFlowTermsAt(world, flow.id)!;
      expect(terms.amount.minorUnits).toBe(fixture.amount);
      expect(terms.provenance).toMatchObject({
        kind: "source-record",
        reference: expect.stringContaining("ESTIMATED FROM AVERAGE"),
      });
      expect(world.history.resourceTransferOutcomes).toHaveLength(0);
      const dueOn = makeIsoDate("2026-02-01");
      world = {
        ...world,
        currentDate: dueOn,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, dueOn),
      };
      const paid = settleLivingCosts(world, fixture.small.personId);
      expect(paid.history.resourceTransferOutcomes).toEqual([
        expect.objectContaining({
          resourceFlowId: flow.id,
          status: "completed",
          transferredAmount: terms.amount,
          periodStartsAt: dueOn,
        }),
      ]);
      expect(
        resourcePositionAt(paid, fixture.owner, terms.amount.currency)!
          .liquidBalance.minorUnits,
      ).toBe(fixture.amount * 2);
      expect(settleLivingCosts(paid, fixture.small.personId)).toBe(paid);
      const reopened = deserializeWorld(serializeWorld(paid));
      expect(settleLivingCosts(reopened, fixture.small.personId)).toBe(
        reopened,
      );
      expect(reopened.history.resourceTransferOutcomes).toEqual(
        paid.history.resourceTransferOutcomes,
      );
    });

    it(`keeps an old estimate immutable and changes only prospective terms (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      let world = createResourcePosition(fixture.world, {
        stableKey: "a52-small:funds",
        owner: fixture.owner,
        openedAt: fixture.world.currentDate,
        openingBalance: money(fixture.amount * 3, "USD"),
        provenance,
      });
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const flow = livingCostsFlowFor(world, fixture.small.personId)!;
      const initial = resourceFlowTermsAt(world, flow.id)!;
      world = recordResourceFlowTerms(world, {
        stableKey: "a52-small:legacy-estimate",
        resourceFlowId: flow.id,
        effectiveAt: world.currentDate,
        status: "active",
        amount: money(600_00, "USD"),
        cadenceKind: "schedule:monthly",
        reason: "Controlled legacy save estimate",
        provenance,
        supersedesTermsId: initial.id,
      });
      const oldTerms = [...world.history.resourceFlowTerms];
      const day = makeIsoDate("2026-01-15");
      world = {
        ...world,
        currentDate: day,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, day),
      };
      const migrated = settleLivingCosts(world, fixture.small.personId);
      expect(
        migrated.history.resourceFlowTerms.slice(0, oldTerms.length),
      ).toEqual(oldTerms);
      expect(resourceFlowTermsAt(migrated, flow.id)!.amount.minorUnits).toBe(
        fixture.amount,
      );
      expect(
        resourceFlowTermsAt(migrated, flow.id, {
          asOfDate: initial.effectiveAt,
          historySequenceExclusive: world.history.nextSequence,
        })!.amount.minorUnits,
      ).toBe(600_00);
      expect(migrated.history.resourceTransferOutcomes).toHaveLength(0);
      expect(settleLivingCosts(migrated, fixture.small.personId)).toBe(
        migrated,
      );
    });

    it(`honors ended due-day terms without reviving a saved bill (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      let world = createResourcePosition(fixture.world, {
        stableKey: "a52-small:funds",
        owner: fixture.owner,
        openedAt: fixture.world.currentDate,
        openingBalance: money(fixture.amount * 3, "USD"),
        provenance,
      });
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const flow = livingCostsFlowFor(world, fixture.small.personId)!;
      const terms = resourceFlowTermsAt(world, flow.id)!;
      const dueOn = makeIsoDate("2026-02-01");
      world = {
        ...world,
        currentDate: dueOn,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, dueOn),
      };
      world = recordResourceFlowTerms(world, {
        stableKey: "a52-small:ended",
        resourceFlowId: flow.id,
        effectiveAt: dueOn,
        status: "ended",
        amount: terms.amount,
        cadenceKind: terms.cadenceKind,
        reason: "Recorded contract ended on its due date",
        provenance,
        supersedesTermsId: terms.id,
      });
      expect(settleLivingCosts(world, fixture.small.personId)).toBe(world);
      expect(world.history.resourceTransferOutcomes).toHaveLength(0);
      expect(
        resourcePositionAt(world, fixture.owner, terms.amount.currency)!
          .liquidBalance.minorUnits,
      ).toBe(fixture.amount * 3);
    });

    it(`reads household size from actual primary residents, including a child (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      const child = createStartingPerson({
        worldId: fixture.world.id,
        worldSeed: `${seed}:child`,
        currentDate: fixture.world.currentDate,
        homeJurisdictionId: fixture.small.jurisdictionId,
        age: 8,
      });
      const childId = child.id;
      let world: World = {
        ...fixture.world,
        people: { ...fixture.world.people, [childId]: child },
        personOrder: [...fixture.world.personOrder, childId],
      };
      world = startHouseholdMembership(world, {
        stableKey: "a52-small:child",
        householdId: fixture.householdId,
        personId: childId,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance,
      });
      const estimate = estimatedHouseholdLivingCostsAt(
        world,
        fixture.small.personId,
      )!;
      expect(estimate.householdSize).toBe(2);
      expect(estimate.averageMonthlyMinor).toBe(
        estimatedMonthlyHouseholdLivingCosts(
          livingCostsRegionForState(fixture.small.place.stateJurisdictionKey),
          2,
        ).monthlyMinor,
      );
      expect(
        estimatedHouseholdLivingCostsAt(world, childId)!.monthlyMinor,
      ).toBe(estimate.monthlyMinor);
      expect(estimate.monthlyMinor).toBeGreaterThanOrEqual(
        estimate.averageMonthlyMinor * 0.75 - 1,
      );
      expect(estimate.monthlyMinor).toBeLessThanOrEqual(
        estimate.averageMonthlyMinor * 1.25 + 1,
      );
      const reopened = deserializeWorld(serializeWorld(world));
      expect(
        estimatedHouseholdLivingCostsAt(reopened, childId)!.monthlyMinor,
      ).toBe(estimate.monthlyMinor);
      expect(world.history.resourceTransferOutcomes).toHaveLength(0);
    });

    it(`refuses untracked money and a source not available yet (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      expect(
        initializeLivingCostsFlow(fixture.world, fixture.small.personId),
      ).toBe(fixture.world);
      const earlier = household(place.jurisdictionKey, "2025-12-01");
      const funded = createResourcePosition(earlier.world, {
        stableKey: "a52-small:funds",
        owner: earlier.owner,
        openedAt: earlier.world.currentDate,
        openingBalance: money(earlier.amount * 3, "USD"),
        provenance,
      });
      expect(settleLivingCosts(funded, earlier.small.personId)).toBe(funded);
      expect(livingCostsFlowFor(funded, earlier.small.personId)).toBeNull();
    });
  },
);
