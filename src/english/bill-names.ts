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
  readonly list: { readonly conjunction: string };
  /** A budget bill's name and purpose: it sets amounts for spending lines, with no direction. */
  readonly budget: { readonly name: string; readonly purpose: string };
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

/** A bill's title composed from its sections: the name, the long title's purpose, and each section's own. */
export interface BillTitle extends BillName {
  readonly sections: readonly {
    /** The section's place in the bill and the catalog row it was drafted from. */
    readonly index: number;
    readonly key: string;
    readonly purpose: string;
  }[];
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
  /** For a budget line: the spending function. */
  readonly line?: string;
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
  // A budget bill: only spending lines, each with its amount and no direction.
  const form = book.forms[bill.form.kind];
  if (
    form &&
    bill.provisions.length > 0 &&
    bill.provisions.every(
      (section) => section.kind === "budget-line" && !section.operation,
    )
  )
    return {
      title: `${book.budget.name} ${form}`,
      purpose: book.budget.purpose,
      reverses: false,
    };
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

/** Items in a list as American English writes them: "a", "a and b", "a, b, and c". */
function joinList(items: readonly string[], conjunction: string): string {
  if (items.length < 3) return items.join(` ${conjunction} `);
  return `${items.slice(0, -1).join(", ")}, ${conjunction} ${items.at(-1)}`;
}

/**
 * A bill's title composed from all its sections: the name of its first named
 * section, and a long-title purpose that joins every named section's purpose
 * ("a higher minimum wage, and paid time off to care for a new child"). Each
 * section keeps the catalog row it came from. Null when no section has a name.
 */
export function billTitleOf(
  bill: {
    readonly form: { readonly kind: string };
    readonly provisions: readonly NamedSection[];
  },
  book: BillNameBook = billNames as BillNameBook,
): BillTitle | null {
  const first = billNameOf(bill, book);
  if (!first) return null;
  // A budget bill states one purpose, not one per spending line.
  if (first.purpose === book.budget.purpose)
    return {
      ...first,
      sections: bill.provisions.flatMap((section, index) => {
        const key = section.policyId ?? section.question ?? section.line;
        return key ? [{ index, key, purpose: first.purpose }] : [];
      }),
    };
  const sections = bill.provisions.flatMap((section, index) => {
    const named = billNameOf({ form: bill.form, provisions: [section] }, book);
    const key = section.policyId ?? section.question;
    return named && key ? [{ index, key, purpose: named.purpose }] : [];
  });
  return {
    ...first,
    purpose: joinList(
      sections.map((row) => row.purpose),
      book.list.conjunction,
    ),
    sections,
  };
}

/**
 * How a bill's designation is said aloud. A designation that carries its own
 * letters ("S 9", "H.R. 25", "LB 12") is said as it is; a bare number
 * ("2025-12", a town's ordinance) takes its form's word first, as a clerk
 * reads it ("Ordinance 2025-12").
 */
export function spokenDesignation(
  designation: string,
  formKind: string,
  book: BillNameBook = billNames as BillNameBook,
): string {
  const form = book.forms[formKind];
  return form && !/[A-Za-z]/.test(designation)
    ? `${form} ${designation}`
    : designation;
}
