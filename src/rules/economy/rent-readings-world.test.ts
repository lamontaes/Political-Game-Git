import { describe, it, expect } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import * as resources from "../../simulation/resources";
import * as life from "../../simulation/life";
import * as native from "../../simulation/living-world/town-rent";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../../simulation/macro-economy/producer";
import * as own from "./rent-readings";
import { rentReadingFacts } from "./test-support/rent-reading-facts";
import { savedLaw } from "./test-support/saved-law";
import type { World, EntityId } from "../../simulation/types";
const dates = ["2025-12-31", "2026-01-05", "2026-02-01", "2027-03-01"].map(
  makeIsoDate,
);
const provenance = {
  kind: "authored" as const,
  note: "Canonical household/dwelling/lease/pay and saved-law controls, not ordinary NPC renting.",
};
function compare(world: World, town: EntityId) {
  const facts = rentReadingFacts(world, dates);
  const row = native.hudRentRowFor(town);
  expect(own.hudRentRowFor(facts, town)).toEqual(row);
  for (const date of dates) {
    expect(own.rentLawLevel(facts, town, date)).toBe(
      native.rentLawLevel(world, town, date),
    );
    expect(own.marketRentLevel(facts, town, date)).toBe(
      native.marketRentLevel(world, town, date),
    );
    expect(own.rentPriceLevel(facts, town, date)).toBe(
      native.rentPriceLevel(world, town, date),
    );
    expect(own.householdHousingFacts(facts, date)).toEqual(
      native.householdHousingFacts(world, date),
    );
    if (row)
      for (const bedrooms of [-1, 0, 1, 2, 3, 4, 5]) {
        expect(own.marketRentMinor(facts, town, row, bedrooms, date)).toBe(
          native.marketRentMinor(world, town, row, bedrooms, date),
        );
        expect(own.affordableRentMinor(row, bedrooms)).toBe(
          native.affordableRentMinor(row, bedrooms),
        );
      }
  }
  if (row)
    for (const size of [0, 1, 1.5, 4, 7.5, 8, 9, 12])
      expect(own.veryLowIncomeLimit(row, size)).toBe(
        native.veryLowIncomeLimit(row, size),
      );
  for (const ratio of [0.5, 1, 1.05, 2])
    for (const basis of [
      undefined,
      row?.estimateBasis ?? "Authored source-basis control.",
    ])
      expect(own.marketRentRenewalReason(ratio, basis)).toBe(
        native.marketRentRenewalReason(ratio, basis),
      );
  return facts;
}
describe("complete HUD/family/law/price/household rent public readers across all 56 Native Worlds", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          people: 12,
          household: true,
          date: "2026-01-05",
          seed: "rules2:economy:rent-readings:" + usps,
        });
        let world = fixture.world;
        compare(world, fixture.jurisdictionId);
        world = ensureWorldStartingConditions(world, {
          openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
        });
        world = ensureMacroEconomyStarted(
          world,
          macroStartForHistory(macroStartingConditions(world)),
        );
        compare(world, fixture.jurisdictionId);
        const membership = world.history.householdMemberships.find((row) =>
          world.history.householdMembershipStates.some(
            (state) =>
              state.membershipId === row.id &&
              state.residenceRole === "primary",
          ),
        )!;
        expect(membership).toBeDefined();
        const personId = membership.personId;
        world = life.createOrganization(world, {
          stableKey: "rules2:rent:employer",
          formedAt: world.currentDate,
          provenance,
          initialProfile: {
            name: "Saved pay and lease provider",
            classification: "enterprise:real-estate",
            locationJurisdictionId: fixture.jurisdictionId,
          },
        });
        const organizationId = world.history.organizations.at(-1)!.id;
        world = resources.createResourceFlow(world, {
          stableKey: "rules2:rent:pay",
          source: { kind: "organization", organizationId },
          recipient: { kind: "person", personId },
          startsAt: world.currentDate,
          amount: resources.money(75000, "USD"),
          cadenceKind: "schedule:weekly",
          basisKind: "compensation:work",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        world = resources.createDwelling(world, {
          stableKey: "rules2:rent:home",
          establishedAt: world.currentDate,
          jurisdictionId: fixture.jurisdictionId,
          classification: "residential:house",
          locationLabel: "Saved rental home",
          provenance,
        });
        const dwellingId = world.history.dwellings.at(-1)!.id;
        world = resources.createHousingTenure(world, {
          stableKey: "rules2:rent:tenure",
          holder: { kind: "household", householdId: membership.householdId },
          dwellingId,
          startedAt: world.currentDate,
          kind: "lease:tenant",
          context: "Saved rental control.",
          provenance,
        });
        const housingTenureId = world.history.housingTenures.at(-1)!.id;
        world = resources.createResourceFlow(world, {
          stableKey: "rules2:rent:lease",
          source: { kind: "person", personId },
          recipient: { kind: "organization", organizationId },
          startsAt: world.currentDate,
          amount: resources.money(90000, "USD"),
          cadenceKind: "schedule:monthly",
          basisKind: "housing:rent",
          basisReference: { kind: "general" },
          restrictionKind: null,
          jurisdictionId: fixture.jurisdictionId,
          provenance,
        });
        const resourceFlowId = world.history.resourceFlows.at(-1)!.id;
        world = resources.createResourceObligation(world, {
          stableKey: "rules2:rent:obligation",
          resourceFlowId,
          housingTenureId,
          careResponsibilityId: null,
          principal: null,
          establishedAt: world.currentDate,
          basisKind: "housing:lease-2-bedroom-market",
          provenance,
        });
        const facts = compare(world, fixture.jurisdictionId);
        expect(
          own
            .householdHousingFacts(facts, world.currentDate)
            .get(membership.householdId)?.rentMinor,
        ).toBe(90000);
        const legal = savedLaw(
          world,
          own.RENT_LAW_KEYS.rentStabilization,
          fixture.jurisdictionId,
          null,
        );
        compare(legal, fixture.jurisdictionId);
        const frontier = {
          ...world,
          history: {
            ...world.history,
            resourceFlowTerms: world.history.resourceFlowTerms.map((row) => ({
              ...row,
              sequence: world.history.nextSequence + 10,
            })),
          },
        };
        compare(frontier, fixture.jurisdictionId);
      },
      30000,
    );
});
