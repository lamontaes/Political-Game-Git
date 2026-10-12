import { detExp } from "./macro-deterministic-math";
import {
  roundMacro,
  stepLocalMonth,
  START_ERA,
  type MacroImpulses,
  type MacroMonthlyState,
} from "./macro-kernel";
import {
  CRUNCH46_PROVISIONAL_POLICY as POLICY,
  UNEMPLOYMENT_RECOVERY_RULE,
} from "./macro-policy";
import { stepNationalConditions } from "./macro-conditions";
import { startCreditState } from "./macro-credit";
import {
  classifyHousing,
  monthEnd,
  monthKeyOf,
  monthRecordKey,
  monthStart,
  nextMonthKey,
} from "./macro-calendar";
import type {
  MacroEconomyStore,
  MacroMonthRecord,
  MacroScopeKey,
  MacroShockRecord,
  MacroStartingConditions,
} from "../../simulation/macro-economy/types";
import type { IsoDate } from "../../simulation/types";
// stopgapId: "economy.macro-shock-floor"
const SHOCK_FLOOR = 0.01;

function monthsBetween(fromMonth: string, toMonth: string): number {
  return (
    (Number(toMonth.slice(0, 4)) - Number(fromMonth.slice(0, 4))) * 12 +
    Number(toMonth.slice(5, 7)) -
    Number(fromMonth.slice(5, 7))
  );
}

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
): {
  impulses: MacroImpulses;
  shockKeys: string[];
} {
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

function stateOf(record: MacroMonthRecord): MacroMonthlyState {
  return {
    growthPct: record.growthPct,
    unemploymentPct: record.unemploymentPct,
    inflationPct: record.inflationPct,
    realOutputIndex: record.realOutputIndex,
    priceIndex: record.priceIndex,
  };
}

export function startState(start: MacroStartingConditions): MacroMonthlyState {
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

// stopgapId: "economy.macro-housing-ratio-hold"
function nationalMonth(
  store: MacroEconomyStore,
  monthKey: string,
): MacroMonthRecord {
  const previous = lastMonth(store, "national");
  const prior = previous ? stateOf(previous) : startState(store.start);
  const { impulses: shockImpulses, shockKeys } = impulsesFor(
    store,
    "national",
    monthKey,
    1,
  );
  const policyRate = store.centralBank?.policyRate ??
    previous?.policyRate ?? {
      lowerPct: POLICY.baseline.policyRateRangePct.lower,
      upperPct: POLICY.baseline.policyRateRangePct.upper,
      basis: "retained-reference" as const,
      decisionEventId: null,
    };
  const policyMidPct = (policyRate.lowerPct + policyRate.upperPct) / 2;
  const startTightness = store.start.initial.creditTightness;
  const stepped = stepNationalConditions({
    previous: prior,
    previousEra: previous?.era ?? START_ERA,
    credit:
      previous?.credit ??
      startCreditState(policyMidPct, startTightness, prior.unemploymentPct),
    policyMidPct,
    startTightness,
    shockImpulses,
  });
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
    ...stepped.state,
    realIncomeIndex: null,
    housing: {
      supplyDemandRatio: ratio,
      supplyUnits: null,
      demandHouseholds: null,
      classification: classifyHousing(ratio),
    },
    exposure: null,
    creditTightness: stepped.credit.tightness,
    policyRate,
    innovations: stepped.innovations,
    impulses: stepped.impulses,
    shockKeys,
    era: stepped.era,
    unemploymentRule: UNEMPLOYMENT_RECOVERY_RULE,
    credit: stepped.credit,
    drivers: stepped.drivers,
  };
}

// stopgapId: "economy.macro-local-exposure"
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
/** Raw persisted macro records, after separately ordered seat/origin producer requests. Own national/local math has no World read or writer. */
export function recordedMacroMonths(
  facts: MacroEconomyStore,
  monthKey: string,
) {
  const previous = lastMonth(facts, "national");
  const previousState = previous ? stateOf(previous) : startState(facts.start);
  const national = nationalMonth(facts, monthKey);
  const localScopes = new Set<MacroScopeKey>([
    ...facts.months.filter((r) => r.scope !== "national").map((r) => r.scope),
    ...facts.shocks
      .filter((r) => r.scope !== "national" && r.beginsAt <= monthEnd(monthKey))
      .map((r) => r.scope),
  ]);
  return [
    national,
    ...[...localScopes]
      .sort()
      .map((scope) =>
        localMonth(facts, scope, monthKey, national, previousState),
      ),
  ];
}
