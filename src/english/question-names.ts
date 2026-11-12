/**
 * The spoken names of the bill catalog's policy questions
 * (`data/english/question-names.json`, authored to the English engine's
 * patterns): one fixed noun phrase that reads after "about" and one verb
 * phrase that reads after "to", so a stand is said as a plain sentence. A
 * question with no name here is not offered as a stand.
 */
import data from "../../data/english/question-names.json" with { type: "json" };
import yearData from "../../data/english/year-claims.json" with { type: "json" };
import townData from "../../data/english/town-figures.json" with { type: "json" };

const NAMES = data.names as Readonly<
  Record<
    string,
    {
      readonly about: string;
      readonly to: string;
      readonly for?: string;
      readonly against?: string;
      readonly repeal?: string;
      readonly keep?: string;
      readonly law?: string;
      readonly principles?: Readonly<
        Record<"for" | "against", readonly number[]>
      >;
      readonly reasons?: Readonly<Record<"for" | "against", string>>;
      readonly today?: {
        readonly without: Readonly<Record<"for" | "against", string>>;
        readonly with: Readonly<Record<"for" | "against", string>>;
      };
      readonly todayMore?: {
        readonly without: Readonly<
          Record<"for" | "against", readonly string[]>
        >;
        readonly with: Readonly<Record<"for" | "against", readonly string[]>>;
      };
      readonly family?: string;
      readonly pole?: "a" | "b";
      readonly number?: "one" | "many";
      readonly figures?: readonly {
        readonly measure: string;
        readonly side: "for" | "against";
      }[];
    }
  >
>;

/**
 * How the question stands today, one plain sentence, by whether a law in
 * force answers it yes and by the side describing it: a supporter (`for`)
 * and an opponent (`against`) tell the same world their own way, so a
 * speech's context never argues against its own ask.
 */
export function questionToday(
  question: string,
  inForce: boolean,
  side: "for" | "against",
): string | null {
  const row = NAMES[question]?.today;
  return row ? (inForce ? row.with : row.without)[side] : null;
}

/** Every wording of how the question stands for one side and state of the law: the first is `questionToday`'s. */
export function questionTodayWordings(
  question: string,
  inForce: boolean,
  side: "for" | "against",
): readonly string[] {
  const first = questionToday(question, inForce, side);
  const more = NAMES[question]?.todayMore;
  return [
    ...(first ? [first] : []),
    ...(more ? (inForce ? more.with : more.without)[side] : []),
  ];
}

/** The family of questions that share a real reason on each side, and the pole of it a supporter stands on; null for a question with none. */
export function questionFamily(
  question: string,
): { readonly family: string; readonly forPole: "a" | "b" } | null {
  const row = NAMES[question];
  return row?.family && row.pole
    ? { family: row.family, forPole: row.pole }
    : null;
}

/** Whether the question's spoken name is one thing or several ("limits on pumping groundwater" are several), for the verbs that agree with it. */
export function questionNumber(question: string): "one" | "many" {
  return NAMES[question]?.number ?? "one";
}

/** The measures of the world's record that bear on the question, each with the side it helps; empty when none does. */
export function questionFigures(
  question: string,
): readonly { readonly measure: string; readonly side: "for" | "against" }[] {
  return NAMES[question]?.figures ?? [];
}

/** The question as one side says it: what a supporter wants done, what an opponent will keep off the books, or what they will repeal. */
export function questionSide(
  question: string,
  side: "for" | "against" | "repeal" | "keep",
): string | null {
  return NAMES[question]?.[side] ?? null;
}

/** The question as a noun phrase: "the bill is about {a higher minimum wage}". */
export function questionAbout(question: string): string | null {
  return NAMES[question]?.about ?? null;
}

/**
 * What can argue one side of a question: the places (1 to 4, in key order)
 * of the belief-words clauses of its family's pole that are a reason for
 * that side, and the side's own reason, said when none of them fits.
 */
export function questionReasons(
  question: string,
  side: "for" | "against",
): { readonly principles: readonly number[]; readonly reason: string | null } {
  const row = NAMES[question];
  return {
    principles: row?.principles?.[side] ?? [],
    reason: row?.reasons?.[side] ?? null,
  };
}

/** The law in force on the question, as the thing itself: "repeal {paid family leave}", "{the higher federal minimum wage}". */
export function questionLaw(question: string): string | null {
  return NAMES[question]?.law ?? null;
}

/** The question as a verb phrase: "I want to {raise the minimum wage}". */
export function questionTo(question: string): string | null {
  return NAMES[question]?.to ?? null;
}

/** Every question that has a spoken name. */
export const NAMED_QUESTIONS: readonly string[] = Object.keys(NAMES);

const YEAR = yearData.claims as Readonly<
  Record<string, { readonly about: string }>
>;

/** A claim the President's address made about the country's year, as a noun phrase ("prices still going up"); null for one with no name. */
export function yearClaimAbout(claim: string): string | null {
  return YEAR[claim]?.about ?? null;
}

const TOWN = townData.figures as Readonly<Record<string, string>>;

/** A town's figure as a resident says it in passing ("more people out of work than most places"); null for one with no words. */
export function townFigureWords(figure: string): string | null {
  return TOWN[figure] ?? null;
}
