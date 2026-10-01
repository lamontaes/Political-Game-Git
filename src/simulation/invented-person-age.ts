import { isoDateFromParts, makeIsoDate } from "./dates";
import type { SeededRng } from "./rng";
import type { IsoDate } from "./types";

/**
 * One way to give an invented person an age (A161). Every producer that
 * makes up a person the records do not name (a successor, a nominee, a
 * committee member, a newcomer) draws the age from this table and the birth
 * date from {@link inventedPersonBirthDate}; none keeps its own range.
 *
 * The draw is a seeded pick among real options: any whole age inside the
 * window, then a day of that year. No percentage decides anything.
 *
 * ESTIMATED FROM AVERAGE: every window below is a game estimate checked
 * against real averages, not a sourced distribution. The averages they were
 * checked against: members of the 119th Congress average about 58 (House)
 * and 65 (Senate) at the start of the term (Congressional Research Service,
 * "Membership of the 119th Congress: A Profile"); state legislators average
 * about 56 to 58 (NCSL, "State Legislators by Age"); sitting governors
 * average about 58 (National Governors Association roster); federal judges
 * are about 50 at appointment (Federal Judicial Center). The research request
 * `invented-person-age-windows-by-role` asks for the distributions by role.
 */
export const INVENTED_PERSON_AGE_RESEARCH_QUESTION =
  "invented-person-age-windows-by-role";

export interface InventedPersonAgeWindow {
  /**
   * The youngest age, either fixed or counted from the office's legal
   * minimum age, which the caller supplies.
   */
  readonly minimum:
    | { readonly kind: "age"; readonly years: number }
    | { readonly kind: "above-legal-minimum"; readonly years: number };
  readonly maximumExclusive: number;
  /**
   * 1 when the birth year is taken a year before the reference year, so the
   * drawn age is already reached on the reference date whatever the day.
   */
  readonly birthYearOffset: 0 | 1;
  readonly basis: "estimated";
}

const fixed = (
  minimum: number,
  maximumExclusive: number,
  birthYearOffset: 0 | 1 = 0,
): InventedPersonAgeWindow => ({
  minimum: { kind: "age", years: minimum },
  maximumExclusive,
  birthYearOffset,
  basis: "estimated",
});
const aboveMinimum = (
  years: number,
  maximumExclusive: number,
  birthYearOffset: 0 | 1,
): InventedPersonAgeWindow => ({
  minimum: { kind: "above-legal-minimum", years },
  maximumExclusive,
  birthYearOffset,
  basis: "estimated",
});

/** The one age-window table. Keys name the role, never a place. */
export const INVENTED_PERSON_AGE_WINDOWS = {
  /** A member of Congress or the legislature chosen for a vacancy. */
  "legislative-successor": aboveMinimum(3, 70, 0),
  /** A prospect for a background seat who may or may not run. */
  "background-seat-prospect": aboveMinimum(3, 71, 0),
  /** A newly elected member of a new or reapportioned seat. */
  "new-legislative-member": aboveMinimum(7, 72, 1),
  /** A member already sitting when the world opens. */
  "sitting-legislator-at-opening": aboveMinimum(7, 81, 1),
  "presidential-nominee": fixed(45, 70, 1),
  "state-executive-challenger": fixed(38, 68),
  "state-executive-successor": fixed(40, 71),
  /** A federal or state officeholder already in office at the opening. */
  "executive-officeholder-at-opening": fixed(45, 70),
  /** Someone an office considers appointing. */
  "appointment-candidate": fixed(34, 62),
  "party-chapter-organizer": fixed(28, 72),
  "party-national-committee-member": fixed(30, 76),
  "party-standing-committee-member": fixed(21, 78),
  "campaign-contact": fixed(22, 76),
  "campaign-field-lead": fixed(24, 61),
  "campaign-opponent": fixed(32, 66),
  "civic-reporter": fixed(32, 66),
  "newsroom-staff": fixed(26, 64),
  "migration-newcomer": fixed(20, 66),
  "central-bank-governor-at-opening": fixed(45, 71),
  "reserve-bank-president-at-opening": fixed(50, 64),
  "reserve-bank-president-successor": fixed(48, 61),
  "municipal-council-member": fixed(25, 81, 1),
  "business-owner": fixed(30, 65, 1),
  "business-worker": fixed(18, 61, 1),
  "judge-at-opening": fixed(45, 71, 1),
} as const satisfies Record<string, InventedPersonAgeWindow>;

export type InventedPersonRole = keyof typeof INVENTED_PERSON_AGE_WINDOWS;

/** The window's bounds for this role, given the office's legal minimum age. */
export function inventedPersonAgeBounds(
  role: InventedPersonRole,
  options: {
    readonly legalMinimumAge?: number;
    /** A rule of the office that ends service earlier (mandatory retirement). */
    readonly ceilingExclusive?: number;
  } = {},
): { readonly minimum: number; readonly maximumExclusive: number } {
  const window: InventedPersonAgeWindow = INVENTED_PERSON_AGE_WINDOWS[role];
  let minimum = window.minimum.years;
  if (window.minimum.kind === "above-legal-minimum") {
    if (options.legalMinimumAge === undefined)
      throw new Error(`${role} needs the office's legal minimum age.`);
    minimum += options.legalMinimumAge;
  }
  const maximumExclusive =
    options.ceilingExclusive === undefined
      ? window.maximumExclusive
      : Math.min(window.maximumExclusive, options.ceilingExclusive);
  if (maximumExclusive <= minimum)
    throw new Error(`No age fits the ${role} window.`);
  return { minimum, maximumExclusive };
}

/** A seeded whole age inside the role's window (one draw from `rng`). */
export function inventedPersonAge(
  rng: SeededRng,
  role: InventedPersonRole,
  options: Parameters<typeof inventedPersonAgeBounds>[1] = {},
): number {
  const bounds = inventedPersonAgeBounds(role, options);
  return rng.integer(bounds.minimum, bounds.maximumExclusive);
}

/**
 * Where in the birth year the date falls.
 * - "drawn": a seeded month and day (the rule for new producers).
 * - "reference-day": the reference date's own month and day, clamped to the
 *   28th, so the person turns the drawn age on that day.
 * - a fixed month and day, kept by producers whose saved openings were built
 *   with one.
 */
export type InventedBirthDayPlacement =
  "drawn" | "reference-day" | { readonly monthDay: `${number}-${number}` };

/**
 * The one birth-date helper. Draws the age from the role's window unless the
 * caller already drew it with {@link inventedPersonAge}, then the day of the
 * year, from `rng` in that order.
 */
export function inventedPersonBirthDate(
  rng: SeededRng,
  input: {
    readonly role: InventedPersonRole;
    /** The date the age is counted to: today, a term start, an election. */
    readonly referenceDate: IsoDate;
    readonly legalMinimumAge?: number;
    readonly ceilingExclusive?: number;
    /** An age already drawn for this role (other draws came between). */
    readonly age?: number;
    readonly placement?: InventedBirthDayPlacement;
  },
): IsoDate {
  const bounds = inventedPersonAgeBounds(input.role, input);
  const age = input.age ?? rng.integer(bounds.minimum, bounds.maximumExclusive);
  if (age < bounds.minimum || age >= bounds.maximumExclusive)
    throw new Error(`An age of ${age} is outside the ${input.role} window.`);
  const year =
    Number(input.referenceDate.slice(0, 4)) -
    age -
    INVENTED_PERSON_AGE_WINDOWS[input.role].birthYearOffset;
  const placement = input.placement ?? "drawn";
  if (placement === "reference-day")
    return isoDateFromParts(
      year,
      Number(input.referenceDate.slice(5, 7)),
      Math.min(Number(input.referenceDate.slice(8, 10)), 28),
    );
  if (placement !== "drawn")
    return makeIsoDate(`${year}-${placement.monthDay}`);
  const month = String(rng.integer(1, 13)).padStart(2, "0");
  const day = String(rng.integer(1, 29)).padStart(2, "0");
  return makeIsoDate(`${year}-${month}-${day}`);
}
