/**
 * How a state's bill numbering style is read out of the recorded research.
 *
 * Decision OCD-LEG-NUM-001 binds every state to its own bill prefixes and
 * chamber names, "taken from the recorded research (the verified enacted-bill
 * samples for all 50 states), not typed from memory." This module is that
 * reading. It is pure: it takes the sample rows and the chamber-name corpus
 * rows as plain data and returns the style table, so the generator script and
 * the drift test run exactly the same code over exactly the same files.
 *
 * What it reads, and what it does not:
 *
 *   - A prefix is taken only from a bill number that plainly has the shape
 *     "prefix, number" ("HB 166", "H.4240", "A5116", "SB25-003"). Substitute
 *     bills, act citations and "see ..." rows are skipped, not guessed at.
 *   - A chamber with no recorded bill number takes the other chamber's
 *     recorded style with its letter swapped, and says so in its basis. A
 *     state with neither keeps the plain game default, also labeled.
 *   - Whether numbering runs one year or two is read from the session labels
 *     the samples carry ("2025-2026 Regular Session", "104th General
 *     Assembly", "57th Legislature, 1st Regular Session"). A state whose
 *     labels only ever name one year numbers by the year.
 */

export type BillNumberingBasis =
  /** Read directly from a recorded sample. */
  | "recorded"
  /** Read from a recorded sample for the other chamber, letter swapped. */
  | "mirrored-from-other-chamber"
  /** Read from the recorded prefix (an "A" bill is an Assembly bill). */
  | "inferred-from-recorded-prefix"
  /** Named in the Decision Register (OCD-LEG-NUM-001 or -002) itself. */
  | "decision-register"
  /** Read from the session labels the recorded samples carry. */
  | "session-label"
  /** A recorded starting number, with its source, checked against the samples. */
  | "recorded-start"
  /** Nothing recorded; the game's own labeled default. */
  | "game-default";

export interface ChamberNumberingStyle {
  /**
   * The designation template. `{n}` is the bill's number, `{yy}` the last two
   * digits of the year its numbering period opened in.
   */
  readonly template: string;
  readonly templateBasis: BillNumberingBasis;
  readonly name: string;
  readonly nameBasis: BillNumberingBasis;
  /**
   * The number a regular session's first bill carries. Decision
   * OCD-LEG-NUM-002: where a state's recorded numbers begin above 1
   * (Washington's Senate at 5001), each session starts there; every other
   * chamber starts at 1.
   */
  readonly firstNumber: number;
  /**
   * For a state whose even-year session opens a block of its own (Rhode
   * Island's House at 7001), that session's first number; otherwise null and
   * every session starts at `firstNumber`.
   */
  readonly evenYearFirstNumber: number | null;
  readonly firstNumberBasis: BillNumberingBasis;
}

/**
 * One chamber's recorded starting number, as
 * data/research/bill-numbering-starts.json holds it with its source.
 */
export interface BillNumberingStartRow {
  readonly state: string;
  readonly chamber: "lower" | "upper";
  readonly firstNumber: number;
  readonly evenYearFirstNumber?: number | null;
  readonly sourceUrl: string;
  readonly quote: string;
}

export interface StateBillNumberingStyle {
  readonly jurisdictionKey: string;
  readonly lower: ChamberNumberingStyle;
  readonly upper: ChamberNumberingStyle;
  /**
   * How long one run of numbers lasts before it returns to 1: one year, or
   * the two-year legislature.
   */
  readonly period: "annual" | "biennial";
  /** For a biennial state, whether its legislatures open in odd or even years. */
  readonly biennialOpensIn: "odd" | "even";
  readonly periodBasis: BillNumberingBasis;
}

export interface BillSampleRow {
  readonly bill_number: string;
  readonly session: string;
}

export interface ChamberNameRow {
  readonly role: "lower" | "upper";
  readonly name: string;
}

export const DEFAULT_LOWER_TEMPLATE = "HB {n}";
export const DEFAULT_UPPER_TEMPLATE = "SB {n}";
export const DEFAULT_LOWER_NAME = "House of Representatives";
export const DEFAULT_UPPER_NAME = "Senate";

/**
 * Chamber names the Decision Register entry names outright, for states whose
 * compiled chamber-name research is still unresolved. OCD-LEG-NUM-001: "the
 * House of Delegates in Maryland, Virginia and West Virginia." Maryland has a
 * compiled legislature and Virginia's name is in the corpus, so only West
 * Virginia needs it here.
 */
const DECISION_REGISTER_LOWER_NAMES: Readonly<Record<string, string>> = {
  "US-WV": "House of Delegates",
};

const SPECIAL_SESSION = /special|extraordinary/i;

interface ParsedNumber {
  readonly role: "lower" | "upper" | "both";
  readonly template: string;
}

/** One bill number's style, or null where it is not a plain designation. */
export function parseBillNumber(raw: string): ParsedNumber | null {
  const text = raw.trim();
  // Colorado: the session year is part of the number ("HB25-1090").
  const withYear = /^([A-Z]{1,2})(\d{2})-(\d+)$/.exec(text);
  if (withYear) {
    return {
      role: roleOfPrefix(withYear[1]!),
      template: `${withYear[1]!}{yy}-{n}`,
    };
  }
  const plain = /^([A-Z]{1,3}\.?)( ?)(\d+)[A-Z]?(?![\d-])/.exec(text);
  if (!plain) return null;
  const prefix = plain[1]!;
  const role = roleOfPrefix(prefix);
  return { role, template: `${prefix}${plain[2]!}{n}` };
}

function roleOfPrefix(prefix: string): "lower" | "upper" | "both" {
  // Maine files every bill as a Legislative Document, whichever chamber.
  if (prefix.startsWith("LD")) return "both";
  if (prefix.startsWith("S")) return "upper";
  return "lower";
}

/** "house of representatives" as the corpus sometimes stores it, titled. */
function titled(name: string): string {
  return name
    .split(" ")
    .map((word) =>
      word === "of" ? word : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
}

function mostFrequent(values: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best: string | null = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    // Ties go to the alphabetically first, so the table never depends on
    // the order the rows happened to be written in.
    if (
      count > bestCount ||
      (count === bestCount && best !== null && value < best)
    ) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function swapChamberLetter(
  template: string,
  toRole: "lower" | "upper",
  lowerIsAssembly = false,
): string {
  if (toRole === "upper") return template.replace(/^[HA]/, "S");
  return template.replace(/^S/, lowerIsAssembly ? "A" : "H");
}

function templatesFor(
  rows: readonly BillSampleRow[],
  role: "lower" | "upper",
): string[] {
  const out: string[] = [];
  for (const row of rows) {
    for (const part of row.bill_number.split("/")) {
      const parsed = parseBillNumber(part);
      if (!parsed) continue;
      if (parsed.role === role || parsed.role === "both")
        out.push(parsed.template);
    }
  }
  return out;
}

function chamberTemplate(
  samples: readonly BillSampleRow[],
  role: "lower" | "upper",
): { template: string; basis: BillNumberingBasis } | null {
  // Regular sessions first: a special session can number its own way
  // ("SB 2-C", "SB25B-004"), and the regular style is the one a session
  // opens with. A special-session sample stands in only where no regular one
  // records this chamber.
  const regular = samples.filter((row) => !SPECIAL_SESSION.test(row.session));
  const special = samples.filter((row) => SPECIAL_SESSION.test(row.session));
  const found =
    mostFrequent(templatesFor(regular, role)) ??
    mostFrequent(templatesFor(special, role));
  return found === null ? null : { template: found, basis: "recorded" };
}

function periodOf(samples: readonly BillSampleRow[]): {
  period: "annual" | "biennial";
  opensIn: "odd" | "even";
  basis: BillNumberingBasis;
} {
  const labels = samples
    .map((row) => row.session)
    .filter((label) => !SPECIAL_SESSION.test(label));
  if (labels.length === 0)
    return { period: "annual", opensIn: "odd", basis: "game-default" };
  for (const label of labels) {
    const range = /(\d{4})\s*-\s*(\d{4})/.exec(label);
    if (range) {
      return {
        period: "biennial",
        opensIn: Number(range[1]) % 2 === 0 ? "even" : "odd",
        basis: "session-label",
      };
    }
    if (/biennium/i.test(label))
      return { period: "biennial", opensIn: "odd", basis: "session-label" };
  }
  // A numbered legislature that names no single year, or that says which of
  // its sessions this was, is a body that sits across two years.
  const ordinalBody = labels.filter(
    (label) =>
      /\d+(st|nd|rd|th) (General Assembly|Legislature|General Court)/i.test(
        label,
      ) &&
      (!/\b(19|20)\d{2}\b/.test(label) ||
        /\b(1st|2nd|first|second)\b[^,]*session/i.test(label)),
  );
  if (ordinalBody.length > 0) {
    // Only a label that says which of the legislature's sessions it was
    // dates the legislature's opening; a bare year could be either one.
    const openings = labels
      .map((label) => {
        const year = /\b((?:19|20)\d{2})\b/.exec(label)?.[1];
        if (year === undefined) return null;
        if (/\b(1st|first)\b[^,]*session/i.test(label)) return Number(year);
        if (/\b(2nd|second)\b[^,]*session/i.test(label))
          return Number(year) - 1;
        return null;
      })
      .filter((year): year is number => year !== null);
    const opening = openings.length > 0 ? Math.min(...openings) : null;
    return {
      period: "biennial",
      opensIn: opening !== null && opening % 2 === 0 ? "even" : "odd",
      basis: "session-label",
    };
  }
  return { period: "annual", opensIn: "odd", basis: "session-label" };
}

/** A regular-session sample's number and the year its session names. */
function sampleNumbers(
  samples: readonly BillSampleRow[],
  role: "lower" | "upper",
): { readonly number: number; readonly year: number | null }[] {
  const out: { number: number; year: number | null }[] = [];
  for (const row of samples) {
    if (SPECIAL_SESSION.test(row.session)) continue;
    const year = /\b((?:19|20)\d{2})\b/.exec(row.session)?.[1];
    for (const part of row.bill_number.split("/")) {
      const text = part.trim();
      const parsed = parseBillNumber(text);
      if (!parsed || (parsed.role !== role && parsed.role !== "both")) continue;
      const digits =
        /^[A-Z]{1,2}\d{2}-(\d+)$/.exec(text)?.[1] ??
        /^[A-Z]{1,3}\.? ?(\d+)/.exec(text)?.[1];
      if (digits === undefined) continue;
      out.push({ number: Number(digits), year: year ? Number(year) : null });
    }
  }
  return out;
}

/**
 * A chamber's recorded starting number, or 1. The start must agree with the
 * recorded samples: a sample numbered below it would mean the start is wrong,
 * so the table refuses to build.
 */
function chamberStart(
  jurisdictionKey: string,
  samples: readonly BillSampleRow[],
  starts: readonly BillNumberingStartRow[],
  role: "lower" | "upper",
): Pick<
  ChamberNumberingStyle,
  "firstNumber" | "evenYearFirstNumber" | "firstNumberBasis"
> {
  const usps = jurisdictionKey.replace(/^US-/, "");
  const row = starts.find(
    (candidate) => candidate.state === usps && candidate.chamber === role,
  );
  // OCD-LEG-NUM-002: a chamber with no recorded higher start begins at 1.
  if (!row)
    return {
      firstNumber: 1,
      evenYearFirstNumber: null,
      firstNumberBasis: "decision-register",
    };
  const even = row.evenYearFirstNumber ?? null;
  for (const sample of sampleNumbers(samples, role)) {
    const floor =
      even !== null && sample.year !== null && sample.year % 2 === 0
        ? even
        : row.firstNumber;
    if (sample.number < floor)
      throw new Error(
        `${jurisdictionKey} ${role}: a recorded sample is numbered ${sample.number}, below the recorded start ${floor}.`,
      );
  }
  return {
    firstNumber: row.firstNumber,
    evenYearFirstNumber: even,
    firstNumberBasis: "recorded-start",
  };
}

/** One state's numbering style, read from its samples and chamber names. */
export function deriveStateBillNumberingStyle(
  jurisdictionKey: string,
  samples: readonly BillSampleRow[],
  chamberNames: readonly ChamberNameRow[],
  starts: readonly BillNumberingStartRow[] = [],
): StateBillNumberingStyle {
  const lowerRecorded = chamberTemplate(samples, "lower");
  const upperRecorded = chamberTemplate(samples, "upper");

  const lowerTemplate =
    lowerRecorded ??
    (upperRecorded
      ? {
          template: swapChamberLetter(
            upperRecorded.template,
            "lower",
            chamberNames.some(
              (row) => row.role === "lower" && /assembly/i.test(row.name),
            ),
          ),
          basis: "mirrored-from-other-chamber" as const,
        }
      : { template: DEFAULT_LOWER_TEMPLATE, basis: "game-default" as const });
  const upperTemplate =
    upperRecorded ??
    (lowerRecorded
      ? {
          template: swapChamberLetter(lowerRecorded.template, "upper"),
          basis: "mirrored-from-other-chamber" as const,
        }
      : { template: DEFAULT_UPPER_TEMPLATE, basis: "game-default" as const });

  const recordedLowerName = chamberNames.find((row) => row.role === "lower");
  const recordedUpperName = chamberNames.find((row) => row.role === "upper");
  const registerLowerName = DECISION_REGISTER_LOWER_NAMES[jurisdictionKey];
  const lowerName: { name: string; basis: BillNumberingBasis } =
    recordedLowerName
      ? { name: titled(recordedLowerName.name), basis: "recorded" }
      : registerLowerName
        ? { name: registerLowerName, basis: "decision-register" }
        : lowerTemplate.basis !== "game-default" &&
            lowerTemplate.template.startsWith("A")
          ? { name: "Assembly", basis: "inferred-from-recorded-prefix" }
          : { name: DEFAULT_LOWER_NAME, basis: "game-default" };
  const upperName: { name: string; basis: BillNumberingBasis } =
    recordedUpperName
      ? { name: titled(recordedUpperName.name), basis: "recorded" }
      : { name: DEFAULT_UPPER_NAME, basis: "game-default" };

  const period = periodOf(samples);
  return {
    jurisdictionKey,
    lower: {
      template: lowerTemplate.template,
      templateBasis: lowerTemplate.basis,
      name: lowerName.name,
      nameBasis: lowerName.basis,
      ...chamberStart(jurisdictionKey, samples, starts, "lower"),
    },
    upper: {
      template: upperTemplate.template,
      templateBasis: upperTemplate.basis,
      name: upperName.name,
      nameBasis: upperName.basis,
      ...chamberStart(jurisdictionKey, samples, starts, "upper"),
    },
    period: period.period,
    biennialOpensIn: period.opensIn,
    periodBasis: period.basis,
  };
}
