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
import { resolvePayConsequences } from "./law-consequences/pay";
import {
  FEDERAL_MINIMUM_WAGE_QUESTION_KEY,
  MINIMUM_WAGE_PAY_ROWS,
} from "./law-consequences/pay-rows";
import { assessedCompletedHourlyGrossMinor } from "./completed-hourly-gross";
import { recordById, recordsWithFieldValue } from "./history-index";
import { money } from "./resources";
import { resourceFlowTermsAt } from "./resource-queries";
import { workRoleAt } from "./life-queries";
import { lawEffectStamp } from "./law-effect-stamp";
import { createStableId } from "./ids";
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
  const resolved = resolvePayConsequences(
    base,
    MINIMUM_WAGE_PAY_ROWS[FEDERAL_MINIMUM_WAGE_QUESTION_KEY]!,
    {
      onDate: completion.occurredAt,
      activity: "payroll",
      activityId: work.id,
      subjectIds: [work.personId],
      completedShift: { eventId: completion.id, termsId: terms.id },
    },
  )[0]!;
  expect(resolved).toBeDefined();
  if (
    resolved.value.type !== "amount" ||
    resolved.value.unit !== "minor/hour" ||
    resolved.value.currency !== "USD"
  )
    throw new Error("Missing canonical federal hourly fixture resolution");
  const typed: ResolvedHourlyLawPayConsequence = {
    rowId: resolved.row.id,
    questionKey: resolved.questionKey,
    jurisdictionId: resolved.jurisdictionId,
    law: resolved.law,
    personId: work.personId,
    workId: work.id,
    payFlowId: flow.id,
    activityId: work.id,
    completedShift: { eventId: completion.id, termsId: terms.id },
    effectiveAt: completion.occurredAt,
    amount: {
      value: resolved.value.value,
      unit: "minor/hour",
      currency: "USD",
    },
    sourceRecordIds: resolved.sourceRecordIds,
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
  ] as const)("rejects tampered %s", (_name, change) => {
    expect(() =>
      validateEarnedLawPayAssessment(world, change(assessment)),
    ).toThrow();
  });

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
