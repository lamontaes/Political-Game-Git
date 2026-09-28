import { makeIsoDate } from "../dates";
import type { EntityId, IsoDate, World } from "../types";
import type {
  ChainStep,
  LinkEffectKind,
  MeasureReading,
  OutcomeLink,
  OutcomeLinksFile,
  OutcomeMeasureKey,
  WebFactorReading,
} from "./contract";
import { linksInto, outcomeLinks } from "./links";
import { outcomeMeasureDefinition, readOutcomeMeasure } from "./registry";

export type MeasureRead = (
  world: World,
  key: OutcomeMeasureKey,
  jurisdictionId: EntityId,
  asOf: IsoDate,
) => MeasureReading | null;

export interface CombineOptions {
  readonly links?: OutcomeLinksFile;
  readonly read?: MeasureRead;
}

/** The same day `months` months earlier, held to the month's last day. */
export function monthsBefore(date: IsoDate, months: number): IsoDate {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const index = year * 12 + (month - 1) - months;
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const d = Math.min(day, last);
  return makeIsoDate(
    `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
  );
}

const signed = (link: OutcomeLink): number =>
  link.direction === "none"
    ? 0
    : (link.direction === "down" ? -1 : 1) * (link.size ?? 0);

/**
 * The cause averaged over the lag window, from `lagMonths` to `fullMonths`
 * months ago, so a change builds in over the window. Months with nothing
 * recorded are skipped; a window with nothing recorded is unknown.
 */
function causeOverWindow(
  world: World,
  link: OutcomeLink,
  jurisdictionId: EntityId,
  asOf: IsoDate,
  read: MeasureRead,
): { value: number; baseline: number } | null {
  let total = 0;
  let count = 0;
  let baseline: number | null = null;
  for (let months = link.lagMonths; months <= link.fullMonths; months += 1) {
    const reading = read(
      world,
      link.from,
      jurisdictionId,
      monthsBefore(asOf, months),
    );
    if (!reading) continue;
    total += reading.value;
    count += 1;
    baseline ??= reading.baseline;
  }
  if (count === 0 || baseline === null) return null;
  return { value: total / count, baseline: link.baseline ?? baseline };
}

/**
 * One link's raw effect before its own bounds: a share (relative links) or
 * points. Null when the shape cannot be read from what is recorded.
 */
function shapedEffect(
  world: World,
  link: OutcomeLink,
  jurisdictionId: EntityId,
  asOf: IsoDate,
  read: MeasureRead,
): { effect: number; value: number; baseline: number } | null {
  const size = signed(link);
  if (link.shape === "acute-decay") {
    const decay = link.decayMonths!;
    let effect = 0;
    let first: { value: number; baseline: number } | null = null;
    for (let k = 0; k <= Math.ceil(decay * 3); k += 1) {
      const reading = read(
        world,
        link.from,
        jurisdictionId,
        monthsBefore(asOf, link.lagMonths + k),
      );
      if (!reading) continue;
      const baseline = link.baseline ?? reading.baseline;
      first ??= { value: reading.value, baseline };
      effect += size * (reading.value - baseline) * Math.exp(-k / decay);
    }
    return first ? { effect, ...first } : null;
  }
  const cause = causeOverWindow(world, link, jurisdictionId, asOf, read);
  if (!cause) return null;
  const delta = cause.value - cause.baseline;
  switch (link.shape) {
    case "linear":
      return { effect: size * delta, ...cause };
    case "threshold": {
      const thresholds = link.thresholds!;
      const slopes = link.slopes!;
      const sign =
        link.direction === "down" ? -1 : link.direction === "none" ? 0 : 1;
      const past = (x: number) =>
        thresholds.reduce((sum, threshold, index) => {
          const next = thresholds[index + 1] ?? Number.POSITIVE_INFINITY;
          return (
            sum + slopes[index]! * Math.max(0, Math.min(x, next) - threshold)
          );
        }, 0);
      return {
        effect: sign * (past(cause.value) - past(cause.baseline)),
        ...cause,
      };
    }
    case "diminishing":
      if (!(cause.value > 0 && cause.baseline > 0)) return null;
      return {
        effect: size * Math.log(cause.value / cause.baseline),
        ...cause,
      };
    case "exposure-years": {
      const cap = link.maxYears!;
      return {
        effect:
          size * (Math.min(cause.value, cap) - Math.min(cause.baseline, cap)),
        ...cause,
      };
    }
    case "moderated": {
      const moderator = link.moderator!;
      const m = read(
        world,
        moderator.measure,
        jurisdictionId,
        monthsBefore(asOf, link.lagMonths),
      );
      if (!m) return null;
      const scale =
        moderator.mode === "scale" ? m.value : 1 - moderator.share * m.value;
      return { effect: size * delta * scale, ...cause };
    }
  }
}

function bounded(
  link: OutcomeLink,
  effect: LinkEffectKind,
  raw: number,
): number {
  const floor =
    link.floor ?? (effect === "relative" ? 0 : Number.NEGATIVE_INFINITY);
  const ceiling = link.ceiling ?? Number.POSITIVE_INFINITY;
  const value = effect === "relative" ? 1 + raw : raw;
  return Math.min(
    ceiling,
    Math.max(Math.max(effect === "relative" ? 0 : floor, floor), value),
  );
}

/**
 * How the web moves one measure in one place on one date: the points it adds
 * to the base and the capped factor it multiplies by, with each cause's part.
 * With no causes recorded the factor is 1, which is the base rate, not zero.
 */
export function webFactor(
  world: World,
  measure: OutcomeMeasureKey,
  jurisdictionId: EntityId,
  asOf: IsoDate,
  options: CombineOptions = {},
): WebFactorReading {
  const file = options.links ?? outcomeLinks();
  const read = options.read ?? readOutcomeMeasure;
  const definition = outcomeMeasureDefinition(measure);
  const chain: ChainStep[] = [];
  let product = 1;
  let points = 0;
  for (const link of linksInto(file, measure)) {
    const base = {
      linkId: link.id,
      from: link.from,
      effect: link.effect,
    } as const;
    if (link.strength === "about-zero") {
      chain.push({
        ...base,
        status: "about-zero",
        causeValue: null,
        causeBaseline: null,
        amount: link.effect === "relative" ? 1 : 0,
      });
      continue;
    }
    if (link.size === null) {
      chain.push({
        ...base,
        status: "unsized",
        causeValue: null,
        causeBaseline: null,
        amount: link.effect === "relative" ? 1 : 0,
      });
      continue;
    }
    const shaped = shapedEffect(world, link, jurisdictionId, asOf, read);
    if (!shaped) {
      chain.push({
        ...base,
        status: "unknown-cause",
        causeValue: null,
        causeBaseline: null,
        amount: link.effect === "relative" ? 1 : 0,
      });
      continue;
    }
    const amount = bounded(link, link.effect, shaped.effect);
    if (link.effect === "relative") product *= amount;
    else points += amount;
    chain.push({
      ...base,
      status: "counted",
      causeValue: shaped.value,
      causeBaseline: shaped.baseline,
      amount,
    });
  }
  const floor = definition?.factorFloor ?? 0;
  const ceiling = definition?.factorCeiling ?? Number.POSITIVE_INFINITY;
  return {
    measure,
    jurisdictionId,
    asOf,
    points,
    factor: Math.min(ceiling, Math.max(floor, product)),
    chain,
  };
}

/**
 * A place's rate from its calibrated base: (base + points) times the factor,
 * never below zero.
 */
export function webAdjustedRate(
  base: number,
  reading: WebFactorReading,
): number {
  return Math.max(0, (base + reading.points) * reading.factor);
}
