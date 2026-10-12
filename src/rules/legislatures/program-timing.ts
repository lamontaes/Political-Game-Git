import type { IsoDate } from "../../simulation/types";
import type {
  ProgramVariant,
  ProgramParameterValue,
} from "../../simulation/legislation-program-families";
import { makeIsoDate as validateDate } from "../elections/calendar";
const makeIsoDate = (date: string): IsoDate => validateDate(date) as IsoDate;
function yearOf(date: IsoDate) {
  return Number(date.slice(0, 4));
}
export class BillConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillConfigurationError";
  }
}

export function resolveTiming(
  variant: ProgramVariant,
  values: Readonly<Record<string, ProgramParameterValue>>,
  filedOn: IsoDate,
): {
  readonly startsOn: IsoDate;
  readonly endsOn: IsoDate | null;
} {
  const startsOn = filedOn;
  const timingSpec = variant.parameters.find(
    (spec) => spec.dimension === "timing",
  );
  if (!timingSpec) return { startsOn, endsOn: null };
  const value = values[timingSpec.key];
  if (value === undefined || value.kind !== "duration-years") {
    return { startsOn, endsOn: null };
  }
  if (value.years === null) return { startsOn, endsOn: null };
  const endsOn = addYears(startsOn, value.years);
  if (endsOn <= startsOn) {
    throw new BillConfigurationError(
      `${timingSpec.label} would end the program on ${endsOn}, on or before it starts on ${startsOn}.`,
    );
  }
  return { startsOn, endsOn };
}

export function addYears(date: IsoDate, years: number): IsoDate {
  const year = yearOf(date) + years;
  const monthDay = date.slice(4);
  if (monthDay === "-02-29") {
    const candidate = `${year}-02-29`;
    try {
      return makeIsoDate(candidate);
    } catch {
      return makeIsoDate(`${year}-02-28`);
    }
  }
  return makeIsoDate(`${year}${monthDay}`);
}
