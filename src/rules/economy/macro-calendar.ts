import { makeIsoDate } from "../../simulation/dates";
import type { IsoDate } from "../../simulation/types";
import type {
  MacroHousingCondition,
  MacroScopeKey,
} from "../../simulation/macro-economy/types";
import { MACRO_ECONOMY_CONTRACT_VERSION } from "../../simulation/macro-economy/types";
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

export function monthRecordKey(scope: MacroScopeKey, monthKey: string): string {
  return `${MACRO_ECONOMY_CONTRACT_VERSION}:month:${scope}:${monthKey}`;
}

// stopgapId: "economy.macro-housing-reading-bands"
export function classifyHousing(
  ratio: number,
): MacroHousingCondition["classification"] {
  if (ratio < 0.98) return "shortage";
  if (ratio > 1.02) return "surplus";
  return "adequate";
}
