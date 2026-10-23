import table from "./data/jobs/occupation-licenses.json" with { type: "json" };

export interface OccupationLicenseGroup {
  readonly id: string;
  readonly title: string;
  readonly employedThousands: number;
  readonly licensedShare: number;
}

export const OCCUPATION_LICENSE_GROUPS: readonly OccupationLicenseGroup[] =
  table.groups;

/**
 * The share of a major occupation group's workers who hold a government
 * license (BLS CPS 2023, Table 53), with the placeholder band around it. Nothing
 * but the group id decides it: the same table reads for every place.
 */
export function licensedShare(groupId: string): {
  readonly value: number;
  readonly low: number;
  readonly high: number;
} {
  const row = OCCUPATION_LICENSE_GROUPS.find((g) => g.id === groupId);
  if (!row) throw new Error(`No occupation license row for ${groupId}`);
  return {
    value: row.licensedShare,
    low: Math.min(1, row.licensedShare * table.spreadRelative.low),
    high: Math.min(1, row.licensedShare * table.spreadRelative.high),
  };
}

/** Workers-weighted share across all groups, for checking the table against the all-employed figure. */
export function weightedLicensedShare(): number {
  const total = OCCUPATION_LICENSE_GROUPS.reduce(
    (n, g) => n + g.employedThousands,
    0,
  );
  return (
    OCCUPATION_LICENSE_GROUPS.reduce(
      (n, g) => n + g.employedThousands * g.licensedShare,
      0,
    ) / total
  );
}
