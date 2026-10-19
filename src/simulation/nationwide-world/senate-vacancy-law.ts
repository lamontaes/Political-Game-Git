import { researchRuleTable } from "../research-rule-tables";
/**
 * HOW EACH STATE FILLS A VACANT U.S. SENATE SEAT — the Seventeenth Amendment
 * has the governor issue writs of election, and lets the legislature let the
 * governor appoint a senator until the people fill the seat. Each state's
 * statute decides whether the governor may appoint, whom, how soon, and when
 * the special election falls.
 *
 * Where each row comes from, row by row in `source`:
 *
 * - `crs-r44781-2017`: Congressional Research Service report R44781, "U.S.
 *   Senate Vacancies: Contemporary Developments and Perspectives," updated
 *   May 17, 2017 (read September 28, 2026, at everycrsreport.com). That is a
 *   summary of each statute as of 2017, not the statute read today; several
 *   states have changed since. Research 9 is reading each current statute,
 *   and a row is replaced when it is read.
 * - `statute-read-2026`: the statute text itself, read September 28, 2026.
 *
 * A special election's timing is simplified to one date: the earliest day
 * the statute allows after the vacancy (`prompt`), or the next regular
 * November election (`next-general`). The proximity rules that move a
 * special election onto a regular election are simplified: whenever the next
 * regular November election comes before the prompt date, it is used. Where
 * the statute's window is not recorded, `promptDays` is null and the window
 * is ESTIMATED FROM AVERAGE: the median of the windows the other states'
 * statutes set (`SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS`), marked as such.
 *
 * September 29, 2026: 44 rows are read from the statute and 6 stay from the
 * 2017 summary (Arkansas, Georgia, Indiana, Mississippi, New Mexico and
 * Tennessee), whose official codes could not be read.
 */

export type SenateAppointmentRule =
  /** The governor may not appoint; the seat is empty until the election. */
  | "none"
  /** The governor appoints anyone qualified. */
  | "governor"
  /** The governor must appoint someone of the departed senator's party. */
  | "governor-same-party"
  /** The governor picks from names the departed senator's party submits. */
  | "governor-from-party-list";

export interface SenateVacancyLaw {
  readonly stateUsps: string;
  readonly appointment: SenateAppointmentRule;
  /** The latest day after the vacancy the statute allows an appointment. */
  readonly appointmentDeadlineDays: number | null;
  readonly specialElection:
    | { readonly kind: "next-general" }
    | { readonly kind: "prompt"; readonly promptDays: number | null };
  readonly citation: string | null;
  readonly source: "crs-r44781-2017" | "statute-read-2026";
}

const ROWS = researchRuleTable(
  "senateVacancyRows",
) as readonly SenateVacancyLaw[];

/**
 * ESTIMATED FROM AVERAGE: the days to a prompt special election where the
 * state's statute gives no window, the median of the windows the recorded
 * statutes do give (10 states; 107 days as recorded September 29, 2026).
 * Affects when a vacant seat in such a state is filled.
 */
export const SENATE_SPECIAL_ELECTION_ESTIMATED_DAYS: number = (() => {
  const days = ROWS.flatMap((row) =>
    row.specialElection.kind === "prompt" &&
    row.specialElection.promptDays !== null
      ? [row.specialElection.promptDays]
      : [],
  ).sort((a, b) => a - b);
  const mid = days.length >> 1;
  return days.length % 2 === 1
    ? days[mid]!
    : Math.floor((days[mid - 1]! + days[mid]!) / 2);
})();

const BY_STATE: ReadonlyMap<string, SenateVacancyLaw> = new Map(
  ROWS.map((row) => [row.stateUsps, row]),
);

/** The recorded law for a state's Senate vacancies, or null if none is. */
export function senateVacancyLaw(stateUsps: string): SenateVacancyLaw | null {
  return BY_STATE.get(stateUsps) ?? null;
}

/** Every recorded row, for tests and reports. */
export function senateVacancyLawRows(): readonly SenateVacancyLaw[] {
  return ROWS;
}

export interface SenateAppointmentTiming {
  readonly days: number;
  readonly basis: "recorded-deadline" | "estimated-deadline-proxy";
  readonly comparatorCount: number;
  readonly comparison: "same-appointment-rule" | "all-appointment-rules" | null;
}

/** A legal deadline is a latest day, not an observed appointment duration.
 * Schedule at that bound where recorded. Otherwise use the median recorded
 * deadline for the same appointment rule, falling back to all appointing
 * rules. This is explicitly an estimate from legal windows, not observed
 * governor behavior; no appointment is scheduled where the law forbids one.
 */
export function senateAppointmentTiming(
  law: SenateVacancyLaw | null,
): SenateAppointmentTiming | null {
  if (law?.appointment === "none") return null;
  if (
    law?.appointmentDeadlineDays !== null &&
    law?.appointmentDeadlineDays !== undefined
  )
    return {
      days: law.appointmentDeadlineDays,
      basis: "recorded-deadline",
      comparatorCount: 0,
      comparison: null,
    };
  const recorded = ROWS.filter(
    (row) => row.appointment !== "none" && row.appointmentDeadlineDays !== null,
  );
  const similar = law
    ? recorded.filter((row) => row.appointment === law.appointment)
    : [];
  const comparators = similar.length ? similar : recorded;
  const days = comparators
    .map((row) => row.appointmentDeadlineDays!)
    .sort((a, b) => a - b);
  if (!days.length)
    throw new Error(
      "No recorded Senate appointment deadlines to estimate from.",
    );
  const middle = Math.floor(days.length / 2);
  return {
    days:
      days.length % 2
        ? days[middle]!
        : Math.floor((days[middle - 1]! + days[middle]!) / 2),
    basis: "estimated-deadline-proxy",
    comparatorCount: days.length,
    comparison: similar.length
      ? "same-appointment-rule"
      : "all-appointment-rules",
  };
}
