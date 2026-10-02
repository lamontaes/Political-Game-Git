import ruleData from "../../data/measure-numbering-rules.json" with { type: "json" };
import {
  stateBillNumberingStyle,
  stateChamberStyle,
} from "./bill-numbering-styles";
import billIntroductionTable from "../../data/research/laws/bill-introductions-2022.json" with { type: "json" };
import { rulePackById } from "./legislature-rule-packs";
import type { ChamberRule, LegislativeRulePack } from "./legislature-rules";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureNumberingSession,
  LegislativeMeasureRecord,
  World,
} from "./types";

/**
 * Displayed measure designations follow jurisdiction/chamber/type data.
 * Canonical introductions consume a counter within the actual numbering
 * session; estimates of bills filed before world opening consume nothing.
 * Legal constants do not draw an effect size. Unverified common rules remain
 * flagged in developer data. Internal measure IDs are independent.
 */

interface BillIntroductionRow {
  readonly usps: string;
  readonly billsIntroduced: number | null;
}

const BILL_INTRODUCTION_ROWS: readonly BillIntroductionRow[] = (
  billIntroductionTable as { readonly rows: readonly BillIntroductionRow[] }
).rows;

/**
 * ESTIMATED FROM AVERAGE: the middle count of bills a state legislature
 * introduced in its 2022 regular session, for a legislature the table does
 * not count (Congress, the District, the territories, and states that held
 * no 2022 regular session).
 */
const MIDDLE_BILLS_INTRODUCED: number = (() => {
  const counts = BILL_INTRODUCTION_ROWS.flatMap((row) =>
    row.billsIntroduced === null ? [] : [row.billsIntroduced],
  ).sort((left, right) => left - right);
  return counts[Math.floor((counts.length - 1) / 2)]!;
})();

/**
 * Where a chamber's numbering sits on the day a world opens: the bills its
 * legislature files in a year (The Book of the States 2023, Table 3.19,
 * 2022 regular sessions, both chambers together), shared evenly among its
 * chambers, times the share of the year gone by. A life that opens in the
 * first days of January meets bill 1 or close to it.
 *
 * GAME ASSUMPTION: bills are filed evenly across the calendar year. Real
 * sessions file most of theirs in their first weeks.
 */
/** Legacy estimate API; the allocator below does not use it. */
export function openingBillNumber(
  jurisdictionKey: string | null,
  chambers: number,
  startedAt: string,
): number {
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey ?? "")?.[1];
  const counted = BILL_INTRODUCTION_ROWS.find(
    (row) => row.usps === usps,
  )?.billsIntroduced;
  const perYear = counted ?? MIDDLE_BILLS_INTRODUCED;
  const date = new Date(`${startedAt.slice(0, 10)}T00:00:00Z`);
  const january = Date.UTC(date.getUTCFullYear(), 0, 1);
  const daysGone = Math.floor((date.getTime() - january) / 86_400_000);
  return 1 + Math.floor((perYear / Math.max(1, chambers)) * (daysGone / 365));
}

/**
 * Where a town council's ordinance count sits on the day a world opens: about
 * one ordinance a week since January 1, so a life that opens in the first
 * week of January meets ORD 1. PLACEHOLDER, pending
 * `local-council-legislative-volume`: no town's volume has been read.
 */
/** Legacy estimate API; the allocator below does not use it. */
export function councilOpeningNumber(startedAt: string): number {
  const date = new Date(`${startedAt.slice(0, 10)}T00:00:00Z`);
  const january = Date.UTC(date.getUTCFullYear(), 0, 1);
  return 1 + Math.floor((date.getTime() - january) / (7 * 86_400_000));
}

export type NumberingMeasureType =
  "bill" | "joint-resolution" | "concurrent-resolution" | "resolution";
export interface MeasureDesignationInput {
  readonly jurisdictionId: EntityId;
  readonly originChamber: ChamberRule;
  readonly rulePackId?: string;
  readonly jurisdictionKey?: string;
  readonly measureType?: NumberingMeasureType;
  /** Session identifier supplied by the actual special-session caller. */
  readonly specialSession?: string;
  /** Observed assembly suffix, independent of regular/special session. */
  readonly suffix?: string;
}
export interface MeasureNumbering {
  readonly designation: string;
  readonly numberingSession: LegislativeMeasureNumberingSession;
}
interface NumberingRule {
  readonly jurisdictionKey?: string;
  readonly chamberKey?: string;
  readonly measureType?: NumberingMeasureType;
  readonly template?: string;
  readonly first: number;
  readonly step: number;
  readonly sequence: "integer" | "letters";
  readonly reset:
    | "regular-session"
    | "annual"
    | "biennial"
    | "congress"
    | "legislature"
    | "council-period";
  readonly series: "type" | "all-types";
  readonly specialSessionSuffix: string;
  readonly separateSpecialSeries?: boolean;
  readonly periodAnchorYear?: number;
  readonly periodStartMonthDay?: string;
  readonly defaultSuffix?: string;
  readonly allowedSuffixes?: readonly string[];
  readonly developerUnverified: boolean;
  readonly verifiedFields: readonly string[];
}
const DATA = ruleData as unknown as {
  readonly default: NumberingRule;
  readonly defaultTemplates: Readonly<
    Record<string, Readonly<Record<NumberingMeasureType, string>>>
  >;
  readonly rules: readonly NumberingRule[];
};
function packOrNull(
  rulePackId: string | undefined,
): LegislativeRulePack | null {
  if (!rulePackId) return null;
  try {
    return rulePackById(rulePackId);
  } catch {
    return null;
  }
}
/** Developer-only evidence flags are data, never player-facing provenance. */
export function measureNumberingRule(
  input: MeasureDesignationInput,
  world?: World,
): NumberingRule {
  const pack = packOrNull(input.rulePackId);
  const type = input.measureType ?? "bill";
  const jurisdictionKey =
    input.jurisdictionKey ??
    pack?.jurisdictionKey ??
    world?.jurisdictions[input.jurisdictionId]?.slug.toUpperCase();
  const row = DATA.rules.find(
    (rule) =>
      rule.jurisdictionKey === jurisdictionKey &&
      (rule.chamberKey === input.originChamber.chamberKey ||
        rule.chamberKey === "*") &&
      rule.measureType === type,
  );
  return { ...DATA.default, ...row };
}
function ordinal(n: number): string {
  const hundred = n % 100;
  return `${n}${hundred >= 11 && hundred <= 13 ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
}
export function congressNumberForYear(year: number): number {
  return Math.floor((year - 1789) / 2) + 1;
}
export function dcCouncilPeriodForYear(year: number): number {
  return Math.floor((year - 1975) / 2) + 1;
}
interface SessionIdentity {
  readonly key: string;
  readonly label: string;
  readonly openingYear: number;
  readonly period: number;
}
function sessionOf(
  date: IsoDate,
  rule: NumberingRule,
  pack: LegislativeRulePack | null,
  special?: string,
): SessionIdentity {
  let year = Number(date.slice(0, 4));
  if (rule.periodStartMonthDay && date.slice(5) < rule.periodStartMonthDay)
    year -= 1;
  let reset = rule.reset;
  const style = pack ? stateBillNumberingStyle(pack.jurisdictionKey) : null;
  if (reset === "regular-session")
    reset = style?.period === "biennial" ? "biennial" : "annual";
  const anchor =
    rule.periodAnchorYear ?? (style?.biennialOpensIn === "even" ? 0 : 1);
  const openingYear =
    reset === "annual" ? year : year - ((((year - anchor) % 2) + 2) % 2);
  const period =
    rule.periodAnchorYear === undefined
      ? openingYear
      : Math.floor((openingYear - rule.periodAnchorYear) / 2) + 1;
  const key =
    reset === "congress"
      ? `congress-${period}`
      : reset === "council-period"
        ? `council-period-${period}`
        : reset === "legislature"
          ? `legislature-${period}`
          : reset === "annual"
            ? `${openingYear}`
            : `${openingYear}-${openingYear + 1}`;
  const label =
    reset === "congress"
      ? `${ordinal(period)} Congress`
      : reset === "council-period"
        ? `Council Period ${period}`
        : reset === "legislature"
          ? `${ordinal(period)} Legislature`
          : `${openingYear}${reset === "annual" ? "" : `-${openingYear + 1}`} Regular Session`;
  return special && rule.separateSpecialSeries !== false
    ? {
        key: `${key}:special:${special}`,
        label: `${openingYear} ${special} Special Session`,
        openingYear,
        period,
      }
    : { key, label, openingYear, period };
}
function letters(number: number): string {
  let value = number,
    text = "";
  while (value > 0) {
    value -= 1;
    text = String.fromCharCode(65 + (value % 26)) + text;
    value = Math.floor(value / 26);
  }
  return text;
}
function letterNumber(text: string): number {
  return [...text].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0);
}
function templateFor(
  input: MeasureDesignationInput,
  rule: NumberingRule,
  session: SessionIdentity,
): string {
  const pack = packOrNull(input.rulePackId);
  const chamber = input.originChamber;
  const style = pack
    ? stateChamberStyle(
        stateBillNumberingStyle(pack.jurisdictionKey),
        chamber.chamberKey,
      )
    : null;
  const billTemplate =
    chamber.chamberKey === "council" || !style
      ? `${chamber.billDesignationPrefix} {n}`
      : style.template;
  const defaults =
    DATA.defaultTemplates[chamber.chamberKey] ?? DATA.defaultTemplates.house!;
  const template = rule.template ?? defaults[input.measureType ?? "bill"];
  const suffix = input.suffix ?? rule.defaultSuffix ?? "";
  if (rule.allowedSuffixes && !rule.allowedSuffixes.includes(suffix))
    throw new Error("Suffix is not admitted by this numbering rule.");
  const special = input.specialSession
    ? rule.specialSessionSuffix.replace("{special}", input.specialSession)
    : "";
  return template
    .replace("{billTemplate}", billTemplate)
    .replace("{period}", String(session.period))
    .replace("{yy}", String(session.openingYear % 100).padStart(2, "0"))
    .replace("{special}", special)
    .replace("{suffix}", suffix);
}
function format(template: string, number: number): string {
  return template
    .replace("{n4}", String(number).padStart(4, "0"))
    .replace("{n3}", String(number).padStart(3, "0"))
    .replace("{n}", String(number))
    .replace("{alpha}", letters(number));
}
function serialOf(
  template: string,
  designation: string,
  rule: NumberingRule,
): number | null {
  const marker = "SERIALTOKEN";
  const skeleton = template.replace(/\{n4\}|\{n3\}|\{n\}|\{alpha\}/, marker);
  const escaped = skeleton.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const capture = rule.sequence === "letters" ? "([A-Z]+)" : "([0-9]+)";
  const match = new RegExp(`^${escaped.replace(marker, capture)}$`).exec(
    designation,
  )?.[1];
  return match === undefined
    ? null
    : rule.sequence === "letters"
      ? letterNumber(match)
      : Number(match);
}
/** One legal/data allocator used by every existing actual-introduction caller. */
export function nextMeasureNumbering(
  world: World,
  input: MeasureDesignationInput,
): MeasureNumbering {
  if (input.specialSession && !/^[A-Z][A-Z0-9-]*$/.test(input.specialSession))
    throw new Error(
      "A special-session identifier is required in its admitted letter/code form.",
    );
  const pack = packOrNull(input.rulePackId);
  const rule = measureNumberingRule(input, world);
  const session = sessionOf(
    world.currentDate,
    rule,
    pack,
    input.specialSession,
  );
  const template = templateFor(input, rule, session);
  const typeInputs =
    rule.series === "all-types"
      ? (
          [
            "bill",
            "joint-resolution",
            "concurrent-resolution",
            "resolution",
          ] as const
        ).map((measureType) => ({ ...input, measureType }))
      : [input];
  const formats = typeInputs.map((value) => ({
    rule: measureNumberingRule(value, world),
    template: templateFor(value, measureNumberingRule(value, world), session),
  }));
  let highest = rule.first - rule.step;
  const taken = new Set<string>();
  for (const record of world.history.legislativeMeasures ?? []) {
    if (
      record.jurisdictionId !== input.jurisdictionId ||
      record.originChamberKey !== input.originChamber.chamberKey
    )
      continue;
    const recordSession =
      record.numberingSession?.key ??
      sessionOf(record.introducedAt, rule, pack).key;
    if (recordSession !== session.key) continue;
    taken.add(record.designation);
    for (const candidate of formats) {
      const serial = serialOf(
        candidate.template,
        record.designation,
        candidate.rule,
      );
      if (serial !== null) highest = Math.max(highest, serial);
    }
    // Suffix metadata does not open a different numeric series.
    if (rule.allowedSuffixes)
      for (const suffix of rule.allowedSuffixes) {
        const serial = serialOf(
          templateFor({ ...input, suffix }, rule, session),
          record.designation,
          rule,
        );
        if (serial !== null) highest = Math.max(highest, serial);
      }
  }
  let number =
    rule.first +
    Math.max(0, Math.floor((highest - rule.first) / rule.step) + 1) * rule.step;
  let designation = format(template, number);
  while (taken.has(designation)) {
    number += rule.step;
    designation = format(template, number);
  }
  const fullDesignation =
    rule.reset === "congress"
      ? `${designation}, ${session.label}`
      : rule.reset === "council-period"
        ? designation
        : `${designation} (${session.label})`;
  return {
    designation,
    numberingSession: {
      key: session.key,
      label: session.label,
      fullDesignation,
    },
  };
}
export function nextMeasureDesignation(
  world: World,
  input: MeasureDesignationInput,
): string {
  return nextMeasureNumbering(world, input).designation;
}
export function measureFullDesignation(
  measure: Pick<LegislativeMeasureRecord, "designation" | "numberingSession">,
): string {
  return measure.numberingSession?.fullDesignation ?? measure.designation;
}
