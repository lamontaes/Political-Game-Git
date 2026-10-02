import { assessedCompletedHourlyGrossMinor } from "./completed-hourly-gross";
import { makeIsoDate, simulationMinutesBetween } from "./dates";
import { recordById, recordsWithFieldValue } from "./history-index";
import { createStableId } from "./ids";
import { resourceFlowTermsAt } from "./resource-queries";
import { workRoleAt, workStatusAt } from "./life-queries";
import { isLawEffectStamp, lawEffectStamp } from "./law-effect-stamp";
import { lawInForce } from "./governing/law-in-force";
import type { LawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import { evaluateLawAmount, type LawAmount } from "./law-consequence-amount";
import type { LawAmountExpression } from "./law-consequence-types";
import { enactedRuleChangeAt, laborLawOfficeKey } from "./enacted-rule-changes";
import { stateMinimumSettingAt } from "./minimum-wage";
import {
  matchPayCoveragePredicates,
  payWorkplaceAt,
  payPayerAt,
} from "./pay-coverage-predicates";
import { workPayCoverageAt } from "./pay-coverage-query";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
  stateKeyForJurisdiction,
} from "./life-places";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  CITY_MINIMUM_WAGE_QUESTION_KEY,
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  STATE_MINIMUM_WAGE_QUESTION_KEY,
  MINIMUM_WAGE_PAY_ROWS,
  NON_ELECTIVE_PAY_PREDICATE,
  PAY_ACTION,
  PAY_SELECTOR,
} from "./law-consequences/pay-rows";
import type {
  EarnedLawPayAssessmentRecord,
  EntityId,
  MoneyAmount,
  World,
} from "./types";

function sameMoney(left: MoneyAmount, right: MoneyAmount): boolean {
  return (
    left.currency === right.currency && left.minorUnits === right.minorUnits
  );
}

/** Independently validates immutable saved work. No writer or resource import. */
export function validateEarnedLawPayAssessment(
  world: World,
  assessment: EarnedLawPayAssessmentRecord,
): void {
  const fail = (detail: string): never => {
    throw new Error(
      `Invalid earned law pay assessment (${detail}): ${assessment.id}`,
    );
  };
  const h = world.history;
  const completion = recordById(h.events, assessment.completionEventId);
  const work = recordById(h.workRelationships, assessment.workRelationshipId);
  const flow = recordById(h.resourceFlows, assessment.resourceFlowId);
  const activity = recordById(
    h.scheduledActivities,
    assessment.scheduledActivityId,
  );
  const state = recordById(
    h.scheduledActivityStates,
    assessment.scheduledActivityStateId,
  );
  if (!completion || !work || !flow || !activity || !state)
    fail("saved completion references");
  if (
    !Number.isSafeInteger(assessment.sequence) ||
    assessment.sequence < 0 ||
    assessment.sequence >= h.nextSequence ||
    !assessment.stableKey.trim() ||
    makeIsoDate(assessment.recordedAt) > world.currentDate ||
    assessment.recordedAt < completion!.occurredAt ||
    completion!.sequence >= assessment.sequence ||
    completion!.type !== "life-paths2.work-session" ||
    assessment.periodStartsAt !== completion!.occurredAt ||
    assessment.periodEndsAt !== completion!.occurredAt ||
    assessment.earnedCutoff.asOfDate !== completion!.occurredAt ||
    assessment.earnedCutoff.historySequenceExclusive !==
      completion!.sequence + 1
  )
    fail("earned frontier and chronology");
  if (
    !world.people[assessment.personId] ||
    work!.personId !== assessment.personId ||
    work!.organizationId !== assessment.organizationId ||
    flow!.source.kind !== "organization" ||
    flow!.source.organizationId !==
      payPayerAt(world, work!.id, assessment.earnedCutoff) ||
    flow!.recipient.kind !== "person" ||
    flow!.recipient.personId !== assessment.personId ||
    flow!.basisReference.kind !== "work" ||
    flow!.basisReference.workRelationshipId !== work!.id ||
    work!.sequence >= completion!.sequence ||
    flow!.sequence >= completion!.sequence ||
    work!.startedAt > completion!.occurredAt ||
    flow!.startsAt > completion!.occurredAt ||
    !completion!.involvedEntityIds.includes(work!.id) ||
    !completion!.involvedEntityIds.includes(assessment.personId) ||
    !completion!.involvedEntityIds.includes(activity!.id) ||
    activity!.sequence >= completion!.sequence ||
    !activity!.sourceEntityIds.includes(work!.id) ||
    !activity!.participantPersonIds.includes(assessment.personId) ||
    state!.activityId !== activity!.id ||
    state!.status !== "completed" ||
    state!.sequence >= assessment.earnedCutoff.historySequenceExclusive ||
    state!.recordedAt.date > assessment.recordedAt
  )
    fail("worker employer flow and performed activity");
  const savedActivities = completion!.involvedEntityIds.flatMap(
    (id) => recordById(h.scheduledActivities, id) ?? [],
  );
  const latest = recordsWithFieldValue(
    h.scheduledActivityStates,
    "activityId",
    activity!.id,
  )
    .filter(
      (row) => row.sequence < assessment.earnedCutoff.historySequenceExclusive,
    )
    .at(-1);
  if (
    savedActivities.length !== 1 ||
    latest?.id !== state!.id ||
    simulationMinutesBetween(state!.start, state!.end) !==
      assessment.workedMinutes
  )
    fail("actual completed interval");
  const terms = resourceFlowTermsAt(world, flow!.id, assessment.earnedCutoff);
  if (
    !terms ||
    terms.id !== assessment.earnedTermsId ||
    terms.status !== "active" ||
    terms.cadenceKind !== "work:completed-shift" ||
    !sameMoney(terms.amount, assessment.contractualGross) ||
    workStatusAt(world, work!.id, assessment.earnedCutoff)?.status !==
      "active" ||
    !workRoleAt(world, work!.id, assessment.earnedCutoff)
  )
    fail("immutable earned terms and active work");
  const resolved = assessment.resolvedConsequence;
  if (
    resolved.personId !== assessment.personId ||
    resolved.workId !== work!.id ||
    resolved.payFlowId !== flow!.id ||
    (resolved.activityId !== work!.id && resolved.activityId !== flow!.id) ||
    resolved.completedShift?.eventId !== completion!.id ||
    resolved.completedShift?.termsId !== terms!.id ||
    resolved.effectiveAt !== completion!.occurredAt ||
    resolved.amount.unit !== "minor/hour" ||
    resolved.amount.currency !== "USD" ||
    assessment.contractualGross.currency !== "USD" ||
    !Number.isSafeInteger(resolved.amount.value) ||
    resolved.amount.value < 0
  )
    fail("resolved completion joins");
  if (
    !sameMoney(assessment.assessedGross, {
      currency: assessment.contractualGross.currency,
      minorUnits: assessedCompletedHourlyGrossMinor(
        resolved.amount.value,
        assessment.workedMinutes,
        assessment.contractualGross.minorUnits,
      ),
    })
  )
    fail("assessed gross");
  validateEarnedLawPayAuthority(world, assessment);
}

function validateEarnedLawPayAuthority(
  world: World,
  assessment: EarnedLawPayAssessmentRecord,
): void {
  const resolved = assessment.resolvedConsequence;
  const cutoff = assessment.earnedCutoff;
  const fail = (detail: string): never => {
    throw new Error(
      `Invalid earned law pay authority (${detail}): ${assessment.id}`,
    );
  };
  const work = recordById(
    world.history.workRelationships,
    assessment.workRelationshipId,
  )!;
  const role = workRoleAt(world, work.id, cutoff)!;
  const workplace = payWorkplaceAt(world, work.id, cutoff);
  const coverage = workPayCoverageAt(world, work.id, cutoff);
  let governing: Pick<LawInForce, "measureId" | "origin" | "operativeAt">;
  let legalSources: EntityId[] = [];
  let factSources: readonly EntityId[] = [];
  if (resolved.action === "raise-hourly-floor") {
    const question = Object.values(world.policyCatalog.propositions).find(
      (p) => p.stableKey === resolved.questionKey,
    );
    const row = question?.consequences?.find((r) => r.id === resolved.rowId);
    if (
      !question ||
      !row ||
      row.kind !== "pay" ||
      row.what !== PAY_ACTION ||
      row.who.selector !== PAY_SELECTOR ||
      row.when !== "payroll" ||
      row.lag.days !== 0 ||
      !row.amount ||
      row.decision
    )
      fail("canonical hourly row");
    const minimum = [
      FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
      STATE_MINIMUM_WAGE_QUESTION_KEY,
      CITY_MINIMUM_WAGE_QUESTION_KEY,
    ].includes(resolved.questionKey);
    const jurisdictionId =
      workplace.jurisdictionId ??
      (resolved.questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY
        ? NATIONAL_ELECTION_JURISDICTION.id
        : null);
    if (!jurisdictionId || jurisdictionId !== resolved.jurisdictionId)
      fail("actual work jurisdiction");
    const predicates = [...row!.who.predicates, ...row!.conditions];
    const office = predicates.filter(
      (p) => p.capability === NON_ELECTIVE_PAY_PREDICATE,
    );
    if (
      office.length &&
      !matchPayCoveragePredicates(world, work.id, office, cutoff).matches
    )
      fail("elective-office applicability");
    const others = predicates.filter(
      (p) => p.capability !== NON_ELECTIVE_PAY_PREDICATE,
    );
    const match = matchPayCoveragePredicates(world, work.id, others, cutoff);
    if (minimum && coverage) {
      const exception = coverage.exceptions.find(
        (e) => e.questionKey === resolved.questionKey,
      );
      if (exception ? exception.rowId !== row!.id : others.length > 0)
        fail("saved pay coverage exception");
    } else if (!match.matches) fail("recorded pay applicability");
    factSources =
      minimum && coverage ? coverage.factRecordIds : match.factRecordIds;
    const law = lawInForce(
      world,
      resolved.jurisdictionId,
      question!.id,
      cutoff.asOfDate,
      "all",
      cutoff,
    );
    if (
      !law ||
      JSON.stringify(law) !== JSON.stringify(resolved.law) ||
      (law.origin === "enacted" && law.answer !== "yes") ||
      (resolved.questionKey === STATE_MINIMUM_WAGE_QUESTION_KEY &&
        law.origin === "in-force-at-start" &&
        law.answer === "no")
    )
      fail("operative canonical law at earned cutoff");
    const inputs: Record<string, LawAmount> = {};
    const collect = (expression: LawAmountExpression): void => {
      if (expression.op === "term") {
        const term = readFinalEnactedLawTerm(world, law!, {
          questionKey: resolved.questionKey,
          termKey: expression.key,
          unit: expression.unit,
          onDate: cutoff.asOfDate,
          cutoff,
        });
        if (
          !term ||
          (inputs[expression.key] && inputs[expression.key]!.unit !== term.unit)
        )
          fail("adopted numeric term");
        inputs[expression.key] = { value: term!.value, unit: term!.unit };
        legalSources.push(...term!.sourceRecordIds);
      } else if (
        expression.op === "sum" ||
        expression.op === "minimum" ||
        expression.op === "maximum"
      )
        expression.operands.forEach(collect);
      else if (
        expression.op === "difference" ||
        expression.op === "product" ||
        expression.op === "ratio"
      ) {
        collect(expression.left);
        collect(expression.right);
      }
    };
    collect(row!.amount!);
    const amount = evaluateLawAmount(row!.amount!, {
      term: inputs,
      record: {},
      capacity: {},
      exposure: {},
    });
    if (
      amount.unit !== resolved.amount.unit ||
      amount.value !== resolved.amount.value
    )
      fail("canonical amount evaluator");
    governing = law!;
  } else if (resolved.action === "raise-saved-rule-hourly-floor") {
    const authority = resolved.authority;
    const place = workplace.jurisdictionId
      ? world.jurisdictions[workplace.jurisdictionId]
      : null;
    const stateKey = place
      ? (stateKeyForJurisdiction(place) ??
        lifePlaceByJurisdictionId(place.id)?.stateJurisdictionKey ??
        null)
      : null;
    const clause = recordById(
      world.history.ruleChangeProvisions ?? [],
      authority.ruleChangeProvisionId,
    );
    const enactment = recordById(
      world.history.legislativeEnactments ?? [],
      authority.enactmentId,
    );
    const change = enactedRuleChangeAt(world, {
      stateUsps: authority.stateUsps,
      officeKey: authority.officeKey,
      field: authority.field,
      onDate: cutoff.asOfDate,
      cutoff,
    });
    const legal = stateKey
      ? stateMinimumSettingAt(world, stateKey, cutoff.asOfDate, cutoff)
      : null;
    const template = MINIMUM_WAGE_PAY_ROWS[STATE_MINIMUM_WAGE_QUESTION_KEY]!;
    const match = matchPayCoveragePredicates(
      world,
      work.id,
      template.who.predicates,
      cutoff,
    );
    const exception = coverage?.exceptions.find(
      (e) => e.questionKey === STATE_MINIMUM_WAGE_QUESTION_KEY,
    );
    if (!match.matches || (exception && exception.rowId !== template.id))
      fail("saved-rule worker applicability");
    if (
      authority.kind !== "enacted-hourly-pay-rule" ||
      authority.field !== "labor.minimumWage.hourlyCents" ||
      authority.officeKey !== laborLawOfficeKey(authority.stateUsps) ||
      stateKey !== `US-${authority.stateUsps}` ||
      stateJurisdictionForKey(stateKey!)?.id !== resolved.jurisdictionId ||
      !clause ||
      !enactment ||
      !change ||
      !legal?.measureId ||
      change.measureId !== legal.measureId ||
      change.operativeAt !== legal.effectiveAt ||
      change.value !== legal.hourlyMinor ||
      clause.sequence >= enactment.sequence ||
      enactment.sequence >= cutoff.historySequenceExclusive ||
      clause.filedAt > cutoff.asOfDate ||
      enactment.resolvedAt > cutoff.asOfDate ||
      enactment.outcome !== "enacted" ||
      enactment.measureId !== clause.measureId ||
      clause.measureId !== authority.measureId ||
      clause.stateUsps !== authority.stateUsps ||
      clause.officeKey !== authority.officeKey ||
      clause.field !== authority.field ||
      resolved.rowId !== `pay:hourly-rule:${clause.id}` ||
      change.instrument !== "statute" ||
      change.measureId !== authority.measureId ||
      change.operativeAt !== authority.operativeAt ||
      change.value !== clause.value ||
      change.value !== resolved.amount.value ||
      JSON.stringify(change.applicability) !==
        JSON.stringify(authority.applicability) ||
      (change.applicability.appliesTo === "terms-beginning-after" &&
        work.startedAt < change.operativeAt)
    )
      fail("adopted saved hourly authority");
    legalSources = [clause!.id, enactment!.id, change!.measureId];
    factSources = [...match.factRecordIds, ...(coverage?.factRecordIds ?? [])];
    governing = {
      measureId: change!.measureId,
      origin: "enacted",
      operativeAt: change!.operativeAt,
    };
  } else fail("supported hourly action");
  const expectedSources = [
    ...new Set([
      work.id,
      role.id,
      assessment.resourceFlowId,
      assessment.earnedTermsId,
      ...factSources,
      ...(coverage ? [coverage.id] : []),
      ...workplace.factRecordIds,
      ...legalSources,
    ]),
  ];
  if (!sameIds(expectedSources, resolved.sourceRecordIds))
    fail("canonical source records");
  const expectedKey = `earned-law-pay:${assessment.resourceFlowId}:${assessment.completionEventId}:${assessment.earnedTermsId}:${resolved.rowId}:${governing!.measureId}`;
  if (
    assessment.stableKey !== expectedKey ||
    assessment.id !==
      createStableId("earned-law-pay-assessment", `${world.id}:${expectedKey}`)
  )
    fail("stable identity");
  const stamp = lawEffectStamp(governing!, {
    effectKind: "pay",
    questionKey:
      resolved.action === "raise-hourly-floor" ? resolved.questionKey : null,
    ...(resolved.action === "raise-saved-rule-hourly-floor"
      ? {
          ruleAuthority: {
            ruleChangeProvisionId: resolved.authority.ruleChangeProvisionId,
            enactmentId: resolved.authority.enactmentId,
            field: resolved.authority.field,
          },
        }
      : {}),
    jurisdictionId: resolved.jurisdictionId,
    appliedAt: assessment.recordedAt,
    sourceRecordIds: [
      ...new Set([
        ...resolved.sourceRecordIds,
        assessment.id,
        resolved.activityId,
        work.id,
        role.id,
        assessment.resourceFlowId,
        assessment.earnedTermsId,
        assessment.completionEventId,
        assessment.scheduledActivityId,
        assessment.scheduledActivityStateId,
      ]),
    ],
  });
  if (
    !stamp ||
    assessment.lawEffectStamps.length !== 1 ||
    !isLawEffectStamp(assessment.lawEffectStamps[0])
  )
    fail("required law stamp");
  const actual = assessment.lawEffectStamps[0]!;
  const { sourceRecordIds: actualIds, ...actualFields } = actual;
  const { sourceRecordIds: expectedIds, ...expectedFields } = stamp!;
  if (
    JSON.stringify(actualFields) !== JSON.stringify(expectedFields) ||
    !sameIds(actualIds ?? [], expectedIds ?? [])
  )
    fail("canonical law stamp");
}

function sameIds(
  left: readonly EntityId[],
  right: readonly EntityId[],
): boolean {
  return (
    left.length === new Set(left).size &&
    right.length === new Set(right).size &&
    left.length === right.length &&
    left.every((id) => right.includes(id))
  );
}

/** Old saves have no assessments; each new record has one globally unique ID. */
export function assertEarnedLawPayIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const keys = new Set<string>();
  for (const assessment of world.history.earnedLawPayAssessments ?? []) {
    if (ids.has(assessment.id) || keys.has(assessment.stableKey))
      throw new Error(`Duplicate earned law pay assessment: ${assessment.id}`);
    ids.add(assessment.id);
    keys.add(assessment.stableKey);
    validateEarnedLawPayAssessment(world, assessment);
  }
}
