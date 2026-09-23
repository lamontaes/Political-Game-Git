import { scheduleFutureDueItem } from "../future-transitions";
import { publishPublicEvent } from "../public-information";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  IsoDate,
  World,
} from "../types";
import { recordWorldEvent } from "../world";
import type { MacroStartingConditionsRecord } from "../world-setup/types";
import { detExp } from "../world-setup/deterministic-math";
import {
  annualizedQuarterlyGrowthPct,
  drawInnovations,
  roundMacro,
  stepLocalMonth,
  stepMonth,
  twelveMonthChangePct,
  type MacroImpulses,
  type MacroMonthlyState,
} from "./kernel";
import {
  CHANGE_AUTHORED_IMPULSES,
  CHANGE_AUTHORED_IMPULSES_VERSION,
  CRUNCH46_PROVISIONAL_POLICY as POLICY,
  MACRO_POLICY_VERSION,
  UNEMPLOYMENT_RECOVERY_RULE,
} from "./policy";
import { MACRO_ORIGIN_READERS, type MacroOriginReader } from "./sources";
import {
  classifyHousing,
  monthEnd,
  monthKeyOf,
  monthRecordKey,
  monthStart,
  nextMonthKey,
  previousMonthKey,
  previousQuarterKey,
  quarterKeyOf,
  quarterMonthKeys,
} from "./store";
import type {
  MacroEconomyStore,
  MacroMonthRecord,
  MacroReleaseIndicator,
  MacroReleaseRecord,
  MacroScopeKey,
  MacroShockRecord,
  MacroStartingConditions,
} from "./types";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "./types";

export const MACRO_MONTHLY_STEP_KEY = "economy:monthly-step" as const;
export const MACRO_RELEASE_EVENT = "economy.release-published" as const;
const STEP_PREFIX = `${MACRO_ECONOMY_CONTRACT_VERSION}:monthly-step:`;
/** A decayed shock below this share of full intensity stops contributing. */
const SHOCK_FLOOR = 0.01;

function stepKey(monthKey: string): string {
  return `${STEP_PREFIX}${monthKey}`;
}

function scheduleStep(world: World, monthKey: string): World {
  return scheduleFutureDueItem(world, {
    stableKey: stepKey(monthKey),
    dueAt: monthStart(nextMonthKey(monthKey)),
    transitionKey: MACRO_MONTHLY_STEP_KEY,
    entityIds: [world.id],
    jurisdictionId: null,
    provenance: { kind: "initialization", reference: stepKey(monthKey) },
  });
}

/**
 * WORLD's persisted record, as CHANGE cites it. A record written under a
 * different policy version is not silently reinterpreted.
 */
export function macroStartForHistory(
  record: MacroStartingConditionsRecord | null,
): MacroStartingConditions | null {
  if (!record || record.policyVersion !== MACRO_POLICY_VERSION) return null;
  return {
    contractVersion: record.contractVersion,
    policyVersion: MACRO_POLICY_VERSION,
    regime: record.regime,
    volatilityScale: record.volatilityScale,
    latents: { ...record.latents },
    initial: { ...record.initial },
    effectiveDate: record.effectiveDate,
  };
}

/**
 * Begins macro history from WORLD's persisted starting draw. Without a draw
 * (an old save, or a world WORLD did not seed) nothing is written and
 * nothing is scheduled.
 */
export function ensureMacroEconomyStarted(
  world: World,
  start: MacroStartingConditions | null,
): World {
  if (world.macroEconomy !== undefined || start === null) return world;
  if (start.effectiveDate > world.currentDate) {
    throw new Error("Macro history cannot start after the current date.");
  }
  const store: MacroEconomyStore = {
    contractVersion: MACRO_ECONOMY_CONTRACT_VERSION,
    policyVersion: MACRO_POLICY_VERSION,
    impulsesVersion: CHANGE_AUTHORED_IMPULSES_VERSION,
    start,
    months: [],
    shocks: [],
    shockEnds: [],
    releases: [],
  };
  return scheduleStep(
    { ...world, macroEconomy: store },
    monthKeyOf(start.effectiveDate),
  );
}

function monthsBetween(fromMonth: string, toMonth: string): number {
  return (
    (Number(toMonth.slice(0, 4)) - Number(fromMonth.slice(0, 4))) * 12 +
    Number(toMonth.slice(5, 7)) -
    Number(fromMonth.slice(5, 7))
  );
}

/** Intensity-weighted share of a shock active in `monthKey`, or 0. */
export function shockFactor(
  shock: MacroShockRecord,
  endedAt: IsoDate | null,
  monthKey: string,
): number {
  if (shock.beginsAt > monthEnd(monthKey)) return 0;
  const retention = shock.persistence.monthlyRetention;
  let factor: number;
  if (shock.persistence.kind === "geometric") {
    factor = retention ** monthsBetween(monthKeyOf(shock.beginsAt), monthKey);
  } else if (endedAt === null || endedAt >= monthStart(monthKey)) {
    factor = 1;
  } else {
    // Recovery after the origin ends is gradual, never instantaneous.
    factor = retention ** monthsBetween(monthKeyOf(endedAt), monthKey);
  }
  const weighted = factor * shock.intensity;
  return weighted < SHOCK_FLOOR ? 0 : weighted;
}

function impulsesFor(
  store: MacroEconomyStore,
  scope: MacroScopeKey,
  monthKey: string,
  exposure: number,
): { impulses: MacroImpulses; shockKeys: string[] } {
  const ends = new Map(
    store.shockEnds.map((end) => [end.shockKey, end.endedAt]),
  );
  let growthPp = 0;
  let laborPp = 0;
  let pricePp = 0;
  const shockKeys: string[] = [];
  for (const shock of store.shocks) {
    if (shock.scope !== scope) continue;
    const factor = shockFactor(shock, ends.get(shock.key) ?? null, monthKey);
    if (factor === 0) continue;
    growthPp += shock.signedMagnitude.growthPp * factor * exposure;
    laborPp += shock.signedMagnitude.laborPp * factor * exposure;
    pricePp += shock.signedMagnitude.pricePp * factor * exposure;
    shockKeys.push(shock.key);
  }
  return {
    impulses: {
      growthPp: roundMacro(growthPp),
      laborPp: roundMacro(laborPp),
      pricePp: roundMacro(pricePp),
    },
    shockKeys: shockKeys.sort(),
  };
}

function intakeShocks(
  store: MacroEconomyStore,
  world: World,
  monthKey: string,
  readers: readonly MacroOriginReader[],
): MacroEconomyStore {
  const through = monthEnd(monthKey);
  const known = new Map(store.shocks.map((shock) => [shock.dedupeKey, shock]));
  const shocks = [...store.shocks];
  for (const reader of readers) {
    for (const origin of reader.origins(world, through)) {
      if (known.has(origin.dedupeKey)) continue;
      const profile = CHANGE_AUTHORED_IMPULSES[origin.kind];
      const shock: MacroShockRecord = {
        key: `${origin.dedupeKey}:shock`,
        kind: origin.kind,
        originEventId: origin.originEventId,
        dedupeKey: origin.dedupeKey,
        consumer: "change-macro",
        impulsesVersion: CHANGE_AUTHORED_IMPULSES_VERSION,
        geographyIds: [...origin.geographyIds].sort(),
        scope: origin.scope,
        sectors: [...profile.sectors],
        signedMagnitude: {
          growthPp: profile.growthPp,
          laborPp: profile.laborPp,
          pricePp: profile.pricePp,
          units: "percentage-points-per-month-at-full-intensity",
        },
        intensity: roundMacro(Math.min(1, Math.max(0, origin.intensity))),
        // An already-happened cause from before Begin acts from Begin on.
        beginsAt:
          origin.beginsAt < store.start.effectiveDate
            ? store.start.effectiveDate
            : origin.beginsAt,
        persistence: {
          kind: origin.persistence,
          monthlyRetention: profile.monthlyRetention,
        },
        observedState: origin.observedState,
        modelUncertainty: "authored-unvalidated",
        schemaVersion: MACRO_ECONOMY_CONTRACT_VERSION,
        causalParents: [...origin.causalParents].sort(),
        recordedAt: world.currentDate,
      };
      shocks.push(shock);
      known.set(shock.dedupeKey, shock);
    }
  }
  const endedKeys = new Set(store.shockEnds.map((end) => end.shockKey));
  const shockEnds = [...store.shockEnds];
  for (const reader of readers) {
    for (const end of reader.ends(world, through)) {
      const shock = known.get(end.dedupeKey);
      if (!shock || endedKeys.has(shock.key)) continue;
      shockEnds.push({
        shockKey: shock.key,
        endEventId: end.endEventId,
        endedAt: end.endedAt < shock.beginsAt ? shock.beginsAt : end.endedAt,
        recordedAt: world.currentDate,
      });
      endedKeys.add(shock.key);
    }
  }
  return { ...store, shocks, shockEnds };
}

function stateOf(record: MacroMonthRecord): MacroMonthlyState {
  return {
    growthPct: record.growthPct,
    unemploymentPct: record.unemploymentPct,
    inflationPct: record.inflationPct,
    realOutputIndex: record.realOutputIndex,
    priceIndex: record.priceIndex,
  };
}

function startState(start: MacroStartingConditions): MacroMonthlyState {
  return {
    growthPct: start.initial.realGrowthAnnualPct,
    unemploymentPct: start.initial.unemploymentPct,
    inflationPct: start.initial.inflation12mPct,
    realOutputIndex: POLICY.baseline.realOutputIndex,
    priceIndex: 100,
  };
}

function lastMonth(
  store: MacroEconomyStore,
  scope: MacroScopeKey,
): MacroMonthRecord | undefined {
  for (let index = store.months.length - 1; index >= 0; index -= 1) {
    if (store.months[index]!.scope === scope) return store.months[index];
  }
  return undefined;
}

function nationalMonth(
  world: World,
  store: MacroEconomyStore,
  monthKey: string,
): MacroMonthRecord {
  const previous = lastMonth(store, "national");
  const prior = previous ? stateOf(previous) : startState(store.start);
  const rng = new SeededRng(world.seed)
    .fork(`${MACRO_ECONOMY_CONTRACT_VERSION}:innovations`)
    .fork("national")
    .fork(monthKey);
  const innovations = drawInnovations(rng);
  const { impulses, shockKeys } = impulsesFor(store, "national", monthKey, 1);
  const next = stepMonth(prior, innovations, impulses);
  const ratio = previous?.housing
    ? previous.housing.supplyDemandRatio
    : store.start.initial.housingSupplyDemandRatio;
  return {
    key: monthRecordKey("national", monthKey),
    scope: "national",
    ordinal: previous ? previous.ordinal + 1 : 0,
    periodStart: monthStart(monthKey),
    periodEnd: monthEnd(monthKey),
    recordedAt: monthStart(nextMonthKey(monthKey)),
    ...next,
    realIncomeIndex: null,
    // Supply and demand move only through recorded construction, migration
    // and household events; none are modeled yet, so the ratio holds.
    housing: {
      supplyDemandRatio: ratio,
      supplyUnits: null,
      demandHouseholds: null,
      classification: classifyHousing(ratio),
    },
    exposure: null,
    // Moves only when a modeled central-bank actor decides; none exists.
    creditTightness:
      previous?.creditTightness ?? store.start.initial.creditTightness,
    policyRate: previous?.policyRate ?? {
      lowerPct: POLICY.baseline.policyRateRangePct.lower,
      upperPct: POLICY.baseline.policyRateRangePct.upper,
      basis: "retained-reference",
      decisionEventId: null,
    },
    innovations,
    impulses,
    shockKeys,
    unemploymentRule: UNEMPLOYMENT_RECOVERY_RULE,
  };
}

/**
 * A jurisdiction's local layer: national movement plus that place's own
 * shocks, with no independent random economy (see `stepLocalMonth`).
 */
function localMonth(
  store: MacroEconomyStore,
  scope: MacroScopeKey,
  monthKey: string,
  national: MacroMonthRecord,
  previousNational: MacroMonthlyState,
): MacroMonthRecord {
  const previous = lastMonth(store, scope);
  const prior = previous ? stateOf(previous) : previousNational;
  const exposure = {
    basis: "national-average-no-local-source" as const,
    multiplier: 1,
    sourceKey: null,
  };
  const { impulses, shockKeys } = impulsesFor(
    store,
    scope,
    monthKey,
    exposure.multiplier,
  );
  const { growthPct, unemploymentPct } = stepLocalMonth(
    national,
    previousNational,
    prior,
    impulses,
  );
  return {
    key: monthRecordKey(scope, monthKey),
    scope,
    ordinal: previous ? previous.ordinal + 1 : 0,
    periodStart: national.periodStart,
    periodEnd: national.periodEnd,
    recordedAt: national.recordedAt,
    growthPct,
    unemploymentPct,
    // Local price levels are not modeled; the national level applies.
    inflationPct: national.inflationPct,
    realOutputIndex: roundMacro(
      prior.realOutputIndex * detExp(growthPct / 100 / 12),
    ),
    priceIndex: national.priceIndex,
    realIncomeIndex: null,
    housing: null,
    exposure,
    creditTightness: national.creditTightness,
    policyRate: national.policyRate,
    innovations: { growth: 0, unemployment: 0, inflation: 0 },
    impulses: {
      growthPp: impulses.growthPp,
      laborPp: impulses.laborPp,
      pricePp: 0,
    },
    shockKeys,
    unemploymentRule: UNEMPLOYMENT_RECOVERY_RULE,
  };
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthLabel(monthKey: string): string {
  return `${MONTH_NAMES[Number(monthKey.slice(5, 7)) - 1]} ${monthKey.slice(0, 4)}`;
}

function formatPct(value: number): string {
  return `${(Math.round(value * 10) / 10).toFixed(1)} percent`;
}

interface ReleaseDraft {
  readonly indicator: MacroReleaseIndicator;
  readonly periodKey: string;
  readonly referencePeriodStart: IsoDate;
  readonly referencePeriodEnd: IsoDate;
  readonly value: number;
  readonly unit: MacroReleaseRecord["unit"];
  readonly sourceMonthKeys: readonly string[];
  readonly summary: string;
}

function releaseDrafts(
  store: MacroEconomyStore,
  monthKey: string,
): readonly ReleaseDraft[] {
  const national = new Map(
    store.months
      .filter((record) => record.scope === "national")
      .map((record) => [monthKeyOf(record.periodStart), record]),
  );
  const current = national.get(monthKey)!;
  const drafts: ReleaseDraft[] = [
    {
      indicator: "unemployment-rate",
      periodKey: monthKey,
      referencePeriodStart: current.periodStart,
      referencePeriodEnd: current.periodEnd,
      value: roundMacro(current.unemploymentPct),
      unit: "percent-of-labor-force",
      sourceMonthKeys: [current.key],
      summary: `The national unemployment rate for ${monthLabel(monthKey)} was reported at ${formatPct(current.unemploymentPct)}.`,
    },
  ];
  // Published inflation exists only once twelve recorded months exist; the
  // starting value is a modeled condition, not a back-filled observation.
  const yearAgo = national.get(previousMonthKey(monthKey, 12));
  if (yearAgo) {
    const value = twelveMonthChangePct(current.priceIndex, yearAgo.priceIndex);
    drafts.push({
      indicator: "consumer-price-inflation-12m",
      periodKey: monthKey,
      referencePeriodStart: current.periodStart,
      referencePeriodEnd: current.periodEnd,
      value,
      unit: "percent-12-month",
      sourceMonthKeys: [yearAgo.key, current.key],
      summary: `Consumer prices in ${monthLabel(monthKey)} were reported ${formatPct(Math.abs(value))} ${value < 0 ? "lower" : "higher"} than a year earlier.`,
    });
  }
  const quarter = quarterKeyOf(monthKey);
  const quarterMonths = quarterMonthKeys(quarter);
  if (quarterMonths[2] === monthKey) {
    const now = quarterMonths.map((key) => national.get(key));
    const before = quarterMonthKeys(previousQuarterKey(quarter)).map((key) =>
      national.get(key),
    );
    if (now.every(Boolean) && before.every(Boolean)) {
      const mean = (records: readonly (MacroMonthRecord | undefined)[]) =>
        records.reduce((sum, record) => sum + record!.realOutputIndex, 0) /
        records.length;
      const value = annualizedQuarterlyGrowthPct(mean(now), mean(before));
      drafts.push({
        indicator: "real-output-growth-annualized-quarterly",
        periodKey: quarter,
        referencePeriodStart: now[0]!.periodStart,
        referencePeriodEnd: now[2]!.periodEnd,
        value,
        unit: "percent-annualized",
        sourceMonthKeys: [...before, ...now].map((record) => record!.key),
        summary: `The national economy's real output was reported ${value < 0 ? "shrinking" : "growing"} at an annual rate of ${formatPct(Math.abs(value))} in the ${["first", "second", "third", "fourth"][Number(quarter.slice(6)) - 1]} quarter of ${quarter.slice(0, 4)}.`,
      });
    }
  }
  return drafts;
}

function publishReleases(
  world: World,
  monthKey: string,
): { world: World; firstEventId: EntityId | null } {
  let next = world;
  let firstEventId: EntityId | null = null;
  for (const draft of releaseDrafts(next.macroEconomy!, monthKey)) {
    const key = `${MACRO_ECONOMY_CONTRACT_VERSION}:release:national:${draft.indicator}:${draft.periodKey}`;
    next = recordWorldEvent(next, {
      stableKey: key,
      type: MACRO_RELEASE_EVENT,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: null,
      involvedEntityIds: [next.id],
      participants: [],
      personFactConstraints: [],
      visibility: "public",
      tags: [
        MACRO_ECONOMY_CONTRACT_VERSION,
        `release:${draft.indicator}`,
        `period:${draft.periodKey}`,
        "scope:national",
      ],
      summary: draft.summary,
      context: {
        location: null,
        socialContext: null,
        pressure: null,
        choice: null,
        motivation: null,
        immediateReaction: null,
      },
    });
    const eventId = next.history.events.at(-1)!.id;
    firstEventId ??= eventId;
    const store = next.macroEconomy!;
    next = {
      ...next,
      macroEconomy: {
        ...store,
        releases: [
          ...store.releases,
          {
            key,
            indicator: draft.indicator,
            scope: "national",
            referencePeriodStart: draft.referencePeriodStart,
            referencePeriodEnd: draft.referencePeriodEnd,
            releasedAt: next.currentDate,
            value: draft.value,
            unit: draft.unit,
            valueClass: "simulated-publication",
            sourceMonthKeys: draft.sourceMonthKeys,
            eventId,
          },
        ],
      },
    };
    next = publishPublicEvent(next, {
      stableKey: `${key}:publication`,
      sourceEventId: eventId,
    });
  }
  return { world: next, firstEventId };
}

/**
 * Closes one calendar month exactly once: takes in canonical shock origins,
 * writes the national record and any materialized local layers, announces
 * the month's public releases and schedules the next month.
 */
export function createMacroMonthlyStepHandler(
  readers: readonly MacroOriginReader[] = MACRO_ORIGIN_READERS,
) {
  return (
    world: World,
    dueItem: FutureDueItem,
  ): FutureTransitionHandlerResult => {
    if (
      dueItem.transitionKey !== MACRO_MONTHLY_STEP_KEY ||
      !dueItem.stableKey.startsWith(STEP_PREFIX)
    ) {
      throw new Error("The macro step handler received another transition.");
    }
    const monthKey = dueItem.stableKey.slice(STEP_PREFIX.length);
    const store = world.macroEconomy;
    if (!store) {
      return {
        world,
        status: "cancelled",
        reasonKey: "economy:history-absent",
        context: null,
        outcomeEventId: null,
      };
    }
    if (
      store.months.some(
        (record) => record.key === monthRecordKey("national", monthKey),
      )
    ) {
      return {
        world,
        status: "cancelled",
        reasonKey: "economy:month-already-recorded",
        context: null,
        outcomeEventId: null,
      };
    }
    let working = intakeShocks(store, world, monthKey, readers);
    const previousNational = lastMonth(working, "national");
    const previousNationalState = previousNational
      ? stateOf(previousNational)
      : startState(working.start);
    const national = nationalMonth(world, working, monthKey);
    const localScopes = new Set<MacroScopeKey>([
      ...working.months
        .filter((record) => record.scope !== "national")
        .map((record) => record.scope),
      ...working.shocks
        .filter(
          (shock) =>
            shock.scope !== "national" && shock.beginsAt <= monthEnd(monthKey),
        )
        .map((shock) => shock.scope),
    ]);
    const locals = [...localScopes]
      .sort()
      .map((scope) =>
        localMonth(working, scope, monthKey, national, previousNationalState),
      );
    working = { ...working, months: [...working.months, national, ...locals] };
    const published = publishReleases(
      { ...world, macroEconomy: working },
      monthKey,
    );
    return {
      world: scheduleStep(published.world, nextMonthKey(monthKey)),
      status: "resolved",
      reasonKey: "economy:month-recorded",
      context: `Economic conditions for ${monthLabel(monthKey)} were recorded.`,
      outcomeEventId: published.firstEventId,
    };
  };
}

export const macroMonthlyStepHandler = createMacroMonthlyStepHandler();
