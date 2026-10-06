export const SUPREME_COURT_APPOINTMENTS_VERSION =
  "governing-supreme-court-appointments-v1";
export const ASSOCIATE_JUSTICE_NOMINATION =
  "governing:associate-justice-nomination" as const;
export const ASSOCIATE_JUSTICE_CONFIRMATION =
  "governing:associate-justice-confirmation" as const;
export const SUPREME_COURT_NOMINATED_EVENT =
  "governing.supreme-court-nominated" as const;
export const SUPREME_COURT_VOTE_EVENT =
  "governing.supreme-court-confirmation-vote" as const;
export const SUPREME_COURT_SEATED_EVENT =
  "governing.supreme-court-seated" as const;
export const SUPREME_COURT_VACANCY_EVENT =
  "governing.supreme-court-vacancy" as const;

export const SUPREME_COURT_ID = "us-supreme-court";

export const SUPREME_COURT_APPOINTMENT_PROFILE = {
  id: "ocd-supreme-court-appointment/v1",
  /** ESTIMATED FROM THE GAME'S FEDERAL NOMINATION PROFILE: one 30-day review. */
  daysFromVacancyToNomination: 30,
  /** MEASURED: median, 17 confirmations 1975-2022 (senate.gov). */
  daysFromNominationToVote: 66,
} as const;

export const CHIEF_JUSTICE_VACANCY_VERSION =
  "governing-chief-justice-vacancy-v1";
export const CHIEF_JUSTICE_NOMINATION =
  "governing:chief-justice-nomination" as const;
export const CHIEF_JUSTICE_CONFIRMATION =
  "governing:chief-justice-confirmation" as const;
export const CHIEF_JUSTICE_NOMINATED_EVENT =
  "governing.chief-justice-nominated" as const;

export const CHIEF_JUSTICE_VACANCY_PROFILE = {
  id: "ocd-chief-justice-vacancy-game-profile/v1",
  daysFromVacancyToNomination:
    SUPREME_COURT_APPOINTMENT_PROFILE.daysFromVacancyToNomination,
  daysFromNominationToConfirmation:
    SUPREME_COURT_APPOINTMENT_PROFILE.daysFromNominationToVote,
} as const;
