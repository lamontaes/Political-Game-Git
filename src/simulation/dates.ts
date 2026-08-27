import type { IsoDate, SimulationMoment } from "./types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const IANA_TIME_ZONE_PATTERN =
  /^[A-Za-z]+(?:[._+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[._+-][A-Za-z0-9]+)*)+$/;
const TIME_ZONE_FORMATTERS = new Map<string, Intl.DateTimeFormat>();
const EPOCH_DATE = "1970-01-01" as IsoDate;

interface LocalMinuteParts {
  readonly date: IsoDate;
  readonly minuteOfDay: number;
}

function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date;
}

export function makeIsoDate(value: string): IsoDate {
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
  return makeIsoDate(
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`,
  );
}

export function addDays(date: IsoDate, days: number): IsoDate {
  if (!Number.isSafeInteger(days)) {
    throw new Error("Days must be a safe integer.");
  }

  const validatedDate = makeIsoDate(date);
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
  const startDate = makeIsoDate(start);
  const endDate = makeIsoDate(end);
  const startParts = ISO_DATE_PATTERN.exec(startDate);
  const endParts = ISO_DATE_PATTERN.exec(endDate);
  if (!startParts || !endParts) {
    throw new Error("Unable to compare invalid ISO dates.");
  }
  const startTime = utcDate(
    Number(startParts[1]),
    Number(startParts[2]),
    Number(startParts[3]),
  ).getTime();
  const endTime = utcDate(
    Number(endParts[1]),
    Number(endParts[2]),
    Number(endParts[3]),
  ).getTime();
  const difference = (endTime - startTime) / 86_400_000;
  if (!Number.isSafeInteger(difference)) {
    throw new Error("Date difference exceeds safe integer precision.");
  }
  return difference;
}

export interface SimulationMomentInput {
  readonly date: string;
  readonly minuteOfDay: number;
  readonly timeZone: string;
  readonly utcOffsetMinutes: number;
}

export interface SimulationLocalTimeInput {
  readonly date: string;
  readonly minuteOfDay: number;
  readonly timeZone: string;
  readonly preferredUtcOffsetMinutes?: number;
}

function timeZoneFormatter(timeZone: string): Intl.DateTimeFormat {
  if (!IANA_TIME_ZONE_PATTERN.test(timeZone)) {
    throw new Error(`Invalid IANA simulation timezone: ${timeZone}`);
  }
  const cached = TIME_ZONE_FORMATTERS.get(timeZone);
  if (cached) return cached;
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat("en-US-u-ca-iso8601-nu-latn", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  } catch {
    throw new Error(`Unsupported IANA simulation timezone: ${timeZone}`);
  }
  TIME_ZONE_FORMATTERS.set(timeZone, formatter);
  return formatter;
}

function localMinutePartsAt(
  epochMinute: number,
  timeZone: string,
): LocalMinuteParts {
  if (!Number.isSafeInteger(epochMinute)) {
    throw new Error("Simulation epoch minute must be a safe integer.");
  }
  const instant = new Date(epochMinute * 60_000);
  if (!Number.isFinite(instant.getTime())) {
    throw new Error("Simulation moment is outside the supported date range.");
  }
  const values = new Map(
    timeZoneFormatter(timeZone)
      .formatToParts(instant)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  const year = values.get("year");
  const month = values.get("month");
  const day = values.get("day");
  const hour = values.get("hour");
  const minute = values.get("minute");
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    hour === undefined ||
    minute === undefined
  ) {
    throw new Error(`Unable to resolve simulation timezone: ${timeZone}`);
  }
  return {
    date: isoDateFromParts(year, month, day),
    minuteOfDay: hour * 60 + minute,
  };
}

function absoluteLocalMinute(date: IsoDate, minuteOfDay: number): number {
  const result = daysBetween(EPOCH_DATE, date) * 1_440 + minuteOfDay;
  if (!Number.isSafeInteger(result)) {
    throw new Error("Simulation local minute exceeds safe integer precision.");
  }
  return result;
}

function offsetAtEpochMinute(epochMinute: number, timeZone: string): number {
  const local = localMinutePartsAt(epochMinute, timeZone);
  const offset =
    absoluteLocalMinute(local.date, local.minuteOfDay) - epochMinute;
  if (!Number.isSafeInteger(offset) || offset < -840 || offset > 840) {
    throw new Error(
      `Unsupported UTC offset for simulation timezone: ${timeZone}`,
    );
  }
  return offset;
}

export function makeSimulationMoment(
  input: SimulationMomentInput,
): SimulationMoment {
  const date = makeIsoDate(input.date);
  if (
    !Number.isSafeInteger(input.minuteOfDay) ||
    input.minuteOfDay < 0 ||
    input.minuteOfDay >= 1_440
  ) {
    throw new Error(
      "Simulation minute-of-day must be an integer from 0 to 1439.",
    );
  }
  if (
    !Number.isSafeInteger(input.utcOffsetMinutes) ||
    input.utcOffsetMinutes < -840 ||
    input.utcOffsetMinutes > 840
  ) {
    throw new Error(
      "Simulation UTC offset must be an integer from -840 to 840 minutes.",
    );
  }
  timeZoneFormatter(input.timeZone);
  const epochMinute =
    absoluteLocalMinute(date, input.minuteOfDay) - input.utcOffsetMinutes;
  const resolved = localMinutePartsAt(epochMinute, input.timeZone);
  if (
    resolved.date !== date ||
    resolved.minuteOfDay !== input.minuteOfDay ||
    offsetAtEpochMinute(epochMinute, input.timeZone) !== input.utcOffsetMinutes
  ) {
    throw new Error(
      `Simulation local date, minute, timezone, and UTC offset are inconsistent: ${date} ${input.minuteOfDay} ${input.timeZone} ${input.utcOffsetMinutes}`,
    );
  }
  return {
    date,
    minuteOfDay: input.minuteOfDay,
    timeZone: input.timeZone,
    utcOffsetMinutes: input.utcOffsetMinutes,
  };
}

export function simulationMomentFromEpochMinute(
  epochMinute: number,
  timeZone: string,
): SimulationMoment {
  const local = localMinutePartsAt(epochMinute, timeZone);
  return makeSimulationMoment({
    ...local,
    timeZone,
    utcOffsetMinutes: offsetAtEpochMinute(epochMinute, timeZone),
  });
}

export function simulationMomentAtLocalTime(
  input: SimulationLocalTimeInput,
): SimulationMoment {
  const date = makeIsoDate(input.date);
  if (
    !Number.isSafeInteger(input.minuteOfDay) ||
    input.minuteOfDay < 0 ||
    input.minuteOfDay >= 1_440
  ) {
    throw new Error(
      "Simulation minute-of-day must be an integer from 0 to 1439.",
    );
  }
  timeZoneFormatter(input.timeZone);
  const desiredLocalMinute = absoluteLocalMinute(date, input.minuteOfDay);
  const offsets = new Set<number>();
  for (const sampleDelta of [-2_160, -720, 0, 720, 2_160]) {
    offsets.add(
      offsetAtEpochMinute(desiredLocalMinute + sampleDelta, input.timeZone),
    );
  }
  const candidates: SimulationMoment[] = [];
  for (const utcOffsetMinutes of offsets) {
    try {
      candidates.push(
        makeSimulationMoment({
          date,
          minuteOfDay: input.minuteOfDay,
          timeZone: input.timeZone,
          utcOffsetMinutes,
        }),
      );
    } catch {
      // A sampled offset may belong to the adjacent side of a local-time gap.
    }
  }
  if (candidates.length === 0) {
    throw new Error(
      `Local simulation time does not exist in timezone ${input.timeZone}: ${date} ${input.minuteOfDay}`,
    );
  }
  const preferred = candidates.find(
    (candidate) =>
      candidate.utcOffsetMinutes === input.preferredUtcOffsetMinutes,
  );
  if (preferred) return preferred;
  return candidates.sort(compareSimulationMoments)[0]!;
}

export function simulationMomentOnLocalDate(
  moment: SimulationMoment,
  date: string,
): SimulationMoment {
  assertSimulationMoment(moment);
  return simulationMomentAtLocalTime({
    date,
    minuteOfDay: moment.minuteOfDay,
    timeZone: moment.timeZone,
    preferredUtcOffsetMinutes: moment.utcOffsetMinutes,
  });
}

export function assertSimulationMoment(moment: SimulationMoment): void {
  makeSimulationMoment(moment);
}

export function simulationMomentEpochMinute(moment: SimulationMoment): number {
  assertSimulationMoment(moment);
  const localMinute = absoluteLocalMinute(moment.date, moment.minuteOfDay);
  const instantMinute = localMinute - moment.utcOffsetMinutes;
  if (!Number.isSafeInteger(instantMinute)) {
    throw new Error("Simulation moment exceeds safe minute precision.");
  }
  return instantMinute;
}

export function compareSimulationMoments(
  left: SimulationMoment,
  right: SimulationMoment,
): number {
  return simulationMomentEpochMinute(left) - simulationMomentEpochMinute(right);
}

export function simulationMinutesBetween(
  start: SimulationMoment,
  end: SimulationMoment,
): number {
  const difference =
    simulationMomentEpochMinute(end) - simulationMomentEpochMinute(start);
  if (!Number.isSafeInteger(difference)) {
    throw new Error("Simulation duration exceeds safe minute precision.");
  }
  return difference;
}

export function addSimulationMinutes(
  moment: SimulationMoment,
  minutes: number,
): SimulationMoment {
  assertSimulationMoment(moment);
  if (!Number.isSafeInteger(minutes)) {
    throw new Error("Simulation minutes must be a safe integer.");
  }
  const targetEpochMinute = simulationMomentEpochMinute(moment) + minutes;
  if (!Number.isSafeInteger(targetEpochMinute)) {
    throw new Error("Simulation moment exceeds safe minute precision.");
  }
  return simulationMomentFromEpochMinute(targetEpochMinute, moment.timeZone);
}

export function sameSimulationMoment(
  left: SimulationMoment,
  right: SimulationMoment,
): boolean {
  return (
    left.date === right.date &&
    left.minuteOfDay === right.minuteOfDay &&
    left.timeZone === right.timeZone &&
    left.utcOffsetMinutes === right.utcOffsetMinutes
  );
}

export function yearOf(date: IsoDate): number {
  return Number(date.slice(0, 4));
}

export function ageOnDate(birthDate: IsoDate, comparisonDate: IsoDate): number {
  const validatedBirthDate = makeIsoDate(birthDate);
  const validatedComparisonDate = makeIsoDate(comparisonDate);
  let age = yearOf(validatedComparisonDate) - yearOf(validatedBirthDate);
  let birthdayInComparisonYear = validatedBirthDate.slice(5);
  if (birthdayInComparisonYear === "02-29") {
    try {
      isoDateFromParts(yearOf(validatedComparisonDate), 2, 29);
    } catch {
      birthdayInComparisonYear = "02-28";
    }
  }
  if (validatedComparisonDate.slice(5) < birthdayInComparisonYear) {
    age -= 1;
  }
  return age;
}

export function dateAtAge(birthDate: IsoDate, age: number): IsoDate {
  if (!Number.isSafeInteger(age) || age < 0) {
    throw new Error("Age must be a non-negative safe integer.");
  }

  const validatedBirthDate = makeIsoDate(birthDate);
  const targetYear = yearOf(validatedBirthDate) + age;
  const month = Number(validatedBirthDate.slice(5, 7));
  const day = Number(validatedBirthDate.slice(8, 10));

  if (month === 2 && day === 29) {
    try {
      return isoDateFromParts(targetYear, month, day);
    } catch {
      return isoDateFromParts(targetYear, month, 28);
    }
  }

  return isoDateFromParts(targetYear, month, day);
}
