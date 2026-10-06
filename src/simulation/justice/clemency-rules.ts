import table from "../../../data/research/clemency/clemency-gates-2026.json" with { type: "json" };
import type { IsoDate } from "../types";

/**
 * Who must agree before clemency is granted, in each state, D.C., the
 * territories and the federal government.
 *
 * The CTO's ruling of 9:54 p.m. on 2026-09-28 is the shape: record the real
 * gate, not a bucket. A place's rule is the list of bodies whose yes a grant
 * needs, in the order a petition reaches them, plus any board the grantor
 * hears from without a veto. The four labels in `executive-authority-rules.ts`
 * (`ClemencyModel`) describe the same facts coarsely; `clemencyModelOf` maps a
 * gate to them so the two can be checked against each other, and nothing
 * routes on the labels.
 *
 * The rows are data (`data/research/clemency/clemency-gates-2026.json`), read
 * from Research 4's table, so a modder can change a place's rule without
 * touching code. A referral rule not yet read starts from the most common
 * read rule and is marked `estimated-from-common-rule` (Claude CTO, 10:32
 * p.m. 9/28: no value shows UNKNOWN); what research can still read is in the
 * row's `toRead`, which no player surface shows.
 */

/** The governor, or the President where the row says so. */
export const EXECUTIVE_BODY = "executive" as const;

export type ClemencyVote =
  "majority" | "majority-including-executive" | "at-least-two";

export interface ClemencyBody {
  readonly key: string;
  readonly label: string;
  /** "appointed", or the offices that sit on it ex officio. */
  readonly members: "appointed" | readonly string[];
  /** Whether the executive sits on this body and votes in it. */
  readonly includesExecutive: boolean;
  readonly vote: ClemencyVote;
}

export type ClemencyOffenseCondition =
  | { readonly kind: "all" }
  | { readonly kind: "committed-before"; readonly date: IsoDate }
  | { readonly kind: "committed-on-or-after"; readonly date: IsoDate }
  | {
      readonly kind: "prior-felony-convictions-at-least";
      readonly count: number;
    };

/**
 * `required`: the law makes the grantor refer the case or wait for a report.
 * `optional`: the grantor may ask.
 */
export type ClemencyReferral = "required" | "optional";

/**
 * `read`: the rule was read from the row's sources.
 * `estimated-from-common-rule`: not read here yet, so it starts from the most
 * common rule among places where it was read; the row's note names them.
 */
export type ClemencyReferralBasis = "read" | "estimated-from-common-rule";

export interface ClemencyGate {
  readonly offenses: ClemencyOffenseCondition;
  /** Every body whose yes a grant needs, in the order a petition reaches them. */
  readonly mustAgree: readonly string[];
  /** A body the grantor hears from first, with no veto. */
  readonly advisory: {
    readonly body: string;
    readonly referral: ClemencyReferral;
    readonly referralBasis: ClemencyReferralBasis;
    /** The longest the grantor must wait for the report, where the law caps it. */
    readonly reportWithinDays?: number;
  } | null;
  /**
   * A law under which the board's recommendation takes effect when the
   * grantor does not act in time (Arizona, A.R.S. 31-402(C), (D)).
   */
  readonly unansweredRecommendationTakesEffect?: {
    readonly afterDays: number;
    readonly kinds: readonly ("pardon" | "commutation")[];
    readonly unanimous: boolean;
  };
  readonly note?: string;
}

export interface ClemencyAuthority {
  readonly jurisdictionKey: string;
  readonly place: string;
  /** "Governor" or "President". */
  readonly executiveTitle: string;
  readonly bodies: readonly ClemencyBody[];
  readonly gates: readonly ClemencyGate[];
  /** P: clause text read; G: a state guide quoting it; O: an official page. */
  readonly basis: "P" | "G" | "O";
  readonly sources: readonly string[];
  /** What research can still read. Never shown to a player. */
  readonly toRead: readonly string[];
  readonly notes: readonly string[];
}

export interface ClemencyTable {
  readonly id: string;
  readonly version: string;
  readonly asOf: IsoDate;
  readonly rows: readonly ClemencyAuthority[];
}

const VOTES: readonly ClemencyVote[] = [
  "majority",
  "majority-including-executive",
  "at-least-two",
];
const REFERRALS: readonly ClemencyReferral[] = ["required", "optional"];
const REFERRAL_BASES: readonly ClemencyReferralBasis[] = [
  "read",
  "estimated-from-common-rule",
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every problem with a table, in plain words; empty when it can be used. A
 * table with a problem is refused whole, because a place routed on half a rule
 * would grant or refuse on a rule nobody wrote.
 */
export function clemencyTableProblems(input: unknown): readonly string[] {
  const problems: string[] = [];
  const doc = input as Partial<ClemencyTable> | null;
  if (!doc || !Array.isArray(doc.rows)) return ["The table has no rows."];
  const seen = new Set<string>();
  for (const row of doc.rows) {
    const where = row?.jurisdictionKey ?? "(a row with no key)";
    if (!/^US(-[A-Z]{2})?$/.test(row?.jurisdictionKey ?? ""))
      problems.push(`${where}: the key is not US or US-XX.`);
    if (seen.has(where)) problems.push(`${where}: listed twice.`);
    seen.add(where);
    if (!["P", "G", "O"].includes(row.basis))
      problems.push(`${where}: the basis is not P, G or O.`);
    if (!Array.isArray(row.sources) || row.sources.length === 0)
      problems.push(`${where}: no source.`);
    const bodyKeys = new Set<string>([EXECUTIVE_BODY]);
    for (const body of row.bodies ?? []) {
      if (body.key === EXECUTIVE_BODY || bodyKeys.has(body.key))
        problems.push(`${where}: body ${body.key} is repeated or reserved.`);
      bodyKeys.add(body.key);
      if (!VOTES.includes(body.vote))
        problems.push(
          `${where}: body ${body.key} has an unsupported vote rule.`,
        );
      if (
        body.vote === "majority-including-executive" &&
        !body.includesExecutive
      )
        problems.push(
          `${where}: body ${body.key} needs the executive in its majority but does not seat the executive.`,
        );
    }
    if (!Array.isArray(row.gates) || row.gates.length === 0)
      problems.push(`${where}: no gate.`);
    for (const [index, gate] of (row.gates ?? []).entries()) {
      if (gate.mustAgree.length === 0)
        problems.push(`${where}: gate ${index + 1} names nobody who grants.`);
      for (const key of gate.mustAgree)
        if (!bodyKeys.has(key))
          problems.push(
            `${where}: gate ${index + 1} names ${key}, not a body.`,
          );
      if (gate.advisory) {
        if (!bodyKeys.has(gate.advisory.body))
          problems.push(
            `${where}: gate ${index + 1} is advised by a missing body.`,
          );
        if (!REFERRALS.includes(gate.advisory.referral))
          problems.push(
            `${where}: gate ${index + 1} has an unsupported referral.`,
          );
        if (!REFERRAL_BASES.includes(gate.advisory.referralBasis))
          problems.push(
            `${where}: gate ${index + 1} does not say whether its referral rule was read.`,
          );
        if (
          gate.advisory.reportWithinDays !== undefined &&
          !(gate.advisory.reportWithinDays > 0)
        )
          problems.push(`${where}: gate ${index + 1} has a bad report wait.`);
        if (
          gate.advisory.referralBasis === "estimated-from-common-rule" &&
          !row.notes.some((note: string) =>
            note.startsWith("ESTIMATED FROM COMMON RULE"),
          )
        )
          problems.push(
            `${where}: gate ${index + 1} is estimated without saying from what.`,
          );
        if (gate.mustAgree.includes(gate.advisory.body))
          problems.push(
            `${where}: gate ${index + 1} lists a body as both advising and deciding.`,
          );
      }
      const offenses = gate.offenses;
      if (
        (offenses.kind === "committed-before" ||
          offenses.kind === "committed-on-or-after") &&
        !DATE.test(offenses.date)
      )
        problems.push(`${where}: gate ${index + 1} has a malformed date.`);
    }
    const last = row.gates?.at(-1);
    // Every offense matches some gate: the last is for all offenses, or a
    // "before" date is paired with an "on or after" the same date.
    const before = new Set<string>();
    const onOrAfter = new Set<string>();
    for (const gate of row.gates ?? []) {
      const offenses: ClemencyOffenseCondition = gate.offenses;
      if (offenses.kind === "committed-before") before.add(offenses.date);
      if (offenses.kind === "committed-on-or-after")
        onOrAfter.add(offenses.date);
    }
    const covered =
      last?.offenses.kind === "all" ||
      [...before].some((date) => onOrAfter.has(date));
    if (!covered) problems.push(`${where}: some offenses match no gate.`);
  }
  return problems;
}

const TABLE: ClemencyTable = (() => {
  const problems = clemencyTableProblems(table);
  if (problems.length > 0)
    throw new Error(`The clemency table cannot be used: ${problems.join(" ")}`);
  return table as unknown as ClemencyTable;
})();

export function clemencyTable(): ClemencyTable {
  return TABLE;
}

/** The place's clemency rule, or null where the table has no row. */
export function clemencyAuthorityFor(
  jurisdictionKey: string,
): ClemencyAuthority | null {
  return (
    TABLE.rows.find((row) => row.jurisdictionKey === jurisdictionKey) ?? null
  );
}

/** What the gate needs to know about the case. */
export interface ClemencyCaseFacts {
  /** When the offense was committed, or null where no record dates it. */
  readonly committedAt: IsoDate | null;
  /** Felony convictions the person had before this one. */
  readonly priorFelonyConvictions: number;
}

/**
 * The gate that applies to one case: the first whose condition the case meets.
 * An offense with no date matches a dated gate never, so a row whose only
 * gates are dated answers null rather than guess the date.
 */
export function clemencyGateFor(
  authority: ClemencyAuthority,
  facts: ClemencyCaseFacts,
): ClemencyGate | null {
  for (const gate of authority.gates) {
    const offenses = gate.offenses;
    switch (offenses.kind) {
      case "all":
        return gate;
      case "committed-before":
        if (facts.committedAt !== null && facts.committedAt < offenses.date)
          return gate;
        break;
      case "committed-on-or-after":
        if (facts.committedAt !== null && facts.committedAt >= offenses.date)
          return gate;
        break;
      case "prior-felony-convictions-at-least":
        if (facts.priorFelonyConvictions >= offenses.count) return gate;
        break;
    }
  }
  return null;
}

export function clemencyBody(
  authority: ClemencyAuthority,
  key: string,
): ClemencyBody | null {
  return authority.bodies.find((body) => body.key === key) ?? null;
}

/**
 * The old four-label reading of a gate, for checking the accepted executive
 * packs against this table. `consent-body` is the fifth arrangement Claude CTO
 * approved on 2026-09-28 (a council, the senate or cabinet members).
 */
export function clemencyModelOf(
  gate: ClemencyGate,
):
  | "executive-sole"
  | "board-advisory"
  | "board-required"
  | "board-exclusive"
  | "consent-body" {
  const executive = gate.mustAgree.includes(EXECUTIVE_BODY);
  const others = gate.mustAgree.filter((key) => key !== EXECUTIVE_BODY);
  if (!executive) return "board-exclusive";
  // A board the executive may ask but need not is still the executive alone.
  if (others.length === 0)
    return gate.advisory && gate.advisory.referral !== "optional"
      ? "board-advisory"
      : "executive-sole";
  const first = gate.mustAgree[0];
  const consent = others.some((key) =>
    ["council", "senate", "cabinet"].includes(key),
  );
  if (consent && first === EXECUTIVE_BODY) return "consent-body";
  return "board-required";
}
