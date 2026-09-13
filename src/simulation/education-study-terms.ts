import type { World, EntityId } from "./types";
import type { LifePathDefinition } from "./life-paths2-catalog";
import { studyUsesPeriodModel } from "./education-study-progression";
/** Versioned accepted terms stored in ordinary canonical evidence artifacts. */
export interface AcceptedEducationTerms {
  readonly version: 1;
  readonly institutionId: string;
  readonly capabilityCode: string;
  readonly sourceEvidence: readonly {
    artifactId: string;
    sha256: string;
    member: string;
    row: number;
  }[];
  readonly path: LifePathDefinition;
}
export const EDUCATION_TERMS_KIND =
  "education:accepted-study-terms-v1" as const;
export function acceptedEducationPath(
  world: World,
  enrollmentId: EntityId,
): LifePathDefinition | undefined {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  if (!enrollment) return undefined;
  const entries = world.history.evidenceArtifacts.filter(
    (e) =>
      e.evidenceKind === EDUCATION_TERMS_KIND &&
      e.relatedEntityIds.some((id) =>
        world.history.events.some(
          (event) =>
            event.id === id &&
            event.type === "education.offer-accepted" &&
            event.involvedEntityIds.includes(enrollmentId),
        ),
      ),
  );
  if (entries.length !== 1) return undefined;
  const terms = parseEducationTerms(entries[0]!.description);
  return terms?.path.program === enrollment.programKind
    ? terms.path
    : undefined;
}
function validSessionStudyPath(p: LifePathDefinition): boolean {
  for (const n of [
    "sessionMinutes",
    "sessionStartMinute",
    "minimumGapDays",
    "minimumElapsedDays",
    "sessionCostMinor",
    "minimumAge",
  ] as const)
    if (!Number.isSafeInteger(p[n]) || p[n]! < 0) return false;
  if (
    p.sessionMinutes <= 0 ||
    p.sessionMinutes > 1440 ||
    p.sessionStartMinute >= 1440 ||
    !p.requiredSessions ||
    p.sessionPayMinor !== 0 ||
    !p.credential ||
    p.provenance.kind !== "authored"
  )
    return false;
  return true;
}
function validPeriodStudyPath(p: LifePathDefinition): boolean {
  if (
    p.progressionModel !== "periods" ||
    !Number.isSafeInteger(p.academicYears) ||
    p.academicYears! <= 0 ||
    !Number.isSafeInteger(p.periodsPerYear) ||
    p.periodsPerYear! <= 0 ||
    !Number.isSafeInteger(p.daysPerPeriod) ||
    p.daysPerPeriod! <= 0 ||
    !Number.isSafeInteger(p.periodCostMinor) ||
    p.periodCostMinor! < 0 ||
    !Number.isSafeInteger(p.minimumAge) ||
    p.minimumAge < 0 ||
    !p.credential ||
    p.provenance.kind !== "authored"
  )
    return false;
  return true;
}
export function parseEducationTerms(
  text: string | null,
): AcceptedEducationTerms | undefined {
  try {
    const terms = JSON.parse(text ?? "") as AcceptedEducationTerms;
    const p = terms.path;
    if (
      terms.version !== 1 ||
      p.version !== 1 ||
      p.kind !== "study" ||
      p.scope !== "personal" ||
      !/^ipeds-unit:\d{6}$/.test(terms.institutionId) ||
      !/^NONCRDT[1-8]$/.test(terms.capabilityCode) ||
      p.program !==
        `postsecondary:edu-path7-${terms.capabilityCode.toLowerCase()}` ||
      !terms.sourceEvidence.length
    )
      return undefined;
    if (
      !terms.sourceEvidence.every(
        (e) =>
          e.artifactId &&
          /^[a-f0-9]{64}$/.test(e.sha256) &&
          e.member &&
          Number.isSafeInteger(e.row) &&
          e.row >= 2,
      )
    )
      return undefined;
    if (studyUsesPeriodModel(p)) {
      if (!validPeriodStudyPath(p)) return undefined;
      return terms;
    }
    if (!validSessionStudyPath(p)) return undefined;
    return terms;
  } catch {
    return undefined;
  }
}
