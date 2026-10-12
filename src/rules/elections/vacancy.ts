export type SenateAppointmentRule =
  "none" | "governor" | "governor-same-party" | "governor-from-party-list";

export interface SenateVacancyLaw {
  readonly stateUsps: string;
  readonly appointment: SenateAppointmentRule;
  readonly appointmentDeadlineDays: number | null;
  readonly specialElection:
    | {
        readonly kind: "next-general";
      }
    | {
        readonly kind: "prompt";
        readonly promptDays: number | null;
      };
  readonly citation: string | null;
  readonly source: "crs-r44781-2017" | "statute-read-2026";
}

export interface SenateAppointmentTiming {
  readonly days: number;
  readonly basis: "recorded-deadline" | "estimated-deadline-proxy";
  readonly comparatorCount: number;
  readonly comparison: "same-appointment-rule" | "all-appointment-rules" | null;
}

export function senateAppointmentTiming(
  law: SenateVacancyLaw | null,
  rows: readonly SenateVacancyLaw[],
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
  // stopgapId: "SG-P14-elections-appointment-deadline-proxy"
  const recorded = rows.filter(
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
