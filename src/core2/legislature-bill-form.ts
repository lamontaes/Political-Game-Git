/**
 * A bill's form in its own body (the owner's ruling, Oct 14, 2026): what it
 * is, how the body numbers it, and its enacting clause. A state chamber
 * numbers by its recorded prefix and period ("LB 12" in Nebraska's
 * two-year legislature), Congress by H.R. and S. per two-year Congress, and
 * a town's body numbers its ordinances by the year.
 */
import forms from "./data/legislature/bill-forms.json" with { type: "json" };
import clauses from "./data/legislature/enacting-clauses.json" with { type: "json" };
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
  return {
    kind: "ordinance",
    template: f.template,
    runKey: `${body.id}:${year}`,
    periodOpened: year,
    firstNumber: f.firstNumber,
    enactingClause: f.enactingClause,
    enactingSource: f.enactingSource,
  };
}

/** The designation a body's nth bill of its run carries. */
export function designation(numbering: BodyNumbering, n: number): string {
  const yyyy = String(numbering.periodOpened);
  return numbering.template
    .replace("{n}", String(n))
    .replace("{yyyy}", yyyy)
    .replace("{yy}", yyyy.slice(2));
}
