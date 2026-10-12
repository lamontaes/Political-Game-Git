export type BillNumberingBasis =
  | "recorded"
  | "mirrored-from-other-chamber"
  | "inferred-from-recorded-prefix"
  | "decision-register"
  | "session-label"
  | "recorded-start"
  | "recorded-period"
  | "game-default";

export interface ChamberNumberingStyle {
  readonly template: string;
  readonly templateBasis: BillNumberingBasis;
  readonly name: string;
  readonly nameBasis: BillNumberingBasis;

  readonly firstNumber: number;

  readonly evenYearFirstNumber: number | null;
  readonly firstNumberBasis: BillNumberingBasis;
}

export interface BillNumberingStartRow {
  readonly state: string;
  readonly chamber: "lower" | "upper";
  readonly firstNumber: number;
  readonly evenYearFirstNumber?: number | null;
  readonly sourceUrl: string;
  readonly quote: string;
}

export interface BillNumberingPeriodRow {
  readonly state: string;
  readonly period: "annual" | "biennial";
  readonly opensIn: "odd" | "even";
  readonly sourceUrl: string;
  readonly quote: string;
}

export interface StateBillNumberingStyle {
  readonly jurisdictionKey: string;
  readonly lower: ChamberNumberingStyle;
  readonly upper: ChamberNumberingStyle;

  readonly period: "annual" | "biennial";

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

const DECISION_REGISTER_LOWER_NAMES: Readonly<Record<string, string>> = {
  "US-WV": "House of Delegates",
};

const SPECIAL_SESSION = /special|extraordinary/i;

interface ParsedNumber {
  readonly role: "lower" | "upper" | "both";
  readonly template: string;
}

export function parseBillNumber(raw: string): ParsedNumber | null {
  const text = raw.trim();

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
  if (prefix.startsWith("LD")) return "both";
  if (prefix.startsWith("S")) return "upper";
  return "lower";
}

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

  const ordinalBody = labels.filter(
    (label) =>
      /\d+(st|nd|rd|th) (General Assembly|Legislature|General Court)/i.test(
        label,
      ) &&
      (!/\b(19|20)\d{2}\b/.test(label) ||
        /\b(1st|2nd|first|second)\b[^,]*session/i.test(label)),
  );
  if (ordinalBody.length > 0) {
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

export function deriveStateBillNumberingStyle(
  jurisdictionKey: string,
  samples: readonly BillSampleRow[],
  chamberNames: readonly ChamberNameRow[],
  starts: readonly BillNumberingStartRow[] = [],
  periods: readonly BillNumberingPeriodRow[] = [],
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

  const statedPeriod = periods.find(
    (row) => `US-${row.state}` === jurisdictionKey,
  );
  const period = statedPeriod
    ? {
        period: statedPeriod.period,
        opensIn: statedPeriod.opensIn,
        basis: "recorded-period" as const,
      }
    : periodOf(samples);
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
