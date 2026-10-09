export type JobApplicantRoute = "applied" | "introduced";

export interface JobApplicantPlacementFacts {
  readonly daysInOpeningWorkLine: number;
  readonly route: JobApplicantRoute;
  readonly submittedAt: string;
  readonly personId: string;
}

/** Rank selected applicant facts using the legacy experience/referral/order rule. */
export function isApplicantBetterPlacedFromFacts(
  a: JobApplicantPlacementFacts,
  b: JobApplicantPlacementFacts,
): boolean {
  if (a.daysInOpeningWorkLine !== b.daysInOpeningWorkLine) {
    return a.daysInOpeningWorkLine > b.daysInOpeningWorkLine;
  }
  if (a.route !== b.route) return a.route === "introduced";
  if (a.submittedAt !== b.submittedAt) return a.submittedAt < b.submittedAt;
  return a.personId < b.personId;
}
