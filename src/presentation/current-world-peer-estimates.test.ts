import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OpeningStatePopulation } from "../player/OpeningStatePopulation";
import { OpeningStateVoting } from "../player/OpeningStateVoting";
import { EconomicContextPanel } from "../player/EconomicContextPanel";
import { createDemoWorld } from "../simulation/demo";
import { createHousehold } from "../simulation/life";
import {
  createDwelling,
  createHousingTenure,
  createResourceFlow,
  createResourceObligation,
  money,
} from "../simulation/resources";
import { LEXINGTON_ECONOMIC_BINDING } from "./economic-context-bindings";
import { createWorld } from "../simulation/world";
import { makeIsoDate } from "../simulation/dates";
import { STATES } from "../simulation/state-reference";
import { stateJurisdictionForKey } from "../simulation/life-places";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
} from "../simulation/public-budgets/store";
import {
  currentWorldPopulationEstimate,
  currentWorldVotingEstimate,
  currentWorldEstimateCaption,
  currentWorldTwoBedroomRentEstimate,
} from "./current-world-peer-estimates";
import type { World } from "../simulation/types";

const date = makeIsoDate("2026-01-01");
function fixture(key: string): World {
  const place = stateJurisdictionForKey(key)!;
  return createWorld({
    seed: `item16:${key}`,
    currentDate: date,
    jurisdictions: [place],
    people: [],
  });
}
function government(
  world: World,
  key: string,
  population: number,
): PublicBudgetGovernment {
  const jurisdiction = world.jurisdictions[world.jurisdictionOrder[0]!]!;
  return {
    key,
    stateKey: key,
    jurisdictionId: jurisdiction.id,
    lawJurisdictionId: jurisdiction.id,
    level: "state",
    name: jurisdiction.name,
    population,
    fiscalYearStart: "01-01",
    fiscalYearStartBasis: "nasbo",
    budgetCycle: "annual",
    openingNotes: [],
    balance: 0,
    reserve: 0,
    debt: 0,
    interestRate: 0,
    cut: 0,
    pension: { liability: 0, assets: 0, paidShare: 0 },
    years: [],
    months: [],
  };
}

describe("item16 current-game peer estimates", () => {
  it.each(Object.keys(STATES).map((usps) => [`US-${usps}`]))(
    "%s reads the actual saved place figure without changing World",
    (key) => {
      const original = fixture(key);
      const world: World = {
        ...original,
        publicBudgets: {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [government(original, key, 4321)],
          adjustments: [],
          unknown: [],
        },
      };
      const before = JSON.stringify(world);
      const estimate = currentWorldPopulationEstimate(world, key.slice(3))!;
      expect(estimate.mean).toBe(4321);
      expect(estimate.peers[0]!.sourceRecordIds).toEqual([key]);
      expect(estimate.standardDeviation).toBe(0);
      const markup = renderToStaticMarkup(
        createElement(OpeningStatePopulation, {
          world,
          stateUsps: key.slice(3),
          asOf: date,
        }),
      );
      expect(markup).toContain("4,321 people");
      expect(markup).toContain("Estimated from");
      expect(markup).not.toContain("Loading population");
      expect(JSON.stringify(world)).toBe(before);
    },
  );
  it("uses the actual peer mean and spread, which change when the game records change", () => {
    const key = `US-${Object.keys(STATES)[0]!}`;
    const base = fixture(key);
    const peerA = government(base, `US-${Object.keys(STATES)[1]!}`, 100);
    const peerB = government(base, `US-${Object.keys(STATES)[2]!}`, 300);
    const world = {
      ...base,
      publicBudgets: {
        version: PUBLIC_BUDGETS_VERSION,
        cursor: { flows: 0, outcomes: 0 },
        governments: [peerA, peerB],
        adjustments: [],
        unknown: [],
      },
    };
    const estimate = currentWorldPopulationEstimate(world, key.slice(3))!;
    expect(estimate.mean).toBe(200);
    expect(estimate.standardDeviation).toBe(100);
    expect([estimate.minimum, estimate.maximum]).toEqual([100, 300]);
    expect(currentWorldEstimateCaption(estimate)).toContain("Estimated from");
    expect(
      currentWorldPopulationEstimate(
        {
          ...world,
          publicBudgets: {
            ...world.publicBudgets,
            governments: [peerA, { ...peerB, population: 500 }],
          },
        },
        key.slice(3),
      )!.mean,
    ).toBe(300);
  });
  it("uses current saved turnout peers, excludes future and local rows, and retains source references", () => {
    const key = `US-${Object.keys(STATES)[0]!}`;
    const world = fixture(key);
    const row = (placeKey: string, value: number, month = date) => ({
      measure: "voting.turnout-pct",
      placeKey,
      jurisdictionId: world.jurisdictionOrder[0]!,
      month,
      base: value,
      multiplier: 1,
      value,
      causes: [],
    });
    const current: World = {
      ...world,
      placeOutcomes: {
        months: [
          {
            month: date,
            records: [
              row(`US-${Object.keys(STATES)[1]!}`, 40),
              row(`US-${Object.keys(STATES)[2]!}`, 60),
              { ...row("local", 99), stateKey: key },
            ],
          },
          {
            month: makeIsoDate("2027-01-01"),
            records: [row(key, 99, makeIsoDate("2027-01-01"))],
          },
        ],
      },
    };
    const estimate = currentWorldVotingEstimate(current, key.slice(3))!;
    expect(estimate.mean).toBe(50);
    expect(estimate.standardDeviation).toBe(10);
    expect(estimate.peers).toHaveLength(2);
    expect(estimate.peers[0]!.sourceRecordIds[0]).toContain(
      "voting.turnout-pct",
    );
    const markup = renderToStaticMarkup(
      createElement(OpeningStateVoting, {
        world: current,
        stateUsps: key.slice(3),
        asOf: date,
      }),
    );
    expect(markup).toContain("Estimated turnout: about 50%");
    expect(markup).toContain("not a survey of registration");
    expect(markup).not.toContain("Loading voting");
  });
  it("Money displays canonical two-bedroom lease estimates while reference data loads", () => {
    let world = createDemoWorld("item16-rent-read");
    const provenance = {
      kind: "authored" as const,
      note: "Controlled recorded lease fixture.",
    };
    const jurisdictionId = world.jurisdictionOrder[0]!;
    world = createHousehold(world, {
      stableKey: "item16-household",
      formedAt: world.currentDate,
      label: "Recorded lease household",
      provenance,
    });
    const householdId = world.history.households.at(-1)!.id;
    for (const [index, amount] of [100000, 200000].entries()) {
      world = createDwelling(world, {
        stableKey: `item16-home:${index}`,
        establishedAt: world.currentDate,
        jurisdictionId,
        locationLabel: `Lease home ${index}`,
        classification: "residential:apartment",
        provenance,
      });
      const dwellingId = world.history.dwellings.at(-1)!.id;
      world = createHousingTenure(world, {
        stableKey: `item16-tenure:${index}`,
        holder: { kind: "household", householdId },
        dwellingId,
        startedAt: world.currentDate,
        kind: "lease:private",
        context: null,
        provenance,
      });
      const housingTenureId = world.history.housingTenures.at(-1)!.id;
      world = createResourceFlow(world, {
        stableKey: `item16-rent:${index}`,
        source: { kind: "person", personId: world.personOrder[0]! },
        recipient: { kind: "person", personId: world.personOrder[1]! },
        startsAt: world.currentDate,
        initialStatus: "active",
        amount: money(amount, "USD"),
        cadenceKind: "schedule:monthly",
        basisKind: "housing:rent",
        basisReference: { kind: "housing", housingTenureId },
        restrictionKind: null,
        jurisdictionId,
        provenance,
      });
      world = createResourceObligation(world, {
        stableKey: `item16-lease:${index}`,
        resourceFlowId: world.history.resourceFlows.at(-1)!.id,
        establishedAt: world.currentDate,
        basisKind: "housing:lease-2-bedroom-market",
        principal: null,
        careResponsibilityId: null,
        housingTenureId,
        provenance,
      });
    }
    const before = JSON.stringify(world);
    const estimate = currentWorldTwoBedroomRentEstimate(world, jurisdictionId)!;
    expect(estimate.mean).toBe(1500);
    expect(estimate.standardDeviation).toBe(500);
    expect(estimate.peers).toHaveLength(2);
    expect(
      estimate.peers.every((peer) =>
        peer.sourceRecordIds.every((id) =>
          Object.values(world.history).some(
            (rows) => Array.isArray(rows) && rows.some((row) => row.id === id),
          ),
        ),
      ),
    ).toBe(true);
    const markup = renderToStaticMarkup(
      createElement(EconomicContextPanel, {
        world,
        jurisdictionId,
        simulationDate: world.currentDate,
        binding: LEXINGTON_ECONOMIC_BINDING,
      }),
    );
    expect(markup).toContain("1,500 a month");
    expect(markup).toContain("estimated");
    expect(JSON.stringify(world)).toBe(before);
    expect(
      currentWorldTwoBedroomRentEstimate(
        {
          ...world,
          history: {
            ...world.history,
            nextSequence: world.history.resourceObligations[0]!.sequence,
          },
        },
        jurisdictionId,
      ),
    ).toBeNull();
  });
});
