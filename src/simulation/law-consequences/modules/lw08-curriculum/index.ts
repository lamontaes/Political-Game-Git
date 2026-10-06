import {
  educationEnrollmentStateAt,
  organizationProfileAt,
} from "../../../life-queries";
import { lifePlaces, stateJurisdictionForKey } from "../../../life-places";
import { stateKeyForJurisdiction } from "../../../state-jurisdiction-id";
import { lawInForce } from "../../../governing/law-in-force";
import { readFinalEnactedLawCategories } from "../../../governing/final-law-term-query";
import { createStableId } from "../../../ids";
import { lawEffectStamp } from "../../../law-effect-stamp";
import type {
  AnyLawConsequenceKindRegistration,
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedAnyLawConsequence,
  ResolvedLawConsequence,
} from "../../../law-consequence-types";
import type { EntityId, IsoDate, World } from "../../../types";
import {
  CURRICULUM_STANDARDS_QUESTION,
  CURRICULUM_STANDARDS_ROW,
} from "./data";

export interface LawCurriculumApplicationRecord {
  readonly id: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly effectiveAt: IsoDate;
  readonly measureId: EntityId;
  readonly questionKey: string;
  readonly personId: EntityId;
  readonly enrollmentId: EntityId;
  readonly schoolOrganizationId: EntityId;
  readonly coverageCategories: readonly string[];
  readonly sourceRecordIds: readonly EntityId[];
  readonly lawEffectStamp: NonNullable<ReturnType<typeof lawEffectStamp>>;
}

declare module "../../../types" {
  interface HistoryStore {
    readonly lawCurriculumApplications?: readonly LawCurriculumApplicationRecord[];
  }
}

export function lawCurriculumApplications(
  world: World,
): readonly LawCurriculumApplicationRecord[] {
  return world.history.lawCurriculumApplications ?? [];
}

/** Category identity is exact; this does not invent a grade/subject mapping. */
export function curriculumCategoryCoversProgram(
  coverageCategories: readonly string[],
  programKind: string,
): boolean {
  if (!programKind.startsWith("schooling:")) return false;
  const stage = programKind.slice("schooling:".length);
  return (
    coverageCategories.includes(programKind) ||
    coverageCategories.includes(stage)
  );
}

function propositionForRow(world: World, row: LawConsequenceRow) {
  return world.policyCatalog.propositionOrder
    .map((id) => world.policyCatalog.propositions[id]!)
    .find(
      (proposition) =>
        proposition.stableKey === CURRICULUM_STANDARDS_QUESTION &&
        proposition.consequences?.some(
          (candidate) => JSON.stringify(candidate) === JSON.stringify(row),
        ),
    );
}

function schoolStateKey(world: World, locationJurisdictionId: EntityId) {
  return (
    lifePlaces().find(
      (candidate) =>
        candidate.context.jurisdiction.id === locationJurisdictionId,
    )?.stateJurisdictionKey ?? null
  );
}

export function resolveLawCurriculumApplications(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  if (
    row.kind !== "curriculum-application" ||
    row.who.selector !== "recorded-active-school-enrollment" ||
    row.what !== "record-curriculum-application" ||
    row.decision?.op !== "term" ||
    row.decision.key !== "law-answer" ||
    row.decision.type !== "boolean" ||
    row.amount ||
    row.when !== "effective"
  )
    throw new Error("Unsupported curriculum-application row");
  if (row.id !== CURRICULUM_STANDARDS_ROW.id)
    throw new Error("Unsupported curriculum-application row id");
  if (context.activity !== "effective" || context.onDate !== world.currentDate)
    return [];
  const proposition = propositionForRow(world, row);
  if (
    !proposition ||
    (context.questionKey && context.questionKey !== proposition.stableKey)
  )
    return [];
  const enactment = (world.history.legislativeEnactments ?? []).find(
    (entry) =>
      entry.id === context.activityId &&
      entry.outcome === "enacted" &&
      (!context.governingLawId || entry.measureId === context.governingLawId),
  );
  const measure = enactment
    ? (world.history.legislativeMeasures ?? []).find(
        (entry) => entry.id === enactment.measureId,
      )
    : null;
  if (!enactment || !measure) return [];
  const law = lawInForce(
    world,
    measure.jurisdictionId,
    proposition.id,
    context.onDate,
  );
  if (
    !law ||
    law.answer !== "yes" ||
    law.origin !== "enacted" ||
    law.measureId !== measure.id ||
    enactment.effectiveAt !== law.operativeAt
  )
    return [];
  const coverage = readFinalEnactedLawCategories(world, law, {
    questionKey: proposition.stableKey,
    termKey: "coverage",
    onDate: context.onDate,
  });
  if (!coverage?.values.length) return [];
  const governingJurisdiction = world.jurisdictions[measure.jurisdictionId];
  const governingStateKey = governingJurisdiction
    ? stateKeyForJurisdiction(governingJurisdiction)
    : null;
  if (!governingStateKey) return [];

  return world.history.educationEnrollments.flatMap((enrollment) => {
    if (
      !curriculumCategoryCoversProgram(
        coverage.values,
        enrollment.programKind,
      ) ||
      enrollment.startedAt > context.onDate ||
      (context.subjectIds.length &&
        !context.subjectIds.includes(enrollment.personId))
    )
      return [];
    const state = educationEnrollmentStateAt(world, enrollment.id, {
      asOfDate: context.onDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (state?.status !== "active") return [];
    const profile = organizationProfileAt(world, enrollment.organizationId, {
      asOfDate: context.onDate,
      historySequenceExclusive: world.history.nextSequence,
    });
    if (
      !profile ||
      !profile.locationJurisdictionId ||
      !["service:school", "sector:education"].includes(
        profile.classification,
      ) ||
      schoolStateKey(world, profile.locationJurisdictionId) !==
        governingStateKey
    )
      return [];
    const schoolLocationId = profile.locationJurisdictionId;
    const locationRecord = world.jurisdictions[schoolLocationId];
    const stateId = stateJurisdictionForKey(governingStateKey)?.id;
    if (!locationRecord || !stateId) return [];
    const sourceRecordIds = [
      ...new Set([
        law.measureId,
        ...coverage.sourceRecordIds,
        enrollment.id,
        state.id,
        enrollment.organizationId,
        profile.id,
        schoolLocationId,
        stateId,
      ]),
    ];
    return [
      {
        row,
        law,
        questionKey: proposition.stableKey,
        jurisdictionId: measure.jurisdictionId,
        subject: { kind: "person" as const, id: enrollment.personId },
        activityId: enactment.id,
        effectiveAt: context.onDate,
        sourceRecordIds,
        value: {
          type: "decision" as const,
          value: JSON.stringify({
            enrollmentId: enrollment.id,
            schoolOrganizationId: enrollment.organizationId,
            coverageCategories: coverage.values,
          }),
        },
      },
    ];
  });
}

export function applyLawCurriculumApplication(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  const candidates = resolveLawCurriculumApplications(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: "effective",
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
    governingLawId: resolved.law.measureId,
    questionKey: resolved.questionKey,
  });
  const current = candidates.find(
    (candidate) => JSON.stringify(candidate) === JSON.stringify(resolved),
  );
  if (!current || current.value.type !== "decision")
    throw new Error("Curriculum-application input is stale or unverified");
  const detail = JSON.parse(current.value.value) as {
    enrollmentId: EntityId;
    schoolOrganizationId: EntityId;
    coverageCategories: string[];
  };
  return appendLawCurriculumApplication(world, current, detail);
}

export function appendLawCurriculumApplication(
  world: World,
  current: ResolvedLawConsequence,
  detail: {
    enrollmentId: EntityId;
    schoolOrganizationId: EntityId;
    coverageCategories: readonly string[];
  },
): World {
  const stableKey = `${current.row.id}:${current.law.measureId}:${current.subject.id}:${detail.enrollmentId}:${current.effectiveAt}`;
  const previous = lawCurriculumApplications(world);
  if (previous.some((entry) => entry.stableKey === stableKey)) return world;
  const stamp = lawEffectStamp(current.law, {
    effectKind: "curriculum-application",
    questionKey: current.questionKey,
    jurisdictionId: current.jurisdictionId,
    appliedAt: current.effectiveAt,
    sourceRecordIds: current.sourceRecordIds,
  });
  if (!stamp)
    throw new Error("Curriculum application cannot stamp an unsupported law");
  const record: LawCurriculumApplicationRecord = {
    id: createStableId("law-exposure", stableKey),
    stableKey,
    sequence: world.history.nextSequence,
    effectiveAt: current.effectiveAt,
    measureId: current.law.measureId,
    questionKey: current.questionKey,
    personId: current.subject.id,
    enrollmentId: detail.enrollmentId,
    schoolOrganizationId: detail.schoolOrganizationId,
    coverageCategories: [...detail.coverageCategories],
    sourceRecordIds: [...current.sourceRecordIds],
    lawEffectStamp: stamp,
  };
  return {
    ...world,
    history: {
      ...world.history,
      lawCurriculumApplications: [...previous, record],
      nextSequence: world.history.nextSequence + 1,
    },
  };
}

const CURRICULUM_APPLICATION_REGISTRATION: LawConsequenceKindRegistration<ResolvedAnyLawConsequence> =
  {
    kind: "curriculum-application",
    owner: "lw08-curriculum",
    selectors: ["recorded-active-school-enrollment"],
    actions: ["record-curriculum-application"],
    predicates: ["curriculum-coverage-category"],
    units: [],
    resolve: resolveLawCurriculumApplications,
    apply: applyLawCurriculumApplication,
  };

export const lawConsequenceLw08CurriculumRegistrations: readonly AnyLawConsequenceKindRegistration[] =
  [CURRICULUM_APPLICATION_REGISTRATION];

export { CURRICULUM_STANDARDS_ROW };
