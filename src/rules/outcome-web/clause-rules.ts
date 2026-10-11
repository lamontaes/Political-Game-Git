type IsoDate = string;
interface LegislativeProvisionRecord {
  readonly text: string;
  readonly fiscalPeriod?: string | null;
  readonly fiscalExposureMinorUnits: number | null;
  readonly provisionKey: string;
}
const APPROPRIATES = /^There is appropriated\b/;

export function isFamilyAppropriation(
  provision: LegislativeProvisionRecord,
): boolean {
  return (
    APPROPRIATES.test(provision.text) &&
    provision.fiscalPeriod !== "annual" &&
    provision.fiscalExposureMinorUnits !== null &&
    provision.fiscalExposureMinorUnits > 0 &&
    provision.provisionKey !== "amount-provided" &&
    !provision.provisionKey.endsWith(":amount-provided")
  );
}

const YEAR_WORDS = [
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

export function statedTermYears(text: string): number | null {
  const match = /\bfor the (\w+)-year\b/.exec(text);
  if (!match) return null;
  const word = YEAR_WORDS.indexOf(match[1]!.toLowerCase());
  if (word >= 0) return word + 1;
  const digits = Number(match[1]);
  return Number.isSafeInteger(digits) && digits > 0 ? digits : null;
}

export function isAuthorizationCeiling(
  provision: LegislativeProvisionRecord,
): boolean {
  return (
    provision.fiscalExposureMinorUnits !== null &&
    provision.fiscalExposureMinorUnits > 0 &&
    !APPROPRIATES.test(provision.text) &&
    provision.provisionKey !== "amount-provided" &&
    !provision.provisionKey.endsWith(":amount-provided")
  );
}
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function spokenDate(date: IsoDate): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function datesStated(section: LegislativeProvisionRecord): IsoDate[] {
  const dates: IsoDate[] = [];
  for (const match of section.text.matchAll(
    /not later than ([A-Z][a-z]+) (\d{1,2}), (\d{4})/g,
  )) {
    const month = MONTHS.indexOf(match[1]!);
    if (month >= 0)
      dates.push(
        `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[2]!.padStart(2, "0")}` as IsoDate,
      );
  }
  return dates.sort();
}

export function statedComplianceDate(
  own: LegislativeProvisionRecord,
  sections: readonly LegislativeProvisionRecord[],
): IsoDate | null {
  const mine = datesStated(own);
  if (mine.length > 0) return mine.at(-1)!;
  const setters = sections
    .filter((section) => /\bshall (?:comply|file)\b/.test(section.text))
    .flatMap(datesStated)
    .sort();
  return setters.at(-1) ?? null;
}
