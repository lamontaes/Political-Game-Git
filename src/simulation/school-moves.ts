import {
  appendChildhoodEntry,
  childhoodRecordEntries,
} from "./childhood-record";
import { recordsByStringField } from "./history-index";
import {
  createEducationEnrollment,
  recordEducationEnrollmentState,
} from "./life";
import {
  educationEnrollmentHistoryForPerson,
  educationEnrollmentStateAt,
  organizationProfileAt,
} from "./life-queries";
import {
  onCalendar,
  SCHOOL_STAGE_CONTEXT,
  SCHOOL_STAGE_PROGRAM,
  schoolGradeOn,
  schoolStageForGrade,
  schoolTermOn,
} from "./school-calendar";
import type { EducationEnrollment, EntityId, IsoDate, World } from "./types";

/** Whether a person holds a grade-school place today, attending or waiting. */
export function holdsSchoolPlace(world: World, personId: EntityId): boolean {
  return educationEnrollmentHistoryForPerson(world, personId).some((row) => {
    if (!row.programKind.startsWith("schooling:")) return false;
    const status = educationEnrollmentStateAt(world, row.id)?.status;
    return status === "active" || status === "expected";
  });
}

/**
 * The schools recorded in a place that teach a program: an organization
 * located there whose own pupils were enrolled in it. A building nobody has
 * attended teaches no grade the World knows, so it is not counted.
 */
function schoolsTeaching(
  world: World,
  jurisdictionId: EntityId,
  program: EducationEnrollment["programKind"],
): readonly { id: EntityId; pupils: number }[] {
  const organizationIds = new Set(
    recordsByStringField(
      world.history.organizationProfiles,
      "locationJurisdictionId",
      jurisdictionId,
    ).map((profile) => profile.organizationId),
  );
  const schools: { id: EntityId; pupils: number }[] = [];
  for (const id of organizationIds) {
    const profile = organizationProfileAt(world, id);
    if (
      !profile ||
      profile.closed ||
      profile.locationJurisdictionId !== jurisdictionId
    )
      continue;
    const taught = recordsByStringField(
      world.history.educationEnrollments,
      "organizationId",
      id,
    ).filter((row) => row.programKind === program);
    if (taught.length === 0) continue;
    const pupils = taught.filter(
      (row) => educationEnrollmentStateAt(world, row.id)?.status === "active",
    ).length;
    schools.push({ id, pupils });
  }
  return schools;
}

/**
 * A pupil who has moved starts school in the new place, in the grade the
 * calendar puts them in: today while school is in session, or from the first
 * day of the next school year over the summer.
 *
 * The school is one the World holds in that place for the grade's stage, or
 * a school teaching all grades. HARDWIRED: among several, the one with the
 * most pupils attending, then the lowest id. Where the place holds none, the
 * childhood record says so and the pupil is left unenrolled; no school is
 * made up for them.
 */
export function startSchoolAfterMove(
  world: World,
  personId: EntityId,
  moveEventId: EntityId,
  toJurisdictionId: EntityId,
  date: IsoDate,
): World {
  const inSession = schoolTermOn(date) !== null;
  const year = Number(date.slice(0, 4));
  const startsAt = inSession
    ? date
    : date < onCalendar(year, "starts")
      ? onCalendar(year, "starts")
      : onCalendar(year + 1, "starts");
  const grade = schoolGradeOn(world, personId, startsAt);
  if (grade === null) return world;
  const stage = schoolStageForGrade(grade);
  const choices = [
    ...schoolsTeaching(
      world,
      toJurisdictionId,
      SCHOOL_STAGE_PROGRAM[stage],
    ).map((school) => ({ ...school, program: SCHOOL_STAGE_PROGRAM[stage] })),
    ...schoolsTeaching(world, toJurisdictionId, "schooling:general").map(
      (school) => ({ ...school, program: "schooling:general" as const }),
    ),
  ].sort((a, b) => b.pupils - a.pupils || a.id.localeCompare(b.id));
  const school = choices[0];
  if (!school)
    return appendChildhoodEntry(world, {
      kind: "no-school-on-record",
      stableKey: `${moveEventId}:childhood:no-school:${personId}`,
      personId,
      effectiveAt: date,
      sourceRecordId: moveEventId,
      toJurisdictionId,
      grade,
    });
  return createEducationEnrollment(world, {
    stableKey: `${moveEventId}:school:${personId}`,
    personId,
    organizationId: school.id,
    startedAt: startsAt,
    initialStatus: inSession ? "active" : "expected",
    programKind: school.program,
    contextKind: SCHOOL_STAGE_CONTEXT[stage],
    provenance: { kind: "simulated-event", eventId: moveEventId },
  });
}

/**
 * A pupil who moves away leaves the school they attended, and the place
 * waiting for them in the fall, as transferred.
 *
 * The childhood record says whether the move landed in the middle of a school
 * year (`school-move-to-scores`, W-S29): a move with a `school-year-move`
 * entry citing it is marked on the study record as a mid-year transfer, with
 * the grade it interrupted; any other move is a change of school over the
 * summer. Enrolling at a school in the new place is not built yet.
 */
export function leaveSchoolOnMove(
  world: World,
  personId: EntityId,
  moveEventId: EntityId,
  date: IsoDate,
): World {
  const midYear = childhoodRecordEntries(world).find(
    (entry) =>
      entry.kind === "school-year-move" &&
      entry.personId === personId &&
      entry.sourceRecordId === moveEventId,
  );
  const reason =
    midYear?.kind === "school-year-move"
      ? `Moved away in the middle of the ${midYear.schoolYear}-${midYear.schoolYear + 1} school year, in ${gradeName(midYear.grade)}.`
      : "Moved away between school years.";
  let next = world;
  for (const enrollment of educationEnrollmentHistoryForPerson(
    world,
    personId,
  )) {
    if (!enrollment.programKind.startsWith("schooling:")) continue;
    const previous = educationEnrollmentStateAt(next, enrollment.id);
    if (previous?.status !== "active" && previous?.status !== "expected")
      continue;
    next = recordEducationEnrollmentState(next, {
      stableKey: `${enrollment.stableKey}:transferred:${moveEventId}`,
      enrollmentId: enrollment.id,
      effectiveAt: date,
      status: "transferred",
      contextKind: previous.contextKind,
      reason,
      provenance: { kind: "simulated-event", eventId: moveEventId },
      supersedesStateId: previous.id,
    });
  }
  return next;
}

function gradeName(grade: number): string {
  if (grade === 0) return "kindergarten";
  const suffix =
    grade === 1 ? "st" : grade === 2 ? "nd" : grade === 3 ? "rd" : "th";
  return `${grade}${suffix} grade`;
}

/** Whether a person attends a grade school today: an active enrollment. */
export function attendingSchool(world: World, personId: EntityId): boolean {
  return educationEnrollmentHistoryForPerson(world, personId).some(
    (enrollment) =>
      enrollment.programKind.startsWith("schooling:") &&
      educationEnrollmentStateAt(world, enrollment.id)?.status === "active",
  );
}
