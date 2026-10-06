import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { drawRandomPlace } from "../../../tests/support/random-place";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { recordCausalProcess } from "../causal-effects";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  createFutureTransitionHandlerRegistry,
  resolveFutureDueItemsThrough,
} from "../future-transitions";
import type { World } from "../types";
import { recordWorldEvent, worldLineage } from "../world";
import { CENTRAL_BANK_RATE_EVENT } from "./central-bank";
import type { MacroGrowthDrivers } from "./credit";
import {
  RECESSION_BEGAN_EVENT,
  RECESSION_ENDED_EVENT,
  recordBusinessCycle,
} from "./cycle";
import { startValuesFromLatents } from "./kernel";
import { CRUNCH46_PROVISIONAL_POLICY } from "./policy";
import {
  createMacroMonthlyStepHandler,
  ensureMacroEconomyStarted,
  MACRO_MONTHLY_STEP_KEY,
} from "./producer";
import { monthKeyOf, nextMonthKey } from "./store";

const SEED = "a129-cycle-event-provenance";

/** Fixture-only growth readings; these are not new production coefficients. */
const falling: MacroGrowthDrivers = {
  trendPct: 2.4,
  carriedPp: -0.2,
  creditPp: -0.3,
  ratePp: -0.15,
  demandPp: -0.02,
  shocksPp: 0,
  chancePp: 0.05,
};
const rising: MacroGrowthDrivers = {
  ...falling,
  creditPp: 0.1,
  ratePp: 0.1,
  demandPp: 0.05,
};

function started(): World {
  const world = smallWorld({ place: "2146027", seed: SEED }).world;
  const latents = { cycle: 0, cost: 0, housing: 0, credit: 0 };
  return ensureMacroEconomyStarted(world, {
    contractVersion: "crunch46-macro-start/v1",
    policyVersion: "crunch46-provisional-v1",
    regime: "near-reference",
    volatilityScale:
      CRUNCH46_PROVISIONAL_POLICY.volatilityScale["near-reference"],
    latents,
    initial: startValuesFromLatents("near-reference", latents),
    effectiveDate: world.currentDate,
  });
}

/**
 * Invoke only the existing monthly producer, not the ordinary-day simulation.
 * Its genuine period keys, credit, releases and board records stay intact.
 */
function sixRecordedMonths(incoming: World): World {
  const registry = createFutureTransitionHandlerRegistry([
    [MACRO_MONTHLY_STEP_KEY, createMacroMonthlyStepHandler()],
  ]);
  let world = incoming;
  let month = monthKeyOf(world.macroEconomy!.start.effectiveDate);
  for (let i = 0; i < 6; i += 1) {
    const due = world.history.futureDueItems.find(
      (item) =>
        item.transitionKey === MACRO_MONTHLY_STEP_KEY &&
        item.stableKey.endsWith(`:${month}`),
    )!;
    expect(due).toBeDefined();
    world = resolveFutureDueItemsThrough(world, due.dueAt, registry);
    month = nextMonthKey(month);
  }
  return world;
}

function withLastMonths(
  base: World,
  rows: readonly { growthPct: number; drivers: MacroGrowthDrivers }[],
): World {
  const store = base.macroEconomy!;
  const national = store.months
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => month.scope === "national")
    .slice(-rows.length);
  expect(national).toHaveLength(rows.length);
  const months = [...store.months];
  for (const [i, { month, index }] of national.entries())
    months[index] = { ...month, ...rows[i]! };
  return { ...base, macroEconomy: { ...store, months } };
}

const lastKey = (world: World) =>
  monthKeyOf(world.macroEconomy!.months.at(-1)!.periodStart);
function shrinking(world: World): World {
  const fixture = withLastMonths(
    world,
    Array.from({ length: 6 }, () => ({ growthPct: -1.2, drivers: falling })),
  );
  // Controlled observer starting phase; normal opening draws may be recessions.
  return {
    ...fixture,
    macroEconomy: {
      ...fixture.macroEconomy!,
      cycle: {
        phase: "expansion",
        sinceMonth: monthKeyOf(fixture.macroEconomy!.months[0]!.periodStart),
        eventId: null,
      },
    },
  };
}

describe("business cycle canonical event provenance", () => {
  it("names the causes, retains cycle identity and records no causal receipt", () => {
    const base = shrinking(sixRecordedMonths(started()));
    // A legacy receipt already present in a save must remain readable.
    const source = base.history.events.at(-1)!.id;
    const before = recordCausalProcess(base, {
      stableKey: `${SEED}:fixture-legacy-cycle-receipt`,
      kind: "economy:recession-onset",
      effectiveAt: base.currentDate,
      recordedAt: base.currentDate,
      sourceEntityIds: [source],
      parentCausalIds: [],
      provenance: { kind: "simulated", sourceEntityIds: [source] },
    });
    const recorded = recordBusinessCycle(before, lastKey(before));
    const onset = recorded.history.events.at(-1)!;
    expect(onset.type).toBe(RECESSION_BEGAN_EVENT);
    expect(onset.tags).toContain("cause:credit");
    expect(onset.tags).toContain("cause:policy-rate");
    expect(onset.tags).not.toContain("cause:lost-jobs");
    expect(onset.tags).not.toContain("cause:chance");
    expect(onset.summary).toMatch(/New lending fell behind/);
    expect(onset.summary).toMatch(/policy rate held spending back/);
    expect(recorded.history.causalProcesses).toBe(
      before.history.causalProcesses,
    );
    expect(recorded.history.effectActivations).toBe(
      before.history.effectActivations,
    );
    expect(recorded.macroEconomy!.months).toBe(before.macroEconomy!.months);
    expect(recorded.macroEconomy!.cycle).toMatchObject({
      phase: "recession",
      eventId: onset.id,
    });
    expect(recordBusinessCycle(recorded, lastKey(recorded))).toBe(recorded);
    const loaded = deserializeWorld(serializeWorld(recorded));
    expect(loaded.history.causalProcesses).toEqual(
      before.history.causalProcesses,
    );
    expect(loaded.history.effectActivations).toEqual(
      before.history.effectActivations,
    );
    expect(loaded.macroEconomy!.cycle).toEqual(recorded.macroEconomy!.cycle);
    expect(recordBusinessCycle(loaded, lastKey(loaded))).toBe(loaded);

    const recovered = withLastMonths(
      recorded,
      Array.from({ length: 3 }, () => ({ growthPct: 1.5, drivers: rising })),
    );
    const ended = recordBusinessCycle(recovered, lastKey(recovered));
    const end = ended.history.events.at(-1)!;
    expect(end.type).toBe(RECESSION_ENDED_EVENT);
    expect(end.tags).toContain(`cause-event:${onset.id}`);
    expect(end.summary).toMatch(/Unemployment peaked at/);
    expect(ended.macroEconomy!.cycle!.phase).toBe("expansion");
    expect(ended.history.causalProcesses).toBe(before.history.causalProcesses);
    expect(ended.history.effectActivations).toBe(
      before.history.effectActivations,
    );
    expect(recordBusinessCycle(ended, lastKey(ended))).toBe(ended);
  });

  it("records nothing while output keeps growing", () => {
    const growing = withLastMonths(
      sixRecordedMonths(started()),
      Array.from({ length: 6 }, () => ({ growthPct: 2, drivers: rising })),
    );
    expect(recordBusinessCycle(growing, lastKey(growing))).toBe(growing);
  });

  it("cites existing rate decisions, shock origins and failures directly", () => {
    // A fixture-only canonical event, consumed by the real W3 origin reader.
    const base = started();
    const origin = recordWorldEvent(base, {
      stableKey: `${SEED}:fixture-trade-origin`,
      type: "international.development-reported",
      occurredAt: base.currentDate,
      recordedAt: base.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [base.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["subject:0", `matter:${SEED}:fixture-trade`, "importance:major"],
      summary: "Fixture-only trade disruption for provenance selection.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    let world = sixRecordedMonths(origin);
    const shock = world.macroEconomy!.shocks.find(
      (row) => row.originEventId === origin.history.events.at(-1)!.id,
    )!;
    expect(shock).toBeDefined();
    expect(shock.signedMagnitude.growthPp).toBeLessThan(0);
    // An authored canonical source record tests provenance selection, not a
    // forecast of what a real central bank would choose.
    world = recordWorldEvent(world, {
      stableKey: `${SEED}:fixture-rate-decision`,
      type: CENTRAL_BANK_RATE_EVENT,
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [world.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        "rate-change:1",
        `month:${monthKeyOf(world.currentDate)}`,
        "fixture-only",
      ],
      summary: "Fixture-only recorded rate increase for source selection.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const rate = world.history.events.at(-1)!;
    expect(rate.type).toBe(CENTRAL_BANK_RATE_EVENT);
    expect(
      Number(
        rate.tags.find((tag) => tag.startsWith("rate-change:"))!.slice(12),
      ),
    ).toBeGreaterThan(0);
    world = recordWorldEvent(world, {
      stableKey: `${SEED}:fixture-bank-failure`,
      type: "economy.bank-failed",
      occurredAt: world.currentDate,
      recordedAt: world.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [world.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: ["fixture-only"],
      summary: "Fixture-only bank failure for provenance selection.",
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const failure = world.history.events.at(-1)!;
    const before = shrinking(world);
    const recorded = recordBusinessCycle(before, lastKey(before));
    const onset = recorded.history.events.at(-1)!;
    for (const eventId of [rate.id, shock.originEventId, failure.id])
      expect(onset.tags).toContain(`cause-event:${eventId}`);
    for (const tag of onset.tags.filter((tag) =>
      tag.startsWith("cause-event:"),
    ))
      expect(
        before.history.events.some((event) => event.id === tag.slice(12)),
      ).toBe(true);
    expect(recorded.history.causalProcesses).toBe(
      before.history.causalProcesses,
    );
    expect(recorded.history.effectActivations).toBe(
      before.history.effectActivations,
    );
    const loaded = deserializeWorld(serializeWorld(recorded));
    expect(
      loaded.history.events.find((event) => event.id === onset.id),
    ).toEqual(onset);
    expect(loaded.macroEconomy!.cycle).toEqual(recorded.macroEconomy!.cycle);
    expect(recordBusinessCycle(loaded, lastKey(loaded))).toBe(loaded);
  });

  it(
    "preserves the observer record through a normal random-place game's save/load",
    { timeout: 120_000 },
    () => {
      const seed = `${SEED}:normal-game`;
      const place = drawRandomPlace(seed);
      const game = generateOpeningLife(
        prepareOpeningLife({
          ...DEFAULT_NEW_GAME_SETUP,
          seed,
          placeKey: place.key,
          startAge: 34,
          questionnaire: "skipped",
        }),
      ).game!;
      expect(worldLineage(game.world)).toBe("production");
      expect(game.world.macroEconomy).toBeDefined();
      const before = serializeWorld(game.world);
      expect(
        recordBusinessCycle(game.world, monthKeyOf(game.world.currentDate)),
      ).toBe(game.world);
      const loaded = deserializeWorld(before);
      expect(serializeWorld(loaded)).toBe(before);
      expect(loaded.history.causalProcesses).toEqual(
        game.world.history.causalProcesses,
      );
      expect(loaded.history.effectActivations).toEqual(
        game.world.history.effectActivations,
      );
    },
  );
});
