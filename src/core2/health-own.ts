/**
 * A full person's own records on their death hazard (modules/health.ts reads
 * them once a month, beside the outcome web's place-level factor).
 *
 * coverage-to-mortality-55-64 (Miller, Johnson and Wherry 2021): at ages 55 to
 * 64, each year a person's own coverage is paid cuts their annual mortality by
 * the link's size (-25 percent per covered person-year), read lagMonths after
 * the coverage. Coverage here is the Medicaid payment the law reach opens for
 * a named person (law-reach/group-b-money.ts payCoverage; its obligations are
 * the record). The place-level twin, medicaid-expansion-to-mortality, is the
 * same cause measured over every low-income 55- to 64-year-old in an expansion
 * state, enrolled or not; for a person whose own coverage is modeled it is
 * left out of their web factor (health-web.ts) so the expansion moves them
 * once, through their own record.
 *
 * Calibration: the life table the hazard starts from already holds the
 * coverage people had when the world began, so only a change from it moves a
 * person, as with every law-caused link. The factor is
 * (1 + size x covered then) / (1 + size x covered at the person's first look),
 * so a person covered all along is the table's, a person who gains coverage
 * runs below it after the lag, and one who loses it runs above it.
 */
import deathWeb from "./data/health/death-web.json" with { type: "json" };
import displacement from "./data/health/displacement.json" with { type: "json" };
import longHours from "./data/health/long-hours.json" with { type: "json" };
import { displacementsNow, type Displacement } from "./health-displacement";
import { daysBetweenText } from "./kernel/dates";
import {
  medicaidCoverageSpells,
  WEB_LINKS,
  type CoverageSpell,
} from "./modules/laws";
import type { CoreAPI } from "./types";

const BAND = deathWeb.mortality5564;
const PERSON = BAND.personLevel;

/**
 * The link's size per covered person-year and the months between the
 * coverage and its effect on the hazard (data/research/outcome-web/links.json),
 * read on first use: the link table comes through the laws family's entry.
 */
let coverageLink: { readonly size: number; readonly lagMonths: number } | null =
  null;
function coverageLinkRow(): {
  readonly size: number;
  readonly lagMonths: number;
} {
  if (coverageLink) return coverageLink;
  const row = WEB_LINKS.find((link) => link.key === PERSON.link);
  if (!row || row.size === null)
    throw new Error(`${PERSON.link} has no researched size`);
  coverageLink = { size: row.size, lagMonths: row.lagMonths };
  return coverageLink;
}

/** One look at a person's coverage, kept with the hazard factor it set. */
export interface OwnCoveragePart {
  readonly link: string;
  /** The link's size per covered person-year. */
  readonly size: number;
  /** The day the coverage was read at: today less the link's lag. */
  readonly readOn: string;
  /** Whether the person's coverage was being paid on that day. */
  readonly covered: boolean;
  /** Whether it was being paid at their first look (the table's own coverage). */
  readonly baseCovered: boolean;
  /** The accounts obligations that paid the stretch the day falls in (the record ids). */
  readonly obligationIds: readonly string[];
}

/** One displaced worker's excess hazard today, with the jobs engine's record it stands on. */
export interface OwnDisplacementPart {
  readonly link: string;
  /** The jobs engine's closure record (job-change:<date>:<job>:closure). */
  readonly recordId: string;
  /** Years since the job ended, and the tenure it had. */
  readonly yearsSince: number;
  readonly tenureYears: number;
  /** The proportional excess in the annual death hazard, tenure weight included. */
  readonly excess: number;
}

/** One worker's long weekly hours and what they add to the heart disease and stroke share of their hazard. */
export interface OwnHoursPart {
  readonly link: string;
  /** The job the hours are recorded on. */
  readonly jobId: string;
  readonly weeklyHours: number;
  /** Relative risks at those hours against 35-40 hours a week. */
  readonly heartRisk: number;
  readonly strokeRisk: number;
  /** The shares of deaths at their age the two causes stand for. */
  readonly heartShare: number;
  readonly strokeShare: number;
}

export type OwnPart = OwnCoveragePart | OwnDisplacementPart | OwnHoursPart;

export interface OwnFactor {
  /** The multiplier on the person's death hazard (1 where nothing moves it). */
  readonly factor: number;
  readonly parts: readonly OwnPart[];
}

/** Whether a person at this age reads their own coverage in place of the place-level row. */
export function readsOwnCoverage(age: number): boolean {
  return age >= BAND.fromAge && age < BAND.belowAge;
}

/** Every named person's coverage stretches now, or null where the world does not model coverage. */
export function coverageSpellsNow(
  api: CoreAPI,
): ReadonlyMap<string, readonly CoverageSpell[]> | null {
  return medicaidCoverageSpells(api, PERSON.policy);
}

/** The stretch of coverage that holds on a day, if any. */
export function spellOn(
  spells: readonly CoverageSpell[] | undefined,
  day: string,
): CoverageSpell | undefined {
  return spells?.find(
    (spell) => spell.from <= day && (spell.to === null || day < spell.to),
  );
}

/** A day some whole months earlier (the day of month clipped to the month's last). */
function monthsBefore(day: string, months: number): string {
  const at = new Date(`${day}T00:00:00.000Z`);
  const month = at.getUTCMonth() - months;
  const last = new Date(
    Date.UTC(at.getUTCFullYear(), month + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(at.getUTCFullYear(), month, Math.min(at.getUTCDate(), last)),
  )
    .toISOString()
    .slice(0, 10);
}

/**
 * The factor on one person's hazard today from their own coverage. `firstLook`
 * is the day the engine first read their coverage and whether it was paid
 * then; days before it read as that state, so the first months after a world
 * opens move nobody.
 */
export function ownCoverageFactor(input: {
  readonly spells: readonly CoverageSpell[] | undefined;
  readonly today: string;
  readonly firstLook: { readonly date: string; readonly covered: boolean };
}): OwnFactor {
  const { size: SIZE, lagMonths } = coverageLinkRow();
  const readOn = monthsBefore(input.today, lagMonths);
  const spell =
    readOn < input.firstLook.date ? undefined : spellOn(input.spells, readOn);
  const covered =
    readOn < input.firstLook.date
      ? input.firstLook.covered
      : spell !== undefined;
  const base = input.firstLook.covered;
  const factor = (1 + SIZE * Number(covered)) / (1 + SIZE * Number(base));
  return {
    factor,
    parts: [
      {
        link: PERSON.link,
        size: SIZE,
        readOn,
        covered,
        baseCovered: base,
        obligationIds: spell?.obligationIds ?? [],
      },
    ],
  };
}

const DISPLACEMENT_LINK = displacement.link;
const POINTS = displacement.points;
const FULL_TENURE_YEARS = displacement.tenure.fullEffectYears;

/** The excess hazard at some years since a displacement: linear between the paper's points, held at the ends. */
export function displacementExcess(yearsSince: number): number {
  const first = POINTS[0]!;
  const last = POINTS[POINTS.length - 1]!;
  if (yearsSince <= first.yearsSince) return first.excess;
  if (yearsSince >= last.yearsSince) return last.excess;
  let at = 1;
  while (yearsSince > POINTS[at]!.yearsSince) at += 1;
  const from = POINTS[at - 1]!;
  const to = POINTS[at]!;
  return (
    from.excess +
    ((to.excess - from.excess) * (yearsSince - from.yearsSince)) /
      (to.yearsSince - from.yearsSince)
  );
}

/** Every full person's closures the jobs engine recorded, by person. */
export function displacementsOfPeople(
  api: CoreAPI,
): ReadonlyMap<string, readonly Displacement[]> {
  return displacementsNow(api, api.parameter("daysPerMeanYear"));
}

/**
 * The factor on one displaced person's hazard today: of their closures, the
 * one that leaves the largest excess, from the paper's table by years since,
 * scaled by the tenure the lost job had (up to the paper's six years).
 */
export function displacementFactor(input: {
  readonly displaced: readonly Displacement[] | undefined;
  readonly today: string;
  readonly daysPerYear: number;
}): OwnFactor | undefined {
  let best: OwnDisplacementPart | undefined;
  for (const row of input.displaced ?? []) {
    if (row.date > input.today) continue;
    const yearsSince =
      daysBetweenText(row.date, input.today) / input.daysPerYear;
    const weight = Math.min(1, row.tenureYears / FULL_TENURE_YEARS);
    const excess = weight * displacementExcess(yearsSince);
    if (!best || excess > best.excess)
      best = {
        link: DISPLACEMENT_LINK,
        recordId: row.recordId,
        yearsSince,
        tenureYears: row.tenureYears,
        excess,
      };
  }
  return best ? { factor: 1 + best.excess, parts: [best] } : undefined;
}

/** A person's own factors together: coverage and displacement are different causes, so they multiply. */
export function combineOwn(
  ...factors: readonly (OwnFactor | undefined)[]
): OwnFactor | undefined {
  const present = factors.filter((one): one is OwnFactor => one !== undefined);
  if (!present.length) return undefined;
  return {
    factor: present.reduce((product, one) => product * one.factor, 1),
    parts: present.flatMap((one) => one.parts),
  };
}

const HOURS_LINK = longHours.link;
const HOURS_BANDS = longHours.bands;

type RiskPoint = { readonly weeklyHours: number; readonly rr: number };

/** A relative risk at some weekly hours: linear between the paper's categories, one below the reference, held past the last. */
function riskAt(points: readonly RiskPoint[], weeklyHours: number): number {
  const first = points[0]!;
  const last = points[points.length - 1]!;
  if (weeklyHours <= first.weeklyHours) return first.rr;
  if (weeklyHours >= last.weeklyHours) return Math.max(1, last.rr);
  let at = 1;
  while (weeklyHours > points[at]!.weeklyHours) at += 1;
  const from = points[at - 1]!;
  const to = points[at]!;
  const rr =
    from.rr +
    ((to.rr - from.rr) * (weeklyHours - from.weeklyHours)) /
      (to.weeklyHours - from.weeklyHours);
  // A point estimate below one is read as no effect (its interval holds one).
  return Math.max(1, rr);
}

/** One cause's share of all deaths at an age: linear between band midpoints, flat past the ends. */
function deathShare(cause: "heart" | "stroke", age: number): number {
  const level = (at: number) => HOURS_BANDS[at]![cause] / HOURS_BANDS[at]!.all;
  const mids = HOURS_BANDS.map((band) => (band.min + band.max) / 2);
  if (age <= mids[0]!) return level(0);
  if (age >= mids[mids.length - 1]!) return level(mids.length - 1);
  let i = 1;
  while (age > mids[i]!) i += 1;
  const part = (age - mids[i - 1]!) / (mids[i]! - mids[i - 1]!);
  return level(i - 1) + (level(i) - level(i - 1)) * part;
}

/**
 * The factor on one worker's hazard from the hours of the job they hold:
 * one plus the heart disease share of deaths at their age times the relative
 * risk less one, and the same for stroke. Nothing at the reference hours.
 */
export function longHoursFactor(input: {
  readonly weeklyHours: number | undefined;
  readonly age: number;
  readonly jobId: string | undefined;
}): OwnFactor | undefined {
  if (input.weeklyHours === undefined || input.jobId === undefined)
    return undefined;
  const heartRisk = riskAt(longHours.relativeRisks.heart, input.weeklyHours);
  const strokeRisk = riskAt(longHours.relativeRisks.stroke, input.weeklyHours);
  if (heartRisk === 1 && strokeRisk === 1) return undefined;
  const heartShare = deathShare("heart", input.age);
  const strokeShare = deathShare("stroke", input.age);
  return {
    factor: 1 + heartShare * (heartRisk - 1) + strokeShare * (strokeRisk - 1),
    parts: [
      {
        link: HOURS_LINK,
        jobId: input.jobId,
        weeklyHours: input.weeklyHours,
        heartRisk,
        strokeRisk,
        heartShare,
        strokeShare,
      },
    ],
  };
}
