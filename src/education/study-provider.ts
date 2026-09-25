import { educationEnrollmentStateAt } from "../simulation/life-queries";
import { proseDate } from "../presentation/prose-dates";
import type { EducationInstitution, EducationCapability } from "./types";
import { institutionDateReason } from "./catalog";
import type { World, EntityId } from "../simulation/types";
import type { LifePathDefinition } from "../simulation/life-paths2-catalog";
import {
  bootstrapStudyPeriodProgression,
  scheduleStudyStart,
  studyUsesPeriodModel,
  studyPeriodDueDate,
  totalStudyPeriods,
} from "../simulation/education-study-progression";
import {
  hasLifePathCredential,
  lifePathEntryReason,
} from "../simulation/life-paths2";
import { lifePathDefinition } from "../simulation/life-paths2-catalog";
import {
  DEGREE_RESEARCH_QUESTION_ID,
  degreeLevelForCode,
  degreeProgramFor,
} from "../simulation/degree-levels";
import {
  createOrganization,
  createEducationEnrollment,
} from "../simulation/life";
import { recordEvidenceArtifact } from "../simulation/evidence";
import { recordWorldEvent } from "../simulation/world";
import {
  parseEducationTerms,
  recordAcceptedEducationTerms,
  DEFAULT_AUTHORED_TUITION_GRACE_DAYS,
} from "../simulation/education-study-terms";
import type { AcceptedEducationTerms } from "../simulation/education-study-terms";
import { addDays, makeIsoDate } from "../simulation/dates";
import {
  finishedHighSchool,
  highSchoolEndsAt,
  inFinalHighSchoolYear,
  stillInGradeSchool,
} from "../simulation/school-stages";
import type { IsoDate } from "../simulation/types";
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
    responsibility: `Study ${capability.label.trim().toLowerCase()} across the accepted noncredit period.`,
    program: `postsecondary:edu-path7-${capability.code.toLowerCase()}`,
    credential: `Completed noncredit ${capability.label.trim().toLowerCase()} study (not a degree or license)`,
    prerequisiteProgram: null,
    minimumAge: 18,
    sessionMinutes: 0,
    sessionStartMinute: 0,
    minimumGapDays: 0,
    requiredSessions: null,
    minimumElapsedDays: 49,
    sessionCostMinor: 0,
    sessionPayMinor: 0,
    progressionModel: "periods",
    academicYears: 1,
    periodsPerYear: 1,
    daysPerPeriod: 49,
    periodCostMinor: 20000,
    tuitionGraceDays: DEFAULT_AUTHORED_TUITION_GRACE_DAYS,
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
/**
 * A degree at a real college, for the award levels in `degree-levels.ts`.
 *
 * The college and the level come from the directory. Everything else is a
 * PLACEHOLDER(research: who-gets-into-college-and-what-it-costs): length, pace
 * and tuition are copied from the game's own authored degree paths, not
 * invented again here, and the offer carries the directory row as evidence.
 */
export function degreeStudyDefinition(
  institution: EducationInstitution,
  capability: EducationCapability,
): LifePathDefinition | null {
  const level = degreeLevelForCode(capability.code);
  if (!level || capability.kind !== "award") return null;
  const template = lifePathDefinition(level.placeholderTemplateId);
  const academicYears = template.academicYears!;
  const periodsPerYear = template.periodsPerYear!;
  const daysPerPeriod = template.daysPerPeriod!;
  return {
    id: `edu-path7-${institution.officialId}-${level.code.toLowerCase()}`,
    version: 1,
    kind: "study",
    scope: "personal",
    organizationName: institution.name,
    title: `${level.credential} at ${institution.name}`,
    responsibility: `Study toward ${level.credential.toLowerCase()} across the accepted periods.`,
    program: degreeProgramFor(level),
    credential: level.credential,
    prerequisiteProgram: level.prerequisiteProgram,
    minimumAge: 18,
    sessionMinutes: 0,
    sessionStartMinute: 0,
    minimumGapDays: 0,
    requiredSessions: null,
    minimumElapsedDays: academicYears * periodsPerYear * daysPerPeriod,
    sessionCostMinor: 0,
    sessionPayMinor: 0,
    progressionModel: "periods",
    academicYears,
    periodsPerYear,
    daysPerPeriod,
    periodCostMinor: template.periodCostMinor!,
    tuitionGraceDays: DEFAULT_AUTHORED_TUITION_GRACE_DAYS,
    volunteerSupported: false,
    timeDemand: template.timeDemand,
    provenance: {
      kind: "authored",
      note: `EDU-PATH7 degree. Source supports the institution and the award level; admission, length, schedule and tuition are placeholders copied from ${level.placeholderTemplateId} pending research question ${DEGREE_RESEARCH_QUESTION_ID}.`,
    },
  };
}
/** The study this capability offers: a degree where the game runs one. */
export function studyPathFor(
  institution: EducationInstitution,
  capability: EducationCapability,
): LifePathDefinition {
  return (
    degreeStudyDefinition(institution, capability) ??
    studyDefinition(institution, capability)
  );
}
/**
 * How long a college takes to answer an application.
 *
 * PLACEHOLDER(research: when-college-applications-are-decided-and-terms-begin):
 * every application is answered 45 days after it is sent.
 */
export const ADMISSION_DECISION_DAYS = 45;

/**
 * The day a college's fall term starts.
 *
 * PLACEHOLDER(research: when-college-applications-are-decided-and-terms-begin):
 * every college starts its fall term on August 25, and a new student starts
 * only in the fall.
 */
export const COLLEGE_FALL_TERM_START = { month: 8, day: 25 } as const;

/** The first day of a fall term on or after a date. */
export function fallTermStartOnOrAfter(date: IsoDate): IsoDate {
  const on = (year: number) =>
    makeIsoDate(
      `${String(year).padStart(4, "0")}-${String(COLLEGE_FALL_TERM_START.month).padStart(2, "0")}-${String(COLLEGE_FALL_TERM_START.day).padStart(2, "0")}`,
    );
  const year = Number(date.slice(0, 4));
  return on(year) >= date ? on(year) : on(year + 1);
}

/**
 * The day classes start for a college place accepted today: the first fall
 * term once high school is over, or from today for somebody out of school.
 */
export function collegeStartsOn(world: World, personId: EntityId): IsoDate {
  const today = makeIsoDate(world.currentDate);
  const highSchoolEnds = highSchoolEndsAt(world, personId);
  return fallTermStartOnOrAfter(
    highSchoolEnds && highSchoolEnds > today ? highSchoolEnds : today,
  );
}

function isDegreePath(path: LifePathDefinition): boolean {
  return /^postsecondary:edu-path7-level\d+$/.test(path.program);
}

/**
 * The entry rule for a study path. A senior applies to college in their last
 * year of high school, often at seventeen: for a degree, finishing high
 * school is what counts, not an eighteenth birthday.
 */
function studyEntryReason(
  world: World,
  personId: EntityId,
  path: LifePathDefinition,
): string | null {
  const graduating =
    isDegreePath(path) &&
    (inFinalHighSchoolYear(world, personId) ||
      finishedHighSchool(world, personId));
  return lifePathEntryReason(
    world,
    personId,
    graduating ? { ...path, minimumAge: 0 } : path,
  );
}

export const GRADE_SCHOOL_REASON =
  "College comes after high school. For now, school is where you study.";
/** Whether the game can take an application for this listed capability. */
export function canApplyFor(capability: EducationCapability): boolean {
  return (
    capability.state === "offered" &&
    (capability.kind === "noncredit" ||
      (capability.kind === "award" && !!degreeLevelForCode(capability.code)))
  );
}
export function educationOptionReason(
  world: World,
  institution: EducationInstitution,
  capability: EducationCapability,
): string | null {
  if (world.control.kind !== "person") return "Choose a person to study.";
  const dateReason = institutionDateReason(institution, world.currentDate);
  if (dateReason) return dateReason;
  // A pupil applies to college from the start of their last year of high
  // school; somebody grown who has left school applies as anybody would.
  if (
    stillInGradeSchool(world, world.control.personId) &&
    !(
      capability.kind === "award" &&
      inFinalHighSchoolYear(world, world.control.personId)
    )
  )
    return GRADE_SCHOOL_REASON;
  if (institution.kind !== "postsecondary" || !canApplyFor(capability))
    return "This college does not take applications for this through the game.";
  const path = studyPathFor(institution, capability);
  const already = alreadyStudyingOrOffered(world, institution, capability);
  if (already) return already;
  if (
    path.prerequisiteProgram &&
    !hasLifePathCredential(
      world,
      world.control.personId,
      path.prerequisiteProgram,
    )
  )
    return "This needs a bachelor's degree first.";
  return studyEntryReason(world, world.control.personId, path);
}
/**
 * One place per program per college. A second application for a degree the
 * person is already studying, has been accepted for or already holds an offer
 * for went through, and left two enrollments in one program.
 */
function alreadyStudyingOrOffered(
  world: World,
  institution: EducationInstitution,
  capability: EducationCapability,
): string | null {
  if (world.control.kind !== "person") return null;
  const actor = world.control.personId;
  const program = studyPathFor(institution, capability).program;
  const org = world.history.organizations.find(
    (o) => o.stableKey === `edu-path7:institution:${institution.id}`,
  );
  if (
    org &&
    world.history.educationEnrollments.some(
      (e) =>
        e.personId === actor &&
        e.organizationId === org.id &&
        e.programKind === program &&
        ["active", "expected", "temporarily-inactive"].includes(
          educationEnrollmentStateAt(world, e.id)?.status ?? "",
        ),
    )
  )
    return "You're already enrolled in this program.";
  const earlier = unansweredEducationApplications(world).find((offer) => {
    const terms = parseEducationTerms(offer.description);
    return (
      terms?.institutionId === institution.id &&
      terms.capabilityCode === capability.code
    );
  });
  if (!earlier) return null;
  // Still waiting on the college: say when it answers, not that it did.
  const decisionAt = offerDecisionAt(earlier);
  return decisionAt && decisionAt > world.currentDate
    ? `You already applied to ${institution.name}. You'll hear back by ${proseDate(decisionAt)}.`
    : "You already have an offer for this program. You can accept or decline it below.";
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
  // A second request while an offer waits is refused by the reason above.
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
  const path = studyPathFor(institution, capability);
  const degree = capability.kind === "award";
  next = event(
    next,
    "application",
    [org.id],
    degree
      ? `You applied to ${institution.name} for ${credentialPhrase(path.credential!)}.`
      : `You asked ${institution.name} about noncredit study. Nothing is booked or paid yet.`,
  );
  // A degree application is answered after a wait; the offer is saved now,
  // with the day it is decided, and can be seen and answered from that day.
  const decisionAt = degree
    ? addDays(next.currentDate, ADMISSION_DECISION_DAYS)
    : null;
  const terms: OfferedEducationTerms = {
    version: 2,
    funding: "available-personal-cash",
    institutionId: institution.id,
    capabilityCode,
    sourceEvidence: institution.evidence,
    path,
    ...(decisionAt ? { decisionAt } : {}),
  };
  next = recordEvidenceArtifact(next, {
    stableKey: `edu-path7:offer:${next.history.nextSequence}`,
    evidenceKind: "education:study-offer-v2",
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
    // PLACEHOLDER(research: who-gets-into-college-and-what-it-costs): every
    // degree applicant is admitted until admission is researched. An
    // open-admission college admits anyone by its own reported policy.
    message: degree
      ? `You applied to ${institution.name}. You'll hear back by ${proseDate(decisionAt!)}.`
      : `${institution.name} offered you a noncredit place. Review the terms before accepting.`,
  };
}
/**
 * Offer terms as saved with an application. `decisionAt` is the day the
 * college answers; an offer saved before applications waited has none and
 * is answered already.
 */
export type OfferedEducationTerms = AcceptedEducationTerms & {
  readonly decisionAt?: IsoDate;
};

/** The day this saved offer is decided, or null when it already was. */
export function offerDecisionAt(offer: {
  readonly description: string | null;
}): IsoDate | null {
  try {
    const decisionAt = (
      JSON.parse(offer.description ?? "") as { decisionAt?: unknown }
    ).decisionAt;
    return typeof decisionAt === "string" ? makeIsoDate(decisionAt) : null;
  } catch {
    return null;
  }
}

function withoutDecision(
  terms: AcceptedEducationTerms,
): AcceptedEducationTerms {
  const copy: Record<string, unknown> = { ...terms };
  delete copy.decisionAt;
  return copy as unknown as AcceptedEducationTerms;
}

/** Offers the college has decided, ready to accept or decline. */
export function pendingEducationOffers(world: World) {
  return unansweredEducationApplications(world).filter((offer) => {
    const decisionAt = offerDecisionAt(offer);
    return decisionAt === null || decisionAt <= world.currentDate;
  });
}

/** Applications still waiting on the college's answer. */
export function awaitingEducationDecisions(world: World) {
  return unansweredEducationApplications(world).flatMap((offer) => {
    const decisionAt = offerDecisionAt(offer);
    const terms = parseEducationTerms(offer.description);
    if (!decisionAt || decisionAt <= world.currentDate || !terms) return [];
    return [
      {
        offerId: offer.id,
        organizationName: terms.path.organizationName,
        credential: terms.path.credential,
        decisionAt,
      },
    ];
  });
}

/** "a bachelor's degree", "an associate's degree". */
export function credentialPhrase(credential: string): string {
  const lower = credential.toLowerCase();
  return `${/^[aeiou]/.test(lower) ? "an" : "a"} ${lower}`;
}

/** Every saved application and offer not yet accepted or declined. */
function unansweredEducationApplications(world: World) {
  if (world.control.kind !== "person") return [];
  const actor = world.control.personId;
  return world.history.evidenceArtifacts.filter(
    (a) =>
      ["education:study-offer-v1", "education:study-offer-v2"].includes(
        a.evidenceKind,
      ) &&
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
  options: { tuitionGraceDays?: number } = {},
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
        "You declined the study offer.",
      ),
      message: "Offer declined.",
    };
  const savedTerms = parseEducationTerms(offer.description);
  const offeredTerms = savedTerms && withoutDecision(savedTerms);
  const graceDays =
    options.tuitionGraceDays ?? offeredTerms?.path.tuitionGraceDays;
  if (
    offeredTerms?.version === 2 &&
    (!Number.isSafeInteger(graceDays) || graceDays! < 0)
  )
    return {
      ok: false as const,
      world,
      message: "Grace must be a whole number of days, zero or more.",
    };
  const terms =
    offeredTerms?.version === 2
      ? {
          ...offeredTerms,
          path: { ...offeredTerms.path, tuitionGraceDays: graceDays },
        }
      : offeredTerms;
  if (!terms)
    return {
      ok: false as const,
      world,
      message: "This offer version is unavailable.",
    };
  const actor = world.control.kind === "person" ? world.control.personId : null;
  if (!actor) throw new Error("No person");
  // A degree place offered after a wait starts with the fall term once high
  // school is over. An offer saved before that keeps starting the day it is
  // accepted.
  const startsAt =
    terms.version === 2 &&
    degreeLevelForCode(terms.capabilityCode) &&
    offerDecisionAt(offer)
      ? collegeStartsOn(world, actor)
      : makeIsoDate(world.currentDate);
  if (terms.version === 2) {
    try {
      addDays(
        studyPeriodDueDate(startsAt, terms.path, totalStudyPeriods(terms.path)),
        graceDays!,
      );
    } catch {
      return {
        ok: false as const,
        world,
        message:
          "These terms exceed the supported calendar; no enrollment was created.",
      };
    }
  }
  if (terms.version === 1 && world.currentDate !== offer.createdAt)
    return {
      ok: false as const,
      world,
      message: "This offer has expired. Request current terms.",
    };
  const reason = studyEntryReason(world, actor, terms.path);
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
        ["expected", "active", "temporarily-inactive"].includes(
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
    startedAt: startsAt,
    ...(startsAt > world.currentDate
      ? { initialStatus: "expected" as const }
      : {}),
    programKind: terms.path.program,
    contextKind: degreeLevelForCode(terms.capabilityCode)
      ? "program:edu-path7-degree"
      : "program:edu-path7-noncredit",
    provenance,
  });
  const enrollment = next.history.educationEnrollments.at(-1)!;
  next = event(
    next,
    "offer-accepted",
    [offer.id, enrollment.id],
    degreeLevelForCode(terms.capabilityCode)
      ? `You accepted a place studying toward ${terms.path.credential!.toLowerCase()}. Tuition is due when each study period ends.`
      : "You accepted the noncredit study terms. Tuition is due when the study period ends.",
  );
  next = recordAcceptedEducationTerms(next, enrollment.id, terms);
  if (startsAt > world.currentDate) {
    // Nothing runs until the first day of classes: that day makes the place
    // active and starts its study periods.
    next = scheduleStudyStart(next, enrollment.id);
    return {
      ok: true as const,
      world: next,
      message: `You accepted a place at ${terms.path.organizationName}. Classes start ${proseDate(startsAt)}.`,
    };
  }
  if (studyUsesPeriodModel(terms.path))
    next = bootstrapStudyPeriodProgression(next, enrollment.id, terms.path);
  return {
    ok: true as const,
    world: next,
    message: studyUsesPeriodModel(terms.path)
      ? "Enrolled. Study advances by period as time passes."
      : "Enrolled. Schedule a session to begin studying.",
  };
}
