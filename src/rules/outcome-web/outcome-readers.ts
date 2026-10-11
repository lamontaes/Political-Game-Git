import { addDays, daysBetween } from "./calendar";
import {
  outcomeFactorFromFacts,
  type OutcomeFactorReading,
  type OutcomeFactorCauseFacts,
} from "./outcome-factor";
import type { OutcomeLinkShapeFacts } from "./link-factor";

export type LinkStatus =
  | "built"
  | "about-zero"
  | "size-not-set"
  | "cause-not-recorded"
  | "outcome-not-produced"
  | "person-level";
export interface LinkFacts {
  readonly key: string;
  readonly from: string;
  readonly to: string;
  readonly shape: OutcomeLinkShapeFacts;
  readonly size: number | null;
  readonly evidence: string;
  readonly lagMonths: number;
  readonly consumed?: boolean;
  readonly moderator?: {
    readonly measure: string;
    readonly effectAtFull: number;
    readonly mode?: "scale" | "only-when";
  };
  readonly sizeByPlace?: Readonly<Record<string, { readonly size: number }>>;
  readonly floor?: number;
  readonly ceiling?: number;
}
export interface PlaceBaseFacts {
  readonly places: Readonly<Record<string, number>>;
  readonly scale?: "share" | "index" | "rate" | "level";
  readonly replaces?: string;
}
export interface PlaceRecordFacts {
  readonly base: number;
  readonly structural?: number;
  readonly value: number;
  readonly multiplier: number;
}
export interface OutcomeCatalogFacts {
  readonly links: readonly LinkFacts[];
  readonly registeredMeasures: ReadonlySet<string>;
  readonly produced: ReadonlySet<string>;
  readonly questionKeys: ReadonlySet<string>;
  readonly changeMeasures: ReadonlySet<string>;
  readonly placeBases: Readonly<Record<string, PlaceBaseFacts>>;
  readonly baselines: Readonly<Record<string, { readonly value: number }>>;
  readonly calibratedAt: string;
  readonly targets: Readonly<
    Record<string, { readonly floor: number; readonly ceiling: number }>
  >;
}
/** Legal hierarchy and indexed record selection remain with their owning readers. */
export interface OutcomeReaders {
  readonly placeKey: (jurisdictionId: string) => string | null;
  readonly readRegistered: (
    measure: string,
    jurisdictionId: string,
    at: string,
  ) => number | null;
  readonly placeRecord: (
    measure: string,
    jurisdictionId: string,
    at: string,
  ) => PlaceRecordFacts | null;
  /** Undefined proposition differs from an unanswered recorded proposition. */
  readonly lawAnswer: (
    question: string,
    jurisdictionId: string,
    at: string,
  ) => "yes" | "no" | null | undefined;
  readonly startingLawAnswer: (
    question: string,
    jurisdictionId: string,
    at: string,
  ) => "yes" | "no" | null | undefined;
}
export function placeOutcomeOfPctOfStartFromFacts(
  catalog: OutcomeCatalogFacts,
  key: string,
): string | null {
  if (!key.endsWith(":pct-of-start")) return null;
  const measure = key.slice(0, -":pct-of-start".length);
  return catalog.placeBases[measure] ? measure : null;
}
export function placeOutcomeMovedByCausesFromFacts(
  catalog: OutcomeCatalogFacts,
  key: string,
): string | null {
  if (!key.endsWith(":moved-by-causes")) return null;
  const measure = key.slice(0, -":moved-by-causes".length);
  return catalog.placeBases[measure] ? measure : null;
}
export function placeOutcomePctMovedByCausesFromFacts(
  catalog: OutcomeCatalogFacts,
  key: string,
): string | null {
  if (!key.endsWith(":pct-moved-by-causes")) return null;
  const measure = key.slice(0, -":pct-moved-by-causes".length);
  const definition = catalog.placeBases[measure];
  return definition && definition.scale !== "level" ? measure : null;
}
export function outcomeMeasureAvailable(
  catalog: OutcomeCatalogFacts,
  key: string,
): boolean {
  return (
    catalog.registeredMeasures.has(key) ||
    placeOutcomeMovedByCausesFromFacts(catalog, key) !== null ||
    placeOutcomePctMovedByCausesFromFacts(catalog, key) !== null ||
    placeOutcomeOfPctOfStartFromFacts(catalog, key) !== null ||
    (key.startsWith("law:") && catalog.questionKeys.has(key.slice(4)))
  );
}
export function readOutcomeMeasure(
  catalog: OutcomeCatalogFacts,
  readers: OutcomeReaders,
  key: string,
  jurisdictionId: string,
  at: string,
): number | null {
  if (catalog.registeredMeasures.has(key))
    return readers.readRegistered(key, jurisdictionId, at);
  const moved = placeOutcomeMovedByCausesFromFacts(catalog, key);
  if (moved) {
    const record = readers.placeRecord(moved, jurisdictionId, at);
    if (!record) return null;
    const structural = record.structural ?? record.base;
    return catalog.placeBases[moved]!.scale === "level"
      ? record.value - structural
      : structural * (record.multiplier - 1);
  }
  const pctMoved = placeOutcomePctMovedByCausesFromFacts(catalog, key);
  if (pctMoved) {
    const record = readers.placeRecord(pctMoved, jurisdictionId, at);
    return record ? (record.multiplier - 1) * 100 : null;
  }
  const pctStart = placeOutcomeOfPctOfStartFromFacts(catalog, key);
  if (pctStart) {
    const replaces = catalog.placeBases[pctStart]!.replaces;
    const record =
      readers.placeRecord(pctStart, jurisdictionId, at) ??
      (replaces ? readers.placeRecord(replaces, jurisdictionId, at) : null);
    return record && record.base > 0
      ? (record.value / record.base) * 100
      : null;
  }
  if (!key.startsWith("law:") || !catalog.questionKeys.has(key.slice(4)))
    return null;
  const answer = readers.lawAnswer(key.slice(4), jurisdictionId, at);
  return answer == null ? null : answer === "yes" ? 1 : 0;
}
export function baselineFromReaders(
  catalog: OutcomeCatalogFacts,
  readers: OutcomeReaders,
  jurisdictionId: string,
  cause: string,
): number | undefined {
  if (catalog.changeMeasures.has(cause)) return 0;
  if (placeOutcomeOfPctOfStartFromFacts(catalog, cause)) return 100;
  if (placeOutcomeMovedByCausesFromFacts(catalog, cause)) return 0;
  if (placeOutcomePctMovedByCausesFromFacts(catalog, cause)) return 0;
  const base = catalog.placeBases[cause];
  if (base) {
    const key = readers.placeKey(jurisdictionId);
    return key ? base.places[key] : undefined;
  }
  if (cause.startsWith("law:"))
    return readers.startingLawAnswer(
      cause.slice(4),
      jurisdictionId,
      catalog.calibratedAt,
    ) === "yes"
      ? 1
      : 0;
  return catalog.baselines[cause]?.value;
}
export function outcomeLinkStatusFromFacts(
  catalog: OutcomeCatalogFacts,
  link: LinkFacts,
): LinkStatus {
  if (link.evidence === "about-zero") return "about-zero";
  if (link.shape.kind === "exposure-years" || link.shape.kind === "acute-decay")
    return "person-level";
  if (link.size === null) return "size-not-set";
  if (!outcomeMeasureAvailable(catalog, link.from)) return "cause-not-recorded";
  if (
    link.moderator &&
    !outcomeMeasureAvailable(catalog, link.moderator.measure)
  )
    return "cause-not-recorded";
  if (!catalog.produced.has(link.to)) return "outcome-not-produced";
  return "built";
}
export function linkSizeFromFacts(
  link: LinkFacts,
  placeKey: string | null,
): number {
  const own = link.sizeByPlace ? link.sizeByPlace[placeKey ?? ""] : undefined;
  return own?.size ?? link.size ?? 0;
}
// STOPGAP RULES4-OW-004: keep 30.44-day lags and legacy shape semantics for equivalence.
export function lagged(asOf: string, lagMonths: number): string {
  return lagMonths === 0 ? asOf : addDays(asOf, -Math.round(lagMonths * 30.44));
}
export function acuteWeight(
  halfLifeDays: number,
  happenedAt: string,
  asOf: string,
): number {
  const age = daysBetween(happenedAt, asOf);
  return age < 0 ? 0 : Math.pow(0.5, age / halfLifeDays);
}
/** Complete selection, reversion timing, place sizing, moderator and product rule. */
export function outcomeFactorFromReaders(
  catalog: OutcomeCatalogFacts,
  readers: OutcomeReaders,
  jurisdictionId: string,
  outcome: string,
  asOf: string,
): OutcomeFactorReading {
  const candidates: OutcomeFactorCauseFacts[] = [];
  for (const link of catalog.links) {
    if (
      link.consumed === false ||
      link.to !== outcome ||
      outcomeLinkStatusFromFacts(catalog, link) !== "built"
    )
      continue;
    const readAt = lagged(asOf, link.lagMonths);
    const value = readOutcomeMeasure(
      catalog,
      readers,
      link.from,
      jurisdictionId,
      readAt,
    );
    if (value === null) continue;
    const baseline = baselineFromReaders(
      catalog,
      readers,
      jurisdictionId,
      link.from,
    );
    if (baseline === undefined) continue;
    if (
      link.lagMonths > 0 &&
      link.from.startsWith("law:") &&
      value !== baseline &&
      readOutcomeMeasure(catalog, readers, link.from, jurisdictionId, asOf) ===
        baseline
    )
      continue;
    const moderator = link.moderator
      ? {
          mode: link.moderator.mode ?? "scale",
          effectAtFull: link.moderator.effectAtFull,
          level: readOutcomeMeasure(
            catalog,
            readers,
            link.moderator.measure,
            jurisdictionId,
            readAt,
          ),
        }
      : undefined;
    candidates.push({
      key: link.key,
      from: link.from,
      link: {
        shape: link.shape,
        size: linkSizeFromFacts(link, readers.placeKey(jurisdictionId)),
      },
      value,
      baseline,
      readAt,
      evidence: link.evidence,
      eligible: true,
      endedByRevert: false,
      ...(moderator ? { moderator } : {}),
    });
  }
  return outcomeFactorFromFacts(outcome, candidates);
}
export function outcomeLinksFedByQuestionFromFacts(
  links: readonly LinkFacts[],
  questionMeasures: Readonly<Record<string, readonly string[]>>,
  questionKey: string,
): readonly LinkFacts[] {
  const measures = questionMeasures[questionKey] ?? [];
  return links.filter(
    (link) =>
      link.consumed !== false &&
      (link.from === `law:${questionKey}` || measures.includes(link.from)),
  );
}
export interface RangeViolation {
  readonly kind: "link" | "target";
  readonly key: string;
  readonly value: number;
  readonly floor: number | null;
  readonly ceiling: number | null;
}
export function outcomeRangeViolationsFromFacts(
  catalog: OutcomeCatalogFacts,
  reading: OutcomeFactorReading,
): readonly RangeViolation[] {
  const violations: RangeViolation[] = [];
  const check = (
    kind: RangeViolation["kind"],
    key: string,
    value: number,
    floor: number | null,
    ceiling: number | null,
  ) => {
    if (
      !Number.isFinite(value) ||
      (floor !== null && value < floor) ||
      (ceiling !== null && value > ceiling)
    )
      violations.push({ kind, key, value, floor, ceiling });
  };
  const links = new Map(catalog.links.map((link) => [link.key, link]));
  for (const cause of reading.causes) {
    const link = links.get(cause.key);
    if (link)
      check(
        "link",
        link.key,
        cause.factor,
        link.floor ?? 0,
        link.ceiling ?? null,
      );
  }
  const bounds = catalog.targets[reading.outcome];
  check(
    "target",
    reading.outcome,
    reading.multiplier,
    bounds?.floor ?? null,
    bounds?.ceiling ?? null,
  );
  return violations;
}
