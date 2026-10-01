import {
  healthCoverageRecords,
  coverageDecisionIsKnown,
  coverageDecisionsForSubjects,
  recordHealthCoverageForSubjects,
} from "../crisis/health-coverage";
import { readEligibilityLawsInForce } from "../enacted-eligibility";
import { lawEffectStamp } from "../law-effect-stamp";
import { householdMembershipsAt } from "../life-queries";
import { stateJurisdictionForKey } from "../life-places";
import type {
  LawConsequenceContext,
  LawConsequenceKindRegistration,
  LawConsequenceRow,
  ResolvedLawConsequence,
} from "../law-consequence-types";
import type { EntityId, IsoDate, World } from "../types";

import {
  COVERAGE_SELECTORS as SELECTORS,
  COVERAGE_ACTION as ACTION,
  COVERAGE_DECISION as DECISION,
  COVERAGE_PREDICATE as PREDICATE,
} from "./coverage-eligibility-rows";
export {
  COVERAGE_QUESTION_KEYS,
  COVERAGE_ELIGIBILITY_ROWS,
} from "./coverage-eligibility-rows";

function questionFor(row: LawConsequenceRow): string {
  const selector = row.who.selector;
  if (!(selector in SELECTORS))
    throw new Error(
      `Missing coverage-eligibility selector capability: ${selector}`,
    );
  return SELECTORS[selector as keyof typeof SELECTORS];
}

function checkRow(row: LawConsequenceRow): void {
  if (row.kind !== "coverage-eligibility" || row.what !== ACTION)
    throw new Error(
      `Missing coverage-eligibility action capability: ${row.what}`,
    );
  questionFor(row);
  if (
    row.amount ||
    row.decision?.op !== "record" ||
    row.decision.key !== DECISION ||
    row.decision.type !== "boolean"
  )
    throw new Error(
      `Missing coverage-eligibility boolean input capability: ${row.decision?.key ?? "amount"}`,
    );
  for (const predicate of [...row.who.predicates, ...row.conditions])
    if (
      predicate.capability !== PREDICATE ||
      Object.keys(predicate.parameters).length
    )
      throw new Error(
        `Missing coverage-eligibility predicate capability: ${predicate.capability}`,
      );
  if (row.lag.days !== 0)
    throw new Error("Missing coverage-eligibility delayed activity capability");
  if (row.onward?.length)
    throw new Error(
      "Missing coverage-eligibility clinical exposure capability",
    );
}

/** Resolve existing legal eligibility; no coverage, cost or exposure is guessed. */
export function resolveCoverageEligibility(
  world: World,
  row: LawConsequenceRow,
  context: LawConsequenceContext,
): readonly ResolvedLawConsequence[] {
  checkRow(row);
  if (row.when !== context.activity || context.onDate > world.currentDate)
    return [];
  const questionKey = questionFor(row);
  if (context.questionKey && context.questionKey !== questionKey) return [];
  const proposition = Object.values(
    world.policyCatalog?.propositions ?? {},
  ).find((entry) => entry.stableKey === questionKey);
  if (!proposition) return [];
  const prior = new Map(
    healthCoverageRecords(world).map((record) => [record.personId, record]),
  );
  const decisions = coverageDecisionsForSubjects(
    world,
    context.subjectIds,
    context.onDate,
  );
  const resolved: ResolvedLawConsequence[] = [];
  for (const personId of new Set(context.subjectIds)) {
    if (!world.people[personId]) continue;
    const membership = householdMembershipsAt(world, personId, {
      asOfDate: context.onDate,
      historySequenceExclusive: world.history.nextSequence,
    })[0];
    if (!membership) continue;
    const decision = decisions.get(personId);
    if (!decision || !coverageDecisionIsKnown(decision)) continue;
    const previous = prior.get(personId);
    if (decision.covered === (previous?.covered ?? false)) continue;
    if (
      !decision.covered &&
      !previous &&
      decision.reasonKey !== "lost:work-requirement"
    )
      continue;
    const governingQuestion =
      decision.reasonKey === "lost:work-requirement" ||
      (decision.covered && previous?.reasonKey === "lost:work-requirement")
        ? SELECTORS["medicaid-work-rule-person"]
        : SELECTORS["medicaid-expansion-person"];
    if (governingQuestion !== questionKey || !decision.stateKey) continue;
    const state = stateJurisdictionForKey(decision.stateKey);
    if (!state) continue;
    const law = readEligibilityLawsInForce(
      world,
      state.id,
      [questionKey],
      context.onDate,
    ).get(questionKey);
    if (!law) continue;
    const sourceRecordIds = [
      context.activityId,
      membership.membership.id,
      ...(previous ? [previous.id] : []),
    ];
    const stamp = lawEffectStamp(law, {
      effectKind: "health-coverage",
      questionKey,
      jurisdictionId: state.id,
      appliedAt: context.onDate,
      sourceRecordIds,
    });
    if (
      !stamp ||
      (context.governingLawId && context.governingLawId !== law.measureId)
    )
      continue;
    resolved.push({
      row,
      law,
      questionKey,
      jurisdictionId: state.id,
      subject: { kind: "person", id: personId },
      activityId: context.activityId,
      effectiveAt: context.onDate,
      sourceRecordIds,
      value: { type: "boolean", value: decision.covered },
    });
  }
  return resolved;
}

/** Single saved-record writer used by the legacy pass and generic application. */
export function settleCoverageEligibilitySubjects(
  world: World,
  onDate: IsoDate,
  causeId: EntityId,
  subjectIds: readonly EntityId[],
  sourceRecordIds: readonly EntityId[] = [],
): World {
  return recordHealthCoverageForSubjects(
    world,
    onDate,
    causeId,
    subjectIds,
    sourceRecordIds,
  );
}

export function applyCoverageEligibility(
  world: World,
  resolved: ResolvedLawConsequence,
): World {
  if (resolved.subject.kind !== "person" || resolved.value.type !== "boolean")
    return world;
  const current = resolveCoverageEligibility(world, resolved.row, {
    onDate: resolved.effectiveAt,
    activity: resolved.row.when,
    activityId: resolved.activityId,
    subjectIds: [resolved.subject.id],
  }).find((entry) => entry.subject.id === resolved.subject.id);
  // A resolved input can be stale after a law amendment or another writer.
  if (
    !current ||
    current.questionKey !== resolved.questionKey ||
    current.jurisdictionId !== resolved.jurisdictionId ||
    current.law.measureId !== resolved.law.measureId ||
    current.law.origin !== resolved.law.origin ||
    current.law.answer !== resolved.law.answer ||
    current.law.operativeAt !== resolved.law.operativeAt ||
    current.value.type !== "boolean" ||
    current.value.value !== resolved.value.value
  )
    return world;
  return settleCoverageEligibilitySubjects(
    world,
    resolved.effectiveAt,
    resolved.activityId,
    [resolved.subject.id],
    current.sourceRecordIds,
  );
}

/** Coordinator appends this sole kind export to the shared registry. */
export const COVERAGE_ELIGIBILITY_REGISTRATION: LawConsequenceKindRegistration =
  {
    kind: "coverage-eligibility",
    owner: "team-8",
    selectors: Object.keys(SELECTORS),
    actions: [ACTION],
    predicates: [PREDICATE],
    units: [],
    resolve: resolveCoverageEligibility,
    apply: applyCoverageEligibility,
  };
