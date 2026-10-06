import {
  stateBillNumberingStyle,
  stateChamberStyle,
} from "./bill-numbering-styles";
import { US_CONGRESS_PACK_ID } from "./congress-rule-pack";
import billIntroductionTable from "../../data/research/laws/bill-introductions-2022.json" with { type: "json" };
import { rulePackById } from "./legislature-rule-packs";
import { isFederalDistrictUsps } from "./state-reference";
import type { ChamberRule, LegislativeRulePack } from "./legislature-rules";
import type {
  EntityId,
  IsoDate,
  LegislativeMeasureNumberingSession,
  LegislativeMeasureRecord,
  World,
} from "./types";

/**
 * What number a bill gets, decided by the world rather than by an author.
 *
 * Decision OCD-LEG-NUM-001: bills are numbered the way they are in real life.
 *
 *   - Numbers restart every session. A chamber's numbering returns to its
 *     first number (1, or where the state's recorded numbers begin, decision
 *     OCD-LEG-NUM-002) when a new regular session opens, every year or every two years as that state's
 *     recorded session labels show; Congress restarts with each two-year
 *     Congress. Only the session the world opens in starts partway up, because
 *     bills were already filed before the player arrived. Where that opening
 *     session stands follows the legislature's own yearly filing count and the
 *     date the world opens (`openingBillNumber`).
 *   - The session is part of the name: "HB 1 (2027 Regular Session)",
 *     "H.R. 1, 120th Congress". The designation itself stays the short form a
 *     person says out loud ("HB 1"); the session travels with it on the record.
 *   - Each state uses its own recorded prefixes ("AB", "HF", "A", "LB",
 *     "H."). The generated style table says which were read and which are a
 *     labeled game default.
 *   - Deterministic and saved. The same seed and the same filed history give
 *     the same numbers, and a filed bill keeps its designation forever: this
 *     is consulted only when a new measure is actually being filed.
 *
 * A measure saved before sessions were recorded is placed in the session its
 * introduction date falls in, so an old save's next bill continues its count.
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
 * week of January meets ORD 1. This is the shared authored local-council
 * numbering pace: one ordinance number per elapsed seven-day period.
 */
export function councilOpeningNumber(startedAt: string): number {
  const date = new Date(`${startedAt.slice(0, 10)}T00:00:00Z`);
  const january = Date.UTC(date.getUTCFullYear(), 0, 1);
  return 1 + Math.floor((date.getTime() - january) / (7 * 86_400_000));
}

export interface MeasureDesignationInput {
  readonly jurisdictionId: EntityId;
  /** The chamber receiving the introduction, from its own rule pack. */
  readonly originChamber: ChamberRule;
  /**
   * The rule pack the measure is filed under. It says whose numbering this
   * is: a state's, Congress's, or a council's. Without it the chamber's own
   * prefix numbers by the calendar year.
   */
  readonly rulePackId?: string;
}

/** Spread straight into `introduceMeasure`'s input. */
export interface MeasureNumbering {
  readonly designation: string;
  readonly numberingSession: LegislativeMeasureNumberingSession;
}

type NumberingKind = "state" | "congress" | "dc-council" | "council" | "plain";

interface NumberingScheme {
  readonly kind: NumberingKind;
  readonly template: string;
  readonly sessionOf: (year: number) => SessionIdentity;
  /** The number a session's first bill carries (OCD-LEG-NUM-002). */
  readonly firstNumberOf: (session: SessionIdentity) => number;
}

const FROM_ONE = (): number => 1;

interface SessionIdentity {
  readonly key: string;
  readonly label: string;
  readonly openingYear: number;
  /** For "{period}" templates: the numbered legislature or council period. */
  readonly period: number;
}

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function annualSession(year: number, label: string): SessionIdentity {
  return { key: `${year}`, label, openingYear: year, period: year };
}

/**
 * The Congress a year belongs to. The First Congress met in 1789, and each
 * Congress sits for two years.
 */
export function congressNumberForYear(year: number): number {
  return Math.floor((year - 1789) / 2) + 1;
}

/**
 * The District of Columbia Council period a year belongs to. Recorded in
 * data/research/bill-samples/dc/district-of-columbia.json: bills B26-0260 and
 * B26-0265 of Council Period 26, which sits 2025–2026.
 */
export function dcCouncilPeriodForYear(year: number): number {
  return Math.floor((year - 1975) / 2) + 1;
}

/** "B{period}-{n4}": the District numbers bills within its council period. */
const DC_COUNCIL_TEMPLATE = "B{period}-{n4}";

function schemeFor(
  pack: LegislativeRulePack | null,
  chamber: ChamberRule,
): NumberingScheme {
  const plainTemplate = `${chamber.billDesignationPrefix} {n}`;
  if (pack === null) {
    return {
      kind: "plain",
      template: plainTemplate,
      sessionOf: (year) => annualSession(year, `${year} Regular Session`),
      firstNumberOf: FROM_ONE,
    };
  }
  if (pack.packId === US_CONGRESS_PACK_ID) {
    return {
      kind: "congress",
      template: plainTemplate,
      firstNumberOf: FROM_ONE,
      sessionOf: (year) => {
        const congress = congressNumberForYear(year);
        return {
          key: `congress-${congress}`,
          label: `${ordinal(congress)} Congress`,
          openingYear: 1789 + (congress - 1) * 2,
          period: congress,
        };
      },
    };
  }
  if (chamber.chamberKey === "council") {
    if (isFederalDistrictUsps(pack.jurisdictionKey.replace(/^US-/, ""))) {
      return {
        kind: "dc-council",
        template: DC_COUNCIL_TEMPLATE,
        firstNumberOf: FROM_ONE,
        sessionOf: (year) => {
          const period = dcCouncilPeriodForYear(year);
          return {
            key: `council-period-${period}`,
            label: `Council Period ${period}`,
            openingYear: 1975 + (period - 1) * 2,
            period,
          };
        },
      };
    }
    // No city's own ordinance numbering has been compiled into its pack, so a
    // council numbers by the calendar year under the game's labeled "ORD".
    return {
      kind: "council",
      template: plainTemplate,
      sessionOf: (year) => annualSession(year, `${year}`),
      firstNumberOf: FROM_ONE,
    };
  }
  const style = stateBillNumberingStyle(pack.jurisdictionKey);
  const chamberStyle = stateChamberStyle(style, chamber.chamberKey);
  const template = chamberStyle.template;
  const firstNumberOf = (session: SessionIdentity): number =>
    chamberStyle.evenYearFirstNumber !== null && session.openingYear % 2 === 0
      ? chamberStyle.evenYearFirstNumber
      : chamberStyle.firstNumber;
  if (style.period === "biennial") {
    const opensOdd = style.biennialOpensIn === "odd";
    return {
      kind: "state",
      template,
      firstNumberOf,
      sessionOf: (year) => {
        const opening = (year % 2 === 1) === opensOdd ? year : year - 1;
        return {
          key: `${opening}-${opening + 1}`,
          label: `${opening}-${opening + 1} Regular Session`,
          openingYear: opening,
          period: opening,
        };
      },
    };
  }
  return {
    kind: "state",
    template,
    sessionOf: (year) => annualSession(year, `${year} Regular Session`),
    firstNumberOf,
  };
}

function formatDesignation(
  template: string,
  number: number,
  session: SessionIdentity,
): string {
  return template
    .replace("{yy}", String(session.openingYear % 100).padStart(2, "0"))
    .replace("{period}", String(session.period))
    .replace("{n4}", String(number).padStart(4, "0"))
    .replace("{n}", String(number));
}

function fullDesignationOf(
  kind: NumberingKind,
  designation: string,
  label: string,
): string {
  if (kind === "congress") return `${designation}, ${label}`;
  // The District's number already carries its council period.
  if (kind === "dc-council") return designation;
  return `${designation} (${label})`;
}

/** The bill's own number: 1090 from "HB25-1090", 5001 from "SB 5001". */
function numberOf(designation: string): number | null {
  const digits = /(\d+)[A-Z]?$/.exec(designation.trim())?.[1];
  return digits === undefined ? null : Number(digits);
}

function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

function packOrNull(
  rulePackId: string | undefined,
): LegislativeRulePack | null {
  if (rulePackId === undefined) return null;
  try {
    return rulePackById(rulePackId);
  } catch {
    return null;
  }
}

/** The session a filed measure belongs to, recorded or read off its date. */
function sessionKeyOf(
  record: LegislativeMeasureRecord,
  scheme: NumberingScheme,
): string {
  return (
    record.numberingSession?.key ??
    scheme.sessionOf(yearOf(record.introducedAt)).key
  );
}

/**
 * The designation and session the next measure filed in this chamber would
 * carry.
 *
 * Pure: it reads the world and returns them, and the caller hands both to
 * `introduceMeasure`, which is what actually writes.
 */
export function nextMeasureNumbering(
  world: World,
  input: MeasureDesignationInput,
): MeasureNumbering {
  const pack = packOrNull(input.rulePackId);
  const scheme = schemeFor(pack, input.originChamber);
  const originChamberKey = input.originChamber.chamberKey;
  const session = scheme.sessionOf(yearOf(world.currentDate));
  const openingSession = scheme.sessionOf(yearOf(world.startedAt));

  // Only the session the world opened in starts partway up; a chamber that
  // has already filed in it continues from its own highest number below.
  const inThisSession = (world.history.legislativeMeasures ?? []).filter(
    (record) =>
      record.jurisdictionId === input.jurisdictionId &&
      sessionKeyOf(record, scheme) === session.key,
  );
  const inThisChamber = inThisSession.filter(
    (record) => record.originChamberKey === originChamberKey,
  );
  const alreadyInThisChamber = inThisChamber.length;

  // A chamber whose numbers begin above 1 opens its band that far up. A save
  // whose opening session was already numbered from 1 keeps counting there,
  // so its bills never jump mid-session.
  const recordedStart = scheme.firstNumberOf(session);
  const sessionStart = inThisChamber.some(
    (record) => (numberOf(record.designation) ?? recordedStart) < recordedStart,
  )
    ? 1
    : recordedStart;
  const firstNumber =
    session.key !== openingSession.key
      ? sessionStart
      : scheme.kind === "council"
        ? councilOpeningNumber(world.startedAt)
        : sessionStart -
          1 +
          openingBillNumber(
            pack?.jurisdictionKey ?? null,
            pack?.chambers.length ?? 1,
            world.startedAt,
          );

  // Two bills in one session never share a number. The count is the ordinary
  // increment; the loop is what keeps that true when a world already holds a
  // measure numbered by some other route, such as a save filed before this
  // existed or a bill the player drafted themselves.
  // A chamber that has already filed this session continues from its
  // highest number, so a save made under an earlier opening rule keeps its
  // count.
  const taken = new Set(inThisSession.map((record) => record.designation));
  const highest = Math.max(
    0,
    ...inThisChamber.map((record) => numberOf(record.designation) ?? 0),
  );
  let number =
    session.key === openingSession.key && highest > 0
      ? highest + 1
      : firstNumber + alreadyInThisChamber;
  let designation = formatDesignation(scheme.template, number, session);
  while (taken.has(designation)) {
    number += 1;
    designation = formatDesignation(scheme.template, number, session);
  }
  return {
    designation,
    numberingSession: {
      key: session.key,
      label: session.label,
      fullDesignation: fullDesignationOf(
        scheme.kind,
        designation,
        session.label,
      ),
    },
  };
}

/** The designation alone; see `nextMeasureNumbering`. */
export function nextMeasureDesignation(
  world: World,
  input: MeasureDesignationInput,
): string {
  return nextMeasureNumbering(world, input).designation;
}

/**
 * A measure's name with its session, for anywhere two sessions' bills could be
 * told apart: "HB 1 (2027 Regular Session)". A measure saved before sessions
 * were recorded, or filed under an authored designation, shows its designation
 * as it was saved.
 */
export function measureFullDesignation(
  measure: Pick<LegislativeMeasureRecord, "designation" | "numberingSession">,
): string {
  return measure.numberingSession?.fullDesignation ?? measure.designation;
}
