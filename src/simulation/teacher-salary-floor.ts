/** A public teacher's annual floor comes from the operative law's saved terms. */

import { addDays, makeIsoDate, yearOf } from "./dates";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import type { EntityId, IsoDate, World } from "./types";
import {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import { resourceFlowTermsAt } from "./resource-queries";
import {
  lifePlaceByJurisdictionId,
  stateKeyForJurisdiction,
} from "./life-places";
import { principledLeaning } from "./governing/officeholder-principles";
import { recordFiledProvision } from "./legislative-politics";
import { recordWorldEvent } from "./world";
import { periodsPerYear } from "./law-effects-noticed";

function stateOf(world: World, jurisdictionId: EntityId | null) {
  if (!jurisdictionId) return null;
  const jurisdiction = world.jurisdictions[jurisdictionId];
  return (
    (jurisdiction ? stateKeyForJurisdiction(jurisdiction) : null) ??
    lifePlaceByJurisdictionId(jurisdictionId)?.stateJurisdictionKey ??
    null
  );
}

/** The state's median annual pay from its actual public-teacher agreements. */
export function recordedTeacherSalaryMedian(
  world: World,
  jurisdictionId: EntityId,
) {
  const state = stateOf(world, jurisdictionId);
  if (!state) return null;
  const work = new Map(
    world.history.workRelationships.map((row) => [row.id, row]),
  );
  const salaries: { minor: number; sourceRecordIds: EntityId[] }[] = [];
  for (const flow of world.history.resourceFlows) {
    if (
      flow.startsAt > world.currentDate ||
      flow.recordedAt > world.currentDate ||
      flow.sequence >= world.history.nextSequence ||
      flow.basisReference.kind !== "work" ||
      flow.source.kind !== "organization"
    )
      continue;
    const relationship = work.get(flow.basisReference.workRelationshipId);
    if (
      !relationship ||
      relationship.organizationId !== flow.source.organizationId ||
      relationship.startedAt > world.currentDate ||
      relationship.recordedAt > world.currentDate
    )
      continue;
    const status = workStatusAt(world, relationship.id);
    const role = workRoleAt(world, relationship.id);
    const profile = organizationProfileAt(world, flow.source.organizationId);
    const terms = resourceFlowTermsAt(world, flow.id);
    if (
      status?.status !== "active" ||
      role?.occupationClassification !== TEACHER_FLOOR_OCCUPATION ||
      profile?.classification !== TEACHER_FLOOR_EMPLOYER ||
      stateOf(world, role.locationJurisdictionId) !== state ||
      terms?.status !== "active" ||
      terms.amount.currency !== "USD" ||
      terms.amount.minorUnits <= 0
    )
      continue;
    const cadence =
      /^schedule:town-(weekly|biweekly|semimonthly|monthly)(?:-\d)?$/.exec(
        terms.cadenceKind,
      );
    if (!cadence) continue;
    const periods = periodsPerYear(terms.cadenceKind);
    const hours =
      (role.timeDemand.expectedWeekly.minimumHours +
        role.timeDemand.expectedWeekly.maximumHours) /
      2;
    if (!Number.isFinite(hours) || !(hours > 0) || periods === null) continue;
    const minor = Math.round(terms.amount.minorUnits * periods);
    if (!Number.isSafeInteger(minor)) continue;
    salaries.push({
      minor,
      sourceRecordIds: [
        relationship.id,
        status.id,
        role.id,
        flow.id,
        terms.id,
        profile.id,
      ],
    });
  }
  if (!salaries.length) return null;
  salaries.sort((a, b) => a.minor - b.minor);
  const middle = Math.floor(salaries.length / 2);
  const minor =
    salaries.length % 2
      ? salaries[middle]!.minor
      : Math.round((salaries[middle - 1]!.minor + salaries[middle]!.minor) / 2);
  return {
    minor,
    teacherCount: salaries.length,
    sourceRecordIds: [
      ...new Set(salaries.flatMap((row) => row.sourceRecordIds)),
    ],
  };
}

/** A supporting sponsor writes a floor from actual state pay, with no prior-floor prerequisite. */
export function requestedTeacherSalaryFloor(
  world: World,
  jurisdictionId: EntityId,
  sponsorPersonId: EntityId,
) {
  const proposition = teacherFloorProposition(world);
  if (!proposition) return null;
  const leaning = principledLeaning(world, sponsorPersonId, proposition);
  if (leaning.score <= 0 || !leaning.recordIds.length) return null;
  const salary = recordedTeacherSalaryMedian(world, jurisdictionId);
  if (!salary) return null;
  const current = teacherSalaryFloorAt(
    world,
    jurisdictionId,
    world.currentDate,
    null,
  );
  if (current && salary.minor <= current.annual * 100) return null;
  return {
    ...salary,
    score: leaning.score,
    principleRecordIds: leaning.recordIds,
  };
}

export function recordTeacherSponsorFloor(
  world: World,
  measureId: EntityId,
): World {
  const measure = world.history.legislativeMeasures?.find(
    (row) => row.id === measureId,
  );
  const proposition = teacherFloorProposition(world);
  if (
    !measure?.sponsorPersonId ||
    !proposition ||
    !measure.propositionAnswers?.some(
      (row) => row.propositionId === proposition && row.answer === "yes",
    )
  )
    return world;
  const stableKey = `${measure.stableKey}:requested-teacher-floor`;
  if (
    world.history.legislativeProvisions?.some(
      (row) => row.stableKey === stableKey,
    )
  )
    return world;
  const requested = requestedTeacherSalaryFloor(
    world,
    measure.jurisdictionId,
    measure.sponsorPersonId,
  );
  if (!requested) return world;
  const heading = world.policyCatalog.propositions[proposition]!.name;
  const next = recordFiledProvision(world, {
    stableKey,
    measureId,
    provisionKey: "teacher-salary-floor",
    sectionNumber: 1,
    heading,
    text: `The minimum annual salary for a full-time public school teacher is $${(requested.minor / 100).toLocaleString("en-US")}.`,
    beneficiary: {
      kind: "general-application",
      appliesToLabel: "Public school teachers",
    },
    applicationScope: {
      jurisdictionId: measure.jurisdictionId,
      segmentKey: null,
    },
    lawTerms: [
      {
        questionKey: TEACHER_SALARY_FLOOR_QUESTION,
        key: "floor",
        value: requested.minor,
        unit: "minor",
      },
    ],
  });
  return recordWorldEvent(next, {
    stableKey: `${stableKey}:requested-term-reason`,
    type: "legislation.sponsor-requested-term",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: measure.jurisdictionId,
    involvedEntityIds: [measure.id, measure.sponsorPersonId],
    participants: [
      {
        personId: measure.sponsorPersonId,
        role: "agency:sponsor",
        detail:
          "Requested the recorded median public-teacher salary from saved pay and principles.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [...requested.sourceRecordIds, ...requested.principleRecordIds]
      .map((id) => `source-record:${id}`)
      .concat(`term:floor`, `principle-score:${requested.score}`),
    summary: `${measure.designation}'s sponsor requested ${heading} from the state's recorded public-teacher pay.`,
    context: {
      location: {
        jurisdictionId: measure.jurisdictionId,
        label: world.jurisdictions[measure.jurisdictionId]!.name,
        setting: null,
      },
      socialContext: measure.designation,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export const TEACHER_SALARY_FLOOR_QUESTION =
  "us-policy-positions:education.raise-teacher-minimum-salary";

/** The occupation and employer a state teacher salary floor covers. */
export const TEACHER_FLOOR_OCCUPATION = "profession:teacher";
export const TEACHER_FLOOR_EMPLOYER = "service:school";

/**
 * HARDWIRED: a floor first applies in the school year that begins on or after
 * the law takes effect, on July 1. Arkansas's, Iowa's, Maine's, Missouri's
 * and New Mexico's floors each began with a school year or the fiscal year
 * starting July 1 (the starting-law rows' citations).
 */
const SCHOOL_YEAR_STARTS = "07-01";

/** The first July 1 on or after `date`. */
export function schoolYearStartOnOrAfter(date: IsoDate): IsoDate {
  const sameYear = makeIsoDate(`${yearOf(date)}-${SCHOOL_YEAR_STARTS}`);
  return sameYear >= date
    ? sameYear
    : makeIsoDate(`${yearOf(date) + 1}-${SCHOOL_YEAR_STARTS}`);
}

export interface TeacherSalaryFloor {
  /** Dollars a year. */
  readonly annual: number;
  /** The enacted measure that set it. */
  readonly measureId: EntityId;
  /** The first day the floor applies: a school year's first day. */
  readonly from: IsoDate;
}

/**
 * The minimum teacher salary in force where the job is on `onDate`, in
 * dollars a year. The numeric floor is annual USD minor units in the
 * adopted `floor` term, independent of wage surveys. Missing terms supply
 * no floor. The unused median argument is retained for existing callers.
 */
export function teacherSalaryFloorAt(
  world: World,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
  _stateMedian: number | null,
): TeacherSalaryFloor | null {
  if (!jurisdictionId) return null;
  const proposition = teacherFloorProposition(world);
  if (!proposition) return null;
  // The law in force on the first day of the school year `onDate` falls in.
  const law = lawInForce(world, jurisdictionId, proposition, onDate);
  if (!law || law.answer !== "yes") return null;
  const from =
    law.origin === "in-force-at-start"
      ? law.operativeAt
      : schoolYearStartOnOrAfter(law.operativeAt);
  if (from > onDate) {
    // Enacted but its school year has not begun: the floor before it, if an
    // earlier law set one, still governs.
    const before = addDays(law.operativeAt, -1);
    return before < onDate
      ? teacherSalaryFloorAt(world, jurisdictionId, before, _stateMedian)
      : null;
  }
  const term = readFinalEnactedLawTerm(world, law, {
    questionKey: TEACHER_SALARY_FLOOR_QUESTION,
    termKey: "floor",
    unit: "minor",
    onDate,
  });
  if (!term || !Number.isSafeInteger(term.value) || term.value <= 0)
    return null;
  return { annual: term.value / 100, measureId: law.measureId, from };
}

const propositionIds = new WeakMap<object, EntityId | null>();

function teacherFloorProposition(world: World): EntityId | null {
  const catalog = world.policyCatalog;
  if (!catalog) return null;
  const cached = propositionIds.get(catalog);
  if (cached !== undefined) return cached;
  const found =
    catalog.propositionOrder.find(
      (id) =>
        catalog.propositions[id]?.stableKey === TEACHER_SALARY_FLOOR_QUESTION,
    ) ?? null;
  propositionIds.set(catalog, found);
  return found;
}

/**
 * Whether a saved starting or enacted law could set a floor. The law itself
 * is read through `lawInForce`, including amendments and riders.
 */
export function anyTeacherFloorLawEnacted(world: World): boolean {
  return teacherFloorProposition(world) !== null;
}
