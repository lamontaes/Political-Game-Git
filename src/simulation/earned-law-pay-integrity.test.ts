import { beforeAll, describe, expect, it } from "vitest";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import {
  enterLifePath,
  scheduleLifePathSession,
  performLifePathSession,
} from "./life-paths2";
import { lawInForce } from "./governing/law-in-force";
import { readFinalEnactedLawTerm } from "./governing/final-law-term-query";
import {
  payWorkplaceAt,
  matchPayCoveragePredicates,
} from "./pay-coverage-predicates";
import {
  workPayCoverageAt,
  assertWorkPayCoverageIntegrity,
} from "./pay-coverage-query";
import { evaluateLawAmount } from "./law-consequence-amount";
import { NATIONAL_ELECTION_JURISDICTION } from "./national-election-geography";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  NON_ELECTIVE_PAY_PREDICATE,
} from "./law-consequences/pay-rows";
import { assessedCompletedHourlyGrossMinor } from "./completed-hourly-gross";
import { recordById, recordsWithFieldValue } from "./history-index";
import { money } from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { workRoleAt } from "./life-queries";
import { lawEffectStamp } from "./law-effect-stamp";
import { createStableId } from "./ids";
import { assertWorldIntegrity } from "./world";
import type { WorkPayCoverageDeterminationRecord } from "./pay-coverage-types";
import { simulationMinutesBetween } from "./dates";
import { serializeWorld, deserializeWorld } from "./serialization";
import {
  validateEarnedLawPayAssessment,
  assertEarnedLawPayIntegrity,
} from "./earned-law-pay-integrity";
import type { EarnedLawPayAssessmentRecord } from "./types";
import type { ResolvedHourlyLawPayConsequence } from "./law-consequence-types";
import type { World } from "./types";

let world: World;
let assessment: EarnedLawPayAssessmentRecord;

beforeAll(() => {
  const game = createNewGameWorld({
    ...DEFAULT_NEW_GAME_SETUP,
    seed: "earned-assessment-integrity:omaha",
    placeKey: "3137000",
    startAge: 30,
    startingLife: "ordinary-life",
    household: "lives-alone",
    questionnaire: "skipped",
    priors: [],
  });
  const entered = enterLifePath(game.world, "shop-assistant");
  expect(entered.ok, entered.message).toBe(true);
  const work = entered.world.history.workRelationships.at(-1)!;
  const scheduled = scheduleLifePathSession(entered.world, work.id);
  expect(scheduled.ok, scheduled.message).toBe(true);
  const worked = performLifePathSession(
    scheduled.world,
    scheduled.world.history.scheduledActivities.at(-1)!.id,
  );
  expect(worked.ok, worked.message).toBe(true);
  const base = worked.world;
  const completion = [...base.history.events]
    .reverse()
    .find((e) => e.type === "life-paths2.work-session")!;
  const flow = base.history.resourceFlows.find(
    (f) =>
      f.basisReference.kind === "work" &&
      f.basisReference.workRelationshipId === work.id,
  )!;
  const cutoff = {
    asOfDate: completion.occurredAt,
    historySequenceExclusive: completion.sequence + 1,
  };
  const terms = resourceFlowTermsAt(base, flow.id, cutoff)!;
  const role = workRoleAt(base, work.id, cutoff)!;
  const activity = completion.involvedEntityIds.flatMap(
    (id) => recordById(base.history.scheduledActivities, id) ?? [],
  )[0]!;
  const state = recordsWithFieldValue(
    base.history.scheduledActivityStates,
    "activityId",
    activity.id,
  )
    .filter((s) => s.sequence < cutoff.historySequenceExclusive)
    .at(-1)!;
  // The assessment is an explicit validator input, not a runtime pay dispatch.
  // Bind its authority and source frontier through the same read-only queries.
  const question = Object.values(base.policyCatalog.propositions).find(
    (p) => p.stableKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  )!;
  const row = question.consequences!.find(
    (r) => r.id === `pay:${FEDERAL_MINIMUM_WAGE_QUESTION_KEY}`,
  )!;
  const workplace = payWorkplaceAt(base, work.id, cutoff);
  const jurisdictionId =
    workplace.jurisdictionId ?? NATIONAL_ELECTION_JURISDICTION.id;
  const law = lawInForce(
    base,
    jurisdictionId,
    question.id,
    cutoff.asOfDate,
    "all",
    cutoff,
  )!;
  expect(law).toBeDefined();
  const coverage = workPayCoverageAt(base, work.id, cutoff);
  const predicates = [...row.who.predicates, ...row.conditions];
  const office = matchPayCoveragePredicates(
    base,
    work.id,
    predicates.filter((p) => p.capability === NON_ELECTIVE_PAY_PREDICATE),
    cutoff,
  );
  const others = predicates.filter(
    (p) => p.capability !== NON_ELECTIVE_PAY_PREDICATE,
  );
  const match = matchPayCoveragePredicates(base, work.id, others, cutoff);
  const exception = coverage?.exceptions.find(
    (e) => e.questionKey === question.stableKey,
  );
  if (
    !office.matches ||
    (coverage
      ? exception
        ? exception.rowId !== row.id
        : others.length > 0
      : !match.matches)
  )
    throw new Error("Missing canonical federal worker coverage");
  if (row.amount?.op !== "term")
    throw new Error(
      "Federal hourly fixture requires the canonical numeric term row",
    );
  const term = readFinalEnactedLawTerm(base, law, {
    questionKey: question.stableKey,
    termKey: row.amount.key,
    unit: row.amount.unit,
    onDate: cutoff.asOfDate,
    cutoff,
  });
  if (!term || term.unit !== "minor/hour")
    throw new Error("Missing canonical federal hourly fixture term");
  const amount = evaluateLawAmount(row.amount, {
    term: { [row.amount.key]: { value: term.value, unit: term.unit } },
    record: {},
    capacity: {},
    exposure: {},
  });
  if (amount.unit !== "minor/hour")
    throw new Error("Missing canonical federal hourly fixture amount");
  const typed: ResolvedHourlyLawPayConsequence = {
    rowId: row.id,
    questionKey: question.stableKey,
    jurisdictionId,
    law,
    personId: work.personId,
    workId: work.id,
    payFlowId: flow.id,
    activityId: work.id,
    completedShift: { eventId: completion.id, termsId: terms.id },
    effectiveAt: completion.occurredAt,
    amount: { value: amount.value, unit: "minor/hour", currency: "USD" },
    sourceRecordIds: [
      ...new Set([
        work.id,
        role.id,
        flow.id,
        terms.id,
        ...(coverage ? coverage.factRecordIds : match.factRecordIds),
        ...(coverage ? [coverage.id] : []),
        ...workplace.factRecordIds,
        ...term.sourceRecordIds,
      ]),
    ],
    action: "raise-hourly-floor",
  };
  const stableKey = `earned-law-pay:${flow.id}:${completion.id}:${terms.id}:${typed.rowId}:${typed.law.measureId}`;
  const id = createStableId(
    "earned-law-pay-assessment",
    `${base.id}:${stableKey}`,
  );
  const workedMinutes = simulationMinutesBetween(state.start, state.end);
  const stamp = lawEffectStamp(typed.law, {
    effectKind: "pay",
    questionKey: typed.questionKey,
    jurisdictionId: typed.jurisdictionId,
    appliedAt: base.currentDate,
    sourceRecordIds: [
      ...new Set([
        ...typed.sourceRecordIds,
        id,
        typed.activityId,
        work.id,
        role.id,
        flow.id,
        terms.id,
        completion.id,
        activity.id,
        state.id,
      ]),
    ],
  })!;
  assessment = {
    id,
    stableKey,
    sequence: base.history.nextSequence,
    recordedAt: base.currentDate,
    personId: work.personId,
    organizationId: work.organizationId!,
    workRelationshipId: work.id,
    resourceFlowId: flow.id,
    earnedTermsId: terms.id,
    completionEventId: completion.id,
    scheduledActivityId: activity.id,
    scheduledActivityStateId: state.id,
    earnedCutoff: cutoff,
    periodStartsAt: completion.occurredAt,
    periodEndsAt: completion.occurredAt,
    workedMinutes,
    contractualGross: { ...terms.amount },
    assessedGross: money(
      assessedCompletedHourlyGrossMinor(
        typed.amount.value,
        workedMinutes,
        terms.amount.minorUnits,
      ),
      "USD",
    ),
    resolvedConsequence: typed,
    lawEffectStamps: [stamp],
  };
  // Explicit validator fixture; the production assessment append belongs to Team3.
  world = {
    ...base,
    history: {
      ...base.history,
      nextSequence: base.history.nextSequence + 1,
      earnedLawPayAssessments: [assessment],
    },
  };
  console.info("EARNED_ASSESSMENT_INTEGRITY", {
    personId: work.personId,
    workId: work.id,
    flowId: flow.id,
    completionEventId: completion.id,
    workedMinutes,
    contractualGross: assessment.contractualGross,
    assessedGross: assessment.assessedGross,
  });
});

describe("saved earned-law assessment integrity", () => {
  it("validates actual completed work without changing its world or earned terms", () => {
    const before = serializeWorld(world);
    expect(() =>
      validateEarnedLawPayAssessment(world, assessment),
    ).not.toThrow();
    expect(serializeWorld(world)).toBe(before);
    expect(() =>
      validateEarnedLawPayAssessment(deserializeWorld(before), assessment),
    ).not.toThrow();
  });

  it.each([
    [
      "cutoff",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        earnedCutoff: {
          ...a.earnedCutoff,
          historySequenceExclusive: a.sequence,
        },
      }),
    ],
    [
      "worked minutes",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        workedMinutes: a.workedMinutes + 1,
      }),
    ],
    [
      "contractual amount",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        contractualGross: {
          ...a.contractualGross,
          minorUnits: a.contractualGross.minorUnits + 1,
        },
      }),
    ],
    [
      "assessed amount",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        assessedGross: {
          ...a.assessedGross,
          minorUnits: a.assessedGross.minorUnits + 1,
        },
      }),
    ],
    [
      "currency",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        assessedGross: money(a.assessedGross.minorUnits, "EUR"),
      }),
    ],
    [
      "completion join",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        completionEventId: a.scheduledActivityId,
      }),
    ],
    [
      "state join",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        scheduledActivityStateId: a.completionEventId,
      }),
    ],
    [
      "legal rate",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        resolvedConsequence: {
          ...a.resolvedConsequence,
          amount: {
            ...a.resolvedConsequence.amount,
            value: a.resolvedConsequence.amount.value + 1,
          },
        },
      }),
    ],
    [
      "law stamp",
      (a: EarnedLawPayAssessmentRecord) => ({ ...a, lawEffectStamps: [] }),
    ],
    [
      "source evidence",
      (a: EarnedLawPayAssessmentRecord) => ({
        ...a,
        resolvedConsequence: { ...a.resolvedConsequence, sourceRecordIds: [] },
      }),
    ],
  ] as const)(
    "rejects tampered %s",
    (
      _name: string,
      change: (
        record: EarnedLawPayAssessmentRecord,
      ) => EarnedLawPayAssessmentRecord,
    ) => {
      expect(() =>
        validateEarnedLawPayAssessment(world, change(assessment)),
      ).toThrow();
    },
  );

  it("rejects duplicate assessment identity in the global integrity channel", () => {
    expect(() =>
      assertEarnedLawPayIntegrity(world, new Set([assessment.id])),
    ).toThrow("Duplicate earned law pay assessment");
    expect(() =>
      assertEarnedLawPayIntegrity(
        {
          ...world,
          history: {
            ...world.history,
            earnedLawPayAssessments: [assessment, assessment],
          },
        },
        new Set(),
      ),
    ).toThrow("Duplicate earned law pay assessment");
  });

  it("keeps old saves without assessments valid", () => {
    const { earnedLawPayAssessments: removed, ...history } = world.history;
    expect(removed).toHaveLength(1);
    expect(() =>
      assertEarnedLawPayIntegrity({ ...world, history }, new Set()),
    ).not.toThrow();
  });
});

describe("earned-pay coverage authority integrity", () => {
  it.each([
    [
      "forged exception row",
      (coverage: WorkPayCoverageDeterminationRecord) => ({
        ...coverage,
        exceptions: [
          {
            questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
            rowId: "pay:fixture-row-not-in-canonical-catalog",
            factRecordIds: coverage.factRecordIds,
          },
        ],
      }),
    ],
    [
      "forged nested exception evidence",
      (coverage: WorkPayCoverageDeterminationRecord) => ({
        ...coverage,
        exceptions: [
          {
            questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
            rowId: assessment.resolvedConsequence.rowId,
            // A saved assessment is not a prior worker/employer applicability fact.
            factRecordIds: [assessment.id],
          },
        ],
      }),
    ],
    [
      "duplicate question exceptions",
      (coverage: WorkPayCoverageDeterminationRecord) => {
        const exception = {
          questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
          rowId: assessment.resolvedConsequence.rowId,
          factRecordIds: coverage.factRecordIds,
        };
        return { ...coverage, exceptions: [exception, exception] };
      },
    ],
    [
      "omitted matching exception",
      (coverage: WorkPayCoverageDeterminationRecord) => ({
        ...coverage,
        exceptions: coverage.exceptions.filter(
          (entry) => entry.questionKey !== FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        ),
      }),
    ],
    [
      "omitted governing law",
      (coverage: WorkPayCoverageDeterminationRecord) => ({
        ...coverage,
        governingLaws: coverage.governingLaws.filter(
          (entry) => entry.questionKey !== FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        ),
      }),
    ],
    [
      "forged governing law",
      (coverage: WorkPayCoverageDeterminationRecord) => ({
        ...coverage,
        governingLaws: [
          {
            questionKey: FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
            governingLawKey: assessment.id,
            origin: "enacted" as const,
          },
        ],
      }),
    ],
  ] as const)(
    "rejects %s before accepting a saved assessment",
    (
      _name: string,
      change: (
        record: WorkPayCoverageDeterminationRecord,
      ) => WorkPayCoverageDeterminationRecord,
    ) => {
      // Validate coverage independently of the assessment's narrower joins.
      // Restore the actual completed-work frontier before its explicit assessment.
      const coverageWorld: World = {
        ...world,
        history: {
          ...world.history,
          nextSequence: assessment.sequence,
          earnedLawPayAssessments: [],
        },
      };
      expect(() => assertWorldIntegrity(coverageWorld)).not.toThrow();
      expect(() => assertWorkPayCoverageIntegrity(coverageWorld)).not.toThrow();
      const coverage = workPayCoverageAt(
        coverageWorld,
        assessment.workRelationshipId,
        assessment.earnedCutoff,
      );
      expect(coverage).toBeDefined();
      expect(
        coverage!.exceptions.some(
          (entry) =>
            entry.questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY &&
            entry.rowId === assessment.resolvedConsequence.rowId,
        ),
      ).toBe(true);
      expect(
        coverage!.governingLaws.some(
          (entry) => entry.questionKey === FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
        ),
      ).toBe(true);
      const forged = {
        ...coverageWorld,
        history: {
          ...coverageWorld.history,
          workPayCoverageDeterminations:
            coverageWorld.history.workPayCoverageDeterminations!.map(
              (record) =>
                record.id === coverage!.id ? change(record) : record,
            ),
        },
      };
      // The query guard must reject the invalid coverage authority itself.
      expect(() => assertWorkPayCoverageIntegrity(forged)).toThrow(
        /Pay coverage/i,
      );
    },
  );
});
