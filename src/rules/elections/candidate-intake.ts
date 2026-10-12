import { addDays, makeIsoDate, type IsoDate } from "./calendar";
export interface IntakeProfile {
  readonly intakeStartMonthDay: string;
  readonly intakeDays: number;
}
export function congressCandidateIntakeDay(
  year: number,
  seatIndex: number,
  CONGRESS_CANDIDATE_PROFILE: IntakeProfile,
): IsoDate {
  return addDays(
    makeIsoDate(`${year}-${CONGRESS_CANDIDATE_PROFILE.intakeStartMonthDay}`),
    seatIndex % CONGRESS_CANDIDATE_PROFILE.intakeDays,
  );
}

export function partyShareFor(
  share: number | null | undefined,
  party: string,
): number | null {
  if (share === null || share === undefined) return null;
  return party === "democratic"
    ? share
    : party === "republican"
      ? 1 - share
      : null;
}
export function stateCandidateIntakeDay(
  year: number,
  index: number,
  STATE_LEGISLATURE_CANDIDATE_PROFILE: IntakeProfile,
): IsoDate {
  return addDays(
    makeIsoDate(
      `${year}-${STATE_LEGISLATURE_CANDIDATE_PROFILE.intakeStartMonthDay}`,
    ),
    index % STATE_LEGISLATURE_CANDIDATE_PROFILE.intakeDays,
  );
}
