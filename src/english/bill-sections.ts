/**
 * A bill's sections, worded from the bill's own record.
 *
 * The legislature module holds a bill as a number, a form (an act or an
 * ordinance, with its enacting clause) and provisions that point at catalog
 * policies and law series. `data/english/bill-sections.json` carries, for
 * each of those, its subject, purpose and operative clause (authored once,
 * graded in a words batch). This file arranges them in the form the body
 * files: the title ("An ordinance to make public transit free to ride."),
 * one numbered section per provision with the body's enacting words, and the
 * closing section on when it takes effect. Never the federal short-title form
 * for a local measure. A law amount reads its new value in its unit, and a
 * raise from a lower one reads differently from a cut.
 */
import { properName } from "../director/words";
import sectionsJson from "../../data/english/bill-sections.json" with { type: "json" };

/**
 * A row authored since the file was last graded says so: `origin: "authored"`
 * with its author and date, and `shippable: false` until the owner grades it.
 * A row with no flag is graded wording from the file's first batch.
 */
interface RowMark {
  origin?: "authored";
  author?: string;
  date?: string;
  shippable?: boolean;
}
interface PolicyWords extends RowMark {
  subject: string;
  purpose: string;
  enact: string;
}
interface AmountWords extends RowMark {
  raiseTo: string;
  lowerTo: string;
  subject: string;
  purpose: string;
  raise: string;
  lower: string;
}
interface FormWords {
  title: string;
  repealTitle: string;
  first: string;
  further: string;
  repeal: string;
  effective: Record<
    "on-enactment" | "days-after-adoption" | "state-rule" | "date",
    string
  >;
}
interface NamesData {
  forms: { ordinance: FormWords; act: FormWords };
  joiners: { subjects: string; purposes: string };
  policies: Record<string, PolicyWords>;
  amounts: Record<string, AmountWords>;
  units: Record<string, string>;
  cited: string;
}
export const BILL_SECTIONS = sectionsJson as unknown as NamesData;

/** What the bill row holds that the words need; `BillRow` and `billForm` fit it. */
export interface BillWordsInput {
  readonly id: string;
  readonly number: string;
  readonly form: { readonly kind: string; readonly enactingClause: string };
  readonly provisions: readonly {
    readonly kind: string;
    readonly question?: string;
    readonly series?: string;
    readonly value: number;
    readonly unit?: string;
    readonly operation?: string;
    readonly effectiveDate?: string;
  }[];
  /** `billForm(api, bill).effectiveSection`, when the caller has the API. */
  readonly effective?: {
    readonly kind: "on-enactment" | "state-rule" | "days-after-adoption";
    readonly days: number | null;
    readonly date: string | null;
  } | null;
  /**
   * Each section's law before the bill (`billSections` `before`): to tell a
   * raise from a cut, to say what it was, and to cite the statute it amends.
   */
  readonly before?: readonly ({
    readonly value: number | null;
    readonly unit?: string | null;
    readonly statute?: string | null;
  } | null)[];
}

export interface ComposedBill {
  readonly designation: string;
  /** "An ordinance to make public transit free to ride." */
  readonly title: string;
  /** Each section, enacting words first. */
  readonly sections: readonly string[];
  /** The closing section on when it takes effect, when the record gives one. */
  readonly effective: string | null;
  /** Title, sections and the closing section, in order: the text of the bill. */
  readonly text: readonly string[];
  /** The catalog keys the words came from. */
  readonly keys: readonly string[];
}

const fill = (template: string, slots: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_all, slot: string) =>
    String(slots[slot] ?? ""),
  );
const upperFirst = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

const dollars = (minor: number) =>
  `$${(minor / 100).toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(minor / 100) ? 0 : 2,
  })}`;

/** A value as its unit says it: "4.5 percent", "$15 an hour". */
export function valueWords(value: number, unit: string | undefined): string {
  const kind = !unit
    ? "percent"
    : unit.startsWith("percent")
      ? "percent"
      : unit;
  const template = BILL_SECTIONS.units[kind];
  if (!template) return String(value);
  return fill(template, {
    value,
    dollars: kind === "minor/hour" ? dollars(value) : dollars(value * 100),
  });
}

interface Words {
  key: string;
  subject: string;
  purpose: string;
  /** The clause after "That". */
  clause: string;
  repeal: boolean;
}

/** Whether a row may reach a player: an ungraded authored row never ships. */
export function shipsAsWords(
  row: RowMark | undefined,
  ungraded = false,
): boolean {
  return !!row && (ungraded || row.shippable !== false);
}

function wordsOf(
  input: BillWordsInput,
  form: FormWords,
  index: number,
  ungraded: boolean,
): Words | null {
  const p = input.provisions[index]!;
  if (p.kind === "policy-question" && p.question) {
    const key = p.question.replace(/^[a-z]+(?:-[a-z]+)*:/, "");
    const row = BILL_SECTIONS.policies[key];
    if (!row || !shipsAsWords(row, ungraded)) return null;
    const repeal = p.operation ? p.operation === "repeal" : p.value <= 0;
    return {
      key,
      subject: row.subject,
      purpose: row.purpose,
      clause: repeal ? fill(form.repeal, { subject: row.subject }) : row.enact,
      repeal,
    };
  }
  if (p.kind === "law-amount" && p.series) {
    const row = BILL_SECTIONS.amounts[p.series];
    if (!row || !shipsAsWords(row, ungraded)) return null;
    const was = input.before?.[index] ?? null;
    const old = was?.value ?? null;
    const lower = p.operation
      ? p.operation === "lower"
      : old != null && p.value < old;
    // The value the law had, in its own unit when the record gives one.
    const slots = {
      value: valueWords(p.value, p.unit),
      before: old != null ? valueWords(old, was?.unit ?? p.unit) : "",
    };
    const clause = fill(
      old != null
        ? lower
          ? row.lower
          : row.raise
        : lower
          ? row.lowerTo
          : row.raiseTo,
      slots,
    );
    return {
      key: p.series,
      subject: row.subject,
      purpose: row.purpose,
      clause: was?.statute
        ? fill(BILL_SECTIONS.cited, { clause, statute: was.statute })
        : clause,
      repeal: false,
    };
  }
  return null;
}

const joinWords = (names: readonly string[], joiner: string) =>
  names.length <= 1
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} ${joiner} ${names.at(-1)}`;

/**
 * The bill's title and text. Null when a provision has no words in the
 * data (a budget line, or a policy the catalog gained) or only words the
 * owner has not graded (`shippable: false`): the caller records the gap
 * rather than falling back to the policy's description. A grading batch
 * passes `ungraded` to word the rows it puts before the owner.
 */
export function composeBill(
  input: BillWordsInput,
  options: { readonly ungraded?: boolean } = {},
): ComposedBill | null {
  const form =
    input.form.kind === "ordinance"
      ? BILL_SECTIONS.forms.ordinance
      : BILL_SECTIONS.forms.act;
  if (input.provisions.length === 0) return null;
  const words: Words[] = [];
  for (let i = 0; i < input.provisions.length; i++) {
    const w = wordsOf(input, form, i, options.ungraded ?? false);
    if (!w) return null;
    words.push(w);
  }
  const allRepeal = words.every((w) => w.repeal);
  const purposes = joinWords(
    words.map((w) => w.purpose),
    BILL_SECTIONS.joiners.purposes,
  );
  const title = allRepeal
    ? fill(form.repealTitle, {
        subject: joinWords(
          words.map((w) => w.subject),
          BILL_SECTIONS.joiners.subjects,
        ),
      })
    : fill(form.title, { purpose: purposes });
  const enacting = properName(input.form.enactingClause.replace(/[,\s]+$/, ""));
  const sections = words.map((w, i) =>
    fill(i === 0 ? form.first : form.further, {
      number: i + 1,
      enacting,
      text: w.clause,
    }),
  );
  const eff = input.effective;
  const dates = new Set(input.provisions.map((p) => p.effectiveDate ?? null));
  const date = eff?.date ?? (dates.size === 1 ? [...dates][0]! : null);
  const effective = eff
    ? fill(form.effective[date ? "date" : eff.kind], {
        days: eff.days ?? "",
        date: date ? longDate(date) : "",
      })
    : null;
  return {
    designation: input.number,
    title,
    sections,
    effective,
    text: [upperFirst(title), ...sections, ...(effective ? [effective] : [])],
    keys: words.map((w) => w.key),
  };
}
