import type { World, EntityId } from "./types";
import type { LifePathDefinition } from "./life-paths2-catalog";
import { studyUsesPeriodModel } from "./education-study-progression";
import { recordEvidenceArtifact } from "./evidence";
import legacyTerms from "./legacy-education-terms-v1.json" with { type: "json" };
/** Versioned accepted terms stored in ordinary canonical evidence artifacts. */
export interface AcceptedEducationTerms {
  readonly version: 1 | 2;
  readonly origin?: "authored-life-path";
  readonly funding?: "available-personal-cash";
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
export const EDUCATION_TERMS_V2_KIND =
  "education:accepted-study-terms-v2" as const;
export const DEFAULT_AUTHORED_TUITION_GRACE_DAYS = 30;
function educationTermRecords(world: World, enrollmentId: EntityId) {
  return world.history.evidenceArtifacts.filter(
    (e) =>
      [EDUCATION_TERMS_KIND, EDUCATION_TERMS_V2_KIND].includes(
        e.evidenceKind as typeof EDUCATION_TERMS_KIND,
      ) &&
      e.relatedEntityIds.some((id) =>
        world.history.events.some(
          (event) =>
            event.id === id &&
            ["education.offer-accepted", "life-paths2.enrolled"].includes(
              event.type,
            ) &&
            event.involvedEntityIds.includes(enrollmentId),
        ),
      ),
  );
}
export function hasAcceptedEducationTermRecord(
  world: World,
  enrollmentId: EntityId,
): boolean {
  return educationTermRecords(world, enrollmentId).length > 0;
}
export function acceptedEducationTerms(
  world: World,
  enrollmentId: EntityId,
): AcceptedEducationTerms | undefined {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  if (!enrollment) return undefined;
  const entries = educationTermRecords(world, enrollmentId);
  if (entries.length !== 1) return undefined;
  const terms = parseEducationTerms(entries[0]!.description);
  if (
    !terms ||
    entries[0]!.evidenceKind !==
      (terms.version === 1 ? EDUCATION_TERMS_KIND : EDUCATION_TERMS_V2_KIND) ||
    terms.path.program !== enrollment.programKind ||
    (terms.origin === "authored-life-path" &&
      terms.institutionId !== enrollment.organizationId)
  )
    return undefined;
  return terms;
}
/** Immutable compatibility baseline; a future catalog edit cannot reprice old v1 lives. */
export function legacyAcceptedEducationPath(
  world: World,
  enrollmentId: EntityId,
): LifePathDefinition | undefined {
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  const initialState = world.history.educationEnrollmentStates.find(
    (s) => s.enrollmentId === enrollmentId,
  );
  if (!enrollment || initialState?.contextKind !== "program:life-paths2-v1")
    return undefined;
  const path = legacyTerms.paths.find(
    (p) => p.program === enrollment.programKind,
  );
  return path ? (structuredClone(path) as LifePathDefinition) : undefined;
}
export function recordAcceptedEducationTerms(
  world: World,
  enrollmentId: EntityId,
  terms: AcceptedEducationTerms,
): World {
  const parsed = parseEducationTerms(JSON.stringify(terms));
  const enrollment = world.history.educationEnrollments.find(
    (e) => e.id === enrollmentId,
  );
  const agreement = world.history.events.find(
    (e) =>
      ["education.offer-accepted", "life-paths2.enrolled"].includes(e.type) &&
      e.involvedEntityIds.includes(enrollmentId),
  );
  if (
    !parsed ||
    !enrollment ||
    !agreement ||
    parsed.path.program !== enrollment.programKind ||
    (parsed.origin === "authored-life-path" &&
      parsed.institutionId !== enrollment.organizationId)
  )
    throw new Error("Invalid accepted study terms.");
  const previous = acceptedEducationTerms(world, enrollmentId);
  if (previous) {
    if (JSON.stringify(previous) !== JSON.stringify(parsed))
      throw new Error("Accepted study terms cannot be replaced.");
    return world;
  }
  if (hasAcceptedEducationTermRecord(world, enrollmentId))
    throw new Error(
      "Saved study terms are unavailable; they cannot be replaced.",
    );
  return recordEvidenceArtifact(world, {
    stableKey: `education:accepted-terms:${enrollmentId}`,
    evidenceKind:
      parsed.version === 1 ? EDUCATION_TERMS_KIND : EDUCATION_TERMS_V2_KIND,
    createdAt: world.currentDate,
    recordedAt: world.currentDate,
    relatedEntityIds: [agreement.id],
    access: "private",
    description: JSON.stringify(parsed),
    provenance: parsed.path.provenance,
  });
}
export function acceptedEducationPath(
  world: World,
  enrollmentId: EntityId,
): LifePathDefinition | undefined {
  return acceptedEducationTerms(world, enrollmentId)?.path;
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
    !Number.isSafeInteger(p.requiredSessions) ||
    (p.requiredSessions ?? 0) <= 0 ||
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
    p.sessionPayMinor !== 0 ||
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
      ![1, 2].includes(terms.version) ||
      (terms.version === 2 && terms.funding !== "available-personal-cash") ||
      p.version !== 1 ||
      p.kind !== "study" ||
      p.scope !== "personal" ||
      !p.id ||
      !p.title ||
      !p.organizationName ||
      !p.program ||
      !p.timeDemand ||
      !Number.isFinite(p.timeDemand.expectedWeekly?.minimumHours) ||
      !Number.isFinite(p.timeDemand.expectedWeekly?.maximumHours) ||
      p.timeDemand.expectedWeekly.minimumHours < 0 ||
      p.timeDemand.expectedWeekly.maximumHours <
        p.timeDemand.expectedWeekly.minimumHours ||
      !Number.isSafeInteger(p.minimumElapsedDays) ||
      p.minimumElapsedDays < 0 ||
      !Number.isSafeInteger(p.sessionCostMinor) ||
      p.sessionCostMinor < 0 ||
      !Number.isSafeInteger(p.sessionMinutes) ||
      p.sessionMinutes < 0 ||
      p.sessionMinutes > 1440 ||
      !Number.isSafeInteger(p.sessionStartMinute) ||
      p.sessionStartMinute < 0 ||
      p.sessionStartMinute >= 1440 ||
      !Number.isSafeInteger(p.minimumGapDays) ||
      p.minimumGapDays < 0 ||
      (p.requiredSessions !== null &&
        (!Number.isSafeInteger(p.requiredSessions) ||
          p.requiredSessions <= 0)) ||
      !terms.institutionId ||
      !Array.isArray(terms.sourceEvidence) ||
      (p.tuitionGraceDays !== undefined &&
        (terms.version !== 2 ||
          !Number.isSafeInteger(p.tuitionGraceDays) ||
          p.tuitionGraceDays < 0))
    )
      return undefined;
    if (
      studyUsesPeriodModel(p) &&
      (!Number.isSafeInteger(p.academicYears! * p.periodsPerYear!) ||
        !Number.isSafeInteger(
          p.academicYears! * p.periodsPerYear! * p.periodCostMinor!,
        ) ||
        !Number.isSafeInteger(
          p.academicYears! * p.periodsPerYear! * p.daysPerPeriod!,
        ))
    )
      return undefined;
    if (terms.origin === "authored-life-path") {
      if (
        terms.version !== 2 ||
        terms.capabilityCode !== p.program ||
        terms.sourceEvidence.length !== 0
      )
        return undefined;
    } else if (
      terms.origin !== undefined ||
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
