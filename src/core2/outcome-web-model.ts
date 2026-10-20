/**
 * The outcome web's rules, pure (M3-04): which measures a link reads and
 * moves, how far a link moves its outcome, and whether each researched link
 * runs on the new core or waits on a named measure.
 *
 * An outcome the web keeps is its modeled base times the product of its
 * links' factors (a "level" outcome adds them instead). Each factor is the
 * link's researched size times how far its cause sits from the cause's
 * baseline, shaped by the link's kind. Nothing here draws a level or clips a
 * factor: the research's floors and ceilings are checks on a finished run.
 */
import web from "../../data/research/outcome-web/links.json" with { type: "json" };
import bases from "../../data/research/outcome-web/place-outcome-bases-2024.json" with { type: "json" };
import ledger from "../../data/research/outcome-web/placeholder-ledger.json" with { type: "json" };
import local from "./data/outcome-web/outcome-web.json" with { type: "json" };
import coverageData from "./data/outcome-web/coverage.json" with { type: "json" };
import type { Source } from "./types";

export type Shape =
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

export interface WebLink {
  readonly key: string;
  readonly from: string;
  /**
   * The measure the new core reads the cause from when it is not `from` (the
   * old engine's name): an engine's own records, e.g. the victimization index.
   */
  readonly readFrom?: string;
  readonly to: string;
  readonly shape: Shape;
  readonly size: number | null;
  readonly per: string;
  readonly lagMonths: number;
  /**
   * Months over which the effect builds after its lag: the cause read is the
   * average of these months, so a step in the cause reaches its full effect
   * this many months after the lag (absent, the whole effect at once).
   */
  readonly phaseInMonths?: number;
  readonly group: string;
  /** Names what carries this effect through an engine's records; the link then does not run. */
  readonly carriedBy?: string;
  readonly evidence: string;
  readonly source: string;
  readonly moderator?: {
    readonly measure: string;
    readonly effectAtFull: number;
    readonly mode?: "scale" | "only-when";
  };
  /** How the link lands on different people, from its research (src/core2/outcome-web-reach.ts). */
  readonly varies?: readonly Varies[];
  readonly sizeByPlace?: Readonly<Record<string, { readonly size: number }>>;
  readonly floor?: number;
  readonly ceiling?: number;
}

/** The circumstance a link's effect varies by: a field an engine knows about its subject. */
export type VariesBy =
  | "incomeFifth"
  | "age"
  | "sex"
  | "householdKind"
  | "tenure"
  | "work"
  | "region";

/** One band of a moderator: who is in it, how hard the cause lands there, and the band's national share. */
export interface VariesBand {
  /** A value of the subject's field, or for a number, `min` (inclusive) to `max` (exclusive). */
  readonly is?: string | number;
  readonly min?: number;
  readonly max?: number;
  /** The effect in this band against the others' (the research's ratio, before scaling). */
  readonly weight: number;
  /** The band's share of the national population the research's average covers. */
  readonly share: number;
}

/** A researched moderator: the bands, the source and the words the weights stand on. */
export interface Varies {
  readonly by: VariesBy;
  readonly bands: readonly VariesBand[];
  readonly tag: "SOURCED" | "ESTIMATED";
  /** The paper, table and page. */
  readonly source: string;
  readonly quote: string;
  readonly estimatedFrom?: string;
}

export type Scale = "share" | "index" | "rate" | "level";

interface BaseDefinition {
  readonly name: string;
  readonly unit: string;
  readonly scale?: Scale;
  readonly places: Readonly<Record<string, number>>;
}

/** The web module's id; here so readers of the web need not load the module itself. */
export const OUTCOME_WEB_MODULE_ID = "core2-outcome-web-v1";
export const WEB_LINKS = (web.links as unknown as readonly WebLink[]).map(
  (link) => (link.readFrom ? { ...link, from: link.readFrom } : link),
);
export const WEB_VERSION = web.version;
/** The date the research's base levels describe; laws in force then are the baseline. */
export const CALIBRATED_AT = web.calibratedAt;
export const WEB_SETTINGS = local;
const BASES = bases.measures as unknown as Readonly<
  Record<string, BaseDefinition>
>;
const KEPT_LOCAL = local.keptOutcomes as unknown as Readonly<
  Record<
    string,
    {
      readonly scale: Scale;
      readonly unit: string;
      readonly national?: number;
      readonly source: Source;
    }
  >
>;
const BASELINES = web.baselines as Readonly<
  Record<string, { readonly value: number }>
>;
const ENGINE = local.engineMeasures as Readonly<
  Record<
    string,
    {
      readonly owner: string;
      /** The field of a month row the measure reads (world-metrics', else the engine's own table). */
      readonly field: string;
      /** Or a named reader of an engine's own record (src/core2/modules/outcome-web.ts). */
      readonly reader?: string;
      readonly unitScale: number;
      /** The engine's record is the kept outcome itself; links into it do not run. */
      readonly ownsOutcome?: boolean;
      /** An engine that keeps its own month rows by place: its module and table (rows have `placeId`, `date`, `id`). */
      readonly module?: string;
      readonly table?: string;
    }
  >
>;
export const LAW_PREFIX = "law:";
/** An index outcome reads 100 where the place began. */
const INDEX_START = local.indexStart;

/** Derived readings of a kept outcome: how far its causes moved it. */
const SUFFIXES = [
  ":pct-of-start",
  ":moved-by-causes",
  ":pct-moved-by-causes",
] as const;
type Suffix = (typeof SUFFIXES)[number];

export function derivedOf(
  measure: string,
): { readonly measure: string; readonly suffix: Suffix } | null {
  for (const suffix of SUFFIXES)
    if (measure.endsWith(suffix)) {
      const base = measure.slice(0, -suffix.length);
      return keptOutcome(base) ? { measure: base, suffix } : null;
    }
  return null;
}

/** Outcomes the web keeps itself: every measure with a real base, and the crime and birth outcomes. */
export function keptOutcome(measure: string): boolean {
  return measure in BASES || measure in KEPT_LOCAL;
}

export const KEPT_OUTCOMES: readonly string[] = [
  ...Object.keys(BASES),
  ...Object.keys(KEPT_LOCAL),
].sort();

export function scaleOf(measure: string): Scale {
  return BASES[measure]?.scale ?? KEPT_LOCAL[measure]?.scale ?? "share";
}

export function engineMeasure(measure: string) {
  return ENGINE[measure];
}

/** A kept outcome whose value is an engine's own record, not the web's product. */
export function engineOwned(measure: string): boolean {
  return keptOutcome(measure) && ENGINE[measure]?.ownsOutcome === true;
}

export function isLaw(measure: string): boolean {
  return measure.startsWith(LAW_PREFIX);
}

/** A cause the core can read: a kept outcome (or a reading of one), an engine record, or a law. */
export function causeAvailable(measure: string): boolean {
  return (
    isLaw(measure) ||
    measure in ENGINE ||
    keptOutcome(measure) ||
    derivedOf(measure) !== null
  );
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]!
    : (sorted[middle - 1]! + sorted[middle]!) / 2;
};

/**
 * A kept outcome's starting level in a state: its recorded 2024 level, the
 * research's labeled estimate where the source left the place out, or the
 * median of the places it reports (labeled). Never zero, never drawn.
 */
export function baseOf(
  measure: string,
  stateKey: string,
): { readonly value: number; readonly source: Source } {
  const local = KEPT_LOCAL[measure];
  if (local)
    return {
      value: local.scale === "index" ? INDEX_START : local.national!,
      source: local.source,
    };
  const definition = BASES[measure];
  if (!definition) throw new Error(`No base for outcome ${measure}.`);
  const citation = `${bases.id}: ${definition.name} (${definition.unit}).`;
  const own = definition.places[stateKey];
  if (own !== undefined)
    return {
      value: own,
      source: { tag: "SOURCED", citation, asOf: bases.calibratedAt },
    };
  const entry = ledger.entries.find(
    (row) => row.measure === measure && row.jurisdictionKeys.includes(stateKey),
  );
  if (entry?.value !== undefined)
    return {
      value: entry.value,
      source: {
        tag: "ESTIMATED",
        citation,
        asOf: bases.calibratedAt,
        estimatedFrom: entry.estimatedFrom,
      },
    };
  return {
    value: median(Object.values(definition.places)),
    source: {
      tag: "ESTIMATED",
      citation,
      asOf: bases.calibratedAt,
      estimatedFrom: `The median of the ${Object.keys(definition.places).length} places the source reports; ${stateKey} is not among them.`,
    },
  };
}

/** The level a cause is measured from: only a move away from it moves an outcome. */
export function fixedBaseline(
  measure: string,
  stateKey: string,
): number | undefined {
  const derived = derivedOf(measure);
  if (derived) return derived.suffix === ":pct-of-start" ? INDEX_START : 0;
  // An engine-kept outcome starts where the engine's record first read.
  if (keptOutcome(measure))
    return engineMeasure(measure) ? undefined : baseOf(measure, stateKey).value;
  return BASELINES[measure]?.value;
}

/** The link's size here: a per-place size where the research gives one. */
export function sizeIn(link: WebLink, stateKey: string): number {
  return link.sizeByPlace?.[stateKey]?.size ?? link.size ?? 0;
}

/**
 * How far one link moves its outcome when the cause reads `value` against
 * `baseline`: a proportional change (the factor less one), or for a level
 * outcome, the change in its own unit.
 */
export function linkEffect(
  link: WebLink,
  size: number,
  value: number,
  baseline: number,
): number {
  const delta = value - baseline;
  switch (link.shape.kind) {
    case "linear":
      return size * delta;
    case "elasticity":
      // A relative change needs a positive baseline; none means no effect.
      return baseline > 0 && Number.isFinite(value)
        ? size * (delta / baseline)
        : 0;
    case "threshold": {
      const over = Math.max(0, value - link.shape.at);
      const steeperAt = link.shape.steeperAt ?? null;
      const overSteeper =
        steeperAt === null ? 0 : Math.max(0, value - steeperAt);
      return size * over + (link.shape.steeperExtraSize ?? 0) * overSteeper;
    }
    case "diminishing":
      return (size * delta) / (1 + Math.abs(delta) / link.shape.scale);
    case "exposure-years":
    case "acute-decay":
      return 0;
  }
}

/** The moderator's hold on a link: 0 to 1 for "only-when", a scale otherwise. */
export function moderatorScale(
  moderator: NonNullable<WebLink["moderator"]>,
  level: number,
): number {
  return moderator.mode === "only-when"
    ? Math.min(1, Math.max(0, level))
    : 1 + moderator.effectAtFull * level;
}

export type Coverage =
  | { readonly key: string; readonly wired: true }
  | {
      readonly key: string;
      readonly wired: false;
      /** What carries the effect through an engine's records; a web link too would count the cause twice. */
      readonly carriedBy: string;
      readonly waitingOn: readonly [];
    }
  | {
      readonly key: string;
      readonly wired: false;
      readonly waitingOn: readonly string[];
      readonly needsSize?: true;
    };

/**
 * Whether a link runs on the new core, and if not, the measures it waits on.
 * It runs when its cause (and moderator) can be read, its outcome is one the
 * web keeps, it has a researched size, and it acts on a place's rate (a
 * person-level shape needs each person's own exposure record).
 */
export function linkCoverage(link: WebLink): Coverage {
  if (link.carriedBy)
    return {
      key: link.key,
      wired: false,
      carriedBy: link.carriedBy,
      waitingOn: [],
    };
  const waitingOn: string[] = [];
  const personShape =
    link.shape.kind === "exposure-years" || link.shape.kind === "acute-decay";
  if (personShape) waitingOn.push(`person:${link.from}`);
  else if (!causeAvailable(link.from)) waitingOn.push(link.from);
  if (link.moderator && !causeAvailable(link.moderator.measure))
    waitingOn.push(link.moderator.measure);
  if (!keptOutcome(link.to)) waitingOn.push(link.to);
  const needsSize = link.size === null;
  if (waitingOn.length || needsSize)
    return {
      key: link.key,
      wired: false,
      waitingOn: [...new Set(waitingOn)],
      ...(needsSize ? { needsSize: true as const } : {}),
    };
  return { key: link.key, wired: true };
}

/** The links that run, by the outcome they move. */
export const WIRED_INTO: ReadonlyMap<string, readonly WebLink[]> = (() => {
  const into = new Map<string, WebLink[]>();
  for (const link of WEB_LINKS) {
    if (!linkCoverage(link).wired) continue;
    const list = into.get(link.to) ?? [];
    list.push(link);
    into.set(link.to, list);
  }
  return into;
})();

/** Who provides a missing measure (the longest matching prefix in the owners table). */
export function ownerOf(measure: string): string {
  const name = measure.replace(/^person:/, "");
  const owners = local.measureOwners.owners as Record<string, string>;
  const match = Object.keys(owners)
    .filter((prefix) => name.startsWith(prefix))
    .sort((a, b) => b.length - a.length)[0];
  return match ? owners[match]! : "OPUS-CORE";
}

/** The checked-in coverage list (data the coverage test holds to the code). */
export const COVERAGE_DATA = coverageData as unknown as {
  readonly wired: readonly string[];
  readonly waiting: Readonly<
    Record<
      string,
      {
        readonly waitingOn: readonly string[];
        readonly needsSize?: true;
        readonly carriedBy?: string;
      }
    >
  >;
  readonly measuresWanted: Readonly<
    Record<string, { readonly owner: string; readonly links: number }>
  >;
};

/** The coverage list as data, computed from the links and what the core can read. */
export function coverageTable(): typeof COVERAGE_DATA {
  const wired: string[] = [];
  const waiting: Record<
    string,
    { waitingOn: string[]; needsSize?: true; carriedBy?: string }
  > = {};
  const wanted: Record<string, { owner: string; links: number }> = {};
  for (const link of WEB_LINKS) {
    const c = linkCoverage(link);
    if (c.wired) {
      wired.push(link.key);
      continue;
    }
    waiting[link.key] = {
      waitingOn: [...c.waitingOn],
      ...("needsSize" in c && c.needsSize ? { needsSize: true as const } : {}),
      ...("carriedBy" in c ? { carriedBy: c.carriedBy } : {}),
    };
    for (const measure of c.waitingOn) {
      const row = (wanted[measure] ??= { owner: ownerOf(measure), links: 0 });
      row.links += 1;
    }
  }
  const measuresWanted = Object.fromEntries(
    Object.entries(wanted).sort(
      (a, b) => b[1].links - a[1].links || a[0].localeCompare(b[0]),
    ),
  );
  return { wired, waiting, measuresWanted };
}
