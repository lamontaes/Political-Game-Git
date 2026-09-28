import web from "../../../data/research/outcome-web/links.json";
import { addDays, daysBetween } from "../dates";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import type { EntityId, IsoDate, World } from "../types";

/**
 * THE OUTCOME WEB (04 SYSTEM SPECS part 5).
 *
 * Laws move levers, levers move their own area's measures, and measures move
 * each other through ONE table: `data/research/outcome-web/links.json`. Each
 * link says how a cause measure moves an outcome measure, how strongly (from
 * causal research, docs/research/outcome-web-2026-09-28.md), in what shape,
 * after what lag and for whom. No area hand-writes an effect on another area.
 *
 * A producer that sets an outcome's rate (crime, births, graduation...) asks
 * `outcomeFactor` for the multiplier on its base rate and keeps the `causes`
 * it returns, so every change can name its chain. A link counts only when its
 * size is known and its cause is a measure the world records
 * (`OUTCOME_MEASURES`); every other link is listed by `outcomeWebStatus` with
 * the reason, so a later lane knows where to plug in. A cause with no recorded
 * value is not a value of zero: its link is skipped and the base rate stands.
 * An "about-zero" link is zero on purpose: research found no effect.
 */

export const OUTCOME_WEB_VERSION = web.version;

export type OutcomeEvidence =
  "researched" | "provisional" | "contested" | "about-zero" | "to-confirm";
export type OutcomeStrength =
  "strong" | "moderate" | "weak" | "about-zero";

export type OutcomeLinkShape =
  | { readonly kind: "linear" }
  | {
      readonly kind: "threshold";
      readonly at: number;
      readonly steeperAt?: number | null;
      readonly steeperExtraSize?: number | null;
    }
  | { readonly kind: "diminishing"; readonly scale: number }
  | { readonly kind: "exposure-years" }
  | { readonly kind: "acute-decay"; readonly halfLifeDays: number };

export interface OutcomeLinkModerator {
  /** The measure that switches or scales the link. */
  readonly measure: string;
  /** How much the link changes when the moderator is at 1 (-0.75: 75% less). */
  readonly effectAtFull: number;
}

export interface OutcomeLink {
  readonly key: string;
  readonly from: string;
  readonly to: string;
  readonly strength: OutcomeStrength;
  readonly shape: OutcomeLinkShape;
  /** Proportional change in the outcome per unit of the cause; null: unset. */
  readonly size: number | null;
  readonly per: string;
  readonly lagMonths: number;
  readonly group: string;
  readonly owner: string;
  readonly evidence: OutcomeEvidence;
  readonly anchor: string;
  /** Developer reference only. Never shown on a player screen. */
  readonly source: string;
  readonly moderator?: OutcomeLinkModerator;
  readonly floor?: number;
  readonly ceiling?: number;
}

export const OUTCOME_LINKS = web.links as readonly OutcomeLink[];

const TARGET_BOUNDS = web.targets as Readonly<
  Record<string, { readonly floor: number; readonly ceiling: number }>
>;
const BASELINES = web.baselines as Readonly<
  Record<string, { readonly value: number; readonly note: string }>
>;

/**
 * A measure the world records, read for one place on one date. `read` returns
 * null when nothing was recorded; that is never treated as zero.
 */
export interface OutcomeMeasure {
  readonly key: string;
  readonly unit: string;
  readonly read: (
    world: World,
    jurisdictionId: EntityId,
    asOf: IsoDate,
  ) => number | null;
}

/**
 * Every measure the web can read today. Each area adds its measures here as
 * the world starts recording them; a link switches on when its cause does.
 */
export const OUTCOME_MEASURES: Readonly<Record<string, OutcomeMeasure>> = {
  "labor.unemployment-pct": {
    key: "labor.unemployment-pct",
    unit: "percent of the labor force",
    // The place's own recorded unemployment where there is one, the nation's
    // otherwise (the rule crime has always used).
    read: (world, jurisdictionId, asOf) => {
      const record =
        macroConditionsAt(world, macroScopeForJurisdiction(jurisdictionId), asOf) ??
        macroConditionsAt(world, "national", asOf);
      return record ? record.unemploymentPct : null;
    },
  },
};

export type OutcomeLinkStatus =
  | "built"
  | "about-zero"
  | "size-not-set"
  | "cause-not-recorded"
  | "person-level";

/** Whether a link acts in the world today, and if not, why not. */
export function outcomeLinkStatus(link: OutcomeLink): OutcomeLinkStatus {
  if (link.evidence === "about-zero") return "about-zero";
  if (
    link.shape.kind === "exposure-years" ||
    link.shape.kind === "acute-decay"
  ) {
    return "person-level";
  }
  if (link.size === null) return "size-not-set";
  if (!OUTCOME_MEASURES[link.from]) return "cause-not-recorded";
  if (link.moderator && !OUTCOME_MEASURES[link.moderator.measure]) {
    return "cause-not-recorded";
  }
  return "built";
}

export function outcomeWebStatus(): readonly {
  readonly key: string;
  readonly owner: string;
  readonly from: string;
  readonly to: string;
  readonly status: OutcomeLinkStatus;
}[] {
  return OUTCOME_LINKS.map((link) => ({
    key: link.key,
    owner: link.owner,
    from: link.from,
    to: link.to,
    status: outcomeLinkStatus(link),
  }));
}

/** One link's part in an outcome's rate: the chain behind a change. */
export interface OutcomeCause {
  readonly key: string;
  readonly from: string;
  readonly factor: number;
  readonly causeValue: number;
  readonly causeBaseline: number;
  readonly readAt: IsoDate;
  readonly evidence: OutcomeEvidence;
}

export interface OutcomeReading {
  readonly outcome: string;
  /** 1 means the base rate. */
  readonly multiplier: number;
  readonly causes: readonly OutcomeCause[];
}

/**
 * How much one link moves its outcome when the cause sits `delta` units from
 * its baseline (`value` is the cause itself, for thresholds). Returns the
 * factor on the outcome's rate, before the moderator and the link's bounds.
 */
export function shapedLinkFactor(
  link: Pick<OutcomeLink, "shape" | "size">,
  value: number,
  baseline: number,
): number {
  const size = link.size ?? 0;
  const delta = value - baseline;
  switch (link.shape.kind) {
    case "linear":
      return 1 + size * delta;
    case "threshold": {
      const over = Math.max(0, value - link.shape.at);
      const steeperAt = link.shape.steeperAt ?? null;
      const extra = link.shape.steeperExtraSize ?? 0;
      const overSteeper =
        steeperAt === null ? 0 : Math.max(0, value - steeperAt);
      return 1 + size * over + extra * overSteeper;
    }
    case "diminishing": {
      // Each further unit counts for less; the effect never passes
      // size * scale however far the cause moves.
      const scale = link.shape.scale;
      return 1 + (size * delta) / (1 + Math.abs(delta) / scale);
    }
    case "exposure-years":
    case "acute-decay":
      // Person-level shapes read a person's own record, not a place's rate.
      return 1;
  }
}

function lagged(asOf: IsoDate, lagMonths: number): IsoDate {
  // Months are counted as 30.44 days; a lag is a delay, not a calendar rule.
  return lagMonths === 0 ? asOf : addDays(asOf, -Math.round(lagMonths * 30.44));
}

/**
 * The multiplier on `outcome`'s base rate in one place on one date, from every
 * built link into it, with each link's part. Each link's factor keeps to its
 * own bounds (none below zero), and the product keeps to the outcome's bounds.
 */
export function outcomeFactor(
  world: World,
  jurisdictionId: EntityId,
  outcome: string,
  asOf: IsoDate,
): OutcomeReading {
  const causes: OutcomeCause[] = [];
  for (const link of OUTCOME_LINKS) {
    if (link.to !== outcome || outcomeLinkStatus(link) !== "built") continue;
    const measure = OUTCOME_MEASURES[link.from]!;
    const readAt = lagged(asOf, link.lagMonths);
    const value = measure.read(world, jurisdictionId, readAt);
    if (value === null) continue;
    const baseline = BASELINES[link.from]?.value;
    if (baseline === undefined) continue;
    let factor = shapedLinkFactor(link, value, baseline);
    if (link.moderator) {
      const level = OUTCOME_MEASURES[link.moderator.measure]!.read(
        world,
        jurisdictionId,
        readAt,
      );
      if (level !== null) {
        factor = 1 + (factor - 1) * (1 + link.moderator.effectAtFull * level);
      }
    }
    factor = Math.min(
      link.ceiling ?? Number.POSITIVE_INFINITY,
      Math.max(link.floor ?? 0, factor),
    );
    causes.push({
      key: link.key,
      from: link.from,
      factor,
      causeValue: value,
      causeBaseline: baseline,
      readAt,
      evidence: link.evidence,
    });
  }
  const product = causes.reduce((total, cause) => total * cause.factor, 1);
  const bounds = TARGET_BOUNDS[outcome];
  const multiplier = bounds
    ? Math.min(bounds.ceiling, Math.max(bounds.floor, product))
    : product;
  return { outcome, multiplier, causes };
}

/** How far back an acute link still counts, for callers that keep events. */
export function acuteWeight(
  halfLifeDays: number,
  happenedAt: IsoDate,
  asOf: IsoDate,
): number {
  const age = daysBetween(happenedAt, asOf);
  return age < 0 ? 0 : Math.pow(0.5, age / halfLifeDays);
}
