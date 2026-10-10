export interface JobLineExperienceFact {
  readonly isEmployment: boolean;
  readonly title: string;
  readonly occupationClassification: string | null;
  readonly workedDays: number;
}

export interface JobLineFact {
  readonly title: string;
  readonly occupationClassification: string | null;
}

/** Sum caller-resolved work spans in the same title or occupation. */
export function daysInJobLineFromFacts(
  experiences: readonly JobLineExperienceFact[],
  opening: JobLineFact,
): number {
  return experiences.reduce((days, experience) => {
    if (!experience.isEmployment) return days;
    const sameLine =
      experience.title === opening.title ||
      (opening.occupationClassification !== null &&
        experience.occupationClassification ===
          opening.occupationClassification);
    return sameLine ? days + Math.max(0, experience.workedDays) : days;
  }, 0);
}
