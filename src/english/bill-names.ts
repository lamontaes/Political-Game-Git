/**
 * A bill's real name. The legislature records which policy question a bill
 * enacts or repeals; this reads the name authored for it in
 * `data/english/bill-names.json` ("Missing Middle Housing Ordinance"), never
 * the catalog's description ("allow multifamily in single family zones"), and
 * the noun phrase the long title says it does. Nothing is typed here: the
 * Act or Ordinance word comes from the bill's own form, and the sentence is
 * composed by the legislation bank.
 */
import billNames from "../../data/english/bill-names.json" with { type: "json" };

export interface BillNameBook {
  readonly forms: Readonly<Record<string, string>>;
  readonly policies: Readonly<
    Record<
      string,
      {
        readonly name: string;
        readonly purpose: string;
        readonly repealName: string;
        readonly repealPurpose: string;
      }
    >
  >;
}

export interface BillName {
  /** The short title with its form word, such as "Fair Wage Act". */
  readonly title: string;
  /** What the long title says the bill is for, as a noun phrase. */
  readonly purpose: string;
  /** Whether the bill undoes or lessens its policy (a repeal, a cut). */
  readonly reverses: boolean;
}

/**
 * The name of a bill that enacts (or, with `repeal`, repeals) a policy
 * question under the given bill form; null when no name is authored for it.
 */
export function billNameFor(
  question: string,
  formKind: string,
  repeal: boolean,
  book: BillNameBook = billNames as BillNameBook,
): BillName | null {
  const row = book.policies[question];
  const form = book.forms[formKind];
  if (!row || !form) return null;
  return repeal
    ? {
        title: `${row.repealName} ${form}`,
        purpose: row.repealPurpose,
        reverses: true,
      }
    : { title: `${row.name} ${form}`, purpose: row.purpose, reverses: false };
}

/** What a bill's section carries that names it: the catalog policy or question it was drafted from, and what it does. */
export interface NamedSection {
  readonly kind: string;
  readonly question?: string;
  readonly policyId?: string;
  readonly operation?: string;
  readonly value: number;
}

/** The operations that undo or lessen what a policy does. */
const REVERSING = new Set(["repeal", "lower", "restrict"]);

/**
 * The real name of a bill: that of its first section that has one. A section
 * reverses its policy by its operation; a policy question with none reverses
 * when its value is not on. A rate or a budget line with no operation has no
 * known direction and no name.
 */
export function billNameOf(
  bill: {
    readonly form: { readonly kind: string };
    readonly provisions: readonly NamedSection[];
  },
  book: BillNameBook = billNames as BillNameBook,
): BillName | null {
  for (const section of bill.provisions) {
    const reverse = section.operation
      ? REVERSING.has(section.operation)
      : section.kind === "policy-question"
        ? section.value <= 0
        : null;
    if (reverse === null) continue;
    for (const key of [section.policyId, section.question]) {
      const found = key
        ? billNameFor(key, bill.form.kind, reverse, book)
        : null;
      if (found) return found;
    }
  }
  return null;
}

/**
 * A drafting sentence mined from Congress ("This Act may be cited as ...")
 * said of a bill of another form: the word for the bill's own form takes the
 * place of "Act" ("This Ordinance may be cited as ...").
 */
export function inBillForm(
  sentence: string,
  formKind: string,
  book: BillNameBook = billNames as BillNameBook,
): string {
  const form = book.forms[formKind];
  return form ? sentence.replace(/\bAct\b/g, form) : sentence;
}
