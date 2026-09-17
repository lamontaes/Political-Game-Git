import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../../presentation/opening-life";
import { createCampaignElectionTransitionRegistry } from "../campaigns";
import { addDays, makeIsoDate } from "../dates";
import { projectPublicInformationDigest } from "../public-information";
import { SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { World } from "../types";
import { advanceWorld, recordWorldEvent } from "../world";
import {
  annualizedQuarterlyGrowthPct,
  drawRegime,
  standardNormal,
  startValuesFromLatents,
  stepMonth,
  twelveMonthChangePct,
  type MacroLatents,
} from "./kernel";
import { CRUNCH46_PROVISIONAL_POLICY, type MacroRegime } from "./policy";
import {
  MACRO_MONTHLY_STEP_KEY,
  ensureMacroEconomyStarted,
  shockFactor,
} from "./producer";
import {
  macroConditionsAt,
  macroMonthHistory,
  macroReleasesAt,
} from "./readers";
import type { MacroStartingConditions } from "./types";

/**
 * Test-only stand-in for WORLD's persisted draw. It uses the section-13
 * arithmetic; production reads WORLD's record and never calls this.
 */
function fixtureStart(
  world: World,
  regime: MacroRegime = "near-reference",
  latents: MacroLatents = { cycle: 0, cost: 0, housing: 0, credit: 0 },
): MacroStartingConditions {
  return {
    contractVersion: "crunch46-macro-start/v1",
    policyVersion: "crunch46-provisional-v1",
    regime,
    volatilityScale: CRUNCH46_PROVISIONAL_POLICY.volatilityScale[regime],
    latents,
    initial: startValuesFromLatents(regime, latents),
    effectiveDate: world.currentDate,
  };
}

function life(seed: string): World {
  return generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      placeKey: "lexington-fayette",
      startAge: 34,
      questionnaire: "skipped" as const,
    }),
  ).game!.world;
}

function started(seed: string, start?: Partial<MacroStartingConditions>) {
  const world = life(seed);
  return ensureMacroEconomyStarted(world, { ...fixtureStart(world), ...start });
}

const registry = createCampaignElectionTransitionRegistry();

function macroOnly(world: World) {
  return JSON.stringify(world.macroEconomy);
}

/** A W3-style shipping-delay development, as living-world writes it. */
function recordShippingDelay(world: World, occurredAt = world.currentDate) {
  return recordWorldEvent(world, {
    stableKey: "test:shipping-delay:reported",
    type: "international.development-reported",
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      "living-world-v1",
      "family:international",
      "matter:test:shipping",
      "stage:reported",
      "importance:major",
      "subject:0",
    ],
    summary:
      "Shipping delays were reported along a busy international trade route.",
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

describe("section 13 kernel arithmetic", () => {
  it("reproduces the authored baseline at zero latents", () => {
    const values = startValuesFromLatents("modest", {
      cycle: 0,
      cost: 0,
      housing: 0,
      credit: 0,
    });
    expect(values).toEqual({
      realGrowthAnnualPct: 2,
      unemploymentPct: 4.6,
      inflation12mPct: 2.7,
      housingSupplyDemandRatio: 1,
      creditTightness: 0.5,
    });
  });

  it("applies the stated startup equations and volatility scales", () => {
    const latents = { cycle: -1, cost: 1, housing: -2, credit: 1 };
    const major = startValuesFromLatents("major", latents);
    expect(major.realGrowthAnnualPct).toBeCloseTo(2 - 2.5, 6);
    const logit = Math.log(0.046 / 0.954) - 0.2 * 2.5 * -1;
    expect(major.unemploymentPct).toBeCloseTo(100 / (1 + Math.exp(-logit)), 5);
    expect(major.inflation12mPct).toBeCloseTo(2.7 + 0.6 * 2.5, 6);
    expect(major.housingSupplyDemandRatio).toBeCloseTo(
      Math.exp(0.06 * 2.5 * -2),
      6,
    );
    expect(major.creditTightness).toBeCloseTo(
      1 / (1 + Math.exp(-0.4 * 2.5)),
      6,
    );
  });

  it("steps one month with the lagged unemployment response", () => {
    const next = stepMonth(
      {
        growthPct: 3,
        unemploymentPct: 5,
        inflationPct: 4,
        realOutputIndex: 100,
        priceIndex: 100,
      },
      { growth: 0.1, unemployment: 0.01, inflation: -0.02 },
      { growthPp: -0.2, laborPp: 0.05, pricePp: 0.1 },
    );
    expect(next.growthPct).toBeCloseTo(2 + 0.85 * 1 + 0.1 - 0.2, 6);
    // Uses previous growth (3), not the new growth.
    expect(next.unemploymentPct).toBeCloseTo(5 - 0.04 * 1 + 0.01 + 0.05, 6);
    expect(next.inflationPct).toBeCloseTo(2 + 0.95 * 2 - 0.02 + 0.1, 6);
    expect(next.realOutputIndex).toBeCloseTo(
      100 * Math.exp(next.growthPct / 1200),
      5,
    );
  });

  it("keeps unemployment inside mathematical bounds in an adverse tail", () => {
    let state = {
      growthPct: -40,
      unemploymentPct: 99.9,
      inflationPct: 30,
      realOutputIndex: 1,
      priceIndex: 1,
    };
    for (let month = 0; month < 24; month += 1) {
      state = stepMonth(
        state,
        { growth: -5, unemployment: 3, inflation: 5 },
        { growthPp: -10, laborPp: 5, pricePp: 5 },
      );
      expect(state.unemploymentPct).toBeLessThanOrEqual(100);
      expect(state.unemploymentPct).toBeGreaterThanOrEqual(0);
      expect(state.realOutputIndex).toBeGreaterThan(0);
      expect(state.priceIndex).toBeGreaterThan(0);
    }
  });

  it("publishes discrete rates from recorded levels, not the model rate", () => {
    expect(annualizedQuarterlyGrowthPct(101, 100)).toBeCloseTo(
      100 * (1.01 ** 4 - 1),
      6,
    );
    expect(twelveMonthChangePct(103, 100)).toBeCloseTo(3, 6);
  });

  it("draws regimes and normals deterministically per stream", () => {
    const draw = (key: string) => {
      const rng = new SeededRng("seed").fork(key);
      return [drawRegime(rng), standardNormal(rng)];
    };
    expect(draw("a")).toEqual(draw("a"));
    const regimes = new Map<string, number>();
    for (let index = 0; index < 4000; index += 1) {
      const regime = drawRegime(new SeededRng("dist").fork(String(index)));
      regimes.set(regime, (regimes.get(regime) ?? 0) + 1);
    }
    expect(regimes.get("near-reference")! / 4000).toBeCloseTo(0.7, 1);
    expect(regimes.get("modest")! / 4000).toBeCloseTo(0.25, 1);
    expect(regimes.get("major")! / 4000).toBeGreaterThan(0.02);
  });
});

describe("CHANGE canonical macro history", { timeout: 1_800_000 }, () => {
  const base = started("change-macro-a");
  // Advancing a whole production life is expensive, so each distinct
  // trajectory is computed once and shared by the assertions below.
  const memo = new Map<string, World>();
  const at = (key: string, make: () => World): World => {
    if (!memo.has(key)) memo.set(key, make());
    return memo.get(key)!;
  };
  const d150 = () => at("150", () => advanceWorld(base, 150, registry));
  const d400 = () => at("400", () => advanceWorld(d150(), 250, registry));
  const oneJump = () => at("jump", () => advanceWorld(base, 400, registry));

  it("writes nothing for a world without WORLD's starting record", () => {
    const world = life("change-macro-old");
    const same = ensureMacroEconomyStarted(world, null);
    expect(same).toBe(world);
    const later = advanceWorld(same, 40, registry);
    expect(later.macroEconomy).toBeUndefined();
    expect(
      later.history.futureDueItems.some(
        (item) => item.transitionKey === MACRO_MONTHLY_STEP_KEY,
      ),
    ).toBe(false);
  });

  it("records each crossed month exactly once, with releases published to News", () => {
    const later = d150();
    const months = macroMonthHistory(later, "national", later.currentDate);
    expect(months.length).toBe(
      new Set(months.map((month) => month.periodStart)).size,
    );
    expect(months.length).toBeGreaterThanOrEqual(4);
    const releases = macroReleasesAt(
      later,
      later.currentDate,
      "unemployment-rate",
    );
    expect(releases.length).toBe(months.length);
    const digest = projectPublicInformationDigest(later);
    for (const release of releases) {
      const month = months.find((m) => m.key === release.sourceMonthKeys[0])!;
      expect(release.value).toBe(month.unemploymentPct);
      expect(
        digest.items.some((item) => item.sourceEventId === release.eventId),
      ).toBe(true);
    }
    // No inflation release without twelve months of comparable history.
    expect(
      macroReleasesAt(later, later.currentDate, "consumer-price-inflation-12m"),
    ).toEqual([]);
  });

  it("replays exactly and is independent of how time was chunked, across Save/Continue", () => {
    const reopened = deserializeWorld(serializeWorld(d150()));
    expect(macroOnly(reopened)).toBe(macroOnly(d150()));
    const continued = advanceWorld(reopened, 250, registry);
    expect(macroOnly(continued)).toBe(macroOnly(oneJump()));
    expect(macroOnly(d400())).toBe(macroOnly(oneJump()));
  });

  it("publishes 12-month inflation and quarterly output once history exists", () => {
    const later = d400();
    const inflation = macroReleasesAt(
      later,
      later.currentDate,
      "consumer-price-inflation-12m",
    );
    expect(inflation.length).toBeGreaterThan(0);
    const first = inflation[0]!;
    const months = later.macroEconomy!.months;
    const [then, now] = first.sourceMonthKeys.map((key) =>
      months.find((month) => month.key === key)!,
    );
    expect(first.value).toBe(
      twelveMonthChangePct(now!.priceIndex, then!.priceIndex),
    );
    const output = macroReleasesAt(
      later,
      later.currentDate,
      "real-output-growth-annualized-quarterly",
    );
    expect(output.length).toBeGreaterThan(0);
    for (const release of output)
      expect(release.sourceMonthKeys).toHaveLength(6);
  });

  it("reading history never changes it", () => {
    const later = d150();
    const before = JSON.stringify(later);
    macroReleasesAt(later, later.currentDate);
    macroConditionsAt(later, "national", later.currentDate);
    macroConditionsAt(later, "national", addDays(later.currentDate, -40));
    macroMonthHistory(later, "jurisdiction:none", later.currentDate);
    expect(JSON.stringify(later)).toBe(before);
    // Reads between advances (d150 was read above) do not alter d400.
    expect(macroOnly(d400())).toBe(macroOnly(oneJump()));
  });

  it("an adequate-housing start never reads as a shortage", () => {
    for (const month of d400().macroEconomy!.months) {
      expect(month.housing?.classification).toBe("adequate");
    }
    const world = life("change-macro-a");
    const tight = ensureMacroEconomyStarted(world, {
      ...fixtureStart(world, "major", {
        cycle: 0,
        cost: 0,
        housing: -2,
        credit: 0,
      }),
    });
    const tightLater = advanceWorld(tight, 40, registry);
    expect(tightLater.macroEconomy!.months[0]!.housing?.classification).toBe(
      "shortage",
    );
  });

  it("an identical start diverges only when a canonical shock exists", () => {
    const shocked = recordShippingDelay(base);
    const plain = d150();
    const withShock = advanceWorld(shocked, 150, registry);
    const plainMonths = plain.macroEconomy!.months;
    const shockMonths = withShock.macroEconomy!.months;
    expect(shockMonths.map((m) => m.innovations)).toEqual(
      plainMonths.map((m) => m.innovations),
    );
    // The seed's own W3 matters may already carry a shipping delay; every
    // such organic shock must come from that canonical W3 origin.
    for (const organic of plain.macroEconomy!.shocks) {
      const origin = plain.history.events.find(
        (event) => event.id === organic.originEventId,
      )!;
      expect(origin.type).toBe("international.development-reported");
      expect(origin.tags).toContain("subject:0");
    }
    const injectedId = shocked.history.events.at(-1)!.id;
    expect(withShock.macroEconomy!.shocks).toHaveLength(
      plain.macroEconomy!.shocks.length + 1,
    );
    const shock = withShock.macroEconomy!.shocks.find(
      (candidate) => candidate.originEventId === injectedId,
    )!;
    expect(shock.kind).toBe("trade-disruption");
    const growthGap = shockMonths[0]!.growthPct - plainMonths[0]!.growthPct;
    expect(growthGap).toBeCloseTo(
      shock.signedMagnitude.growthPp * shock.intensity,
      5,
    );
    expect(shockMonths[0]!.inflationPct).toBeGreaterThan(
      plainMonths[0]!.inflationPct,
    );
    // Unemployment moves in the shock month by the labor impulse only; the
    // growth gap reaches it a month later through the lag.
    expect(
      shockMonths[0]!.unemploymentPct - plainMonths[0]!.unemploymentPct,
    ).toBeCloseTo(shock.signedMagnitude.laborPp * shock.intensity, 5);
    // Taken in exactly once and still acting while unresolved.
    const dedupe = withShock.macroEconomy!.shocks.map((s) => s.dedupeKey);
    expect(new Set(dedupe).size).toBe(dedupe.length);
    expect(shockMonths.at(-1)!.shockKeys).toContain(shock.key);
    expect(macroOnly(withShock)).not.toBe(macroOnly(plain));
  });

  it("recovers gradually after the origin ends, with no fixed timer", () => {
    const shock = {
      key: "k",
      beginsAt: makeIsoDate("2026-01-10"),
      intensity: 1,
      persistence: { kind: "until-origin-ends", monthlyRetention: 0.75 },
    } as never;
    expect(shockFactor(shock, null, "2026-06")).toBe(1);
    expect(shockFactor(shock, makeIsoDate("2026-03-05"), "2026-03")).toBe(1);
    expect(
      shockFactor(shock, makeIsoDate("2026-03-05"), "2026-04"),
    ).toBeCloseTo(0.75, 6);
    expect(
      shockFactor(shock, makeIsoDate("2026-03-05"), "2026-05"),
    ).toBeCloseTo(0.5625, 6);
    expect(shockFactor(shock, makeIsoDate("2026-03-05"), "2028-03")).toBe(0);
    expect(shockFactor(shock, null, "2025-12")).toBe(0);
  });

  it("rejects a tampered history on load", () => {
    const later = d150();
    const tampered = {
      ...later,
      macroEconomy: {
        ...later.macroEconomy!,
        months: later.macroEconomy!.months.map((month, index) =>
          index === 0 ? { ...month, unemploymentPct: -1 } : month,
        ),
      },
    };
    expect(() => deserializeWorld(serializeWorld(tampered))).toThrow();
  });
});
