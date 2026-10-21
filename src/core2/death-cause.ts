/**
 * What a death was. One rule for both tiers: a full person's death
 * (modules/health.ts) and a counted person's (births-counted.ts) take a cause
 * from the same sourced shares by age (data/health/death-causes.json), and
 * the outcome web's factor for each cause multiplies that cause's share, so
 * the death hazard rises by the share the web moved.
 *
 * The cause is assigned, never rolled: every death adds each cause's share
 * to the place's carry for the age band, and the death takes the cause the
 * band is owed the most (ties by cause id), paying one back. A person with
 * the substance-use-disorder condition takes an overdose first whenever the
 * band is owed one.
 */
import causeData from "./data/health/death-causes.json" with { type: "json" };
import { ssa2023AnnualProbability } from "./health-mortality-table";
import { webReach, type Subject } from "./outcome-web-reach";
import { registerWorldMapPart } from "./snapshot";
import type { CoreAPI, CoreState } from "./types";

export const OTHER_CAUSE = "other";
export const OVERDOSE_CAUSE = "drug-overdose";
/** The event fact a death carries its cause under. */
export const DEATH_CAUSE_FACT_KEY = "causeOfDeath";
export const SUBSTANCE_CONDITION = "substance-use-disorder";
const HALF = 2;
const PER_100000 = 100_000;

interface Band {
  readonly min: number;
  readonly max: number;
  readonly deaths?: number;
  readonly ratePer100000?: number;
}
interface CauseRow {
  readonly id: string;
  readonly measure: string;
  readonly webAges: { readonly min: number; readonly max: number } | null;
  readonly method: string;
  readonly scaleToTotal?: number;
  readonly bands: readonly Band[];
}
const CAUSES = (causeData.causes as readonly CauseRow[])
  .slice()
  .sort((a, b) => (a.id < b.id ? -1 : 1));
const ALL_DEATHS = causeData.allDeaths.bands as readonly Band[];

/** Every cause id a death can carry, in tie order. */
export const DEATH_CAUSE_IDS: readonly string[] = [
  ...CAUSES.map((cause) => cause.id),
  OTHER_CAUSE,
].sort();

/** All deaths in an age range, spreading each band evenly across its years. */
function deathsIn(min: number, max: number): number {
  let total = 0;
  for (const band of ALL_DEATHS) {
    const overlap = Math.min(max, band.max) - Math.max(min, band.min);
    if (overlap > 0)
      total += (band.deaths ?? 0) * (overlap / (band.max - band.min));
  }
  return total;
}

/** The index of the all-deaths band an age falls in (the carry's age band). */
export function ageBandOf(age: number): number {
  const at = ALL_DEATHS.findIndex((band) => age >= band.min && age < band.max);
  return at < 0 ? ALL_DEATHS.length - 1 : at;
}

const lifeTable = new Map<number, number>();
const allCauseProbability = (whole: number) => {
  let found = lifeTable.get(whole);
  if (found === undefined) {
    found =
      (Number(ssa2023AnnualProbability(Math.min(whole, 119), "male")) +
        Number(ssa2023AnnualProbability(Math.min(whole, 119), "female"))) /
      HALF;
    lifeTable.set(whole, found);
  }
  return found;
};

/** Each band's share of its age band's deaths for one cause. */
function bandShares(cause: CauseRow): number[] {
  const scale = cause.scaleToTotal
    ? cause.scaleToTotal /
      cause.bands.reduce((n, band) => n + (band.deaths ?? 0), 0)
    : 1;
  return cause.bands.map((band) =>
    band.ratePer100000 !== undefined
      ? band.ratePer100000 / PER_100000 // turned into a share at the age, below
      : ((band.deaths ?? 0) * scale) / deathsIn(band.min, band.max),
  );
}
const SHARES = new Map(CAUSES.map((cause) => [cause.id, bandShares(cause)]));

/** One cause's share of all deaths at an age: linear between band midpoints, flat past the ends. */
function shareOf(cause: CauseRow, age: number): number {
  const levels = SHARES.get(cause.id)!;
  const mids = cause.bands.map((band) => (band.min + band.max) / HALF);
  const whole = Math.max(0, Math.floor(age));
  const level = (at: number) =>
    cause.method === "rate"
      ? levels[at]! / allCauseProbability(whole)
      : levels[at]!;
  let value: number;
  if (age <= mids[0]!) value = level(0);
  else if (age >= mids[mids.length - 1]!) value = level(mids.length - 1);
  else {
    let i = 1;
    while (age > mids[i]!) i += 1;
    const part = (age - mids[i - 1]!) / (mids[i]! - mids[i - 1]!);
    value = level(i - 1) + (level(i) - level(i - 1)) * part;
  }
  return Math.min(1, value);
}

const baseCache = new Map<number, Readonly<Record<string, number>>>();
/** Each cause's share of deaths at a whole age before the web moves any, with the rest as `other`. */
export function baseCauseShares(age: number): Readonly<Record<string, number>> {
  const whole = Math.max(0, Math.floor(age));
  let found = baseCache.get(whole);
  if (!found) {
    const raw = CAUSES.map((cause) => shareOf(cause, whole));
    const sum = raw.reduce((n, share) => n + share, 0);
    const squeeze = sum > 1 ? 1 / sum : 1;
    const shares: Record<string, number> = {};
    CAUSES.forEach((cause, i) => (shares[cause.id] = raw[i]! * squeeze));
    shares[OTHER_CAUSE] = Math.max(0, 1 - sum * squeeze);
    found = shares;
    baseCache.set(whole, found);
  }
  return found;
}

export interface CauseMix {
  /** The multiplier on the death hazard from the causes the web moved (1 where nothing moves). */
  readonly factor: number;
  /** Each cause's share of the deaths now, after the web, adding to one. */
  readonly shares: Readonly<Record<string, number>>;
  /** The web factor on each cause's outcome. */
  readonly causeFactors: Readonly<Record<string, number>>;
  /** The first web month row a cause's factor stands on, or null. */
  readonly recordId: string | null;
}

const CACHE = new WeakMap<
  object,
  { date: string; rows: Map<string, CauseMix> }
>();

/**
 * The web's factor on every cause for a person of this age and income fifth,
 * cached by place, age and fifth for the day. The hazard factor is the base
 * shares times these, with the rest at one.
 */
export function causeMix(
  api: CoreAPI,
  placeId: string,
  age: number,
  incomeFifth?: number,
): CauseMix {
  const core = api.state as CoreState;
  let cache = CACHE.get(core);
  if (!cache || cache.date !== core.date) {
    cache = { date: core.date, rows: new Map() };
    CACHE.set(core, cache);
  }
  const whole = Math.max(0, Math.floor(age));
  const key = `${placeId}|${whole}|${incomeFifth ?? "-"}`;
  const found = cache.rows.get(key);
  if (found) return found;
  const subject: Subject = {
    age: whole,
    ...(incomeFifth === undefined ? {} : { incomeFifth }),
  };
  const base = baseCauseShares(whole);
  const causeFactors: Record<string, number> = {};
  let recordId: string | null = null;
  let factor = 1;
  for (const cause of CAUSES) {
    const inWindow =
      !cause.webAges ||
      (whole >= cause.webAges.min && whole < cause.webAges.max);
    const reach = inWindow
      ? webReach(api, placeId, cause.measure, subject)
      : undefined;
    causeFactors[cause.id] = reach?.factor ?? 1;
    if (reach?.factor !== undefined && reach.factor !== 1)
      recordId ??= reach.recordId;
    factor += base[cause.id]! * (causeFactors[cause.id]! - 1);
  }
  const shares: Record<string, number> = {
    [OTHER_CAUSE]: base[OTHER_CAUSE]! / factor,
  };
  for (const cause of CAUSES)
    shares[cause.id] = (base[cause.id]! * causeFactors[cause.id]!) / factor;
  const result: CauseMix = { factor, shares, causeFactors, recordId };
  cache.rows.set(key, result);
  return result;
}

/** What each place owes by age band and cause: the carry that assigns causes. */
const carries = new WeakMap<object, Map<string, number>>();
registerWorldMapPart("death-cause-carry", carries);

export interface DeathCause {
  readonly cause: string;
  /** The web month row the cause mix stands on, or null where the web moved nothing. */
  readonly recordId: string | null;
}

/**
 * The cause of one death (or of `weight` real people a counted death stands
 * for): the one the place's age band is owed the most, an overdose first for
 * a person with the substance-use-disorder condition.
 */
export function assignDeathCause(
  api: CoreAPI,
  input: {
    placeId: string;
    age: number;
    incomeFifth?: number;
    substanceUse?: boolean;
    weight?: number;
  },
): DeathCause {
  const core = api.state as CoreState;
  let carry = carries.get(core);
  if (!carry) carries.set(core, (carry = new Map()));
  const weight = input.weight ?? 1;
  const mix = causeMix(api, input.placeId, input.age, input.incomeFifth);
  const band = ageBandOf(input.age);
  const keyOf = (cause: string) => `${input.placeId}|${band}|${cause}`;
  for (const cause of DEATH_CAUSE_IDS)
    carry.set(
      keyOf(cause),
      (carry.get(keyOf(cause)) ?? 0) + mix.shares[cause]! * weight,
    );
  let pick = OTHER_CAUSE;
  let best = -Infinity;
  for (const cause of DEATH_CAUSE_IDS) {
    const owed = carry.get(keyOf(cause))!;
    if (owed > best) {
      best = owed;
      pick = cause;
    }
  }
  if (input.substanceUse && carry.get(keyOf(OVERDOSE_CAUSE))! > 0)
    pick = OVERDOSE_CAUSE;
  carry.set(keyOf(pick), carry.get(keyOf(pick))! - weight);
  return { cause: pick, recordId: mix.recordId };
}
