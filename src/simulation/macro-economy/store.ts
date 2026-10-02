import { makeIsoDate } from "../dates";
import { eventIndexOf } from "../event-index";
import type { IsoDate, World } from "../types";
import {
  CHANGE_AUTHORED_IMPULSES_VERSION,
  GAMEPLAY_SECTORS,
  MACRO_POLICY_VERSION,
  MACRO_SHOCK_KINDS,
  UNEMPLOYMENT_RECOVERY_RULE,
} from "./policy";
import type {
  MacroEconomyStore,
  MacroHousingCondition,
  MacroMonthRecord,
  MacroScopeKey,
} from "./types";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "./types";

/** "YYYY-MM" for a date. */
export function monthKeyOf(date: IsoDate): string {
  return date.slice(0, 7);
}

export function monthStart(monthKey: string): IsoDate {
  return makeIsoDate(`${monthKey}-01`);
}

export function nextMonthKey(monthKey: string): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  return month === 12
    ? `${String(year + 1).padStart(4, "0")}-01`
    : `${monthKey.slice(0, 4)}-${String(month + 1).padStart(2, "0")}`;
}

export function previousMonthKey(monthKey: string, back = 1): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7)) - 1 - back;
  const y = year + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  return `${String(y).padStart(4, "0")}-${String(m + 1).padStart(2, "0")}`;
}

const MONTH_END_CACHE = new Map<string, IsoDate>();

export function monthEnd(monthKey: string): IsoDate {
  const cached = MONTH_END_CACHE.get(monthKey);
  if (cached) return cached;
  const next = monthStart(nextMonthKey(monthKey));
  const date = new Date(`${next}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  const end = makeIsoDate(date.toISOString().slice(0, 10));
  MONTH_END_CACHE.set(monthKey, end);
  return end;
}

/** "YYYY-Qn" for a month key. */
export function quarterKeyOf(monthKey: string): string {
  const quarter = Math.floor((Number(monthKey.slice(5, 7)) - 1) / 3) + 1;
  return `${monthKey.slice(0, 4)}-Q${quarter}`;
}

export function quarterMonthKeys(quarterKey: string): readonly string[] {
  const quarter = Number(quarterKey.slice(6));
  const first = (quarter - 1) * 3 + 1;
  return [first, first + 1, first + 2].map(
    (month) => `${quarterKey.slice(0, 4)}-${String(month).padStart(2, "0")}`,
  );
}

export function previousQuarterKey(quarterKey: string): string {
  const year = Number(quarterKey.slice(0, 4));
  const quarter = Number(quarterKey.slice(6));
  return quarter === 1
    ? `${String(year - 1).padStart(4, "0")}-Q4`
    : `${quarterKey.slice(0, 4)}-Q${quarter - 1}`;
}

export function monthRecordKey(scope: MacroScopeKey, monthKey: string): string {
  return `${MACRO_ECONOMY_CONTRACT_VERSION}:month:${scope}:${monthKey}`;
}

export function classifyHousing(
  ratio: number,
): MacroHousingCondition["classification"] {
  // Authored reading bands around the neutral 1.0 ratio.
  if (ratio < 0.98) return "shortage";
  if (ratio > 1.02) return "surplus";
  return "adequate";
}

export function macroMonthsForScope(
  store: MacroEconomyStore,
  scope: MacroScopeKey,
): readonly MacroMonthRecord[] {
  return store.months.filter((record) => record.scope === scope);
}

function validHousing(month: MacroMonthRecord): boolean {
  const housing = month.housing;
  if (housing === null) return true;
  return (
    Number.isFinite(housing.supplyDemandRatio) &&
    housing.supplyDemandRatio > 0 &&
    (housing.supplyUnits === null || housing.supplyUnits >= 0) &&
    (housing.demandHouseholds === null || housing.demandHouseholds >= 0) &&
    housing.classification === classifyHousing(housing.supplyDemandRatio)
  );
}

function finite(value: unknown, label: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Macro ${label} must be a finite number.`);
  }
}

/**
 * Indexed, linear-time integrity. Runs inside assertWorldIntegrity, so it
 * must stay cheap on a thirty-year history.
 */
export function assertMacroEconomyIntegrity(world: World): void {
  const store = world.macroEconomy;
  if (store === undefined) return;
  if (
    store.contractVersion !== MACRO_ECONOMY_CONTRACT_VERSION ||
    store.policyVersion !== MACRO_POLICY_VERSION ||
    store.impulsesVersion !== CHANGE_AUTHORED_IMPULSES_VERSION
  ) {
    throw new Error("Unsupported macro-economy store version.");
  }
  const start = store.start;
  const observed = start.contractVersion === "observed-macro-start/v2";
  const supportedLegacy =
    start.contractVersion === "crunch46-macro-start/v1" &&
    start.regime !== null &&
    ["near-reference", "modest", "major"].includes(start.regime) &&
    start.latents !== null &&
    start.volatilityScale !== null;
  const supportedObserved =
    observed &&
    start.regime === null &&
    start.latents === null &&
    start.volatilityScale === null &&
    start.reference?.basis === "estimated-from-observed-reference";
  if (
    (!supportedLegacy && !supportedObserved) ||
    start.policyVersion !== MACRO_POLICY_VERSION
  ) {
    throw new Error("Macro starting conditions have an unsupported shape.");
  }
  makeIsoDate(start.effectiveDate);
  if (start.effectiveDate > world.currentDate) {
    throw new Error("Macro starting conditions postdate the world clock.");
  }
  for (const [label, value] of [
    ...(start.volatilityScale === null
      ? []
      : [["volatility scale", start.volatilityScale] as const]),
    ...Object.entries(start.latents ?? {}),
    ...Object.entries(start.initial),
  ] as const) {
    finite(value, `start ${label}`);
  }
  if (
    start.initial.housingSupplyDemandRatio <= 0 ||
    start.initial.unemploymentPct < 0 ||
    start.initial.unemploymentPct > 100
  ) {
    throw new Error("Macro starting conditions are out of bounds.");
  }

  if (observed) {
    const reference = start.reference!;
    makeIsoDate(reference.asOfDate);
    if (
      !/^[a-f0-9]{64}$/.test(reference.sourceSha256) ||
      reference.observations.length !== 8 ||
      new Set(reference.observations.map((row) => row.field)).size !==
        reference.observations.length
    )
      throw new Error("Observed macro start lacks unique source evidence.");
    for (const row of reference.observations) {
      finite(row.value, "macro reference observation");
      if (makeIsoDate(row.releasedAt) > reference.asOfDate)
        throw new Error("Macro reference contains a later release.");
    }
    if (
      start.initial.creditTightness <= 0 ||
      start.initial.creditTightness >= 1
    )
      throw new Error(
        "Observed credit tightness must support the existing logit mapping.",
      );
    const housing = start.initialHousingCounts;
    const rate = start.initialPolicyRate;
    if (
      !housing ||
      !rate ||
      housing.supplyUnits <= 0 ||
      housing.demandHouseholds <= 0 ||
      !Number.isFinite(housing.supplyUnits) ||
      !Number.isFinite(housing.demandHouseholds) ||
      !Number.isFinite(rate.lowerPct) ||
      !Number.isFinite(rate.upperPct) ||
      rate.lowerPct > rate.upperPct
    )
      throw new Error(
        "Observed macro start lacks valid housing or policy-rate values.",
      );
  }

  const eventIds = eventIndexOf(world.history.events);
  const startMonth = monthKeyOf(start.effectiveDate);

  const shockKeys = new Set<string>();
  const dedupeKeys = new Set<string>();
  for (const shock of store.shocks) {
    if (shockKeys.has(shock.key) || dedupeKeys.has(shock.dedupeKey)) {
      throw new Error(`Duplicate macro shock: ${shock.key}`);
    }
    shockKeys.add(shock.key);
    dedupeKeys.add(shock.dedupeKey);
    if (!MACRO_SHOCK_KINDS.includes(shock.kind)) {
      throw new Error(`Unknown macro shock kind: ${shock.key}`);
    }
    if (!eventIds.has(shock.originEventId)) {
      throw new Error(`Macro shock has no canonical origin: ${shock.key}`);
    }
    if (shock.sectors.some((sector) => !GAMEPLAY_SECTORS.includes(sector))) {
      throw new Error(`Macro shock names an unknown sector: ${shock.key}`);
    }
    makeIsoDate(shock.beginsAt);
    makeIsoDate(shock.recordedAt);
    if (
      shock.recordedAt > world.currentDate ||
      shock.beginsAt > shock.recordedAt
    ) {
      throw new Error(`Macro shock has invalid chronology: ${shock.key}`);
    }
    finite(shock.intensity, "shock intensity");
    if (shock.intensity < 0 || shock.intensity > 1) {
      throw new Error(`Macro shock intensity is out of range: ${shock.key}`);
    }
    for (const value of [
      shock.signedMagnitude.growthPp,
      shock.signedMagnitude.laborPp,
      shock.signedMagnitude.pricePp,
      shock.persistence.monthlyRetention,
    ]) {
      finite(value, "shock magnitude");
    }
  }

  const shockBegins = new Map(
    store.shocks.map((shock) => [shock.key, shock.beginsAt]),
  );
  const endedShocks = new Set<string>();
  for (const end of store.shockEnds) {
    const beginsAt = shockBegins.get(end.shockKey);
    if (
      beginsAt === undefined ||
      endedShocks.has(end.shockKey) ||
      !eventIds.has(end.endEventId) ||
      end.endedAt < beginsAt ||
      end.endedAt > end.recordedAt ||
      end.recordedAt > world.currentDate
    ) {
      throw new Error(`Macro shock end is invalid: ${end.shockKey}`);
    }
    endedShocks.add(end.shockKey);
  }

  const monthKeys = new Set<string>();
  const lastOrdinal = new Map<MacroScopeKey, number>();
  for (const month of store.months) {
    if (monthKeys.has(month.key)) {
      throw new Error(`Duplicate macro month: ${month.key}`);
    }
    monthKeys.add(month.key);
    const key = monthKeyOf(month.periodStart);
    if (
      month.key !== monthRecordKey(month.scope, key) ||
      month.periodStart !== `${key}-01` ||
      month.periodEnd !== monthEnd(key) ||
      month.recordedAt !== `${nextMonthKey(key)}-01` ||
      month.recordedAt > world.currentDate ||
      key < startMonth
    ) {
      throw new Error(`Macro month has invalid period: ${month.key}`);
    }
    const expected = (lastOrdinal.get(month.scope) ?? -1) + 1;
    if (month.ordinal !== expected) {
      throw new Error(`Macro months must be contiguous: ${month.key}`);
    }
    lastOrdinal.set(month.scope, month.ordinal);
    for (const value of [
      month.growthPct,
      month.unemploymentPct,
      month.inflationPct,
      month.realOutputIndex,
      month.priceIndex,
      month.creditTightness,
      month.policyRate.lowerPct,
      month.policyRate.upperPct,
      ...Object.values(month.innovations),
      ...Object.values(month.impulses),
      ...Object.values(month.drivers ?? {}),
    ]) {
      finite(value, `month value in ${month.key}`);
    }
    if (month.credit) {
      const credit = month.credit;
      for (const value of [
        credit.debtRatio,
        credit.debtRatePct,
        credit.burden,
        credit.chargeOffPct,
        credit.bankCapitalRatio,
        credit.lendingGrowthPct,
        credit.tightness,
        credit.priorUnemploymentPct,
      ])
        finite(value, `credit value in ${month.key}`);
      if (
        month.scope !== "national" ||
        credit.debtRatio < 0 ||
        credit.bankCapitalRatio < 0 ||
        credit.chargeOffPct < 0
      )
        throw new Error(
          `Macro month has an invalid credit record: ${month.key}`,
        );
    }
    if (
      month.realOutputIndex <= 0 ||
      month.priceIndex <= 0 ||
      month.unemploymentPct < 0 ||
      month.unemploymentPct > 100 ||
      !validHousing(month) ||
      (month.scope === "national") !== (month.exposure === null) ||
      (month.scope === "national") !== (month.housing !== null) ||
      (month.exposure !== null &&
        (!Number.isFinite(month.exposure.multiplier) ||
          month.exposure.multiplier < 0)) ||
      month.realIncomeIndex !== null ||
      month.policyRate.lowerPct > month.policyRate.upperPct ||
      (month.unemploymentRule !== undefined &&
        month.unemploymentRule !== UNEMPLOYMENT_RECOVERY_RULE)
    ) {
      throw new Error(`Macro month violates a stock or bound: ${month.key}`);
    }
    for (const shockKey of month.shockKeys) {
      if (!shockKeys.has(shockKey)) {
        throw new Error(`Macro month cites an unknown shock: ${month.key}`);
      }
    }
  }

  const releaseKeys = new Set<string>();
  for (const release of store.releases) {
    if (releaseKeys.has(release.key)) {
      throw new Error(`Duplicate macro release: ${release.key}`);
    }
    releaseKeys.add(release.key);
    const event = eventIds.get(release.eventId);
    if (
      !event ||
      event.type !== "economy.release-published" ||
      event.visibility !== "public" ||
      event.occurredAt !== release.releasedAt
    ) {
      throw new Error(`Macro release lacks its public event: ${release.key}`);
    }
    if (
      release.releasedAt > world.currentDate ||
      release.referencePeriodEnd >= release.releasedAt ||
      release.sourceMonthKeys.length === 0 ||
      release.sourceMonthKeys.some((key) => !monthKeys.has(key))
    ) {
      throw new Error(`Macro release has invalid sources: ${release.key}`);
    }
    if (release.value !== null) finite(release.value, "release value");
  }

  const bank = store.centralBank;
  if (bank) {
    const seated = [
      ...bank.seats.flatMap((seat) => (seat ? [seat] : [])),
      ...(bank.presidents ?? []).flatMap((seat) => (seat ? [seat] : [])),
    ];
    if (
      seated.some(
        (seat) =>
          !world.people[seat.personId] || !eventIds.has(seat.appointedEventId),
      ) ||
      new Set(seated.map((seat) => seat.personId)).size !== seated.length ||
      (bank.chair !== null && !world.people[bank.chair.personId]) ||
      bank.policyRate.lowerPct > bank.policyRate.upperPct ||
      !Number.isFinite(bank.policyRate.lowerPct) ||
      !Number.isFinite(bank.policyRate.upperPct) ||
      (bank.policyRate.decisionEventId !== undefined &&
        bank.policyRate.decisionEventId !== null &&
        !eventIds.has(bank.policyRate.decisionEventId))
    )
      throw new Error("The central bank's record is invalid.");
  }
  if (store.cycle && store.cycle.eventId && !eventIds.has(store.cycle.eventId))
    throw new Error("The business cycle cites an unknown event.");
}
