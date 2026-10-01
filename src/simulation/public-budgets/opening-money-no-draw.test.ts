import { describe, expect, it } from "vitest";
import { makeIsoDate } from "../dates";
import { lifePlaceByKey, stateJurisdictionForKey } from "../life-places";
import { STATES } from "../state-reference";
import { createWorld } from "../world";
import { deserializeWorld, serializeWorld } from "../serialization";
import bases from "../../../data/research/money/public-budget-bases.json" with { type: "json" };
import {
  budgetCandidates,
  openGovernmentBudget,
  type BudgetCandidate,
} from "./opening";
import { BUDGET_CALIBRATION } from "./opening";
import { withOpenedBudgets } from "./index";
import {
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  type PublicBudgetGovernment,
} from "./store";

const date = makeIsoDate("2026-01-05");
const stateKeys = Object.keys(STATES).map((key) => `US-${key}`);
const localPlaces = ["0904790", "1004130", "7258365", "2146027"].map((key) =>
  lifePlaceByKey(key)!,
);
const jurisdictions = [
  ...stateKeys.map((key) => stateJurisdictionForKey(key)!),
  ...localPlaces.map((place) => place.context.jurisdiction),
];
const worlds = ["opening-amount-a", "opening-amount-b", "opening-amount-c"].map(
  (seed) =>
    createWorld({
      seed,
      currentDate: date,
      jurisdictions,
      people: [],
      lineage: "production",
    }),
);
const candidates = budgetCandidates(worlds[0]!).candidates;

function open(
  candidate: BudgetCandidate,
  index: number,
): PublicBudgetGovernment {
  const government = openGovernmentBudget(worlds[index]!, candidate, date);
  if (typeof government === "string")
    throw new Error(`${candidate.key}: ${government}`);
  return government;
}

describe("X3 opening budget amounts use recorded inputs without a money draw", () => {
  it.each(stateKeys)(
    "keeps the sourced or averaged %s opening identical across seeds",
    (key) => {
      const candidate = candidates.find((row) => row.key === key)!;
      const reference = open(candidate, 0);
      expect(open(candidate, 1)).toEqual(reference);
      expect(open(candidate, 2)).toEqual(reference);
      expect(reference.years[0]!.expectedRevenue.length).toBe(
        BUDGET_SOURCES.length,
      );
    },
  );

  it("keeps actual compiled city, county and town estimates identical across seeds", () => {
    const local = candidates.filter((row) => row.level !== "state");
    expect(local.some((row) => row.level === "city")).toBe(true);
    expect(local.some((row) => row.level === "county")).toBe(true);
    expect(local.some((row) => row.key.startsWith("town:"))).toBe(true);
    for (const candidate of local) {
      const reference = open(candidate, 0);
      expect(open(candidate, 1), candidate.key).toEqual(reference);
      expect(open(candidate, 2), candidate.key).toEqual(reference);
    }
  });

  it("preserves each read state revenue formula and whole-dollar rounding", () => {
    for (const [key, base] of Object.entries(bases.places)) {
      if (!("state" in base) || !base.state || !base.population2024) continue;
      const candidate = candidates.find((row) => row.key === key)!;
      const government = open(candidate, 0);
      // DC's existing opener uses its local-government finance column.
      const column = key === "US-DC" ? base.local : base.state;
      if (!column) throw new Error(`No read finance column for ${key}`);
      const revenue: Readonly<Record<string, number>> = column.revenue;
      expect(government.years[0]!.expectedRevenue, key).toEqual(
        BUDGET_SOURCES.map((source) =>
          Math.round(
            (revenue[source] ?? 0) * base.population2024! * BUDGET_CALIBRATION,
          ),
        ),
      );
    }
  });

  it("reopens and repeats the same calculator without creating financial records", () => {
    const base = worlds[0]!;
    const original = {
      ...base,
      publicBudgets: withOpenedBudgets(
        base,
        {
          version: PUBLIC_BUDGETS_VERSION,
          cursor: { flows: 0, outcomes: 0 },
          governments: [],
          adjustments: [],
          unknown: [],
        },
        date,
      ),
    };
    const reloaded = deserializeWorld(serializeWorld(original));
    expect(reloaded.publicBudgets?.governments).toHaveLength(candidates.length);
    for (const candidate of candidates) {
      expect(
        openGovernmentBudget(reloaded, candidate, date),
        candidate.key,
      ).toEqual(open(candidate, 0));
    }
    expect(serializeWorld(original)).toBe(serializeWorld(reloaded));
    expect(
      serializeWorld({
        ...reloaded,
        publicBudgets: withOpenedBudgets(
          reloaded,
          reloaded.publicBudgets!,
          date,
        ),
      }),
    ).toBe(serializeWorld(original));
    expect(original.history.resourceTransferOutcomes).toHaveLength(0);
    expect(original.history.resourceFlows).toHaveLength(0);
  });
});
