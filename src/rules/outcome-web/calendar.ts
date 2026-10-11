/** Validated calendar arithmetic lifted from simulation/dates; no clock or scheduler. */
type IsoDate = string;
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

function validateIsoDate(value: string): IsoDate {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    throw new Error(`Invalid ISO date: ${value}`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = utcDate(year, month, day);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${value}`);
  }

  return value as IsoDate;
}

export function isoDateFromParts(
  year: number,
  month: number,
  day: number,
): IsoDate {
  return validateIsoDate(
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`,
  );
}

export function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isSafeInteger(days)) {
    throw new Error("Days must be a safe integer.");
  }

  const validatedDate = validateIsoDate(date);
  const match = ISO_DATE_PATTERN.exec(validatedDate);

  if (!match) {
    throw new Error(`Invalid ISO date: ${date}`);
  }

  const parsed = utcDate(Number(match[1]), Number(match[2]), Number(match[3]));
  parsed.setUTCDate(parsed.getUTCDate() + days);

  return isoDateFromParts(
    parsed.getUTCFullYear(),
    parsed.getUTCMonth() + 1,
    parsed.getUTCDate(),
  );
}

export function daysBetween(start: IsoDate, end: IsoDate): number {
  const difference = epochDayOf(end) - epochDayOf(start);
  if (!Number.isSafeInteger(difference)) {
    throw new Error("Date difference exceeds safe integer precision.");
  }
  return difference;
}

function epochDayOf(date: string): number {
  const valid = validateIsoDate(date);
  const parts = ISO_DATE_PATTERN.exec(valid);
  if (!parts) throw new Error("Unable to compare invalid ISO dates.");
  return (
    utcDate(Number(parts[1]), Number(parts[2]), Number(parts[3])).getTime() /
    86_400_000
  );
}
