import { describe, expect, it } from "vitest";
import { createStartingPerson } from "./people";
import type { World } from "./types";
import { smallWorld } from "../../tests/fixtures/small-world";
import {
  createHousehold,
  createOrganization,
  recordHouseholdLocation,
  startHouseholdMembership,
} from "./life";
import { lifePlaceStateIdentities } from "./life-places";
import {
  createResourcePosition,
  createResourceFlow,
  money,
  recordResourceFlowTerms,
  recordResourceTransferOutcome,
} from "./resources";
import {
  resourceFlowTermsAt,
  resourcePositionAt,
  sameEndpoint,
} from "./resource-queries";
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
  const owner = { kind: "household" as const, householdId };
  const amount = estimatedHouseholdLivingCostsAt(
    world,
    small.personId,
  )!.monthlyMinor;
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
      expect(flow.source).toEqual(fixture.owner);
      expect(flow.recipient.kind).toBe("organization");
      expect(world.history.organizationProfiles.at(-1)!.name).toBe(
        "Sellers outside this town's simulated businesses",
      );
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
      expect(
        resourcePositionAt(paid, flow.recipient, terms.amount.currency)!
          .liquidBalance.minorUnits,
      ).toBe(fixture.amount);
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

    it(`preserves a saved same-day spending trough when settling an overdue household bill (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      const opening = fixture.amount * 3;
      const remaining = 12345;
      expect(fixture.amount).toBeGreaterThan(remaining);
      let world = createResourcePosition(fixture.world, {
        stableKey: "a52-small:trough-funds",
        owner: fixture.owner,
        openedAt: fixture.world.currentDate,
        openingBalance: money(opening, "USD"),
        provenance,
      });
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const bill = livingCostsFlowFor(world, fixture.small.personId)!;
      const later = makeIsoDate("2026-02-10");
      const current = makeIsoDate("2026-02-15");
      world = {
        ...world,
        currentDate: current,
        currentMoment: simulationMomentOnLocalDate(
          world.currentMoment,
          current,
        ),
      };
      for (const [key, source, recipient] of [
        ["spending", fixture.owner, bill.recipient],
        ["replenishment", bill.recipient, fixture.owner],
      ] as const) {
        world = createResourceFlow(world, {
          stableKey: `a52-small:trough:${key}`,
          source,
          recipient,
          startsAt: later,
          amount: money(opening - remaining, "USD"),
          cadenceKind: "schedule:once",
          basisKind: "custom:trough-fixture",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.small.jurisdictionId,
          provenance,
        });
        world = recordResourceTransferOutcome(world, {
          stableKey: `a52-small:trough:${key}:paid`,
          resourceFlowId: world.history.resourceFlows.at(-1)!.id,
          periodStartsAt: later,
          periodEndsAt: later,
          occurredAt: later,
          status: "completed",
          attemptedAmount: money(opening - remaining, "USD"),
          transferredAmount: money(opening - remaining, "USD"),
          reasonKind: null,
          note: "Saved spending then replenishment on the same day.",
          provenance,
        });
      }
      const spending = world.history.resourceTransferOutcomes.at(-2)!;
      const originalReceipts = world.history.resourceTransferOutcomes;
      world = settleLivingCosts(
        deserializeWorld(serializeWorld(world)),
        fixture.small.personId,
      );
      const payment = world.history.resourceTransferOutcomes.at(-1)!;
      expect(payment.resourceFlowId).toBe(bill.id);
      expect(payment.status).toBe("partial");
      expect(payment.transferredAmount.minorUnits).toBe(remaining);
      expect(world.history.resourceTransferOutcomes.slice(0, -1)).toEqual(
        originalReceipts,
      );
      expect(
        resourcePositionAt(world, fixture.owner, money(0, "USD").currency, {
          asOfDate: later,
          historySequenceExclusive: spending.sequence + 1,
        })!.liquidBalance.minorUnits,
      ).toBe(remaining);
      const cash = resourcePositionAt(
        world,
        fixture.owner,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const sellers = resourcePositionAt(
        world,
        bill.recipient,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      expect(cash).toBe(opening - remaining);
      expect(sellers).toBe(remaining);
      expect(cash + sellers).toBe(opening);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(settleLivingCosts(reopened, fixture.small.personId)).toBe(
        reopened,
      );
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

    it.each(["completed", "partial", "missed", "unknown"] as const)(
      `settles a recorded household provider with %s cash and preserves conservation/reload (seed ${seed})`,
      (status) => {
        const fixture = household(place.jurisdictionKey);
        let world = createOrganization(fixture.world, {
          stableKey: "a52-small:recorded-provider",
          formedAt: fixture.world.currentDate,
          provenance,
          initialProfile: {
            name: "Recorded fixture provider",
            classification: "enterprise:retail",
            locationJurisdictionId: fixture.small.jurisdictionId,
          },
        });
        const provider = {
          kind: "organization" as const,
          organizationId: world.history.organizations.at(-1)!.id,
        };
        const payer = {
          kind: "household" as const,
          householdId: fixture.householdId,
        };
        const cash =
          status === "completed" ? 600000 : status === "partial" ? 5000 : 0;
        // Personal cash is deliberately ample, but never funds this saved household bill.
        world = createResourcePosition(world, {
          stableKey: "a52-small:personal-funds",
          owner: { kind: "person", personId: fixture.small.personId },
          openedAt: world.currentDate,
          openingBalance: money(900000, "USD"),
          provenance,
        });
        world = createResourceFlow(world, {
          stableKey: `living-costs:${fixture.small.personId}`,
          source: { kind: "person", personId: fixture.small.personId },
          recipient: payer,
          startsAt: world.currentDate,
          amount: money(60000, "USD"),
          cadenceKind: "schedule:monthly",
          basisKind: "custom:living-costs",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.small.jurisdictionId,
          provenance,
        });
        const old = world.history.resourceFlows.at(-1)!;
        const oldTerms = [...world.history.resourceFlowTerms];
        if (status !== "unknown")
          world = createResourcePosition(world, {
            stableKey: "a52-small:household-funds",
            owner: payer,
            openedAt: world.currentDate,
            openingBalance: money(cash, "USD"),
            provenance,
          });
        world = createResourcePosition(world, {
          stableKey: "a52-small:provider-funds",
          owner: provider,
          openedAt: world.currentDate,
          openingBalance: money(0, "USD"),
          provenance,
        });
        world = createResourceFlow(world, {
          stableKey: "a52-small:provider-bill",
          source: payer,
          recipient: provider,
          startsAt: world.currentDate,
          amount: money(status === "completed" ? 200000 : 10000, "USD"),
          cadenceKind: "schedule:monthly",
          basisKind: "custom:living-costs",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.small.jurisdictionId,
          provenance,
        });
        const bill = world.history.resourceFlows.at(-1)!;
        world = initializeLivingCostsFlow(world, fixture.small.personId);
        expect(world.history.resourceTransferOutcomes).toHaveLength(0);
        expect(resourceFlowTermsAt(world, old.id)!.status).toBe("ended");
        expect(
          world.history.resourceFlowTerms.slice(0, oldTerms.length),
        ).toEqual(oldTerms);
        const dueOn = makeIsoDate("2026-02-01");
        world = {
          ...world,
          currentDate: dueOn,
          currentMoment: simulationMomentOnLocalDate(
            world.currentMoment,
            dueOn,
          ),
        };
        const paid = settleLivingCosts(world, fixture.small.personId);
        const outcomes = paid.history.resourceTransferOutcomes;
        const expectedPaid = status === "completed" ? 200000 : cash;
        if (status === "unknown") expect(outcomes).toHaveLength(0);
        else {
          expect(outcomes).toHaveLength(1);
          expect(outcomes[0]).toMatchObject({
            resourceFlowId: bill.id,
            status,
            transferredAmount: money(expectedPaid, "USD"),
            periodStartsAt: dueOn,
            note: "Food and bills for February.",
          });
          expect(
            resourcePositionAt(paid, payer, money(0, "USD").currency)!
              .liquidBalance.minorUnits,
          ).toBe(cash - expectedPaid);
        }
        expect(
          resourcePositionAt(paid, provider, money(0, "USD").currency)!
            .liquidBalance.minorUnits,
        ).toBe(expectedPaid);
        expect(
          resourcePositionAt(
            paid,
            { kind: "person", personId: fixture.small.personId },
            money(0, "USD").currency,
          )!.liquidBalance.minorUnits,
        ).toBe(900000);
        expect(settleLivingCosts(paid, fixture.small.personId)).toBe(paid);
        const reopened = deserializeWorld(serializeWorld(paid));
        expect(settleLivingCosts(reopened, fixture.small.personId)).toBe(
          reopened,
        );
      },
    );

    it(`shares one outside-sellers account across two households in the same place (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      let world = createResourcePosition(fixture.world, {
        stableKey: "a52-small:first-funds",
        owner: fixture.owner,
        openedAt: fixture.world.currentDate,
        openingBalance: money(500000, "USD"),
        provenance,
      });
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const first = livingCostsFlowFor(world, fixture.small.personId)!;
      const secondPerson = Object.values(world.people).find(
        (person) => person.id !== fixture.small.personId,
      )!;
      world = createHousehold(world, {
        stableKey: "a52-small:second-household",
        formedAt: world.currentDate,
        label: "Second controlled household",
        provenance,
      });
      const secondHousehold = world.history.households.at(-1)!.id;
      world = startHouseholdMembership(world, {
        stableKey: "a52-small:second-member",
        householdId: secondHousehold,
        personId: secondPerson.id,
        startedAt: world.currentDate,
        residenceRole: "primary",
        kind: "resident:member",
        provenance,
      });
      world = createResourcePosition(world, {
        stableKey: "a52-small:second-funds",
        owner: { kind: "household", householdId: secondHousehold },
        openedAt: world.currentDate,
        openingBalance: money(500000, "USD"),
        provenance,
      });
      world = {
        ...world,
        control: { kind: "person", personId: secondPerson.id },
      };
      world = initializeLivingCostsFlow(world, secondPerson.id);
      const second = livingCostsFlowFor(world, secondPerson.id)!;
      expect(second.recipient).toEqual(first.recipient);
      expect(
        world.history.organizations.filter((org) =>
          org.stableKey.startsWith("living-costs:outside-sellers:"),
        ),
      ).toHaveLength(1);
      expect(
        world.history.resourcePositions.filter((position) =>
          sameEndpoint(position.owner, first.recipient),
        ),
      ).toHaveLength(1);
      expect(initializeLivingCostsFlow(world, secondPerson.id)).toBe(world);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(initializeLivingCostsFlow(reopened, secondPerson.id)).toBe(
        reopened,
      );
    });

    it(`keeps outside-seller accounts separate across a recorded household move (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      const target = places[(places.indexOf(place) + 1) % places.length]!;
      const destination = smallWorld({
        place: target.jurisdictionKey,
        seed,
        date: "2026-02-01",
      });
      const opening = fixture.amount * 10;
      let world = createResourcePosition(fixture.world, {
        stableKey: "a52-small:move-funds",
        owner: fixture.owner,
        openedAt: fixture.world.currentDate,
        openingBalance: money(opening, "USD"),
        provenance,
      });
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const first = livingCostsFlowFor(world, fixture.small.personId)!;
      const receipts = world.history.resourceTransferOutcomes;
      const movedOn = makeIsoDate("2026-02-01");
      // Compose the destination's existing canonical geography into this
      // controlled multi-place fixture; no fictional jurisdiction is created.
      world = {
        ...world,
        jurisdictions: {
          ...world.jurisdictions,
          ...destination.world.jurisdictions,
        },
        jurisdictionOrder: [
          ...new Set([
            ...world.jurisdictionOrder,
            ...destination.world.jurisdictionOrder,
          ]),
        ],
        currentDate: movedOn,
        currentMoment: simulationMomentOnLocalDate(
          world.currentMoment,
          movedOn,
        ),
      };
      world = recordHouseholdLocation(world, {
        stableKey: "a52-small:move-location",
        householdId: fixture.householdId,
        effectiveAt: movedOn,
        jurisdictionId: destination.jurisdictionId,
        label: destination.place.context.jurisdiction.name,
        kind: "residence:ordinary",
        provenance,
        supersedesLocationId: null,
      });
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const second = livingCostsFlowFor(world, fixture.small.personId)!;
      expect(second.recipient).not.toEqual(first.recipient);
      expect(second.jurisdictionId).toBe(destination.jurisdictionId);
      expect(resourceFlowTermsAt(world, first.id)!.status).toBe("ended");
      const sellers = world.history.organizations.filter((row) =>
        row.stableKey.startsWith("living-costs:outside-sellers:"),
      );
      expect(sellers).toHaveLength(2);
      for (const seller of sellers) {
        expect(
          world.history.organizationProfiles.find(
            (row) => row.organizationId === seller.id,
          )!.name,
        ).toBe("Sellers outside this town's simulated businesses");
        expect(
          world.history.resourcePositions.filter(
            (row) =>
              row.owner.kind === "organization" &&
              row.owner.organizationId === seller.id,
          ),
        ).toHaveLength(1);
      }
      expect(world.history.resourceTransferOutcomes).toEqual(receipts);
      expect(
        resourcePositionAt(world, first.recipient, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(0);
      expect(
        resourcePositionAt(world, second.recipient, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(0);
      const dueOn = makeIsoDate("2026-03-01");
      world = {
        ...world,
        currentDate: dueOn,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, dueOn),
      };
      world = settleLivingCosts(
        deserializeWorld(serializeWorld(world)),
        fixture.small.personId,
      );
      const payment = world.history.resourceTransferOutcomes.at(-1)!;
      expect(payment.resourceFlowId).toBe(second.id);
      expect(payment.status).toBe("completed");
      expect(
        world.history.resourceTransferOutcomes.filter(
          (row) => row.resourceFlowId === first.id,
        ),
      ).toHaveLength(0);
      const cash = resourcePositionAt(
        world,
        fixture.owner,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const paid = resourcePositionAt(
        world,
        second.recipient,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      expect(
        resourcePositionAt(world, first.recipient, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(0);
      expect(paid).toBe(payment.transferredAmount.minorUnits);
      expect(cash + paid).toBe(opening);
      const reopened = deserializeWorld(serializeWorld(world));
      expect(initializeLivingCostsFlow(reopened, fixture.small.personId)).toBe(
        reopened,
      );
      expect(settleLivingCosts(reopened, fixture.small.personId)).toBe(
        reopened,
      );
      const returnedOn = makeIsoDate("2026-03-02");
      world = {
        ...reopened,
        currentDate: returnedOn,
        currentMoment: simulationMomentOnLocalDate(
          reopened.currentMoment,
          returnedOn,
        ),
      };
      world = recordHouseholdLocation(world, {
        stableKey: "a52-small:return-location",
        householdId: fixture.householdId,
        effectiveAt: returnedOn,
        jurisdictionId: fixture.small.jurisdictionId,
        label: fixture.small.place.context.jurisdiction.name,
        kind: "residence:ordinary",
        provenance,
        supersedesLocationId: world.history.householdLocations.at(-1)!.id,
      });
      const earlierReceipts = world.history.resourceTransferOutcomes;
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const returned = livingCostsFlowFor(world, fixture.small.personId)!;
      expect(returned.id).not.toBe(first.id);
      expect(returned.recipient).toEqual(first.recipient);
      expect(resourceFlowTermsAt(world, first.id)!.status).toBe("ended");
      expect(resourceFlowTermsAt(world, second.id)!.status).toBe("ended");
      expect(resourceFlowTermsAt(world, returned.id)!.status).toBe("active");
      expect(
        world.history.organizations.filter((row) =>
          row.stableKey.startsWith("living-costs:outside-sellers:"),
        ),
      ).toHaveLength(2);
      expect(
        world.history.resourcePositions.filter((row) =>
          sameEndpoint(row.owner, first.recipient),
        ),
      ).toHaveLength(1);
      expect(world.history.resourceTransferOutcomes).toEqual(earlierReceipts);
      const returnedDue = makeIsoDate("2026-04-01");
      world = {
        ...world,
        currentDate: returnedDue,
        currentMoment: simulationMomentOnLocalDate(
          world.currentMoment,
          returnedDue,
        ),
      };
      world = settleLivingCosts(
        deserializeWorld(serializeWorld(world)),
        fixture.small.personId,
      );
      expect(
        world.history.resourceTransferOutcomes.at(-1)!.resourceFlowId,
      ).toBe(returned.id);
      expect(world.history.resourceTransferOutcomes.at(-1)!.status).toBe(
        "completed",
      );
      expect(world.history.resourceTransferOutcomes.slice(0, -1)).toEqual(
        earlierReceipts,
      );
      const householdCash = resourcePositionAt(
        world,
        fixture.owner,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const originalSellerCash = resourcePositionAt(
        world,
        first.recipient,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      const destinationSellerCash = resourcePositionAt(
        world,
        second.recipient,
        money(0, "USD").currency,
      )!.liquidBalance.minorUnits;
      expect(householdCash + originalSellerCash + destinationSellerCash).toBe(
        opening,
      );
      const returnedReload = deserializeWorld(serializeWorld(world));
      expect(
        initializeLivingCostsFlow(returnedReload, fixture.small.personId),
      ).toBe(returnedReload);
      expect(settleLivingCosts(returnedReload, fixture.small.personId)).toBe(
        returnedReload,
      );
    });

    it(`excludes a recorded category invoice from the outside-sellers estimate (seed ${seed})`, () => {
      const fixture = household(place.jurisdictionKey);
      let world = createResourcePosition(fixture.world, {
        stableKey: "a52-small:category-funds",
        owner: fixture.owner,
        openedAt: fixture.world.currentDate,
        openingBalance: money(500000, "USD"),
        provenance,
      });
      world = createOrganization(world, {
        stableKey: "a52-small:food-provider",
        formedAt: world.currentDate,
        provenance,
        initialProfile: {
          name: "Controlled recorded food seller",
          classification: "enterprise:retail",
          locationJurisdictionId: fixture.small.jurisdictionId,
        },
      });
      const provider = {
        kind: "organization" as const,
        organizationId: world.history.organizations.at(-1)!.id,
      };
      world = createResourcePosition(world, {
        stableKey: "a52-small:food-provider-cash",
        owner: provider,
        openedAt: world.currentDate,
        openingBalance: money(0, "USD"),
        provenance,
      });
      world = createResourceFlow(world, {
        stableKey: "a52-small:food-invoice",
        source: fixture.owner,
        recipient: provider,
        startsAt: world.currentDate,
        amount: money(20000, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: "custom:living-costs.food",
        basisReference: { kind: "general" },
        restrictionKind: null,
        jurisdictionId: fixture.small.jurisdictionId,
        provenance,
      });
      const invoice = world.history.resourceFlows.at(-1)!;
      const estimate = estimatedHouseholdLivingCostsAt(
        world,
        fixture.small.personId,
      )!;
      const total = estimate.categories.reduce(
        (sum, row) => sum + row.annualMeanUsd,
        0,
      );
      const food = estimate.categories.find(
        (row) => row.key === "food",
      )!.annualMeanUsd;
      const outsideAmount = Math.round(
        (estimate.monthlyMinor * (total - food)) / total,
      );
      world = initializeLivingCostsFlow(world, fixture.small.personId);
      const outside = livingCostsFlowFor(world, fixture.small.personId)!;
      expect(outside.recipient).not.toEqual(provider);
      expect(resourceFlowTermsAt(world, outside.id)!.amount.minorUnits).toBe(
        outsideAmount,
      );
      const dueOn = makeIsoDate("2026-02-01");
      world = {
        ...world,
        currentDate: dueOn,
        currentMoment: simulationMomentOnLocalDate(world.currentMoment, dueOn),
      };
      world = settleLivingCosts(world, fixture.small.personId);
      expect(world.history.resourceTransferOutcomes).toHaveLength(2);
      expect(
        world.history.resourceTransferOutcomes.find(
          (row) => row.resourceFlowId === invoice.id,
        )!.transferredAmount.minorUnits,
      ).toBe(20000);
      expect(
        resourcePositionAt(world, provider, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(20000);
      expect(
        resourcePositionAt(world, outside.recipient, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(outsideAmount);
      expect(
        resourcePositionAt(world, fixture.owner, money(0, "USD").currency)!
          .liquidBalance.minorUnits,
      ).toBe(500000 - 20000 - outsideAmount);
      expect(settleLivingCosts(world, fixture.small.personId)).toBe(world);
    });

    it.each([0, 5000])(
      `limits outside-seller payment to saved household cash %i (seed ${seed})`,
      (cash) => {
        const fixture = household(place.jurisdictionKey);
        let world = createResourcePosition(fixture.world, {
          stableKey: "a52-small:limited-funds",
          owner: fixture.owner,
          openedAt: fixture.world.currentDate,
          openingBalance: money(cash, "USD"),
          provenance,
        });
        world = initializeLivingCostsFlow(world, fixture.small.personId);
        const flow = livingCostsFlowFor(world, fixture.small.personId)!;
        const dueOn = makeIsoDate("2026-02-01");
        world = {
          ...world,
          currentDate: dueOn,
          currentMoment: simulationMomentOnLocalDate(
            world.currentMoment,
            dueOn,
          ),
        };
        world = settleLivingCosts(world, fixture.small.personId);
        expect(world.history.resourceTransferOutcomes.at(-1)!.status).toBe(
          cash > 0 ? "partial" : "missed",
        );
        expect(
          resourcePositionAt(world, fixture.owner, money(0, "USD").currency)!
            .liquidBalance.minorUnits,
        ).toBe(0);
        expect(
          resourcePositionAt(world, flow.recipient, money(0, "USD").currency)!
            .liquidBalance.minorUnits,
        ).toBe(cash);
        expect(settleLivingCosts(world, fixture.small.personId)).toBe(world);
      },
    );

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
