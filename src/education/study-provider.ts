import { educationEnrollmentStateAt } from "../simulation/life-queries";
import type { EducationInstitution, EducationCapability } from "./types";
import { institutionDateReason } from "./catalog";
import type { World, EntityId } from "../simulation/types";
import type { LifePathDefinition } from "../simulation/life-paths2-catalog";
import { lifePathEntryReason } from "../simulation/life-paths2";
import {
  createOrganization,
  createEducationEnrollment,
} from "../simulation/life";
import { recordEvidenceArtifact } from "../simulation/evidence";
import { recordWorldEvent } from "../simulation/world";
import {
  EDUCATION_TERMS_KIND,
  parseEducationTerms,
} from "../simulation/education-study-terms";
import type { AcceptedEducationTerms } from "../simulation/education-study-terms";
const provenance = {
  kind: "authored",
  note: "EDU-PATH7 v1 simulated noncredit opportunity and terms. Source supports only institution/category; admission, schedule, fees and completion below are game-authored, not official institutional policy.",
} as const;
/** Only noncredit categories permit broad course content without inventing a major/degree. */
export function studyDefinition(
  institution: EducationInstitution,
  capability: EducationCapability,
): LifePathDefinition {
  return {
    id: `edu-path7-${institution.officialId}-${capability.code.toLowerCase()}`,
    version: 1,
    kind: "study",
    scope: "personal",
    organizationName: institution.name,
    title: `${capability.label.trim()} — noncredit study`,
    responsibility: `Complete a supervised noncredit learning session in ${capability.label.trim().toLowerCase()}.`,
    program: `postsecondary:edu-path7-${capability.code.toLowerCase()}`,
    credential: `Completed noncredit ${capability.label.trim().toLowerCase()} study (game-authored record; no degree or license)`,
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 120,
    sessionStartMinute: 1080,
    minimumGapDays: 7,
    requiredSessions: 8,
    minimumElapsedDays: 49,
    sessionCostMinor: 2500,
    sessionPayMinor: 0,
    volunteerSupported: false,
    timeDemand: {
      expectedWeekly: { minimumHours: 2, maximumHours: 2 },
      attention: "moderate",
      concurrency: "mostly-exclusive",
      scheduleRigidity: "flexible",
      interruptibility: "limited",
      locationJurisdictionId: null,
    },
    provenance,
  };
}
export function educationOptionReason(
  world: World,
  institution: EducationInstitution,
  capability: EducationCapability,
): string | null {
  if (world.control.kind !== "person") return "Choose a person to study.";
  const dateReason = institutionDateReason(institution, world.currentDate);
  if (dateReason) return dateReason;
  if (
    institution.kind !== "postsecondary" ||
    capability.kind !== "noncredit" ||
    capability.state !== "offered"
  )
    return "This source does not establish an available noncredit study category. Degree/grade admission, exact program and prerequisites remain unestablished.";
  return lifePathEntryReason(
    world,
    world.control.personId,
    studyDefinition(institution, capability),
  );
}
function event(
  world: World,
  type: string,
  ids: EntityId[],
  summary: string,
): World {
  const personId =
    world.control.kind === "person" ? world.control.personId : null;
  if (!personId) throw new Error("No controlled person");
  return recordWorldEvent(world, {
    stableKey: `edu-path7:${type}:${world.history.nextSequence}`,
    type: `education.${type}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [personId, ...ids],
    participants: [{ personId, role: "agency:applicant", detail: summary }],
    personFactConstraints: [],
    visibility: "private",
    tags: ["education", "edu-path7"],
    summary,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: summary,
      motivation: null,
      immediateReaction: null,
    },
  });
}
export function applyForEducation(
  world: World,
  institution: EducationInstitution,
  capabilityCode: string,
) {
  const capability = institution.capabilities.find(
    (c) => c.code === capabilityCode,
  );
  if (!capability) throw new Error("Unknown capability");
  const reason = educationOptionReason(world, institution, capability);
  if (reason) return { ok: false as const, world, message: reason };
  const actor = world.control.kind === "person" ? world.control.personId : null;
  if (!actor) throw new Error("No person");
  const stableKey = `edu-path7:institution:${institution.id}`;
  let next = world;
  let org = next.history.organizations.find((o) => o.stableKey === stableKey);
  if (!org) {
    next = createOrganization(next, {
      stableKey,
      formedAt: next.currentDate,
      provenance: {
        kind: "authored",
        note: `Save-world representation from ${institution.id}; represented from ${next.currentDate}, not a claim of historical founding. ${institution.evidence.map((e) => `${e.artifactId}:${e.sha256}:${e.member}:${e.row}`).join(";")}`,
      },
      initialProfile: {
        name: institution.name,
        classification: "service:college",
        locationJurisdictionId: null,
      },
    });
    org = next.history.organizations.at(-1)!;
  }
  next = event(
    next,
    "application",
    [org.id],
    `You requested the game-authored noncredit study option at ${institution.name}. No attendance, degree or payment is recorded.`,
  );
  const terms: AcceptedEducationTerms = {
    version: 1,
    institutionId: institution.id,
    capabilityCode,
    sourceEvidence: institution.evidence,
    path: studyDefinition(institution, capability),
  };
  next = recordEvidenceArtifact(next, {
    stableKey: `edu-path7:offer:${next.history.nextSequence}`,
    evidenceKind: "education:study-offer-v1",
    createdAt: next.currentDate,
    recordedAt: next.currentDate,
    relatedEntityIds: [next.history.events.at(-1)!.id],
    access: "private",
    description: JSON.stringify(terms),
    provenance,
  });
  return {
    ok: true as const,
    world: next,
    message:
      "A game-authored noncredit offer is available. Review its terms before accepting; this is not official admission.",
  };
}
export function pendingEducationOffers(world: World) {
  if (world.control.kind !== "person") return [];
  const actor = world.control.personId;
  return world.history.evidenceArtifacts.filter(
    (a) =>
      a.evidenceKind === "education:study-offer-v1" &&
      a.relatedEntityIds.some((id) =>
        world.history.events.some(
          (e) =>
            e.id === id && e.participants.some((p) => p.personId === actor),
        ),
      ) &&
      !world.history.events.some(
        (e) =>
          ["education.offer-accepted", "education.offer-declined"].includes(
            e.type,
          ) && e.involvedEntityIds.includes(a.id),
      ),
  );
}
export function respondToEducationOffer(
  world: World,
  offerId: EntityId,
  accept: boolean,
) {
  const offer = pendingEducationOffers(world).find((a) => a.id === offerId);
  if (!offer)
    return {
      ok: false as const,
      world,
      message: "This offer is not available to you.",
    };
  if (!accept)
    return {
      ok: true as const,
      world: event(
        world,
        "offer-declined",
        [offer.id],
        "You declined the noncredit study offer.",
      ),
      message: "Offer declined.",
    };
  const terms = parseEducationTerms(offer.description);
  if (!terms)
    return {
      ok: false as const,
      world,
      message: "This offer version is unavailable.",
    };
  if (world.currentDate !== offer.createdAt)
    return {
      ok: false as const,
      world,
      message: "This offer has expired. Request current terms.",
    };
  const actor = world.control.kind === "person" ? world.control.personId : null;
  if (!actor) throw new Error("No person");
  const reason = lifePathEntryReason(world, actor, terms.path);
  if (reason) return { ok: false as const, world, message: reason };
  const application = world.history.events.find((e) =>
    offer.relatedEntityIds.includes(e.id),
  );
  const org = application?.involvedEntityIds.find((id) =>
    world.history.organizations.some((o) => o.id === id),
  );
  if (!org) throw new Error("Missing issuer");
  if (
    world.history.educationEnrollments.some(
      (e) =>
        e.personId === actor &&
        e.organizationId === org &&
        e.programKind === terms.path.program &&
        ["active", "temporarily-inactive"].includes(
          educationEnrollmentStateAt(world, e.id)?.status ?? "",
        ),
    )
  )
    return {
      ok: false as const,
      world,
      message: "This study path is already active or interrupted.",
    };
  let next = createEducationEnrollment(world, {
    stableKey: `edu-path7:enrollment:${world.history.nextSequence}`,
    personId: actor,
    organizationId: org,
    startedAt: world.currentDate,
    programKind: terms.path.program,
    contextKind: "program:edu-path7-noncredit",
    provenance,
  });
  const enrollment = next.history.educationEnrollments.at(-1)!;
  next = event(
    next,
    "offer-accepted",
    [offer.id, enrollment.id],
    "You accepted the noncredit study terms. Attendance and charges require performing a scheduled session.",
  );
  next = recordEvidenceArtifact(next, {
    stableKey: `edu-path7:accepted:${enrollment.id}`,
    evidenceKind: EDUCATION_TERMS_KIND,
    createdAt: next.currentDate,
    recordedAt: next.currentDate,
    relatedEntityIds: [next.history.events.at(-1)!.id],
    access: "private",
    description: JSON.stringify(terms),
    provenance,
  });
  return {
    ok: true as const,
    world: next,
    message: "Enrolled. Schedule a session to begin studying.",
  };
}
