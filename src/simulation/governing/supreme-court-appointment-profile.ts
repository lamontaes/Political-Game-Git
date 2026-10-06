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
  /**
   * ESTIMATED FROM AVERAGE: the median of four recent vacancies from the
   * announcement or death to the nomination (Garland 32 days, 2016; Kavanaugh
   * 12, 2018; Barrett 8, 2020; Jackson 29, 2022), 20.5 days, rounded to 21.
   */
  daysFromVacancyToNomination: 21,
  daysFromVacancyToNominationEstimated: true,
  daysFromVacancyToNominationEstimatedFrom:
    "Median of Garland (Feb 13 to Mar 16, 2016), Kavanaugh (Jun 27 to Jul 9, 2018), Barrett (Sep 18 to Sep 26, 2020) and Jackson (Jan 27 to Feb 25, 2022): vacancy or announcement to nomination",
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
