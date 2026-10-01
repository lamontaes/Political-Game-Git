import web from "../../../data/research/outcome-web/links.json" with { type: "json" };
import { addDays, daysBetween } from "../dates";
import {
  macroConditionsAt,
  macroScopeForJurisdiction,
} from "../macro-economy/readers";
import { lawInForce, lawInForceAtStart } from "../governing/law-in-force";
import { defenseBoostPct } from "../federal-defense-spending";
import { railExpansionPct } from "../federal-passenger-rail";
import { federalDeficitChangePctOfGdp } from "../federal-outlay-laws";
import { parksLawAddedPct } from "../public-budgets/parks-dedication";
import { farmPaymentsCutPctOfLandValue } from "../federal-farm-subsidy-law";
import { stateMinimumSettingAt } from "../minimum-wage";
import {
  PLACE_OUTCOME_BASES,
  placeOutcomeAt,
  placeOutcomeKey,
} from "./place-outcome-store";
import minimumWages from "../../../data/research/money/minimum-wage-2026.json" with { type: "json" };
import { US_FEDERAL_POSITIONS_PACK } from "../policy-pack-us-federal-positions";
import { US_POLICY_POSITIONS_PACK } from "../policy-pack-us-policy-positions";
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
 *
 * A cause named `law:<qualified question key>` is what the law in force says
 * on a policy question in that place (`governing/law-in-force.ts`, federal
 * over state over local): 1 when it says yes, 0 when it says no. Where no law
 * has answered the question, the cause is unrecorded and the base rate, which
 * reflects the status quo, stands.
 */

export const OUTCOME_WEB_VERSION = web.version;

/**
 * The date the outcomes' base data describes. A law cause is measured from
 * the place's law on this date, because the base already includes it.
 */
export const OUTCOME_WEB_CALIBRATED_AT = web.calibratedAt as IsoDate;

const FEDERAL_MINIMUM_HOURLY = minimumWages.federalHourly;

/** Hours in a full-time work year, as pay and local-economy code count them. */
const WORK_HOURS_PER_YEAR = 2_080;

export type OutcomeEvidence =
  "researched" | "provisional" | "contested" | "about-zero" | "to-confirm";
export type OutcomeStrength = "strong" | "moderate" | "weak" | "about-zero";

export type OutcomeLinkShape =
  | { readonly kind: "linear" }
  | { readonly kind: "elasticity" }
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
  /**
   * "only-when": the link acts only as far as the moderator is present (a
   * Medicaid work requirement only where Medicaid covers the adults it binds).
   * Otherwise the moderator scales the link by `effectAtFull` at full level.
   */
  readonly mode?: "scale" | "only-when";
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
  /** Declared structural inventory; never proof of delivery to a person. */
  readonly status: OutcomeLinkStatus;
  readonly unsupportedReason: OutcomeLinkUnsupportedReason | null;
  readonly anchor: string;
  /** Developer reference only. Never shown on a player screen. */
  readonly source: string;
  readonly moderator?: OutcomeLinkModerator;
  /**
   * The uncertainty range the research reports, [low, high]. The mechanism
   * uses the researched `size`; this range does not draw another value.
   */
  readonly range?: readonly [number, number];
  /**
   * Where research sizes the link place by place (a law whose effect depends
   * on how many people it reaches in each state): each place's own central
   * size and range, by its `US-XX` key. A place not listed uses `size`.
   */
  readonly sizeByPlace?: Readonly<
    Record<
      string,
      { readonly size: number; readonly range?: readonly [number, number] }
    >
  >;
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

/** Measures whose baseline is zero: a change from where the place began. */
const CHANGE_MEASURES = new Set([
  "budget.parks-added-pct",
  "labor.minimum-wage-change-pct",
  "federal.defense-boost-pct",
  "federal.rail-expansion-pct",
  "federal.farm-payments-cut-pct-of-land-value",
  "federal.deficit-change-pct-of-gdp",
]);

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

/** A state's minimum wage in force and its 2026 level, or null if unknown. */
function stateMinimumHourlyAt(
  world: World,
  jurisdictionId: EntityId,
  asOf: IsoDate,
): { readonly now: number; readonly before: number } | null {
  const key = placeOutcomeKey(jurisdictionId);
  if (!key || !/^US-[A-Z]{2}$/.test(key)) return null;
  const setting = stateMinimumSettingAt(world, key, asOf);
  if (setting === null) return null;
  return {
    now: Math.max(FEDERAL_MINIMUM_HOURLY, setting.hourlyMinor / 100),
    before: Math.max(FEDERAL_MINIMUM_HOURLY, setting.beforeMinor / 100),
  };
}

/**
 * Measures the web reads that are not place outcomes. Each area adds its
 * measures here as the world starts recording them; a link switches on when
 * its cause does. Place outcomes need no entry: adding one to
 * place-outcome-bases makes it readable, produced and drifting.
 */
const FIXED_MEASURES: Readonly<Record<string, OutcomeMeasure>> = {
  // Every place outcome (place-outcome-bases) is added below.
  "labor.minimum-wage-gap-to-15": {
    key: "labor.minimum-wage-gap-to-15",
    unit: "share of the way from $15 down to $7.25 the state's minimum sits",
    // 1 at the federal $7.25, 0 at $15 or above: how much a federal raise to
    // about $15 binds in the state.
    read: (world, jurisdictionId, asOf) => {
      const minimum = stateMinimumHourlyAt(world, jurisdictionId, asOf);
      if (minimum === null) return null;
      return Math.min(
        1,
        Math.max(0, (15 - minimum.now) / (15 - FEDERAL_MINIMUM_HOURLY)),
      );
    },
  },
  "labor.minimum-wage-change-pct": {
    key: "labor.minimum-wage-change-pct",
    unit: "percent the state minimum wage in force is above its 2026 level",
    // A state law enacted in play replaces the state's rate (#868); without
    // one the 2026 rate stands and the change is zero.
    read: (world, jurisdictionId, asOf) => {
      const minimum = stateMinimumHourlyAt(world, jurisdictionId, asOf);
      return minimum === null ? null : (minimum.now / minimum.before - 1) * 100;
    },
  },
  "labor.minimum-wage-to-median": {
    key: "labor.minimum-wage-to-median",
    unit: "the state minimum wage in force as a share of the place's typical hourly pay",
    // The minimum wage in force (`minimum-wage.ts`, `stateMinimumSettingAt`)
    // over the place's own recorded median earnings (`place-outcomes.ts`, the
    // `labor.median-earnings` record) spread over a 2,080-hour year. Both are
    // saved: a law that sets the wage or a month that moves the earnings
    // changes the reading. Median earnings count people with part-year work,
    // so the ratio reads a little above one built on full-time hourly pay.
    // Null until the place has a recorded month.
    read: (world, jurisdictionId, asOf) => {
      const minimum = stateMinimumHourlyAt(world, jurisdictionId, asOf);
      if (minimum === null) return null;
      const earnings = placeOutcomeAt(
        world,
        "labor.median-earnings",
        jurisdictionId,
        asOf,
      );
      if (earnings === null || !(earnings.value > 0)) return null;
      return minimum.now / (earnings.value / WORK_HOURS_PER_YEAR);
    },
  },

  "budget.parks-added-pct": {
    key: "budget.parks-added-pct",
    unit: "percent of what the place spends on parks that a dedicated parks tax adds or a repeal takes away",
    // A dedication (or a repeal of the one the game began with) moves the
    // state's parks line by the same dollars per resident every month it
    // stands (`public-budgets/parks-dedication.ts`); with none it is zero.
    read: (world, jurisdictionId, asOf) => {
      const key = placeOutcomeKey(jurisdictionId);
      return key === null
        ? null
        : parksLawAddedPct(world, jurisdictionId, key, asOf);
    },
  },
  "federal.defense-boost-pct": {
    key: "federal.defense-boost-pct",
    unit: "percent of what the state produces that extra defense contracts add",
    // A federal law that grows defense spending faster than inflation sends
    // each state more contracts, in proportion to what it draws today
    // (`federal-defense-spending.ts`); with no such law the boost is zero.
    read: (world, jurisdictionId, asOf) => {
      const key = placeOutcomeKey(jurisdictionId);
      return key === null ? null : defenseBoostPct(world, key, asOf);
    },
  },
  "federal.rail-expansion-pct": {
    key: "federal.rail-expansion-pct",
    unit: "percent more intercity rail riders a federal expansion plan projects",
    // A federal law that pays to expand passenger rail grows riders by the
    // same share in every place Amtrak serves (`federal-passenger-rail.ts`);
    // with no such law it is zero.
    read: (world, _jurisdictionId, asOf) => railExpansionPct(world, asOf),
  },
  "federal.farm-payments-cut-pct-of-land-value": {
    key: "federal.farm-payments-cut-pct-of-land-value",
    unit: "percent of the state's farm real estate value that the farm payments cut removes each year",
    // A federal law that cuts farm subsidies removes a share of each state's
    // payments (`federal-farm-subsidy-law.ts`); with no such law it is zero.
    read: (world, jurisdictionId, asOf) => {
      const key = placeOutcomeKey(jurisdictionId);
      return key === null
        ? null
        : farmPaymentsCutPctOfLandValue(world, key, asOf);
    },
  },
  "federal.deficit-change-pct-of-gdp": {
    key: "federal.deficit-change-pct-of-gdp",
    unit: "percentage points of GDP the federal deficit is above where the laws the game began with put it",
    // Federal laws that cut spending before the debt limit rises, or spend
    // more on foreign aid, change the federal deficit
    // (`federal-outlay-laws.ts`); with neither the change is zero. The same
    // nation-wide figure for every place.
    read: (world, _jurisdictionId, asOf) =>
      federalDeficitChangePctOfGdp(world, asOf),
  },
  "labor.unemployment-pct": {
    key: "labor.unemployment-pct",
    unit: "percent of the labor force",
    // The place's own recorded unemployment where there is one, the nation's
    // otherwise (the rule crime has always used).
    read: (world, jurisdictionId, asOf) => {
      const record =
        macroConditionsAt(
          world,
          macroScopeForJurisdiction(jurisdictionId),
          asOf,
        ) ?? macroConditionsAt(world, "national", asOf);
      return record ? record.unemploymentPct : null;
    },
  },
};

/**
 * Every measure the web can read today: the fixed ones above, and every
 * place outcome the world records monthly, read for a place's state.
 */
export const OUTCOME_MEASURES: Readonly<Record<string, OutcomeMeasure>> = {
  ...FIXED_MEASURES,
  ...Object.fromEntries(
    Object.entries(PLACE_OUTCOME_BASES).map(([key, definition]) => [
      key,
      {
        key,
        unit: definition.unit,
        read: (world: World, jurisdictionId: EntityId, asOf: IsoDate) =>
          placeOutcomeAt(world, key, jurisdictionId, asOf)?.value ?? null,
      },
    ]),
  ),
};

export type OutcomeLinkStatus =
  | "built"
  | "about-zero"
  | "size-not-set"
  | "cause-not-recorded"
  | "outcome-not-produced"
  | "person-level";

/**
 * Outcomes some producer computes from `outcomeFactor` today. A link into any
 * other outcome is ready but has nothing to move until that producer reads it.
 */
/**
 * The share of a flood's exposed homes it damages
 * (`crisis/disaster.ts`, `homeLevel`), as a multiplier on the game's rate.
 */
export const FLOOD_DAMAGE_OUTCOME = "disaster.flood-damage";

export const OUTCOMES_PRODUCED: ReadonlySet<string> = new Set([
  FLOOD_DAMAGE_OUTCOME,
  "crime.assault",
  "crime.robbery",
  "crime.burglary",
  "crime.vandalism",
  "births.rate",
  ...Object.keys(PLACE_OUTCOME_BASES),
]);

const LAW_CAUSE_PREFIX = "law:";

/** The qualified keys of every shipped policy question a law can answer. */
const LAW_QUESTION_KEYS: ReadonlySet<string> = new Set(
  [US_POLICY_POSITIONS_PACK, US_FEDERAL_POSITIONS_PACK].flatMap((pack) =>
    (pack.propositions ?? []).map((row) => `${pack.pack}:${row.key}`),
  ),
);

/**
 * A place outcome read as a percent of where the place began: 100 at the
 * start (`crime.violent:pct-of-start`). Town crime reads the state's violent
 * crime this way, as a ratio, whatever the state's own level.
 */
const PCT_OF_START_SUFFIX = ":pct-of-start";

function placeOutcomeOfPctOfStart(key: string): string | null {
  if (!key.endsWith(PCT_OF_START_SUFFIX)) return null;
  const measure = key.slice(0, -PCT_OF_START_SUFFIX.length);
  return PLACE_OUTCOME_BASES[measure] ? measure : null;
}

/**
 * The part of a place outcome that its causes moved, in the outcome's own
 * units: 0 until a law or another outcome moves it
 * (`program.snap-receipt:moved-by-causes`). The outcome's own drift, which
 * stands for everything the web does not model, is left out, so a link that
 * reads this acts only on what the world's causes did.
 */
const MOVED_BY_CAUSES_SUFFIX = ":moved-by-causes";

function placeOutcomeMovedByCauses(key: string): string | null {
  if (!key.endsWith(MOVED_BY_CAUSES_SUFFIX)) return null;
  const measure = key.slice(0, -MOVED_BY_CAUSES_SUFFIX.length);
  return PLACE_OUTCOME_BASES[measure] ? measure : null;
}

/**
 * A law's own answer is not always the cause an outcome reads. A state law that
 * answers yes to "raise the minimum wage" carries a wage term (its bill's, or
 * the average raise, `minimum-wage.ts`), and the outcome web reads the wage the
 * term sets. So the question feeds the links whose cause is that measure, the
 * same way it feeds a link whose cause is `law:<question>`.
 */
export const LAW_QUESTION_MEASURES: Readonly<
  Record<string, readonly string[]>
> = {
  "us-policy-positions:labor-workforce.raise-minimum-wage": [
    "labor.minimum-wage-change-pct",
  ],
  "us-federal-positions:defense.grow-defense-spending": [
    "federal.defense-boost-pct",
  ],
  "us-federal-positions:transport-water.expand-passenger-rail": [
    "federal.rail-expansion-pct",
  ],
  "us-federal-positions:agriculture.cut-farm-subsidies": [
    "federal.farm-payments-cut-pct-of-land-value",
  ],
  "us-federal-positions:budget.pay-for-a-higher-debt-limit": [
    "federal.deficit-change-pct-of-gdp",
  ],
  "us-federal-positions:foreign-affairs.increase-foreign-aid": [
    "federal.deficit-change-pct-of-gdp",
  ],
};

/** Every link a law on this question feeds, by its answer or by its bill term. */
export function outcomeLinksFedByQuestion(
  questionKey: string,
): readonly OutcomeLink[] {
  const measures = LAW_QUESTION_MEASURES[questionKey] ?? [];
  return OUTCOME_LINKS.filter(
    (link) =>
      link.from === `${LAW_CAUSE_PREFIX}${questionKey}` ||
      measures.includes(link.from),
  );
}

/**
 * The same part as a percent of the outcome's level before its causes acted:
 * 0 until a law or another outcome moves it, 6 when they raised it 6%
 * (`transit.service-access:pct-moved-by-causes`). A link sized as an
 * elasticity reads this, so it acts the same in a place with little of the
 * outcome as in one with a lot.
 */
const PCT_MOVED_BY_CAUSES_SUFFIX = ":pct-moved-by-causes";

function placeOutcomePctMovedByCauses(key: string): string | null {
  if (!key.endsWith(PCT_MOVED_BY_CAUSES_SUFFIX)) return null;
  const measure = key.slice(0, -PCT_MOVED_BY_CAUSES_SUFFIX.length);
  const definition = PLACE_OUTCOME_BASES[measure];
  // A level adds its causes rather than multiplying, so it has no percent.
  return definition && definition.scale !== "level" ? measure : null;
}

/** The reader for a cause: a registered measure, or the law on a question. */
export function outcomeMeasure(key: string): OutcomeMeasure | null {
  const registered = OUTCOME_MEASURES[key];
  if (registered) return registered;
  const movedMeasure = placeOutcomeMovedByCauses(key);
  if (movedMeasure) {
    const definition = PLACE_OUTCOME_BASES[movedMeasure]!;
    return {
      key,
      unit: `${definition.unit}, moved by its causes`,
      read: (world, jurisdictionId, asOf) => {
        const record = placeOutcomeAt(
          world,
          movedMeasure,
          jurisdictionId,
          asOf,
        );
        if (!record) return null;
        const structural = record.structural ?? record.base;
        // From the multiplier, not the rounded value, so an outcome no
        // cause has moved reads exactly 0.
        return definition.scale === "level"
          ? record.value - structural
          : structural * (record.multiplier - 1);
      },
    };
  }
  const pctMovedMeasure = placeOutcomePctMovedByCauses(key);
  if (pctMovedMeasure) {
    return {
      key,
      unit: `percent the causes moved the place's ${PLACE_OUTCOME_BASES[pctMovedMeasure]!.name.toLowerCase()}`,
      read: (world, jurisdictionId, asOf) => {
        const record = placeOutcomeAt(
          world,
          pctMovedMeasure,
          jurisdictionId,
          asOf,
        );
        return record ? (record.multiplier - 1) * 100 : null;
      },
    };
  }
  const placeMeasure = placeOutcomeOfPctOfStart(key);
  if (placeMeasure) {
    return {
      key,
      unit: `percent of the place's starting ${PLACE_OUTCOME_BASES[placeMeasure]!.name.toLowerCase()}`,
      read: (world, jurisdictionId, asOf) => {
        // A save from before the measure replaced an index reads the index
        // until the next monthly pass records the measure itself.
        const replaces = PLACE_OUTCOME_BASES[placeMeasure]!.replaces;
        const record =
          placeOutcomeAt(world, placeMeasure, jurisdictionId, asOf) ??
          (replaces
            ? placeOutcomeAt(world, replaces, jurisdictionId, asOf)
            : null);
        return record && record.base > 0
          ? (record.value / record.base) * 100
          : null;
      },
    };
  }
  if (!key.startsWith(LAW_CAUSE_PREFIX)) return null;
  const questionKey = key.slice(LAW_CAUSE_PREFIX.length);
  if (!LAW_QUESTION_KEYS.has(questionKey)) return null;
  return {
    key,
    unit: "1 when the law in force says yes, 0 when it says no",
    read: (world, jurisdictionId, asOf) => {
      const proposition = Object.values(
        world.policyCatalog?.propositions ?? {},
      ).find((definition) => definition.stableKey === questionKey);
      if (!proposition) return null;
      const law = lawInForce(world, jurisdictionId, proposition.id, asOf);
      if (!law) return null;
      return law.answer === "yes" ? 1 : 0;
    },
  };
}

function baselineOf(
  world: World,
  jurisdictionId: EntityId,
  cause: string,
): number | undefined {
  if (CHANGE_MEASURES.has(cause)) return 0;
  if (placeOutcomeOfPctOfStart(cause)) return 100;
  if (placeOutcomeMovedByCauses(cause)) return 0;
  if (placeOutcomePctMovedByCauses(cause)) return 0;
  // A place outcome is measured from where the place began.
  const placeBase = PLACE_OUTCOME_BASES[cause];
  if (placeBase) {
    const key = placeOutcomeKey(jurisdictionId);
    return key ? placeBase.places[key] : undefined;
  }
  if (cause.startsWith(LAW_CAUSE_PREFIX)) {
    // The law the place had when its base data was measured: only a change
    // from it moves the outcome. No law then counts as "not yes".
    const questionKey = cause.slice(LAW_CAUSE_PREFIX.length);
    const proposition = Object.values(
      world.policyCatalog?.propositions ?? {},
    ).find((definition) => definition.stableKey === questionKey);
    if (!proposition) return 0;
    return lawInForceAtStart(
      world,
      jurisdictionId,
      proposition.id,
      OUTCOME_WEB_CALIBRATED_AT,
    ) === "yes"
      ? 1
      : 0;
  }
  return BASELINES[cause]?.value;
}

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
  if (!outcomeMeasure(link.from)) return "cause-not-recorded";
  if (link.moderator && !outcomeMeasure(link.moderator.measure)) {
    return "cause-not-recorded";
  }
  if (!OUTCOMES_PRODUCED.has(link.to)) return "outcome-not-produced";
  return "built";
}

export type OutcomeLinkUnsupportedReason =
  "size-not-set" | "cause-not-recorded" | "outcome-not-produced";

/** Validate the declared inventory against the existing structural classifier.
 * This does not admit a cause value, a person-level effect or a saved delivery. */
export function validateOutcomeLinkInventory(
  links: readonly OutcomeLink[],
): void {
  for (const link of links) {
    const actual = outcomeLinkStatus(link);
    if (link.status !== actual)
      throw new Error(
        `Outcome link status disagrees with its existing readers: ${link.key}`,
      );
    const reason: OutcomeLinkUnsupportedReason | null =
      link.size === null
        ? "size-not-set"
        : actual === "cause-not-recorded" || actual === "outcome-not-produced"
          ? actual
          : null;
    if (link.unsupportedReason !== reason)
      throw new Error(
        `Outcome link has an invalid blocker reason: ${link.key}`,
      );
  }
}

export function outcomeWebStatus(): readonly {
  readonly key: string;
  readonly owner: string;
  readonly from: string;
  readonly to: string;
  readonly status: OutcomeLinkStatus;
  readonly evidence: OutcomeEvidence;
  readonly unsupportedReason: OutcomeLinkUnsupportedReason | null;
}[] {
  validateOutcomeLinkInventory(OUTCOME_LINKS);
  return OUTCOME_LINKS.map((link) => ({
    key: link.key,
    owner: link.owner,
    from: link.from,
    to: link.to,
    status: outcomeLinkStatus(link),
    evidence: link.evidence,
    unsupportedReason: link.unsupportedReason,
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
    case "elasticity":
      // A relative change is undefined without a positive baseline.
      // Do not turn missing/zero exposure into a fabricated effect.
      if (
        !Number.isFinite(baseline) ||
        baseline <= 0 ||
        !Number.isFinite(value)
      )
        return 1;
      return 1 + size * (delta / baseline);
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

/** Use the researched effect size, including a place's own researched size.
 * Research ranges describe uncertainty; they do not draw a new mechanism. */
export function researchedLinkSize(
  _world: World,
  link: Pick<OutcomeLink, "key" | "size" | "range" | "evidence"> &
    Partial<Pick<OutcomeLink, "sizeByPlace">>,
  jurisdictionId: EntityId,
): number {
  const own = link.sizeByPlace
    ? link.sizeByPlace[placeOutcomeKey(jurisdictionId) ?? ""]
    : undefined;
  return own ? own.size : (link.size ?? 0);
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
    const measure = outcomeMeasure(link.from)!;
    const readAt = lagged(asOf, link.lagMonths);
    const value = measure.read(world, jurisdictionId, readAt);
    if (value === null) continue;
    const baseline = baselineOf(world, jurisdictionId, link.from);
    if (baseline === undefined) continue;
    // A lagged effect phases in after its law, but it does not outlast the
    // law: once the law in force is back to where the place began (a repeal
    // or amendment took effect), the effect ends that day, not a lag later.
    if (
      link.lagMonths > 0 &&
      link.from.startsWith(LAW_CAUSE_PREFIX) &&
      value !== baseline &&
      measure.read(world, jurisdictionId, asOf) === baseline
    ) {
      continue;
    }
    let factor = shapedLinkFactor(
      {
        shape: link.shape,
        size: researchedLinkSize(world, link, jurisdictionId),
      },
      value,
      baseline,
    );
    if (link.moderator) {
      const level = outcomeMeasure(link.moderator.measure)!.read(
        world,
        jurisdictionId,
        readAt,
      );
      if (level !== null) {
        const scale =
          link.moderator.mode === "only-when"
            ? Math.min(1, Math.max(0, level))
            : 1 + link.moderator.effectAtFull * level;
        factor = 1 + (factor - 1) * scale;
      } else if (link.moderator.mode === "only-when") {
        // Unknown whether the condition holds: the link cannot be said to act.
        continue;
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

// Admit the catalog before any caller can use an effect or status reading.
validateOutcomeLinkInventory(OUTCOME_LINKS);
