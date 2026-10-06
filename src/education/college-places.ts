import kindData from "../../data/research/places/college-kinds.json" with { type: "json" };
import campusManifest from "../../art/campuses/manifest.json" with { type: "json" };
import type { EducationInstitution } from "./types";

export type CollegePlaceKind =
  | "flagship"
  | "ivy-league"
  | "political-hotbed"
  | "regional-public"
  | "private"
  | "community";

export interface CollegePlace {
  /** Stable IPEDS unit identity. This is a read projection, not another writer. */
  readonly id: string;
  readonly name: string;
  readonly city: string;
  readonly state: string;
  readonly kind: CollegePlaceKind;
  readonly campus: string | null;
  readonly sourceYear: string;
}

interface CollegeKindRow {
  readonly id: string;
  readonly kind: CollegePlaceKind;
  readonly campus?: string;
  readonly sourceYear: string;
}

const rows = new Map(
  (kindData.institutions as readonly CollegeKindRow[]).map((row) => [
    row.id,
    row,
  ]),
);
const painted = new Map(
  (
    campusManifest.campuses as readonly {
      campus: string;
      institutionId?: string;
      kind: string;
      variant: string;
    }[]
  )
    .filter((row) => row.variant === "midday" && row.institutionId)
    .map((row) => [row.institutionId!, row]),
);

/**
 * Resolve the saved college identity lazily from the same IPEDS identity used
 * by study and tuition. This never creates a second organization record.
 */
export function collegePlaceFor(
  institution: EducationInstitution,
): CollegePlace | null {
  if (
    institution.kind !== "postsecondary" ||
    !["A", "N", "R"].includes(institution.statusCode)
  )
    return null;
  const row = rows.get(institution.id);
  if (!row) return null;
  const campusRecord = painted.get(institution.id);
  const paintedKind: CollegePlaceKind | null = campusRecord
    ? campusRecord.kind === "ivy-league"
      ? "ivy-league"
      : campusRecord.kind === "flagship" || campusRecord.kind === "territorial"
        ? "flagship"
        : campusRecord.kind === "land-grant"
          ? row.kind
          : campusRecord.kind === "private-research" ||
              campusRecord.kind === "private-college"
            ? "private"
            : "regional-public"
    : null;
  return {
    id: institution.id,
    name: institution.name,
    city: institution.city,
    state: institution.state,
    kind: paintedKind ?? row.kind,
    campus: row.campus ?? campusRecord?.campus ?? null,
    sourceYear: row.sourceYear,
  };
}
