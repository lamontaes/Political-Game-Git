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
import { spokenDate } from "../core2/kernel/dates";
import { properName } from "../director/words";
import { billTitleOf, spokenDesignation } from "./bill-names";
import sectionsJson from "../../data/english/bill-sections.json" with { type: "json" };

interface PolicyWords {
  subject: string;
  purpose: string;
  enact: string;
}
interface AmountWords {
  subject: string;
  purpose: string;
  raiseTo?: string;
  lowerTo?: string;
  raise?: string;
  lower?: string;
  /** A switch (1 grants, 0 withdraws), worded by what each does, never "raised to 1". */
  grant?: string;
  withdraw?: string;
}
interface FormWords {
  title: string;
  repealTitle: string;
  /** The federal and state form only: a local measure has no short title. */
  shortTitle?: string;
  longTitle?: string;
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
   * raise from a cut, to say what it was, and to cite the bill that enacted
   * it, said in that bill's own form, or a starting law's recorded statute.
   */
  readonly before?: readonly ({
    readonly value: number | null;
    readonly unit?: string | null;
    readonly statute?: string | null;
    readonly statuteForm?: string | null;
  } | null)[];
}

export interface ComposedBill {
  readonly designation: string;
  /** "An ordinance to make public transit free to ride." */
  readonly title: string;
  /** Each section, enacting words first. */
  readonly sections: readonly string[];
  /** "This Act may be cited as the “Fair Wage Act”." An act's short title, from the bill's own name; none for a local measure or a bill with no name. */
  readonly shortTitle: string | null;
  /** "To provide for a higher minimum wage, and for other purposes." An act's long title, from its sections' purposes. */
  readonly longTitle: string | null;
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

/** An amount of money as it is said: "$250", "$12.50". */
export const dollars = (minor: number) =>
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

/**
 * The words for a law amount by its series. A state's bar on its places' own
 * rule for one policy question (`local-power:<question>`) is worded from that
 * question's own subject, so the one switch needs no row a question.
 */
export function amountWords(series: string): AmountWords | undefined {
  const row = BILL_SECTIONS.amounts[series];
  if (row || !series.startsWith("local-power:")) return row;
  const key = series.replace(/^local-power:[a-z]+(?:-[a-z]+)*:/, "");
  const subject = BILL_SECTIONS.policies[key]?.subject;
  if (!subject) return undefined;
  return {
    subject: `local governments' power to make their own rules on ${subject}`,
    purpose: `decide whether local governments may make their own rules on ${subject}`,
    grant: `each city, town and county may make its own rules on ${subject}, by ordinance`,
    withdraw: `no city, town or county shall make its own rule on ${subject}, and any such rule in force shall end`,
  };
}

function wordsOf(
  input: BillWordsInput,
  form: FormWords,
  index: number,
): Words | null {
  const p = input.provisions[index]!;
  if (p.kind === "policy-question" && p.question) {
    const key = p.question.replace(/^[a-z]+(?:-[a-z]+)*:/, "");
    const row = BILL_SECTIONS.policies[key];
    if (!row) return null;
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
    const row = amountWords(p.series);
    if (!row) return null;
    if (row.grant && row.withdraw)
      return {
        key: p.series,
        subject: row.subject,
        purpose: row.purpose,
        clause: p.value > 0 ? row.grant : row.withdraw,
        repeal: false,
      };
    const was = input.before?.[index] ?? null;
    const old = was?.value ?? null;
    const lower = p.operation
      ? p.operation === "lower"
      : old != null && p.value < old;
    // The value the law had, in its own unit when the record gives one.
    const slots = {
      // A section that names no unit takes the law row's, never a default percent.
      value: valueWords(p.value, p.unit ?? was?.unit ?? undefined),
      before: old != null ? valueWords(old, was?.unit ?? p.unit) : "",
    };
    const words =
      old != null
        ? lower
          ? row.lower
          : row.raise
        : lower
          ? row.lowerTo
          : row.raiseTo;
    if (!words) return null;
    const clause = fill(words, slots);
    return {
      key: p.series,
      subject: row.subject,
      purpose: row.purpose,
      clause: was?.statute
        ? fill(BILL_SECTIONS.cited, {
            clause,
            // A bill passed in play is said in its form ("Ordinance
            // 2025-3"); a starting law's recorded statute, as recorded.
            statute: was.statuteForm
              ? spokenDesignation(was.statute, was.statuteForm)
              : was.statute,
          })
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
 * data (a budget line, or a policy the catalog gained): the caller records
 * the gap rather than falling back to the policy's description.
 */
export function composeBill(input: BillWordsInput): ComposedBill | null {
  const form =
    input.form.kind === "ordinance"
      ? BILL_SECTIONS.forms.ordinance
      : BILL_SECTIONS.forms.act;
  if (input.provisions.length === 0) return null;
  const words: Words[] = [];
  for (let i = 0; i < input.provisions.length; i++) {
    const w = wordsOf(input, form, i);
    if (!w) return null;
    words.push(w);
  }
  const allRepeal = words.every((w) => w.repeal);
  // Two sections on one law (a raise in dated steps) state its purpose once.
  const purposes = joinWords(
    [...new Set(words.map((w) => w.purpose))],
    BILL_SECTIONS.joiners.purposes,
  );
  const title = allRepeal
    ? fill(form.repealTitle, {
        subject: joinWords(
          [...new Set(words.map((w) => w.subject))],
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
  // An act (never a local ordinance) opens with its short and long titles, said
  // from the bill's own name and purposes (bill-names.ts), when it has them.
  const named =
    form.shortTitle && form.longTitle
      ? billTitleOf({ form: input.form, provisions: input.provisions })
      : null;
  const shortTitle =
    named && form.shortTitle
      ? fill(form.shortTitle, { act: `\u201C${named.title}\u201D` })
      : null;
  const longTitle =
    named && form.longTitle
      ? fill(form.longTitle, {
          purpose: joinWords(
            [...new Set(named.sections.map((row) => row.purpose))],
            BILL_SECTIONS.joiners.purposes,
          ),
        })
      : null;
  const eff = input.effective;
  const dates = new Set(input.provisions.map((p) => p.effectiveDate ?? null));
  const date = eff?.date ?? (dates.size === 1 ? [...dates][0]! : null);
  const effective = eff
    ? fill(form.effective[date ? "date" : eff.kind], {
        days: eff.days ?? "",
        date: date ? spokenDate(date) : "",
      })
    : null;
  return {
    designation: input.number,
    title,
    shortTitle,
    longTitle,
    sections,
    effective,
    text: [
      upperFirst(title),
      ...(longTitle ? [longTitle] : []),
      ...(shortTitle ? [shortTitle] : []),
      ...sections,
      ...(effective ? [effective] : []),
    ],
    keys: words.map((w) => w.key),
  };
}
