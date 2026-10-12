import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { makeIsoDate } from "../../simulation/dates";
import {
  householdMembershipsAt,
  householdLocationAt,
  peopleInHouseholdAt,
} from "../../simulation/life-queries";
import { lifePlaceByJurisdictionId } from "../../simulation/life-places";
import { resourceFlowTermsAt } from "../../simulation/resource-queries";
import * as resources from "../../simulation/resources";
import { createOrganization } from "../../simulation/life";
import { recordSalesTaxBases } from "../../simulation/sales-tax-bases";
import { recordEventKnowledge } from "../../simulation/records";
import { advanceWorld, recordWorldEvent } from "../../simulation/world";
import {
  censusRegionOf,
  censusRegionStates,
} from "../../simulation/world-setup/census-regions";
import { placeOutcomeKey } from "../../simulation/outcome-web/place-outcome-store";
import {
  LIVING_COSTS_CATEGORY_DATA,
  LIVING_COSTS_CATEGORY_SOURCES,
} from "../../simulation/living-costs-category-data";
import {
  LIVING_COSTS_SOURCE,
  REPRESENTATIVE_LIVING_COSTS,
} from "../../simulation/living-costs-data";
import * as native from "../../simulation/cost-of-living";
import {
  costReceiptKey,
  estimatedHouseholdLivingCostsAt,
  initializeLivingCostsFlow,
  livingCostsFlowFor,
  settleLivingCosts,
  type CostFacts,
  type CostProcess,
  type CostWriteRequest,
} from "./household-costs";
import type { EntityId, World } from "../../simulation/types";
const provenance = {
  kind: "authored" as const,
  note: "Saved household bill/cash control for equivalence; not ordinary NPC play.",
};
function facts(world: World): CostFacts {
  const memberships: CostFacts["memberships"] extends ReadonlyMap<
    string,
    infer V
  >
    ? Map<string, V>
    : never = new Map();
  const residents: CostFacts["residents"] extends ReadonlyMap<string, infer V>
    ? Map<string, V>
    : never = new Map();
  const locations: CostFacts["locations"] extends ReadonlyMap<string, infer V>
    ? Map<string, V>
    : never = new Map();
  const terms: CostFacts["terms"] extends ReadonlyMap<string, infer V>
    ? Map<string, V>
    : never = new Map();
  const dates = new Set([world.currentDate, world.startedAt]);
  for (const flow of world.history.resourceFlows) {
    dates.add(flow.startsAt);
    let on = makeIsoDate(flow.startsAt.slice(0, 7) + "-01");
    for (let month = 0; month < 241 && on <= world.currentDate; month++) {
      dates.add(on);
      const [year, m] = on.split("-").map(Number) as [number, number];
      on = makeIsoDate(
        m === 12
          ? `${year + 1}-01-01`
          : `${year}-${String(m + 1).padStart(2, "0")}-01`,
      );
    }
  }
  const places = new Map<
    EntityId,
    ReturnType<typeof lifePlaceByJurisdictionId>
  >();
  for (const date of dates) {
    const cutoff = {
      asOfDate: date,
      historySequenceExclusive: world.history.nextSequence,
    };
    for (const id of world.personOrder) {
      memberships.set(
        costReceiptKey(id, date, world.history.nextSequence),
        householdMembershipsAt(world, id, cutoff),
      );
      places.set(
        world.people[id]!.homeJurisdictionId,
        lifePlaceByJurisdictionId(world.people[id]!.homeJurisdictionId),
      );
    }
    for (const household of world.history.households) {
      const key = costReceiptKey(
        household.id,
        date,
        world.history.nextSequence,
      );
      residents.set(key, peopleInHouseholdAt(world, household.id, cutoff));
      const location = householdLocationAt(world, household.id, cutoff);
      locations.set(key, location);
      if (location)
        places.set(
          location.jurisdictionId,
          lifePlaceByJurisdictionId(location.jurisdictionId),
        );
    }
    for (const flow of world.history.resourceFlows)
      terms.set(
        costReceiptKey(flow.id, date, world.history.nextSequence),
        resourceFlowTermsAt(world, flow.id, cutoff),
      );
  }
  return {
    onDate: world.currentDate,
    control: world.control,
    people: world.people,
    personOrder: world.personOrder,
    records: world.history,
    cash: { id: world.id, onDate: world.currentDate, records: world.history },
    living: { categories: LIVING_COSTS_CATEGORY_DATA },
    places,
    memberships,
    residents,
    locations,
    terms,
    outcomeKeys: new Map(
      [...places.keys()].map((id) => [id, placeOutcomeKey(id)]),
    ),
    censusRegions: new Map(
      censusRegionStates().map((usps) => [usps, censusRegionOf(usps)]),
    ),
    sourceUrl: LIVING_COSTS_SOURCE,
    sources: LIVING_COSTS_CATEGORY_SOURCES,
    sourceAvailableBy: REPRESENTATIVE_LIVING_COSTS.sourceAvailableBy,
    currency: REPRESENTATIVE_LIVING_COSTS.currency,
  };
}
function apply(world: World, request: CostWriteRequest): World {
  switch (request.op) {
    case "createOrganization":
      return createOrganization(world, request.input);
    case "createResourcePosition":
      return resources.createResourcePosition(world, request.input);
    case "createResourceFlow":
      return resources.createResourceFlow(world, request.input);
    case "recordResourceFlowTerms":
      return resources.recordResourceFlowTerms(world, request.input);
    case "recordResourceTransferOutcome":
      return resources.recordResourceTransferOutcome(world, request.input);
    case "recordSalesTaxBases":
      return recordSalesTaxBases(world, request.input);
    case "recordWorldEvent":
      return recordWorldEvent(world, request.input);
    case "recordEventKnowledge":
      return recordEventKnowledge(world, request.input);
  }
}
function run(world: World, process: CostProcess): World {
  let step = process.next();
  while (!step.done) {
    world = apply(world, step.value);
    step = process.next(facts(world));
  }
  return world;
}
function compare(world: World, id: EntityId, settle = false): World {
  expect(estimatedHouseholdLivingCostsAt(facts(world), id)).toEqual(
    native.estimatedHouseholdLivingCostsAt(world, id),
  );
  expect(livingCostsFlowFor(facts(world), id)).toEqual(
    native.livingCostsFlowFor(world, id),
  );
  const expected = settle
    ? native.settleLivingCosts(world, id)
    : native.initializeLivingCostsFlow(world, id);
  const actual = run(
    world,
    settle
      ? settleLivingCosts(facts(world), id)
      : initializeLivingCostsFlow(facts(world), id),
  );
  expect(actual).toEqual(expected);
  return actual;
}
describe("retained household bill preparation and settlement through native public owners", () => {
  for (const usps of Object.keys(STATES))
    it(
      usps,
      () => {
        const fixture = smallWorld({
          place: "US-" + usps,
          date: "2026-01-05",
          household: true,
          seed: "rules2:economy:household-costs:" + usps,
        });
        const base = fixture.world;
        const personId =
          base.control.kind === "person"
            ? base.control.personId
            : base.personOrder[0]!;
        const householdId = householdMembershipsAt(base, personId).find(
          (x) => x.state.residenceRole === "primary",
        )!.household.id;
        compare(base, personId);
        compare(
          base,
          base.personOrder.find((id) => id !== personId)!,
        );
        for (const balance of [0, 12345, 100000000]) {
          let world = resources.createResourcePosition(base, {
            stableKey: "rules2:costs:cash:" + balance,
            owner: { kind: "household", householdId },
            openedAt: base.currentDate,
            openingBalance: resources.money(balance, "USD"),
            provenance,
          });
          world = compare(world, personId);
          expect(native.livingCostsFlowFor(world, personId)).not.toBeNull();
          world = compare(world, personId);
          world = advanceWorld(world, 28);
          world = compare(world, personId, true);
          expect(world.history.resourceTransferOutcomes.length).toBeGreaterThan(
            0,
          );
          world = compare(world, personId, true);
          if (balance === 0)
            expect(
              world.history.events.some((x) =>
                x.tags.includes(native.HOUSEHOLD_SHORTFALL_TAG),
              ),
            ).toBe(true);
          world = advanceWorld(world, 31);
          compare(world, personId, true);
        }
        let funded = resources.createResourcePosition(base, {
          stableKey: "rules2:costs:providers-cash",
          owner: { kind: "household", householdId },
          openedAt: base.currentDate,
          openingBalance: resources.money(100000000, "USD"),
          provenance,
        });
        funded = compare(funded, personId);
        for (const basisKind of [
          native.LIVING_COSTS_BASIS +
            "." +
            Object.keys(LIVING_COSTS_CATEGORY_DATA)[0]!.toLowerCase(),
          native.LIVING_COSTS_BASIS,
        ]) {
          let world = createOrganization(funded, {
            stableKey: "rules2:costs:provider:" + basisKind,
            formedAt: funded.currentDate,
            initialProfile: {
              name: "Saved provider",
              classification: "sector:private",
              locationJurisdictionId: fixture.jurisdictionId,
            },
            provenance,
          });
          const organizationId = world.history.organizations.at(-1)!.id;
          world = resources.createResourcePosition(world, {
            stableKey: "rules2:costs:provider-cash:" + basisKind,
            owner: { kind: "organization", organizationId },
            openedAt: world.currentDate,
            openingBalance: resources.money(0, "USD"),
            provenance,
          });
          world = resources.createResourceFlow(world, {
            stableKey: "rules2:costs:provider-flow:" + basisKind,
            source: { kind: "household", householdId },
            recipient: { kind: "organization", organizationId },
            startsAt: world.currentDate,
            amount: resources.money(10000, "USD"),
            cadenceKind: "schedule:monthly",
            basisKind: basisKind as `custom:${string}`,
            basisReference: { kind: "general" },
            restrictionKind: null,
            jurisdictionId: fixture.jurisdictionId,
            provenance,
          });
          world = compare(world, personId, true);
          world = advanceWorld(world, 28);
          compare(world, personId, true);
        }
      },
      30000,
    );
});
