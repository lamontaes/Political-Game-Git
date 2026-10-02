import { describe, expect, it } from "vitest";
import tuitionRevenue from "../../../data/research/money/state-tuition-revenue.json" with { type: "json" };
import { makeIsoDate } from "../dates";
import { stateJurisdictionForKey } from "../life-places";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { assertWorldIntegrity } from "../world";
import type { EntityId, World } from "../types";
import {
  BUDGET_PROGRAMS,
  BUDGET_SOURCES,
  PUBLIC_BUDGETS_VERSION,
  publicBudgetFor,
  withOpenedBudgets,
  type PublicBudgetStore,
} from ".";
import { firstOfNextMonth } from "./fiscal";
import { settleGovernmentMonth, taxLawFactor, type MonthFlows } from "./month";
import {
  TUITION_FREEZE_QUESTION,
  TUITION_GROWTH_PER_YEAR,
  tuitionShareOfCharges,
  tuitionFreezeFactor,
} from "./tuition-freeze";

/* Saved tuition policy alone cannot determine every state fee receipt. */

const FREEZE = "proposition_tuition_freeze" as EntityId;

interface Law {
  readonly answer: "yes" | "no";
  readonly effectiveAt: string;
}

function worldWith(
  stateKey: string,
  laws: readonly Law[],
  seed?: string,
): World {
  const jurisdictionId = stateJurisdictionForKey(stateKey)!.id;
  return {
    id: "world_test" as EntityId,
    seed,
    currentDate: makeIsoDate("2026-01-05"),
    jurisdictions: {},
    jurisdictionOrder: [],
    policyCatalog: {
      propositions: {
        [FREEZE]: { id: FREEZE, stableKey: TUITION_FREEZE_QUESTION },
      },
    },
    history: {
      events: [],
      organizations: [],
      resourceFlows: [],
      resourceTransferOutcomes: [],
      futureDueItems: [],
      legislativeMeasures: laws.map((law, at) => ({
        id: `measure_${at}` as EntityId,
        jurisdictionId,
        propositionIds: [FREEZE],
        propositionAnswers: [{ propositionId: FREEZE, answer: law.answer }],
      })),
      legislativeEnactments: laws.map((law, at) => ({
        id: `enactment_${at}` as EntityId,
        sequence: 1000 + at,
        measureId: `measure_${at}` as EntityId,
        resolvedAt: makeIsoDate(law.effectiveAt),
        outcome: "enacted",
        effectiveAt: makeIsoDate(law.effectiveAt),
      })),
    },
  } as unknown as World;
}

const NO_FLOWS: MonthFlows = {
  withheld: new Map(),
  represented: new Map(),
  levies: new Map(),
  payments: new Map(),
};

function settled(world: World, stateKey: string, last: string) {
  const store: PublicBudgetStore = {
    version: PUBLIC_BUDGETS_VERSION,
    cursor: { flows: 0, outcomes: 0 },
    governments: [],
    adjustments: [],
    unknown: [],
  };
  const opened = {
    ...world,
    publicBudgets: withOpenedBudgets(world, store, world.currentDate),
  };
  let current = publicBudgetFor(opened, stateJurisdictionForKey(stateKey)!.id)!;
  let month = makeIsoDate("2026-01-01");
  while (month <= last) {
    current = settleGovernmentMonth(world, current, month, NO_FLOWS).government;
    month = firstOfNextMonth(month);
  }
  return current;
}

const STATE_KEYS = Object.keys(tuitionRevenue.places);
const samples = Array.from({ length: 5 }, (_, index) => {
  const seed = `overflow5-a21-recorded-tuition-all56:${index}`;
  return { seed, place: drawRandomPlace(seed) };
});

describe("tuition freeze aggregate compatibility while the school route is completed", () => {
  it("opens an ordinary new game in an unfiltered random place", () => {
    const seed = "overflow5-a21-ordinary-opening-all56";
    const place = drawRandomPlace(seed);
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
      }),
    ).game;
    expect(game).not.toBeNull();
    if (!game) throw new Error("Ordinary opening did not produce a game");
    assertWorldIntegrity(game.world);
    expect(game.world.control).toEqual({
      kind: "person",
      personId: game.playerPersonId,
    });
    process.stdout.write(
      `A21 ordinary opening place=${place.displayName} key=${place.key} head=38c6b6385 seed=${seed}\n`,
    );
  });
  it("preserves researched aggregate coverage without treating it as a school charge", () => {
    expect(STATE_KEYS).toHaveLength(50);
    expect(TUITION_GROWTH_PER_YEAR).toBe(0.031);
    for (const key of STATE_KEYS) {
      expect(tuitionShareOfCharges(key), key).toBeGreaterThan(0.1);
      expect(tuitionShareOfCharges(key), key).toBeLessThan(0.9);
    }
    for (const key of ["US-DC", "US-PR", "US-GU", "US-VI", "US-AS", "US-MP"])
      expect(tuitionShareOfCharges(key), key).toBeNull();
  });
  it.each(samples)(
    "retains main's tuition factor without inventing cash receipts in $place.displayName ($seed)",
    ({ seed, place }) => {
      const stateKey = place.stateJurisdictionKey;
      if (!stateKey)
        throw new Error("Sampled place has no saved state jurisdiction.");
      const frozen = settled(
        worldWith(
          stateKey,
          [{ answer: "yes", effectiveAt: "2026-03-01" }],
          seed,
        ),
        stateKey,
        "2027-09-01",
      );
      const baseline = settled(
        worldWith(stateKey, [], seed),
        stateKey,
        "2027-09-01",
      );
      const frozenWorld = worldWith(
        stateKey,
        [{ answer: "yes", effectiveAt: "2026-03-01" }],
        seed,
      );
      const baselineWorld = worldWith(stateKey, [], seed);
      for (const month of [
        "2026-06-01",
        "2026-07-01",
        "2027-07-01",
        "2027-08-01",
      ]) {
        for (const source of BUDGET_SOURCES.filter(
          (source) => source !== "chargesAndFees",
        ))
          expect(
            taxLawFactor(frozenWorld, frozen, source, makeIsoDate(month)),
            `${place.displayName} ${month} ${source}`,
          ).toBe(
            taxLawFactor(baselineWorld, baseline, source, makeIsoDate(month)),
          );
        expect(
          taxLawFactor(
            frozenWorld,
            frozen,
            "chargesAndFees",
            makeIsoDate(month),
          ),
        ).toBe(tuitionFreezeFactor(frozenWorld, frozen, makeIsoDate(month)));
      }
      // These sparse fixtures have no recorded cash: settlement must not invent receipts.
      expect(frozen.months).toEqual([]);
      expect(baseline.months).toEqual([]);
      expect(frozen.years.map((year) => year.expectedRevenue)).toEqual(
        baseline.years.map((year) => year.expectedRevenue),
      );
      expect(BUDGET_PROGRAMS).toContain("higherEducation");
    },
  );
  it.todo(
    "limits an actual public college resident tuition charge using its recorded revision, baseline and applicable law date",
  );
});
