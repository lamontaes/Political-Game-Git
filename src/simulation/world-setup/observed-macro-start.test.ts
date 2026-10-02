import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { advanceWorld } from "../world";
import { serializeWorld, deserializeWorld } from "../serialization";
import {
  ensureMacroEconomyStarted,
  macroStartForHistory,
  MACRO_MONTHLY_STEP_KEY,
} from "../macro-economy/producer";
import { assertMacroEconomyIntegrity } from "../macro-economy/store";
import { CRUNCH46_WORLD_OPENING_VERSION } from "./types";
import {
  ensureWorldStartingConditions,
  macroStartingConditions,
} from "./conditions";
import { observedMacroStartingDraft } from "./observed-macro-start";

const seed = "a122-observed-macro-controls";
const place = drawRandomPlace(seed);
const registry = createCampaignElectionTransitionRegistry();
function start() {
  const base = smallWorld({ place: place.key, seed }).world;
  const world = ensureWorldStartingConditions(base, {
    openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
  });
  return ensureMacroEconomyStarted(
    world,
    macroStartForHistory(macroStartingConditions(world)),
  );
}

describe(`observed macro source join: ${place.displayName}`, () => {
  it("records real source units, estimates and provenance without invented draw metadata", () => {
    const world = start();
    const saved = macroStartingConditions(world)!;
    expect(saved.contractVersion).toBe("observed-macro-start/v2");
    expect(saved.regime).toBeNull();
    expect(saved.latents).toBeNull();
    expect(saved.volatilityScale).toBeNull();
    expect(saved.initial.unemploymentPct).toBe(4.2);
    expect(saved.initial.realGrowthAnnualPct).toBeCloseTo(
      100 * Math.log(1.022),
      6,
    );
    expect(saved.initial.inflation12mPct).toBeCloseTo(100 * Math.log(1.034), 6);
    expect(saved.initialHousingCounts).toEqual({
      supplyUnits: 149454000,
      demandHouseholds: 133811000,
    });
    expect(saved.initial.housingSupplyDemandRatio).toBeCloseTo(
      149454000 / 133811000,
      6,
    );
    expect(
      saved.reference?.observations.find(
        (row) => row.field === "creditConditionsIndex",
      )?.value,
    ).toBe(-0.548);
    expect(saved.initialPolicyRate).toEqual({ lowerPct: 3.75, upperPct: 4 });
    expect(saved.reference?.asOfDate).toBe("2026-10-02");
    expect(saved.reference?.basis).toBe("estimated-from-observed-reference");
    expect(world.currentDate).toBe("2026-01-05");
    expect(world.macroEconomy!.releases).toEqual([]);
    expect(
      world.history.futureDueItems.filter(
        (row) => row.transitionKey === MACRO_MONTHLY_STEP_KEY,
      ),
    ).toHaveLength(1);
    expect(
      ensureWorldStartingConditions(world, {
        openingVersion: CRUNCH46_WORLD_OPENING_VERSION,
      }),
    ).toBe(world);
    expect(ensureMacroEconomyStarted(world, macroStartForHistory(saved))).toBe(
      world,
    );
    const loaded = deserializeWorld(serializeWorld(world));
    expect(macroStartingConditions(loaded)).toEqual(saved);
    expect(loaded.macroEconomy).toEqual(world.macroEconomy);
  });

  it("uses the existing handler for two real months, preserves housing counts and reloads", () => {
    const world = start();
    const later = advanceWorld(world, 62, registry);
    const months = later.macroEconomy!.months.filter(
      (row) => row.scope === "national",
    );
    expect(months).toHaveLength(2);
    expect(new Set(months.map((row) => row.key)).size).toBe(2);
    for (const month of months) {
      expect(Number.isFinite(month.unemploymentPct)).toBe(true);
      expect(Number.isFinite(month.growthPct)).toBe(true);
      expect(Number.isFinite(month.inflationPct)).toBe(true);
      expect(month.housing?.supplyUnits).toBe(149454000);
      expect(month.housing?.demandHouseholds).toBe(133811000);
      expect(month.policyRate.basis).toMatch(
        /retained-reference|modeled-decision/,
      );
    }
    expect(deserializeWorld(serializeWorld(later)).macroEconomy).toEqual(
      later.macroEconomy,
    );
  }, 120000);

  it("rejects an observed start that lost its source evidence", () => {
    const world = start();
    expect(() =>
      assertMacroEconomyIntegrity({
        ...world,
        macroEconomy: {
          ...world.macroEconomy!,
          start: { ...world.macroEconomy!.start, reference: undefined },
        },
      }),
    ).toThrow(/unsupported shape/);
    const draft = observedMacroStartingDraft();
    expect(draft.initial.creditTightness).toBeGreaterThan(0);
    expect(draft.initial.creditTightness).toBeLessThan(1);
  });
});
