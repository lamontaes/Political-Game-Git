import type { EducationInstitution } from "./types";
/** Pagination limits rendered rows, never the searchable corpus. */
export function searchInstitutions(
  catalog: readonly EducationInstitution[],
  query: string,
  kind = "",
  offset = 0,
  pageSize = 30,
) {
  const terms = query
    .trim()
    .toLocaleLowerCase("en-US")
    .split(/\s+/)
    .filter(Boolean);
  const matches = catalog.filter(
    (r) =>
      (!kind || r.kind === kind) &&
      terms.every((t) =>
        `${r.name} ${r.city} ${r.state} ${r.officialId} ${r.countyGeoid ?? ""}`
          .toLocaleLowerCase("en-US")
          .includes(t),
      ),
  );
  return {
    total: matches.length,
    rows: matches.slice(Math.max(0, offset), Math.max(0, offset) + pageSize),
  };
}
/** Observed year is not a founding date or authorization for historical attendance. */
export function institutionDateReason(
  institution: EducationInstitution,
  date: string,
): string | null {
  if (date < "2024-07-01" || date > "2025-06-30")
    return "This directory describes 2024–25. Existence and offerings at this date are not established.";
  if (
    institution.kind === "postsecondary" &&
    !["A", "N", "R"].includes(institution.statusCode)
  )
    return "The directory does not establish an open institution.";
  if (
    institution.kind !== "postsecondary" &&
    !["1", "3", "4", "5", "8"].includes(institution.statusCode)
  )
    return "The directory does not establish an open school or district.";
  return null;
}
