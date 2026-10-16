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
    ? { title: `${row.repealName} ${form}`, purpose: row.repealPurpose }
    : { title: `${row.name} ${form}`, purpose: row.purpose };
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
