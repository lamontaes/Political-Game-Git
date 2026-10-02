import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import nominationRules from "../../data/research/elections/party-nomination-rules-2026.json" with { type: "json" };
import type { World } from "../simulation/types";
import { createWorld } from "../simulation/world";
import { makeIsoDate } from "../simulation/dates";
import { stateJurisdictionForKey } from "../simulation/life-places";
import {
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
} from "../simulation/public-budgets/store";
import { OpeningStatePopulation } from "./OpeningStatePopulation";
import { OpeningStateVoting } from "./OpeningStateVoting";

const ALL_56 = Object.keys(
  (nominationRules as { places: Record<string, unknown> }).places,
)
  .map((key) => key.replace(/^US-/, ""))
  .sort();
const date = makeIsoDate("2026-01-05");
/** Controlled saved records, not authored production population or turnout. */
function recordedWorld(usps: string, population = 4321): World {
  const place = stateJurisdictionForKey(`US-${usps}`)!;
  const world = createWorld({
    seed: `never-blank:${usps}`,
    currentDate: date,
    jurisdictions: [place],
    people: [],
  });
  const government: PublicBudgetGovernment = {
    key: `US-${usps}`,
    stateKey: `US-${usps}`,
    jurisdictionId: place.id,
    lawJurisdictionId: place.id,
    level: "state",
    name: place.name,
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
  return {
    ...world,
    publicBudgets: {
      version: PUBLIC_BUDGETS_VERSION,
      cursor: { flows: 0, outcomes: 0 },
      governments: [government],
      adjustments: [],
      unknown: [],
    },
    placeOutcomes: {
      months: [
        {
          month: date,
          records: [
            {
              measure: "voting.turnout-pct",
              placeKey: `US-${usps}`,
              jurisdictionId: place.id,
              month: date,
              base: 47,
              multiplier: 1,
              value: 47,
              causes: [],
            },
          ],
        },
      ],
    },
  };
}

describe("the opening's state card uses saved current-game figures on first paint", () => {
  it("covers all 56 jurisdictions", () => {
    expect(ALL_56).toHaveLength(56);
  });
  it("shows an estimated population on the first paint in every jurisdiction", () => {
    for (const usps of ALL_56) {
      const html = renderToStaticMarkup(
        <OpeningStatePopulation
          world={recordedWorld(usps)}
          stateUsps={usps}
          asOf={date}
        />,
      );
      expect(html, usps).not.toContain("Loading");
      expect(html, usps).toContain("Estimated");
      expect(html, usps).toContain("4,321");
      expect(html, usps).toContain("pg-state-population-unit");
    }
  });
  it("shows estimated current-game turnout on the first paint in every jurisdiction", () => {
    for (const usps of ALL_56) {
      const html = renderToStaticMarkup(
        <OpeningStateVoting
          world={recordedWorld(usps)}
          stateUsps={usps}
          asOf={date}
        />,
      );
      expect(html, usps).not.toContain("Loading");
      expect(html, usps).toContain("Estimated turnout");
      expect(html, usps).toContain("47%");
      expect(html, usps).toContain("not a survey of registration");
      expect(html, usps).not.toContain("national average");
    }
  });
  it("changes with the recorded population rather than House seats", () => {
    const usps = ALL_56[0]!;
    for (const population of [2000, 9000]) {
      const html = renderToStaticMarkup(
        <OpeningStatePopulation
          world={recordedWorld(usps, population)}
          stateUsps={usps}
          asOf={date}
        />,
      );
      expect(html).toContain(population.toLocaleString("en-US"));
    }
  });
});
