import type {
  EntityId,
  LegislativeMeasureRecord,
} from "../../simulation/types";
import type { IsoDate } from "./calendar";
import type {
  ChamberRule,
  LegislativeRulePack,
} from "../../simulation/legislature-rules";
import type { StateBillNumberingStyle } from "../../simulation/bill-numbering-derivation";
import { councilOpeningNumber } from "./measure-periods";
interface SessionIdentity {
  readonly key: string;
  readonly openingYear: number;
  readonly period: number;
}
function annualSession(year: number): SessionIdentity {
  return { key: String(year), openingYear: year, period: year };
}
export interface NumberingFacts {
  readonly currentDate: IsoDate;
  readonly startedAt: IsoDate;
  readonly measures: readonly LegislativeMeasureRecord[];
  readonly pack: LegislativeRulePack | null;
  readonly style: StateBillNumberingStyle;
  readonly rows: readonly BillIntroductionRow[];
}
export interface MeasureDesignationInput {
  readonly jurisdictionId: EntityId;
  readonly originChamber: ChamberRule;
  readonly rulePackId?: string;
}
export interface MeasureNumbering {
  readonly designation: string;
  readonly numberingSession: { readonly key: string };
}
export interface BillIntroductionRow {
  readonly usps: string;
  readonly billsIntroduced: number | null;
}

export function openingBillNumber(
  BILL_INTRODUCTION_ROWS: readonly BillIntroductionRow[],
  jurisdictionKey: string | null,
  chambers: number,
  startedAt: string,
): number {
  const MIDDLE_BILLS_INTRODUCED: number = (() => {
    const counts = BILL_INTRODUCTION_ROWS.flatMap((row) =>
      row.billsIntroduced === null ? [] : [row.billsIntroduced],
    ).sort((left, right) => left - right);
    return counts[Math.floor((counts.length - 1) / 2)]!;
  })();
  const usps = /^US-([A-Z]{2})$/.exec(jurisdictionKey ?? "")?.[1];
  const counted = BILL_INTRODUCTION_ROWS.find(
    (row) => row.usps === usps,
  )?.billsIntroduced;
  const perYear = counted ?? MIDDLE_BILLS_INTRODUCED;
  const date = new Date(`${startedAt.slice(0, 10)}T00:00:00Z`);
  const january = Date.UTC(date.getUTCFullYear(), 0, 1);
  const daysGone = Math.floor((date.getTime() - january) / 86400000);
  return 1 + Math.floor((perYear / Math.max(1, chambers)) * (daysGone / 365));
}
type NumberingKind = "state" | "congress" | "dc-council" | "council" | "plain";
interface NumberingScheme {
  readonly kind: NumberingKind;
  readonly template: string;
  readonly sessionOf: (year: number) => SessionIdentity;
  readonly firstNumberOf: (session: SessionIdentity) => number;
}
const FROM_ONE = (): number => 1;
export function congressNumberForYear(year: number): number {
  return Math.floor((year - 1789) / 2) + 1;
}
export function dcCouncilPeriodForYear(year: number): number {
  return Math.floor((year - 1975) / 2) + 1;
}
const DC_COUNCIL_TEMPLATE = "B{period}-{n4}";
function schemeFor(
  facts: NumberingFacts,
  pack: LegislativeRulePack | null,
  chamber: ChamberRule,
): NumberingScheme {
  const plainTemplate = `${chamber.billDesignationPrefix} {n}`;
  if (pack === null) {
    return {
      kind: "plain",
      template: plainTemplate,
      sessionOf: (year) => annualSession(year),
      firstNumberOf: FROM_ONE,
    };
  }
  if (pack.institution?.numberingCycle === "biennial-congress") {
    return {
      kind: "congress",
      template: plainTemplate,
      firstNumberOf: FROM_ONE,
      sessionOf: (year) => {
        const congress = congressNumberForYear(year);
        return {
          key: `congress-${congress}`,
          openingYear: 1789 + (congress - 1) * 2,
          period: congress,
        };
      },
    };
  }
  if (chamber.chamberKey === "council") {
    if (pack.jurisdictionKey.replace(/^US-/, "") === "DC") {
      return {
        kind: "dc-council",
        template: DC_COUNCIL_TEMPLATE,
        firstNumberOf: FROM_ONE,
        sessionOf: (year) => {
          const period = dcCouncilPeriodForYear(year);
          return {
            key: `council-period-${period}`,
            openingYear: 1975 + (period - 1) * 2,
            period,
          };
        },
      };
    }
    return {
      kind: "council",
      template: plainTemplate,
      sessionOf: (year) => annualSession(year),
      firstNumberOf: FROM_ONE,
    };
  }
  const style = facts.style;
  const chamberStyle =
    chamber.chamberKey === "senate" ? style.upper : style.lower;
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
          openingYear: opening,
          period: opening,
        };
      },
    };
  }
  return {
    kind: "state",
    template,
    sessionOf: (year) => annualSession(year),
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
function numberOf(designation: string): number | null {
  const digits = /(\d+)[A-Z]?$/.exec(designation.trim())?.[1];
  return digits === undefined ? null : Number(digits);
}
function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}
function sessionKeyOf(
  record: LegislativeMeasureRecord,
  scheme: NumberingScheme,
): string {
  return (
    record.numberingSession?.key ??
    scheme.sessionOf(yearOf(record.introducedAt)).key
  );
}
export function nextMeasureNumbering(
  facts: NumberingFacts,
  input: MeasureDesignationInput,
): MeasureNumbering {
  const pack = facts.pack;
  const scheme = schemeFor(facts, pack, input.originChamber);
  const originChamberKey = input.originChamber.chamberKey;
  const session = scheme.sessionOf(yearOf(facts.currentDate));
  const openingSession = scheme.sessionOf(yearOf(facts.startedAt));
  const inThisSession = (facts.measures ?? []).filter(
    (record) =>
      record.jurisdictionId === input.jurisdictionId &&
      sessionKeyOf(record, scheme) === session.key,
  );
  const inThisChamber = inThisSession.filter(
    (record) => record.originChamberKey === originChamberKey,
  );
  const alreadyInThisChamber = inThisChamber.length;
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
        ? councilOpeningNumber(facts.startedAt)
        : sessionStart -
          1 +
          openingBillNumber(
            facts.rows,
            pack?.jurisdictionKey ?? null,
            pack?.chambers.length ?? 1,
            facts.startedAt,
          );
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
    },
  };
}

// stopgapId: "SG-P14-elections-bill-opening-pace"
