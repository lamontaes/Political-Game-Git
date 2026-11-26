/**
 * Reads the laws a session passed on policy questions against the law at
 * their level the day each passed, for the tests and checks of pool item
 * laws-session-passes-moot-and-opposite-bills. Read from the law rows alone.
 */
import type { LawRowInput } from "./laws-starting";
import { LAWS_MODULE_ID } from "./modules/laws";
import { POLICY_QUESTIONS } from "./policy-answers";
import type { CoreAPI } from "./types";

const sequenceOf = (row: LawRowInput) =>
  Number(row.terms?.enactedSequence ?? 0);
/** The law a later row of the same series reads: the latest effective date, the later enacted of two the same day. */
export const laterOf = (a: LawRowInput, b: LawRowInput) =>
  a.effectiveDate !== b.effectiveDate
    ? a.effectiveDate > b.effectiveDate
      ? a
      : b
    : sequenceOf(a) >= sequenceOf(b)
      ? a
      : b;

export interface PassedLaw {
  readonly row: LawRowInput;
  /** The law at its level the day it passed: the starting answer or an earlier act, in force or waiting. */
  readonly prior: LawRowInput | undefined;
  /** It sets the answer already law there. */
  readonly repeats: boolean;
  /** It points against an act of the same session that had not taken effect yet. */
  readonly undoesPending: boolean;
}

/**
 * Every law passed in play on a policy question by the jurisdictions in the
 * town's chain, in the order enacted, each against what stood at its level
 * the day it passed; read from the law rows alone.
 */
export function auditPassed(
  api: CoreAPI,
  jurisdictions: ReadonlySet<string>,
): readonly PassedLaw[] {
  const rows = (
    api
      .moduleState(LAWS_MODULE_ID)
      .table("laws")
      .rows() as unknown as LawRowInput[]
  ).filter(
    (r) => r.series in POLICY_QUESTIONS && jurisdictions.has(r.jurisdiction),
  );
  const standing = new Map<string, LawRowInput[]>();
  for (const row of rows.filter((r) => r.terms?.enactedBy === undefined)) {
    const key = `${row.jurisdiction}|${row.series}`;
    standing.set(key, [...(standing.get(key) ?? []), row]);
  }
  return rows
    .filter((r) => r.terms?.enactedBy !== undefined)
    .sort((a, b) => sequenceOf(a) - sequenceOf(b))
    .map((row): PassedLaw => {
      const key = `${row.jurisdiction}|${row.series}`;
      const known = standing.get(key) ?? [];
      const prior = known.length ? known.reduce(laterOf) : undefined;
      standing.set(key, [...known, row]);
      const sameAnswer = (prior?.value === 1) === (row.value === 1);
      return {
        row,
        prior,
        repeats: prior !== undefined && sameAnswer,
        undoesPending:
          !sameAnswer &&
          prior !== undefined &&
          prior.effectiveDate > row.retrieved,
      };
    });
}

/** Pairs of laws on one question at one level taking effect the same day with opposite answers. */
export function oppositePairs(passed: readonly PassedLaw[]): string[] {
  const days = new Map<string, LawRowInput[]>();
  for (const { row } of passed) {
    const key = `${row.jurisdiction}|${row.series}|${row.effectiveDate}`;
    days.set(key, [...(days.get(key) ?? []), row]);
  }
  return [...days.values()]
    .filter((rows) => new Set(rows.map((r) => r.value === 1)).size > 1)
    .map((rows) => rows.map((r) => `${r.id} (${r.value})`).join(" against "));
}
