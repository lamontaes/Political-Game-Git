import { describe, it, expect } from "vitest";
import {
  smallWorld,
  smallWorldPlace,
} from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import {
  countyGovernmentUnitsForPlace,
  type GovernmentUnitIdentity,
} from "../../simulation/government-units";
import { ensureLocalGovernmentOrganization } from "../../simulation/nationwide-world/local-governments";
import { ensureCountyCouncilOpening } from "../../simulation/municipal-council-opening";
import { ensureCountyGovernmentSeatsForUnit } from "../../simulation/living-world/local-government-seats";
import { ensureStateJurisdictionForKey } from "../../simulation/nationwide-world/state-executives";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "../../simulation/world-setup/conditions";
import { CRUNCH46_WORLD_OPENING_VERSION } from "../../simulation/world-setup/types";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
} from "../../simulation/macro-economy";
import { PUBLIC_BUDGETS_VERSION } from "../../simulation/public-budgets/store";
import { withOpenedBudgets } from "../../simulation/public-budgets";
import {
  cancelFutureDueItem,
  scheduleFutureDueItem,
} from "../../simulation/future-transitions";
import { introduceMeasure } from "../../simulation/legislation";
import { attachTaxProposal } from "../../simulation/tax-policy";
import { recordWorldEvent } from "../../simulation/world";
import * as ordinances from "../../simulation/municipal-ordinance-procedure";
import * as native from "../../simulation/living-world/county-budget-hearings";
import * as own from "./county-hearings";
import { countyHearingFacts } from "./test-support/county-hearing-facts";
import { simulationMomentOnLocalDate } from "../../simulation/dates";
import type { World, FutureDueItem } from "../../simulation/types";
function run(
  world: World,
  units: readonly GovernmentUnitIdentity[],
  due?: FutureDueItem,
) {
  const result = due ? native.countyBudgetHearingHandler(world, due) : null;
  const expected = result?.world ?? native.ensureCountyBudgetHearings(world);
  const gen = due
    ? own.countyBudgetHearingHandler(countyHearingFacts(world, units), due)
    : own.ensureCountyBudgetHearings(countyHearingFacts(world, units));
  let current = world,
    step = gen.next(),
    requests = 0;
  while (!step.done) {
    requests++;
    const r = step.value;
    current = { ...current, control: r.control };
    let agenda: Parameters<typeof countyHearingFacts>[2];
    switch (r.kind) {
      case "scheduleFutureDueItem":
        current = scheduleFutureDueItem(current, r.input);
        break;
      case "introduceMeasure":
        current = introduceMeasure(current, r.input);
        break;
      case "attachTaxProposal":
        current = attachTaxProposal(current, r.input);
        break;
      case "recordWorldEvent":
        current = recordWorldEvent(current, r.input);
        break;
      case "placeMunicipalOrdinanceOnAgenda": {
        const receipt = ordinances.placeMunicipalOrdinanceOnAgenda(
          current,
          r.input,
        );
        current = receipt.world;
        agenda = { ...receipt, reason: receipt.ok ? "" : receipt.reason };
        break;
      }
      case "scheduleOrdinaryCouncilReading":
        current = ordinances.scheduleOrdinaryCouncilReading(
          current,
          ...r.input,
        );
        break;
      case "recordHearing":
        expect(r.input).toEqual(expected.publicBudgets!.countyBudgetHearings);
        current = {
          ...current,
          publicBudgets: {
            ...current.publicBudgets!,
            countyBudgetHearings: expected.publicBudgets!.countyBudgetHearings,
          },
        };
        break;
    }
    step = gen.next(countyHearingFacts(current, units, agenda));
  }
  expect(current).toEqual(expected);
  if (result) {
    const { facts, ...metadata } = step.value as own.CountyHearingResult;
    const { world: ignored, ...nativeMetadata } = result;
    expect(metadata).toEqual(nativeMetadata);
    expect(facts.records).toEqual(current.history);
    void ignored;
  }
  return { world: current, requests, context: result?.context };
}
describe.each(Object.keys(STATES))(
  "complete county hearing/levy public parent in US-%s",
  (usps) => {
    it("keeps actual source no-ops and an explicitly labeled compiled county context, forecasts, requests and repeat history", () => {
      const fixture = smallWorld({
        place: "US-" + usps,
        people: 8,
        date: "2026-01-05",
        seed: "rules2:county:" + usps,
      });
      let world = ensureWorldStartingConditions(fixture.world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      });
      world = ensureMacroEconomyStarted(
        world,
        macroStartForHistory(macroStartingConditions(world)),
      );
      const actual = countyGovernmentUnitsForPlace(
        smallWorldPlace("US-" + usps).sourceGeoid!,
      ).map((row) => row.unit);
      for (const u of actual) {
        world = ensureLocalGovernmentOrganization(world, u);
        world = ensureCountyCouncilOpening(world, u.id);
        world = ensureCountyGovernmentSeatsForUnit(
          world,
          u,
          fixture.jurisdictionId,
        );
      }
      world = {
        ...world,
        publicBudgets: withOpenedBudgets(
          world,
          world.publicBudgets ?? {
            version: PUBLIC_BUDGETS_VERSION,
            governments: [],
            unknown: [],
            cursor: { flows: 0, outcomes: 0 },
            adjustments: [],
          },
          world.currentDate,
        ),
      };
      run(world, actual);
      // A separately labeled real compiled Colorado county context in each World. This is not a territory's actual county or NPC-play claim.
      const reference = countyGovernmentUnitsForPlace(
        smallWorldPlace("US-CO").sourceGeoid!,
      )[0]!.unit;
      world = ensureStateJurisdictionForKey(world, "US-CO");
      world = ensureLocalGovernmentOrganization(world, reference);
      world = ensureCountyCouncilOpening(world, reference.id);
      world = ensureCountyGovernmentSeatsForUnit(
        world,
        reference,
        fixture.jurisdictionId,
      );
      world = {
        ...world,
        publicBudgets: withOpenedBudgets(
          world,
          world.publicBudgets ?? {
            version: PUBLIC_BUDGETS_VERSION,
            governments: [],
            unknown: [],
            cursor: { flows: 0, outcomes: 0 },
            adjustments: [],
          },
          world.currentDate,
        ),
      };
      const units = [...actual, reference];
      world = run(world, units).world;
      const due = world.history.futureDueItems.find(
        (d) =>
          d.transitionKey === native.COUNTY_BUDGET_HEARING_TRANSITION &&
          d.stableKey.includes(reference.id),
      );
      expect(due).toBeDefined();
      for (const item of world.history.futureDueItems)
        if (item.dueAt < due!.dueAt)
          world = cancelFutureDueItem(world, {
            stableKey: item.stableKey + ":rules2-source-clock",
            dueItemId: item.id,
            effectiveAt: world.currentDate,
            reasonKey: "test:county-clock-only",
            context:
              "Labeled county-parent clock control; unrelated events are not NPC activity.",
          });
      world = {
        ...world,
        currentDate: due!.dueAt,
        currentMoment: simulationMomentOnLocalDate(
          world.currentMoment,
          due!.dueAt,
        ),
      };
      const held = run(world, units, due);
      expect(held.requests).toBeGreaterThan(0);
      console.error("county-reference-context", held.context);
      expect(
        held.world.publicBudgets!.countyBudgetHearings?.some(
          (h) => h.unitId === reference.id,
        ),
      ).toBe(true);
      run(held.world, units, due);
    }, 120000);
  },
);
