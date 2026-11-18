/**
 * A bill's form in its own body (the owner's ruling, Oct 14, 2026): what it
 * is, how the body numbers it, and its enacting clause. A state chamber
 * numbers by its recorded prefix and period ("LB 12" in Nebraska's
 * two-year legislature), Congress by H.R. and S. per two-year Congress, and
 * a town's body numbers its ordinances by the year.
 */
import forms from "./data/legislature/bill-forms.json" with { type: "json" };
import clauses from "./data/legislature/enacting-clauses.json" with { type: "json" };
import localStyle from "../../data/research/gov/local-ordinance-style-2026.json" with { type: "json" };
import {
  gameDefaultBillNumberingStyle,
  recordedStateBillNumberingStyle,
} from "./bill-numbering-styles";

export type BillFormKind = "act" | "ordinance";

/** How one body numbers its bills: the template, and which run of numbers a date falls in. */
export interface BodyNumbering {
  readonly kind: BillFormKind;
  /** `{n}` the number, `{yy}` and `{yyyy}` the year its numbering period opened. */
  readonly template: string;
  /** The counter's key: one run of numbers per chamber per period. */
  readonly runKey: string;
  readonly periodOpened: number;
  readonly firstNumber: number;
  /** The enacting clause as the law prescribes it, `{body}` for a local body's name. */
  readonly enactingClause: string;
  readonly enactingSource: string;
  /** A body that numbers by the council's period (`{period}` in the template): the period's own number. */
  readonly periodLabel?: number;
}

interface LocalClauseRow {
  readonly clause: string;
  readonly kinds?: readonly string[];
  readonly statute?: string;
  readonly tag: string;
}
interface LocalNumberingRow {
  readonly template: string;
  readonly period: string;
  /** A council-period numbering: the period that opened in `periodAnchorYear`, and its number. */
  readonly periodAnchorYear?: number;
  readonly periodAnchorNumber?: number;
  readonly statute?: string;
}
const LOCAL_PLACES = (
  localStyle as unknown as {
    places: Record<
      string,
      {
        municipal: LocalClauseRow;
        county: LocalClauseRow;
        numbering: LocalNumberingRow;
      }
    >;
  }
).places;

/**
 * The place a local body sits in, for the clause and the numbering its state's general law gives it:
 * the state's key and the government's own name ("City of Boise"). Where none is given, or the place
 * has no row, the national default in bill-forms.json stands.
 */
export interface LocalPlace {
  readonly state: string;
  readonly governmentName: string;
}

/** A government's class word and name as its listing says it ("City of Boise" is a city called Boise). */
function classOf(governmentName: string): { kind: string; name: string } {
  const named =
    /^(City|Town|Village|Borough|Township|County|Parish|Plantation|(?:Charter |Civil |Metro )?Township) of (.+)$/i.exec(
      governmentName,
    );
  return named
    ? { kind: named[1]!.toLowerCase(), name: named[2]! }
    : { kind: "city", name: governmentName };
}

interface ClauseRow {
  readonly text: string;
  readonly citation: string;
}
const CLAUSES = (clauses as unknown as { clauses: Record<string, ClauseRow> })
  .clauses;

function periodOpened(
  year: number,
  period: "annual" | "biennial",
  opensIn: "odd" | "even",
): number {
  if (period === "annual") return year;
  const odd = year % 2 === 1;
  return (opensIn === "odd") === odd ? year : year - 1;
}

/**
 * The form a body's measures take by its office kind: Congress and a state
 * chamber pass acts (said "bill"), every local body ordinances. The one rule
 * `bodyNumbering` and a speech saying what the body passes both read.
 */
export function formKindOf(officeKind: string): BillFormKind {
  return /^(?:us-house|us-senate|legislature-(?:lower|upper|unicameral))/.test(
    officeKind,
  )
    ? "act"
    : "ordinance";
}

/**
 * The numbering of the body a bill goes to, from the body's office kind and
 * jurisdiction ("US", "US-XX", or a local government id).
 */
export function bodyNumbering(
  body: {
    readonly id: string;
    readonly kind: string;
    readonly jurisdiction: string;
  },
  date: string,
  place?: LocalPlace,
): BodyNumbering {
  const year = Number(date.slice(0, 4));
  if (body.kind.startsWith("us-house") || body.kind === "us-senate") {
    const f = forms.federal;
    const opened = periodOpened(year, "biennial", "odd");
    const upper = body.kind === "us-senate";
    return {
      kind: "act",
      template: upper ? f.upper : f.lower,
      runKey: `US:${upper ? "upper" : "lower"}:${opened}`,
      periodOpened: opened,
      firstNumber: f.firstNumber,
      enactingClause: f.enactingClause,
      enactingSource: f.enactingSource,
    };
  }
  const chamber = /^legislature-(lower|upper|unicameral)$/.exec(body.kind)?.[1];
  if (chamber) {
    // A legislature whose own rules number by the council's period (the District's Council): the
    // place's row in local-ordinance-style-2026.json says so, so no place is named here.
    const byPeriod =
      LOCAL_PLACES[body.jurisdiction.replace(/^US-/, "")]?.numbering;
    if (byPeriod?.period === "council-period") {
      const opened = periodOpened(year, "biennial", "odd");
      return {
        kind: "act",
        template: byPeriod.template,
        runKey: `${body.jurisdiction}:${opened}`,
        periodOpened: opened,
        firstNumber: forms.local.firstNumber,
        enactingClause: CLAUSES[body.jurisdiction]?.text ?? "",
        enactingSource: CLAUSES[body.jurisdiction]?.citation ?? "",
        periodLabel:
          (byPeriod.periodAnchorNumber ?? 1) +
          (opened - (byPeriod.periodAnchorYear ?? opened)) / 2,
      };
    }
    const style =
      recordedStateBillNumberingStyle(body.jurisdiction) ??
      gameDefaultBillNumberingStyle(body.jurisdiction);
    const side = chamber === "upper" ? style.upper : style.lower;
    const opened = periodOpened(year, style.period, style.biennialOpensIn);
    const clause = CLAUSES[body.jurisdiction];
    if (!clause)
      throw new Error(`No enacting clause recorded for ${body.jurisdiction}.`);
    // A state whose even year opens a block of its own (Rhode Island's House
    // at 7001) starts a fresh run that year.
    const evenBlock = year % 2 === 0 && side.evenYearFirstNumber !== null;
    return {
      kind: "act",
      template: side.template,
      runKey: `${body.jurisdiction}:${chamber === "upper" ? "upper" : "lower"}:${opened}${evenBlock ? `:${year}` : ""}`,
      periodOpened: opened,
      firstNumber: evenBlock ? side.evenYearFirstNumber! : side.firstNumber,
      enactingClause: clause.text,
      enactingSource: clause.citation,
    };
  }
  const f = forms.local;
  const row = place ? LOCAL_PLACES[place.state] : undefined;
  if (!place || !row)
    return {
      kind: "ordinance",
      template: f.template,
      runKey: `${body.id}:${year}`,
      periodOpened: year,
      firstNumber: f.firstNumber,
      enactingClause: f.enactingClause,
      enactingSource: f.enactingSource,
    };
  const { kind, name } = classOf(place.governmentName);
  // The clause the state's general law gives this kind of government; a government of a kind the
  // statute does not cover keeps the national default.
  const clauseRow = body.kind === "county-board" ? row.county : row.municipal;
  const covered =
    clauseRow.tag === "SOURCED" &&
    (!clauseRow.kinds || clauseRow.kinds.includes(kind));
  const clause = covered ? clauseRow.clause : f.enactingClause;
  const numbering = row.numbering;
  return {
    kind: "ordinance",
    template: numbering.template,
    runKey: `${body.id}:${year}`,
    periodOpened: year,
    firstNumber: f.firstNumber,
    enactingClause: clause.replace("{place}", name).replace("{kind}", kind),
    enactingSource: covered
      ? (clauseRow.statute ?? f.enactingSource)
      : f.enactingSource,
  };
}

/** The designation a body's nth bill of its run carries. */
export function designation(numbering: BodyNumbering, n: number): string {
  const yyyy = String(numbering.periodOpened);
  return numbering.template
    .replace("{n}", String(n))
    .replace("{yyyy}", yyyy)
    .replace("{yy}", yyyy.slice(2))
    .replace("{period}", String(numbering.periodLabel ?? ""));
}
