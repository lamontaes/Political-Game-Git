import { addDays } from "../simulation/dates";
import { lawInForce } from "../simulation/governing/law-in-force";
import { stateJurisdictionForKey } from "../simulation/life-places";
import {
  OUTCOME_LINKS,
  outcomeFactor,
  outcomeLinkStatus,
} from "../simulation/outcome-web";
import {
  PLACE_OUTCOME_BASES,
  PLACE_OUTCOME_MEASURES,
  placeOutcomeAt,
  placeOutcomeKey,
  type PlaceOutcomeMeasureBase,
  type PlaceOutcomeRecord,
} from "../simulation/outcome-web/place-outcome-store";
import type { EntityId, IsoDate, World } from "../simulation/types";
import { measureAnswersAt } from "../simulation/vote-bundle";
import { proseDate, proseMonthYear } from "./prose-dates";

/**
 * HOW A PLACE IS DOING, AND WHAT MOVED IT.
 *
 * The world keeps each state's conditions month by month (the share without
 * health insurance, violent crime, turnout...) and records every cause that
 * moved each one, laws included (`outcome-web/place-outcome-store.ts`). Until
 * now only the developer's world report read them, so a law that lowered the
 * uninsured rate changed nothing a player could see. This reads the same
 * records for two screens: a state's conditions, and a law's own page.
 *
 * Read-only: it spends no time and writes nothing. Every number is the
 * world's own record; no source or research note reaches the screen.
 */

export interface ConditionCause {
  /** What moved it, as a player would name it. */
  readonly label: string;
  readonly direction: "raised" | "lowered";
  /** "about 4.1%", or "about 12 basis points over AAA" for a level. */
  readonly size: string;
  /** Whether the cause is a law in force. */
  readonly law: boolean;
}

export interface PlaceConditionRow {
  readonly measure: string;
  readonly name: string;
  readonly atStart: string;
  readonly startMonth: string;
  readonly now: string;
  readonly change: "up" | "down" | "steady";
  /** The strongest causes this month, strongest first; empty when none. */
  readonly causes: readonly ConditionCause[];
}

export interface PlaceConditions {
  readonly placeName: string;
  readonly asOf: IsoDate;
  readonly rows: readonly PlaceConditionRow[];
}

const LAW_PREFIX = "law:";
const MOST_CAUSES_SHOWN = 3;

/** Names for the causes that are not place conditions or laws. */
const OTHER_CAUSE_LABELS: Readonly<Record<string, string>> = {
  "labor.minimum-wage-gap-to-15": "the minimum wage",
  "labor.minimum-wage-change-pct": "the minimum wage",
  "labor.unemployment-pct": "unemployment",
};

function round(value: number, places: number): number {
  const scale = 10 ** places;
  return Math.round(value * scale) / scale;
}

function numberText(value: number): string {
  return round(value, Math.abs(value) >= 100 ? 0 : 1).toLocaleString("en-US");
}

/** A condition's value as the screen writes it. */
export function conditionValueText(
  definition: PlaceOutcomeMeasureBase,
  value: number,
): string {
  if (definition.scale === "index")
    return `${Math.round(value)}, where 100 is where it began`;
  if (definition.scale === "rate" || definition.scale === "level") {
    const unit = definition.shortUnit ?? "";
    if (/^dollars\b/.test(unit))
      return `$${Math.round(value).toLocaleString("en-US")}${unit.slice("dollars".length)}`;
    return unit ? `${numberText(value)} ${unit}` : numberText(value);
  }
  return `${round(value, 1).toFixed(1)}%`;
}

/** How much one cause moves a condition, in words. */
function causeSize(definition: PlaceOutcomeMeasureBase, factor: number) {
  if (definition.scale === "level") {
    const amount = Math.abs(factor - 1);
    return `about ${numberText(amount)}${definition.shortUnit ? ` ${definition.shortUnit}` : ""}`;
  }
  return `about ${round(Math.abs(factor - 1) * 100, 1)}%`;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function propositionByStableKey(
  world: World,
  stableKey: string,
): { readonly id: EntityId; readonly name: string } | null {
  const catalog = world.policyCatalog;
  for (const id of catalog.propositionOrder) {
    const proposition = catalog.propositions[id];
    if (proposition?.stableKey === stableKey)
      return { id, name: proposition.name };
  }
  return null;
}

/** The law behind a `law:` cause in a place, named as its page names it. */
function lawCauseLabel(
  world: World,
  jurisdictionId: EntityId,
  stableKey: string,
  asOf: IsoDate,
): string {
  const proposition = propositionByStableKey(world, stableKey);
  if (!proposition) return "a law in force";
  const law = lawInForce(world, jurisdictionId, proposition.id, asOf);
  const measure =
    law?.origin === "enacted"
      ? world.history.legislativeMeasures?.find(
          (row) => row.id === law.measureId,
        )
      : undefined;
  if (measure) return `${measure.shortTitle} (${measure.designation})`;
  return `the existing law on ${lowerFirst(proposition.name)}`;
}

function causeLabel(
  world: World,
  jurisdictionId: EntityId,
  key: string,
  asOf: IsoDate,
): string {
  const link = OUTCOME_LINKS.find((row) => row.key === key);
  const from = link?.from ?? key;
  if (from.startsWith(LAW_PREFIX))
    return lawCauseLabel(
      world,
      jurisdictionId,
      from.slice(LAW_PREFIX.length),
      asOf,
    );
  const measure = from.split(":")[0]!;
  const definition = PLACE_OUTCOME_BASES[measure];
  if (definition) return lowerFirst(definition.name);
  return OTHER_CAUSE_LABELS[from] ?? "other conditions";
}

function causesOf(
  world: World,
  jurisdictionId: EntityId,
  definition: PlaceOutcomeMeasureBase,
  record: PlaceOutcomeRecord,
  asOf: IsoDate,
): ConditionCause[] {
  return [...record.causes]
    .filter((cause) => cause.factor !== 1)
    .sort((a, b) => Math.abs(Math.log(b.factor)) - Math.abs(Math.log(a.factor)))
    .slice(0, MOST_CAUSES_SHOWN)
    .map((cause) => {
      const from = OUTCOME_LINKS.find((row) => row.key === cause.key)?.from;
      return {
        label: causeLabel(world, jurisdictionId, cause.key, asOf),
        direction: cause.factor > 1 ? "raised" : "lowered",
        size: causeSize(definition, cause.factor),
        law: from?.startsWith(LAW_PREFIX) ?? false,
      };
    });
}

/**
 * Every condition the world keeps for the place a jurisdiction lies in: where
 * it stood when the record began, where it stands now, and what is moving it.
 * Null where the world keeps no conditions for the place (a territory the
 * record has no data for).
 */
export function projectPlaceConditions(
  world: World,
  jurisdictionId: EntityId,
): PlaceConditions | null {
  const stateKey = placeOutcomeKey(jurisdictionId);
  if (!stateKey) return null;
  const asOf = world.currentDate;
  // Before the first month is written, each condition stands where the place
  // began: its real starting level, moved by nothing yet.
  const firstMonth = world.placeOutcomes?.months[0]?.month ?? asOf;
  const rows: PlaceConditionRow[] = [];
  let placeJurisdiction: EntityId | null = null;
  for (const measure of PLACE_OUTCOME_MEASURES) {
    const definition = PLACE_OUTCOME_BASES[measure]!;
    const base = definition.places[stateKey];
    const now = placeOutcomeAt(world, measure, jurisdictionId, asOf);
    const start = placeOutcomeAt(world, measure, jurisdictionId, firstMonth);
    if (!now && base === undefined) continue;
    if (now) placeJurisdiction ??= now.jurisdictionId;
    const nowValue = now?.value ?? base!;
    const startValue = start?.value ?? base ?? nowValue;
    const nowText = conditionValueText(definition, nowValue);
    const startText = conditionValueText(definition, startValue);
    rows.push({
      measure,
      name: definition.name,
      atStart: startText,
      startMonth: proseMonthYear(start?.month ?? firstMonth),
      now: nowText,
      change:
        nowText === startText
          ? "steady"
          : nowValue > startValue
            ? "up"
            : "down",
      causes: now ? causesOf(world, jurisdictionId, definition, now, asOf) : [],
    });
  }
  placeJurisdiction ??= stateJurisdictionForKey(stateKey)?.id ?? null;
  if (rows.length === 0 || !placeJurisdiction) return null;
  // What a law is moving leads, then what anything is moving.
  const rank = (row: PlaceConditionRow) =>
    row.causes.some((cause) => cause.law) ? 0 : row.causes.length ? 1 : 2;
  return {
    placeName: world.jurisdictions[placeJurisdiction]?.name ?? "This place",
    asOf,
    rows: [...rows].sort((a, b) => rank(a) - rank(b)),
  };
}

/**
 * What an enacted law is doing to the conditions the world keeps, one plain
 * sentence per condition, for the law's own page. A federal law is read in
 * `viewerJurisdictionId`'s state. Empty for a bill that is not law, or a law
 * whose questions move no condition.
 */
export function lawConditionSentences(
  world: World,
  measureId: EntityId,
  viewerJurisdictionId: EntityId | null,
): readonly string[] {
  const enactment = world.history.legislativeEnactments?.find(
    (row) => row.measureId === measureId && row.outcome === "enacted",
  );
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  if (!enactment || !measure) return [];
  const place = placeOutcomeKey(measure.jurisdictionId)
    ? measure.jurisdictionId
    : viewerJurisdictionId && placeOutcomeKey(viewerJurisdictionId)
      ? viewerJurisdictionId
      : null;
  if (!place) return [];
  const asOf = world.currentDate;
  const questions = new Set<EntityId>([
    ...(measure.propositionIds ?? []),
    ...measureAnswersAt(world, measureId).map((row) => row.propositionId),
  ]);
  const sentences: string[] = [];
  for (const questionId of questions) {
    const proposition = world.policyCatalog.propositions[questionId];
    if (!proposition) continue;
    const links = OUTCOME_LINKS.filter(
      (link) =>
        link.from === `${LAW_PREFIX}${proposition.stableKey}` &&
        PLACE_OUTCOME_BASES[link.to] !== undefined &&
        outcomeLinkStatus(link) === "built",
    );
    if (links.length === 0) continue;
    const law = lawInForce(world, place, questionId, asOf);
    if (!law) continue;
    if (law.measureId !== measureId) {
      sentences.push(
        `Another law now decides "${lowerFirst(proposition.name)}" here, so this one no longer moves anything.`,
      );
      continue;
    }
    const reading = new Map<string, number>();
    const lagOf = new Map<string, number>();
    for (const link of links) {
      lagOf.set(link.to, Math.max(lagOf.get(link.to) ?? 0, link.lagMonths));
      if (law.operativeAt > asOf) continue;
      const cause = outcomeFactor(world, place, link.to, asOf).causes.find(
        (row) => row.key === link.key,
      );
      if (cause && cause.factor !== 1)
        reading.set(link.to, (reading.get(link.to) ?? 1) * cause.factor);
    }
    for (const [to, lag] of lagOf) {
      const definition = PLACE_OUTCOME_BASES[to]!;
      const now = placeOutcomeAt(world, to, place, asOf);
      if (!now) continue;
      const where = world.jurisdictions[now.jurisdictionId]?.name ?? "here";
      if (law.operativeAt > asOf) {
        sentences.push(
          `${definition.name} in ${where} is ${conditionValueText(definition, now.value)}. This law begins to move it once it takes effect on ${proseDate(law.operativeAt)}.`,
        );
        continue;
      }
      const factor = reading.get(to);
      if (factor === undefined) {
        // The outcome web counts a lag's months as 30.44 days.
        const starts = addDays(law.operativeAt, Math.round(lag * 30.44));
        sentences.push(
          starts > asOf
            ? `${definition.name} in ${where} is ${conditionValueText(definition, now.value)}. This law starts to move it in ${proseMonthYear(starts)}.`
            : `${definition.name} in ${where} is ${conditionValueText(definition, now.value)}. This law has not moved it.`,
        );
        continue;
      }
      const before = placeOutcomeAt(world, to, place, law.operativeAt);
      const from = before
        ? `${conditionValueText(definition, before.value)} when the law took effect, `
        : "";
      sentences.push(
        `${definition.name} in ${where}: ${from}${conditionValueText(definition, now.value)} now. This law ${factor > 1 ? "raises" : "lowers"} it by ${causeSize(definition, factor)}.`,
      );
    }
  }
  return sentences;
}

export interface SponsoredLaw {
  readonly measureId: EntityId;
  readonly title: string;
  readonly designation: string;
  readonly enactedOn: IsoDate;
  readonly enactedLabel: string;
  /** What it is doing to the place's conditions; empty when it moves none. */
  readonly effects: readonly string[];
}

/** The most sponsored laws a record lists, newest first. */
const MOST_SPONSORED_LAWS = 5;

/**
 * The laws a person sponsored that were enacted, newest first, each with what
 * it is doing to the conditions the world keeps. For a lawmaker's record.
 */
export function sponsoredLaws(
  world: World,
  personId: EntityId,
  viewerJurisdictionId: EntityId | null,
): readonly SponsoredLaw[] {
  const measures = new Map(
    (world.history.legislativeMeasures ?? [])
      .filter((measure) => measure.sponsorPersonId === personId)
      .map((measure) => [measure.id, measure] as const),
  );
  if (measures.size === 0) return [];
  return (world.history.legislativeEnactments ?? [])
    .filter(
      (enactment) =>
        enactment.outcome === "enacted" &&
        measures.has(enactment.measureId) &&
        enactment.resolvedAt <= world.currentDate,
    )
    .sort((a, b) =>
      a.resolvedAt === b.resolvedAt
        ? b.sequence - a.sequence
        : b.resolvedAt.localeCompare(a.resolvedAt),
    )
    .slice(0, MOST_SPONSORED_LAWS)
    .map((enactment) => {
      const measure = measures.get(enactment.measureId)!;
      return {
        measureId: measure.id,
        title: measure.shortTitle,
        designation: enactment.actDesignation ?? measure.designation,
        enactedOn: enactment.resolvedAt,
        enactedLabel: proseDate(enactment.resolvedAt),
        effects: lawConditionSentences(world, measure.id, viewerJurisdictionId),
      };
    });
}
