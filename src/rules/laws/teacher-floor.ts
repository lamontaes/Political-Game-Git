import type { EntityId, IsoDate, World } from "../../simulation/types";
import type {
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "../../simulation/life-queries";
import type { resourceFlowTermsAt } from "../../simulation/resource-queries";
import type { readFinalEnactedLawTerm as NativeTerm } from "../../simulation/governing/final-law-term-query";
import { lawInForce, type LawFacts } from "./dated-law";
import { finalTermReceiptKey } from "./tax-law-schedules";
import {
  principledLeaning,
  type PrincipledLeaningFacts,
} from "../legislatures/principled-leaning";
import { schoolYearStartOnOrAfter } from "./school-year-date";
import { periodsPerYear } from "./work-cadence";
import { addDays as advanceDays } from "../elections/calendar";
function addDays(date: IsoDate, days: number) {
  return advanceDays(date, days) as IsoDate;
}
export interface TeacherFacts extends LawFacts {
  readonly workRelationships: World["history"]["workRelationships"];
  readonly flows: World["history"]["resourceFlows"];
  readonly statuses: ReadonlyMap<EntityId, ReturnType<typeof workStatusAt>>;
  readonly roles: ReadonlyMap<EntityId, ReturnType<typeof workRoleAt>>;
  readonly profiles: ReadonlyMap<
    EntityId,
    ReturnType<typeof organizationProfileAt>
  >;
  readonly flowTerms: ReadonlyMap<
    EntityId,
    ReturnType<typeof resourceFlowTermsAt>
  >;
  readonly jurisdictionStateKeys: ReadonlyMap<EntityId, string>;
  readonly leanings: PrincipledLeaningFacts;
  readonly finalTerms: ReadonlyMap<string, ReturnType<typeof NativeTerm>>;
}
function stateOf(facts: TeacherFacts, id: EntityId | null) {
  return id ? (facts.jurisdictionStateKeys.get(id) ?? null) : null;
}
function teacherFloorProposition(facts: TeacherFacts) {
  return (
    facts.policyCatalog.propositionOrder.find(
      (id) =>
        facts.policyCatalog.propositions[id]?.stableKey ===
        TEACHER_SALARY_FLOOR_QUESTION,
    ) ?? null
  );
}
function readFinalEnactedLawTerm(
  facts: TeacherFacts,
  law: Parameters<typeof NativeTerm>[1],
  query: Parameters<typeof NativeTerm>[2],
) {
  return (
    facts.finalTerms.get(finalTermReceiptKey(law.measureId, query)) ?? null
  );
}
// stopgapId: "laws.teacher-median-flow-count"
export function recordedTeacherSalaryMedian(
  facts: TeacherFacts,
  jurisdictionId: EntityId,
) {
  const state = stateOf(facts, jurisdictionId);
  if (!state) return null;
  const work = new Map(facts.workRelationships.map((row) => [row.id, row]));
  const salaries: {
    minor: number;
    sourceRecordIds: EntityId[];
  }[] = [];
  for (const flow of facts.flows) {
    if (
      flow.startsAt > facts.onDate ||
      flow.recordedAt > facts.onDate ||
      flow.sequence >= facts.nextSequence ||
      flow.basisReference.kind !== "work" ||
      flow.source.kind !== "organization"
    )
      continue;
    const relationship = work.get(flow.basisReference.workRelationshipId);
    if (
      !relationship ||
      relationship.organizationId !== flow.source.organizationId ||
      relationship.startedAt > facts.onDate ||
      relationship.recordedAt > facts.onDate
    )
      continue;
    const status = facts.statuses.get(relationship.id);
    const role = facts.roles.get(relationship.id);
    const profile = facts.profiles.get(flow.source.organizationId);
    const terms = facts.flowTerms.get(flow.id);
    if (
      status?.status !== "active" ||
      role?.occupationClassification !== TEACHER_FLOOR_OCCUPATION ||
      profile?.classification !== TEACHER_FLOOR_EMPLOYER ||
      stateOf(facts, role.locationJurisdictionId) !== state ||
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

export function requestedTeacherSalaryFloor(
  facts: TeacherFacts,
  jurisdictionId: EntityId,
  sponsorPersonId: EntityId,
) {
  const proposition = teacherFloorProposition(facts);
  if (!proposition) return null;
  const leaning = principledLeaning(
    facts.leanings,
    sponsorPersonId,
    proposition,
  );
  if (leaning.score <= 0 || !leaning.recordIds.length) return null;
  const salary = recordedTeacherSalaryMedian(facts, jurisdictionId);
  if (!salary) return null;
  const current = teacherSalaryFloorAt(
    facts,
    jurisdictionId,
    facts.onDate,
    null,
  );
  if (current && salary.minor <= current.annual * 100) return null;
  return {
    ...salary,
    score: leaning.score,
    principleRecordIds: leaning.recordIds,
  };
}

export const TEACHER_SALARY_FLOOR_QUESTION =
  "us-policy-positions:education.raise-teacher-minimum-salary";

export const TEACHER_FLOOR_OCCUPATION = "profession:teacher";

export const TEACHER_FLOOR_EMPLOYER = "service:school";

export interface TeacherSalaryFloor {
  readonly annual: number;
  readonly measureId: EntityId;
  readonly from: IsoDate;
}

export function teacherSalaryFloorAt(
  facts: TeacherFacts,
  jurisdictionId: EntityId | null,
  onDate: IsoDate,
  _stateMedian: number | null,
): TeacherSalaryFloor | null {
  if (!jurisdictionId) return null;
  const proposition = teacherFloorProposition(facts);
  if (!proposition) return null;
  const law = lawInForce(facts, jurisdictionId, proposition, onDate);
  if (!law || law.answer !== "yes") return null;
  const from =
    law.origin === "in-force-at-start"
      ? law.operativeAt
      : (schoolYearStartOnOrAfter(law.operativeAt) as IsoDate);
  if (from > onDate) {
    const before = addDays(law.operativeAt, -1);
    return before < onDate
      ? teacherSalaryFloorAt(facts, jurisdictionId, before, _stateMedian)
      : null;
  }
  const term = readFinalEnactedLawTerm(facts, law, {
    questionKey: TEACHER_SALARY_FLOOR_QUESTION,
    termKey: "floor",
    unit: "minor",
    onDate,
  });
  if (!term || !Number.isSafeInteger(term.value) || term.value <= 0)
    return null;
  return { annual: term.value / 100, measureId: law.measureId, from };
}
