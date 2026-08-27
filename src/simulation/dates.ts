import type { IsoDate, SimulationMoment } from "./types";

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const IANA_TIME_ZONE_PATTERN =
  /^[A-Za-z]+(?:[._+-][A-Za-z0-9]+)*(?:\/[A-Za-z0-9]+(?:[._+-][A-Za-z0-9]+)*)+$/;

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
  if (!IANA_TIME_ZONE_PATTERN.test(input.timeZone)) {
    throw new Error(`Invalid IANA simulation timezone: ${input.timeZone}`);
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
  return {
    date,
    minuteOfDay: input.minuteOfDay,
    timeZone: input.timeZone,
    utcOffsetMinutes: input.utcOffsetMinutes,
  };
}

export function assertSimulationMoment(moment: SimulationMoment): void {
  makeSimulationMoment(moment);
}

export function simulationMomentEpochMinute(moment: SimulationMoment): number {
  assertSimulationMoment(moment);
  const localMinute =
    daysBetween(makeIsoDate("1970-01-01"), moment.date) * 1_440 +
    moment.minuteOfDay;
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
  const total = moment.minuteOfDay + minutes;
  const dayDelta = Math.floor(total / 1_440);
  const minuteOfDay = ((total % 1_440) + 1_440) % 1_440;
  return makeSimulationMoment({
    date: addDays(moment.date, dayDelta),
    minuteOfDay,
    timeZone: moment.timeZone,
    utcOffsetMinutes: moment.utcOffsetMinutes,
  });
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
