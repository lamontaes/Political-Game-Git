import type { IsoDate, SimulationMoment } from "../../simulation/types";
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

const VALID_ISO_DATES_LIMIT = 100000;

const VALID_ISO_DATES = new Set<string>();

export function makeIsoDate(value: string): IsoDate {
  if (VALID_ISO_DATES.has(value)) return value as IsoDate;
  const date = validateIsoDate(value);
  if (VALID_ISO_DATES.size >= VALID_ISO_DATES_LIMIT) VALID_ISO_DATES.clear();
  VALID_ISO_DATES.add(value);
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
  return makeIsoDate(
    `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
      .toString()
      .padStart(2, "0")}`,
  );
}

const EPOCH_DAY_CACHE_LIMIT = 100000;

const EPOCH_DAY_CACHE = new Map<string, number>();

function epochDayOf(date: string): number {
  const cached = EPOCH_DAY_CACHE.get(date);
  if (cached !== undefined) return cached;
  const valid = makeIsoDate(date);
  const parts = ISO_DATE_PATTERN.exec(valid);
  if (!parts) throw new Error("Unable to compare invalid ISO dates.");
  const day =
    utcDate(Number(parts[1]), Number(parts[2]), Number(parts[3])).getTime() /
    86400000;
  if (EPOCH_DAY_CACHE.size >= EPOCH_DAY_CACHE_LIMIT) EPOCH_DAY_CACHE.clear();
  EPOCH_DAY_CACHE.set(date, day);
  return day;
}

export function daysBetween(start: IsoDate, end: IsoDate): number {
  const difference = epochDayOf(end) - epochDayOf(start);
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

const LOCAL_PARTS_CACHE_LIMIT = 100000;

const LOCAL_PARTS_CACHE = new Map<string, LocalMinuteParts>();

function localMinutePartsAt(
  epochMinute: number,
  timeZone: string,
): LocalMinuteParts {
  const key = `${timeZone}|${epochMinute}`;
  const cached = LOCAL_PARTS_CACHE.get(key);
  if (cached) return cached;
  const parts = computeLocalMinutePartsAt(epochMinute, timeZone);
  if (LOCAL_PARTS_CACHE.size >= LOCAL_PARTS_CACHE_LIMIT)
    LOCAL_PARTS_CACHE.clear();
  LOCAL_PARTS_CACHE.set(key, parts);
  return parts;
}

function computeLocalMinutePartsAt(
  epochMinute: number,
  timeZone: string,
): LocalMinuteParts {
  if (!Number.isSafeInteger(epochMinute)) {
    throw new Error("Simulation epoch minute must be a safe integer.");
  }
  const instant = new Date(epochMinute * 60000);
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
  const result = daysBetween(EPOCH_DATE, date) * 1440 + minuteOfDay;
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
    input.minuteOfDay >= 1440
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
    input.minuteOfDay >= 1440
  ) {
    throw new Error(
      "Simulation minute-of-day must be an integer from 0 to 1439.",
    );
  }
  timeZoneFormatter(input.timeZone);
  const desiredLocalMinute = absoluteLocalMinute(date, input.minuteOfDay);
  const offsets = new Set<number>();
  for (const sampleDelta of [-2160, -720, 0, 720, 2160]) {
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
      // Native offset candidates that cannot represent this local minute are skipped.
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

export function assertSimulationMoment(moment: SimulationMoment): void {
  if (
    EPOCH_MINUTE_CACHE.has(
      `${moment.date}|${moment.minuteOfDay}|${moment.timeZone}|${moment.utcOffsetMinutes}`,
    )
  )
    return;
  makeSimulationMoment(moment);
}

const EPOCH_MINUTE_CACHE_LIMIT = 100000;

const EPOCH_MINUTE_CACHE = new Map<string, number>();

export function simulationMomentEpochMinute(moment: SimulationMoment): number {
  const key = `${moment.date}|${moment.minuteOfDay}|${moment.timeZone}|${moment.utcOffsetMinutes}`;
  const cached = EPOCH_MINUTE_CACHE.get(key);
  if (cached !== undefined) return cached;
  const minute = computeSimulationMomentEpochMinute(moment);
  if (EPOCH_MINUTE_CACHE.size >= EPOCH_MINUTE_CACHE_LIMIT)
    EPOCH_MINUTE_CACHE.clear();
  EPOCH_MINUTE_CACHE.set(key, minute);
  return minute;
}

function computeSimulationMomentEpochMinute(moment: SimulationMoment): number {
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
