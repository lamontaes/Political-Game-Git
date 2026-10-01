import { describe, expect, it } from "vitest";
import { DEFAULT_NEW_GAME_SETUP } from "../../presentation/new-game";
import type { NewGameSetup } from "../../presentation/new-game";
import { macroStartingConditions } from "../world-setup/conditions";
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
  START_ERA,
  standardNormal,
  startValuesFromLatents,
  stepLocalMonth,
  stepMonth,
  twelveMonthChangePct,
  NO_IMPULSES,
  type MacroImpulses,
  type MacroLatents,
  type MacroMonthlyState,
} from "./kernel";
import {
  CHANGE_AUTHORED_IMPULSES,
  CRUNCH46_PROVISIONAL_POLICY,
  UNRESEARCHED_UNEMPLOYMENT_RECOVERY,
  type MacroRegime,
  type MacroShockKind,
} from "./policy";
import {
  MACRO_MONTHLY_STEP_KEY,
  ensureMacroEconomyStarted,
  shockFactor,
} from "./producer";
import {
  macroConditionsAt,
  macroMonthHistory,
  macroReleasesAt,
  publicConcernsAt,
} from "./readers";
import type { MacroStartingConditions } from "./types";
import {
  CENTRAL_BANK_PROFILE,
  RESERVE_BANKS,
  votingReserveBanks,
} from "./central-bank";
import { stepNationalConditions } from "./conditions";
import {
  MACRO_CREDIT_POLICY,
  startCreditState,
  type MacroGrowthDrivers,
} from "./credit";
import {
  rankRateOptionsWithoutWorld,
  rateConsiderations,
  rateMoveOf,
  type RateReadings,
  type RateSetterView,
} from "./rate-choice";

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

/**
 * A legacy-descriptor life: WORLD writes no starting record, so CHANGE starts
 * nothing on its own and the tests below can supply controlled starts.
 */
function life(seed: string, seeded = false): World {
  const setup: NewGameSetup = {
    ...DEFAULT_NEW_GAME_SETUP,
    seed,
    placeKey: "lexington-fayette",
    startAge: 34,
    questionnaire: "skipped" as const,
  };
  if (!seeded)
    delete (setup as { worldOpeningVersion?: unknown }).worldOpeningVersion;
  return generateOpeningLife(prepareOpeningLife(setup)).game!.world;
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
    expect(next.unemploymentPct).toBeCloseTo(
      4.6 + 0.985 * (5 - 4.6) - 0.04 * 1 + 0.01 + 0.05,
      6,
    );
    expect(next.inflationPct).toBeCloseTo(2 + 0.95 * 2 - 0.02 + 0.1, 6);
    expect(next.realOutputIndex).toBeCloseTo(
      100 * Math.exp(next.growthPct / 1200),
      5,
    );
  });

  const calm = { growth: 0, unemployment: 0, inflation: 0 };
  const natural = UNRESEARCHED_UNEMPLOYMENT_RECOVERY.naturalRatePct;
  const steady = (unemploymentPct: number): MacroMonthlyState => ({
    growthPct: 2,
    unemploymentPct,
    inflationPct: 2,
    realOutputIndex: 100,
    priceIndex: 100,
  });

  it("brings unemployment back toward its normal rate once growth recovers", () => {
    let state = steady(10);
    const path: number[] = [];
    for (let month = 0; month < 240; month += 1) {
      state = stepMonth(state, calm, NO_IMPULSES);
      path.push(state.unemploymentPct);
    }
    for (let index = 1; index < path.length; index += 1) {
      expect(path[index]!).toBeLessThan(path[index - 1]!);
      expect(path[index]!).toBeGreaterThan(natural);
    }
    // Roughly half the distance is gone in four years, and nearly all of it
    // in twenty; the old rule held 10% forever.
    expect(path[47]! - natural).toBeCloseTo((10 - natural) / 2, 0);
    expect(path.at(-1)! - natural).toBeLessThan(0.3);
  });

  it("holds a long slowdown at a raised level instead of a climb", () => {
    // A slowdown that keeps growth half a point under its anchor for fifty
    // years, the drag every world's shipping delays put on it.
    const drag = { growthPp: -0.075, laborPp: 0, pricePp: 0 };
    let state = steady(natural);
    const yearly: number[] = [];
    for (let month = 1; month <= 600; month += 1) {
      state = stepMonth(state, calm, drag);
      if (month % 12 === 0) yearly.push(state.unemploymentPct);
    }
    const ceiling = natural + (0.04 * 0.5) / (1 - 0.985);
    expect(state.growthPct).toBeCloseTo(1.5, 3);
    expect(yearly.at(-1)!).toBeLessThan(ceiling + 0.01);
    expect(yearly.at(-1)!).toBeGreaterThan(natural + 1);
    expect(Math.abs(yearly.at(-1)! - yearly.at(-2)!)).toBeLessThan(0.01);
  });

  it("raises a place's unemployment on a local shock and lets it rejoin the nation", () => {
    const nation = steady(natural);
    let local = steady(natural);
    const shock = { growthPp: -0.25, laborPp: 0.03, pricePp: 0 };
    const path: number[] = [];
    for (let month = 0; month < 180; month += 1) {
      const step = stepLocalMonth(
        nation,
        nation,
        local,
        month < 12 ? shock : NO_IMPULSES,
      );
      local = { ...local, ...step };
      path.push(local.unemploymentPct - natural);
    }
    const peak = Math.max(...path);
    expect(peak).toBeGreaterThan(0.5);
    expect(path.indexOf(peak)).toBeGreaterThanOrEqual(11);
    // Falls every month after the peak and is mostly gone ten years on.
    for (let index = path.indexOf(peak) + 1; index < path.length; index += 1) {
      expect(path[index]!).toBeLessThan(path[index - 1]!);
    }
    expect(path[131]!).toBeLessThan(peak * 0.25);
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

  it("draws normals deterministically per stream", () => {
    const draw = (key: string) =>
      standardNormal(new SeededRng("seed").fork(key));
    expect(draw("a")).toBe(draw("a"));
    expect(draw("a")).not.toBe(draw("b"));
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

  it("starts from WORLD's persisted draw in an ordinary seeded opening", () => {
    const seeded = life("change-macro-world", true);
    const record = macroStartingConditions(seeded)!;
    expect(record).not.toBeNull();
    const store = seeded.macroEconomy!;
    expect(store.start.regime).toBe(record.regime);
    expect(store.start.latents).toEqual(record.latents);
    expect(store.start.initial).toEqual(record.initial);
    expect(store.months).toEqual([]);
    const recomputed = startValuesFromLatents(record.regime, record.latents);
    for (const key of Object.keys(recomputed) as (keyof typeof recomputed)[]) {
      expect(recomputed[key]).toBeCloseTo(record.initial[key], 5);
    }
    expect(
      seeded.history.futureDueItems.filter(
        (item) => item.transitionKey === MACRO_MONTHLY_STEP_KEY,
      ),
    ).toHaveLength(1);
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

  it("offers campaigns only released figures as public concerns", () => {
    const home = (w: World) =>
      w.people[w.control.kind === "person" ? w.control.personId : ""]!
        .homeJurisdictionId;
    expect(publicConcernsAt(base, home(base), base.currentDate)).toEqual([]);
    const later = d400();
    const concerns = publicConcernsAt(later, home(later), later.currentDate);
    expect(concerns.map((c) => c.indicator).sort()).toEqual([
      "consumer-price-inflation-12m",
      "real-output-growth-annualized-quarterly",
      "unemployment-rate",
    ]);
    const releases = macroReleasesAt(later, later.currentDate);
    for (const concern of concerns) {
      const series = releases.filter((r) => r.indicator === concern.indicator);
      expect(concern.releaseId).toBe(series.at(-1)!.eventId);
      expect(concern.releasedOn).toBe(series.at(-1)!.releasedAt);
    }
    for (let i = 1; i < concerns.length; i += 1) {
      expect(concerns[i - 1]!.releasedOn >= concerns[i]!.releasedOn).toBe(true);
    }
    const unemployment = concerns.find(
      (c) => c.indicator === "unemployment-rate",
    )!;
    const [prev, last] = releases
      .filter((r) => r.indicator === "unemployment-rate")
      .slice(-2);
    const change = last!.value! - prev!.value!;
    expect(unemployment.direction).toBe(
      change > 0.05 ? "rising" : change < -0.05 ? "falling" : "steady",
    );
    // A first release has nothing to compare with.
    const firstMonth = addDays(base.currentDate, 40);
    const early = publicConcernsAt(later, home(later), firstMonth);
    expect(early.every((c) => c.direction === "unknown")).toBe(true);
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

  it("two seeds with the same start give the same economy for as long as the same rate is in force, and no month holds a drawn surprise", () => {
    const elsewhere = at("other-seed", () =>
      advanceWorld(started("change-macro-z"), 400, registry),
    );
    const national = (world: World) =>
      world.macroEconomy!.months.filter((month) => month.scope === "national");
    const here = national(d400());
    const there = national(elsewhere);
    expect(there.length).toBe(here.length);
    for (const month of [...here, ...there]) {
      expect(month.innovations).toEqual({
        growth: 0,
        unemployment: 0,
        inflation: 0,
      });
      expect(month.drivers!.chancePp).toBe(0);
    }
    // The board is people, so its rate can differ between seeds; the economy
    // cannot, until it does.
    let same = 0;
    for (let index = 0; index < here.length; index += 1) {
      const a = here[index]!;
      const b = there[index]!;
      if (
        a.policyRate.lowerPct !== b.policyRate.lowerPct ||
        a.policyRate.upperPct !== b.policyRate.upperPct
      )
        break;
      expect(b.growthPct, `month ${index}`).toBe(a.growthPct);
      expect(b.unemploymentPct, `month ${index}`).toBe(a.unemploymentPct);
      expect(b.inflationPct, `month ${index}`).toBe(a.inflationPct);
      same += 1;
    }
    expect(same).toBeGreaterThanOrEqual(6);
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

describe("the economy moves only from recorded causes: nothing is drawn", () => {
  /**
   * A recorded origin with a date: a shock of the game's own kind (its
   * authored push each month), held at full strength while the origin lasts
   * and fading by that kind's retention once it ends. This is what a dated
   * crisis reaches the national month as (`shockImpulses`).
   */
  interface RecordedOrigin {
    readonly kind: MacroShockKind;
    readonly beginsMonth: number;
    readonly months: number;
    readonly intensity: number;
  }
  const pushOf = (
    origins: readonly RecordedOrigin[],
    month: number,
  ): MacroImpulses => {
    let growthPp = 0;
    let laborPp = 0;
    let pricePp = 0;
    for (const origin of origins) {
      if (month < origin.beginsMonth) continue;
      const profile = CHANGE_AUTHORED_IMPULSES[origin.kind];
      const endsAt = origin.beginsMonth + origin.months;
      const factor =
        month < endsAt ? 1 : profile.monthlyRetention ** (month - endsAt + 1);
      const weight = factor * origin.intensity;
      growthPp += profile.growthPp * weight;
      laborPp += profile.laborPp * weight;
      pricePp += profile.pricePp * weight;
    }
    return { growthPp, laborPp, pricePp };
  };
  const OPENING: MacroMonthlyState = {
    growthPct: 2,
    unemploymentPct: 4.6,
    inflationPct: 2.7,
    realOutputIndex: 100,
    priceIndex: 100,
  };
  const MONTHS = 1200;

  /**
   * One economy for a century under Build 19's conditions, month by month,
   * from the recorded origins and the policy rate. With `board` a stand-in
   * committee of twelve with drawn views (seven governors, the New York
   * president and four presidents in rotation) sets the rate at eight
   * meetings a year from the same considerations the game's committee weighs
   * (the game decides through `evaluateDecision`; this pure run ranks them
   * with the same arithmetic): the members are people, and their views are
   * the only thing the seed picks. Without it the rate is held where it
   * opened. Every recession start is kept with its drivers.
   */
  function century(
    seed: number,
    origins: readonly RecordedOrigin[],
    board: boolean,
  ) {
    let state = OPENING;
    let era = START_ERA;
    let rate = 3.625;
    const startTightness = 0.5;
    let credit = startCreditState(rate, startTightness, 4.6);
    const rng = new SeededRng(`century-${seed}`);
    const member = (key: string): RateSetterView => {
      const draw = rng.fork(key);
      const trait = (name: string) =>
        draw.fork(name).integer(-2, 3) as RateSetterView["risk"];
      return {
        inflationLean: trait("lean"),
        risk: trait("risk"),
        deliberation: trait("deliberation"),
      };
    };
    // The committee that votes: seven governors, and the New York president
    // with four others in the statute's rotation.
    let seats = Array.from({ length: 7 }, (_, i) => member(`member-${i}`));
    const presidents = new Map(
      RESERVE_BANKS.map((row) => [row.key, member(`president-${row.key}`)]),
    );
    const history: MacroMonthlyState[] = [];
    const recentDrivers: MacroGrowthDrivers[] = [];
    const recessions: {
      month: number;
      drivers: MacroGrowthDrivers;
      months: number;
    }[] = [];
    const growth: number[] = [];
    const inflation: number[] = [];
    const unemployment: number[] = [];
    let worstUnemployment = 0;
    let unexplainedPp = 0;
    let drawnInnovations = 0;
    let shrinking = 0;
    let inRecession = false;
    let growing = 0;
    let g = 0;
    let inf = 0;
    let u = 0;
    for (let month = 0; month < MONTHS; month += 1) {
      if (board && month > 0 && month % 24 === 0)
        seats = seats.map((row, i) =>
          i === (month / 24) % 7 ? member(`member-${month}`) : row,
        );
      const step = stepNationalConditions({
        previous: state,
        previousEra: era,
        credit,
        policyMidPct: rate,
        startTightness,
        shockImpulses: pushOf(origins, month),
      });
      state = step.state;
      era = step.era;
      credit = step.credit;
      unexplainedPp += Math.abs(step.drivers.chancePp);
      drawnInnovations +=
        Math.abs(step.innovations.growth) +
        Math.abs(step.innovations.unemployment) +
        Math.abs(step.innovations.inflation);
      history.push(state);
      recentDrivers.push(step.drivers);
      const openRecession = recessions.at(-1);
      if (inRecession && openRecession) openRecession.months += 1;
      if (recentDrivers.length > 6) recentDrivers.shift();
      shrinking = state.growthPct < 0 ? shrinking + 1 : 0;
      growing = state.growthPct >= 0 ? growing + 1 : 0;
      if (!inRecession && shrinking === 3) {
        inRecession = true;
        const drivers = recentDrivers.reduce((sum, row) => ({
          trendPct: sum.trendPct + row.trendPct,
          carriedPp: sum.carriedPp + row.carriedPp,
          creditPp: sum.creditPp + row.creditPp,
          ratePp: sum.ratePp + row.ratePp,
          demandPp: sum.demandPp + row.demandPp,
          shocksPp: sum.shocksPp + row.shocksPp,
          chancePp: sum.chancePp + row.chancePp,
        }));
        recessions.push({ month, drivers, months: 3 });
      }
      if (inRecession && growing === 3) {
        inRecession = false;
        // The three growing months that ended it are not part of it.
        recessions.at(-1)!.months -= 3;
      }
      if (
        board &&
        MEETINGS.has(((month + 1) % 12) + 1) &&
        history.length > 12
      ) {
        const year = history.at(-13)!;
        const inflationPct = 100 * (state.priceIndex / year.priceIndex - 1);
        const window = history.slice(-240);
        const readings: RateReadings = {
          inflationPct,
          unemploymentPct: state.unemploymentPct,
          unemploymentEarlierPct: history.at(-4)?.unemploymentPct ?? null,
          normalUnemploymentPct:
            window.reduce((sum, row) => sum + row.unemploymentPct, 0) /
            window.length,
          chargeOffPct: credit.chargeOffPct,
          calmChargeOffPct: MACRO_CREDIT_POLICY.start.chargeOffPct,
          recentBankFailures: 0,
          policyMidPct: rate,
          neutralRealRatePct: MACRO_CREDIT_POLICY.neutralRealRatePct,
        };
        const voters = [
          ...seats,
          ...votingReserveBanks(2026 + Math.floor(month / 12)).map((key) =>
            presidents.get(key)!,
          ),
        ];
        const votes = voters.map(
          (view) =>
            rankRateOptionsWithoutWorld(rateConsiderations(view, readings))[0]!,
        );
        const proposal = votes[0]!;
        const against = votes
          .slice(1)
          .filter(
            (vote) =>
              Math.sign(rateMoveOf(vote)) !== Math.sign(rateMoveOf(proposal)),
          ).length;
        if (against * 2 < voters.length)
          rate = Math.max(0.125, rate + rateMoveOf(proposal));
      }
      worstUnemployment = Math.max(worstUnemployment, state.unemploymentPct);
      g += state.growthPct;
      inf += state.inflationPct;
      u += state.unemploymentPct;
      if (month % 120 === 119) {
        growth.push(g / 120);
        inflation.push(inf / 120);
        unemployment.push(u / 120);
        g = inf = u = 0;
      }
    }
    return {
      months: history,
      recessions,
      growth,
      inflation,
      unemployment,
      worstUnemployment,
      unexplainedPp,
      drawnInnovations,
    };
  }
  const MEETINGS = new Set(CENTRAL_BANK_PROFILE.meetingMonths);

  /** A 1970s-style oil shock: two full-strength energy disruptions, two years. */
  const OIL_SHOCK: readonly RecordedOrigin[] = [
    {
      kind: "energy-input-cost-disruption",
      beginsMonth: 240,
      months: 24,
      intensity: 2,
    },
  ];
  /** A credit crunch: two years of tighter lending. */
  const CREDIT_CRUNCH: readonly RecordedOrigin[] = [
    { kind: "credit-tightening", beginsMonth: 360, months: 24, intensity: 1.5 },
  ];
  const calm = Array.from({ length: 6 }, (_, seed) => ({
    seed,
    origins: [] as readonly RecordedOrigin[],
  }));
  const struck = Array.from({ length: 6 }, (_, index) => ({
    seed: index + 6,
    origins: index % 2 === 0 ? OIL_SHOCK : CREDIT_CRUNCH,
  }));
  // Twelve worlds of 100 years: six with no recorded crisis, six with one.
  const worlds = [...calm, ...struck].map(({ seed, origins }) => ({
    origins,
    ...century(seed, origins, true),
  }));
  const all = (key: "growth" | "inflation" | "unemployment") =>
    worlds.flatMap((world) => world[key]);

  it("draws nothing: no month carries a surprise, and the same inputs give the same century", () => {
    for (const world of worlds) {
      expect(world.unexplainedPp).toBe(0);
      expect(world.drawnInnovations).toBe(0);
    }
    const again = century(3, [], true);
    expect(JSON.stringify(again.months)).toBe(
      JSON.stringify(worlds[3]!.months),
    );
    // The same economy, whoever sits on the board, while the rate holds.
    const held = century(0, [], false);
    const heldElsewhere = century(11, [], false);
    expect(JSON.stringify(held.months)).toBe(
      JSON.stringify(heldElsewhere.months),
    );
  });

  it("with no recorded crisis and the rate held, a century has no recession, only the opening's own credit cycle settling to the long run", () => {
    const quiet = century(0, [], false);
    expect(quiet.recessions).toEqual([]);
    expect(
      Math.min(...quiet.months.map((month) => month.growthPct)),
    ).toBeGreaterThan(0);
    // Nothing moves it any more but the stocks it opened with, and they die
    // away: the last forty years are flat.
    const last = quiet.months.slice(-480);
    const range = (pick: (month: MacroMonthlyState) => number) =>
      Math.max(...last.map(pick)) - Math.min(...last.map(pick));
    expect(range((month) => month.growthPct)).toBeLessThan(0.5);
    expect(range((month) => month.unemploymentPct)).toBeLessThan(0.1);
    expect(range((month) => month.inflationPct)).toBeLessThan(0.1);
    expect(quiet.inflation.at(-1)!).toBeCloseTo(2, 1);
    expect(quiet.unemployment.at(-1)!).toBeCloseTo(4.8, 1);
  });

  it("a recorded crisis is the only thing that separates two worlds with the same board", () => {
    const calmWorld = worlds[0]!;
    for (const [index, origins] of [OIL_SHOCK, CREDIT_CRUNCH].entries()) {
      const hit = century(0, origins, true);
      const begins = origins[0]!.beginsMonth;
      for (let month = 0; month < begins; month += 1)
        expect(hit.months[month], `month ${month}`).toEqual(
          calmWorld.months[month],
        );
      // The month it lands, the economy is already somewhere else.
      expect(hit.months[begins]!).not.toEqual(calmWorld.months[begins]!);
      expect(hit.months[begins + 6]!.growthPct, `case ${index}`).toBeLessThan(
        calmWorld.months[begins + 6]!.growthPct,
      );
    }
  });

  it("recessions arise from recorded conditions, with no recession drawn", () => {
    for (const world of worlds) {
      expect(world.recessions.length).toBeGreaterThanOrEqual(2);
      // The densest century on record, 1854 to 1954, had about 25.
      expect(world.recessions.length).toBeLessThanOrEqual(30);
    }
    // The record, 1854 to 2020 (National Bureau of Economic Research): about
    // two onsets a decade, and about 1.3 since 1945.
    const perCentury =
      worlds.reduce((sum, world) => sum + world.recessions.length, 0) /
      worlds.length;
    expect(perCentury).toBeGreaterThan(8);
    expect(perCentury).toBeLessThan(22);
    // Every start is explained: credit, the policy rate, lost jobs and
    // recorded shocks together pulled the economy down, and no month holds an
    // unexplained surprise.
    const starts = worlds.flatMap((world) => world.recessions);
    const explained = starts.filter(
      ({ drivers }) =>
        drivers.creditPp +
          drivers.ratePp +
          drivers.demandPp +
          drivers.shocksPp <
        0,
    );
    expect(explained.length / starts.length).toBeGreaterThan(0.75);
    for (const { drivers } of starts) expect(drivers.chancePp).toBe(0);
    // Not a clock: the gaps between recessions vary.
    const gaps = worlds.flatMap((world) =>
      world.recessions
        .slice(1)
        .map((row, i) => row.month - world.recessions[i]!.month),
    );
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(60);
    for (const world of worlds)
      expect(world.worstUnemployment).toBeGreaterThan(6.5);
  });

  it("a recorded crisis shrinks output within a year of its date, and a recession it starts counts its shock among the drivers", () => {
    for (const world of worlds.filter((row) => row.origins.length > 0)) {
      const begins = world.origins[0]!.beginsMonth;
      const year = world.months.slice(begins, begins + 13);
      expect(Math.min(...year.map((month) => month.growthPct))).toBeLessThan(0);
      const started = world.recessions.filter(
        (row) => row.month >= begins && row.month <= begins + 12,
      );
      for (const start of started)
        expect(start.drivers.shocksPp).toBeLessThan(0);
    }
  });

  it("recessions last as long as the record's: most about a year, long ones rare", () => {
    // Closed recessions only; the record averaged about 17 months from 1854
    // to 2020 and about 10 after 1945, and the longest ran 65 months.
    const lengths = worlds
      .flatMap((world) => world.recessions.slice(0, -1))
      .map((row) => row.months)
      .sort((a, b) => a - b);
    const at = (share: number) =>
      lengths[Math.floor(share * (lengths.length - 1))]!;
    expect(at(0.5)).toBeGreaterThanOrEqual(6);
    expect(at(0.5)).toBeLessThanOrEqual(20);
    expect(at(0.9)).toBeLessThanOrEqual(30);
    expect(lengths.filter((months) => months > 65).length).toBeLessThanOrEqual(
      Math.ceil(lengths.length / 50),
    );
  });

  it("a 1970s-style inflation comes only after a recorded oil shock", () => {
    const peak = (world: (typeof worlds)[number]) =>
      Math.max(...world.months.map((month) => month.inflationPct));
    for (const world of worlds) {
      const oil = world.origins === OIL_SHOCK;
      if (oil) expect(peak(world)).toBeGreaterThan(5);
      else expect(peak(world)).toBeLessThan(3.5);
    }
  });

  it("every value stays inside its bounds", () => {
    for (const value of all("unemployment")) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(40);
    }
    for (const value of all("inflation")) {
      expect(value).toBeGreaterThan(-5);
      expect(value).toBeLessThan(20);
    }
  });
});
