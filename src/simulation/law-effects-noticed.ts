import { addDays, daysBetween, simulationMinutesBetween } from "./dates";
import { recordById, recordsWithFieldValue } from "./history-index";
import { recordLawExposure } from "./law-exposure";
import { resourceFlowTermsAt } from "./resource-queries";
import { money } from "./resources";
import type { EntityId, IsoDate, MoneyAmount, World } from "./types";

/** Law-attributed changes supported by completed payment evidence. */
export interface RecordedLawPayChange {
  readonly personId: EntityId;
  readonly measureId: EntityId;
  readonly termsId: EntityId;
  readonly previousOutcomeId?: EntityId;
  readonly earnedLawPayAssessmentId?: EntityId;
  readonly sourceRecordId: EntityId;
  readonly at: IsoDate;
  readonly amount: MoneyAmount;
  readonly direction: "gain" | "cost";
}

export const LAW_EFFECTS_NOTICED_VERSION = "law-effects-noticed/v1";
const LOOK_BACK_DAYS = 35;

/**
 * Terms alone are a promise. A change is supported only by an enacted cause
 * and completed paychecks at both contract amounts, with the same currency,
 * cadence and period length. Missing or partial pay remains unsupported.
 * Assessment-linked completed gross instead uses the producer's saved earned
 * contractual gross and exact completion/cutoff/law bindings. It writes no pay
 * and invents no tax counterfactual or monthly sum.
 */
export function recordedLawPayChanges(
  world: World,
  since: IsoDate,
  through = world.currentDate,
): readonly RecordedLawPayChange[] {
  const lawOfEvent = new Map<EntityId, EntityId>();
  for (const enactment of world.history.legislativeEnactments ?? [])
    if (enactment.outcome === "enacted" && enactment.resolvedAt <= through)
      lawOfEvent.set(enactment.outcomeEventId, enactment.measureId);
  const changes = completedAssessmentPayChanges(world, since, through);
  for (const row of world.history.resourceFlowTerms) {
    if (row.effectiveAt > through || row.provenance.kind !== "simulated-event")
      continue;
    const measureId = lawOfEvent.get(row.provenance.eventId);
    if (!measureId || !row.supersedesTermsId || row.status !== "active")
      continue;
    const before = recordById(
      world.history.resourceFlowTerms,
      row.supersedesTermsId,
    );
    const flow = recordById(world.history.resourceFlows, row.resourceFlowId);
    if (
      !before ||
      before.status !== "active" ||
      before.cadenceKind !== row.cadenceKind ||
      before.amount.currency !== row.amount.currency ||
      !flow ||
      flow.basisReference.kind !== "work" ||
      flow.recipient.kind !== "person"
    )
      continue;
    const outcomes = recordsWithFieldValue(
      world.history.resourceTransferOutcomes,
      "resourceFlowId",
      flow.id,
    );
    const prior = outcomes
      .filter(
        (outcome) =>
          outcome.status === "completed" &&
          outcome.periodStartsAt >= before.effectiveAt &&
          outcome.periodEndsAt < row.effectiveAt &&
          outcome.transferredAmount.currency === before.amount.currency &&
          outcome.transferredAmount.minorUnits === before.amount.minorUnits,
      )
      .at(-1);
    if (!prior) continue;
    // Stop at the next terms revision: its pay cannot be assigned to this law.
    const following = recordsWithFieldValue(
      world.history.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    ).find((terms) => terms.supersedesTermsId === row.id);
    const paid = outcomes.find(
      (outcome) =>
        outcome.status === "completed" &&
        outcome.earnedLawPayAssessmentId === undefined &&
        outcome.periodStartsAt >= row.effectiveAt &&
        (!following || outcome.periodEndsAt < following.effectiveAt) &&
        outcome.occurredAt >= since &&
        outcome.occurredAt <= through &&
        outcome.transferredAmount.currency === row.amount.currency &&
        outcome.transferredAmount.minorUnits === row.amount.minorUnits &&
        daysBetween(outcome.periodStartsAt, outcome.periodEndsAt) ===
          daysBetween(prior.periodStartsAt, prior.periodEndsAt),
    );
    if (!paid) continue;
    const delta =
      paid.transferredAmount.minorUnits - prior.transferredAmount.minorUnits;
    if (delta === 0) continue;
    changes.push({
      personId: flow.recipient.personId,
      measureId,
      termsId: row.id,
      previousOutcomeId: prior.id,
      sourceRecordId: paid.id,
      at: paid.occurredAt,
      amount: money(Math.abs(delta), paid.transferredAmount.currency),
      direction: delta > 0 ? "gain" : "cost",
    });
  }
  return changes;
}

/** Read the producer's later legal determination without revising earned terms. */
function completedAssessmentPayChanges(
  world: World,
  since: IsoDate,
  through: IsoDate,
): RecordedLawPayChange[] {
  const changes: RecordedLawPayChange[] = [];
  if (!world.history.earnedLawPayAssessments?.length) return changes;
  const seen = new Set<EntityId>();
  for (const paid of world.history.resourceTransferOutcomes) {
    if (
      !paid.earnedLawPayAssessmentId ||
      paid.status !== "completed" ||
      paid.occurredAt < since ||
      paid.occurredAt > through
    )
      continue;
    const assessment = recordById(
      world.history.earnedLawPayAssessments ?? [],
      paid.earnedLawPayAssessmentId,
    );
    if (!assessment || seen.has(assessment.id)) continue;
    const flow = recordById(
      world.history.resourceFlows,
      assessment.resourceFlowId,
    );
    const work = recordById(
      world.history.workRelationships,
      assessment.workRelationshipId,
    );
    const completion = recordById(
      world.history.events,
      assessment.completionEventId,
    );
    const activity = recordById(
      world.history.scheduledActivities,
      assessment.scheduledActivityId,
    );
    const state = recordById(
      world.history.scheduledActivityStates,
      assessment.scheduledActivityStateId,
    );
    const terms = flow
      ? resourceFlowTermsAt(world, flow.id, assessment.earnedCutoff)
      : null;
    const resolved = assessment.resolvedConsequence;
    const stamp = assessment.lawEffectStamps[0];
    const measureId =
      resolved.action === "raise-saved-rule-hourly-floor"
        ? resolved.authority.measureId
        : resolved.law.measureId;
    const rule =
      resolved.action === "raise-saved-rule-hourly-floor"
        ? recordById(
            world.history.ruleChangeProvisions ?? [],
            resolved.authority.ruleChangeProvisionId,
          )
        : null;
    const ruleStamp =
      stamp && "ruleAuthority" in stamp
        ? (stamp.ruleAuthority as {
            ruleChangeProvisionId?: EntityId;
            enactmentId?: EntityId;
            field?: string;
          })
        : null;
    const enactment = (world.history.legislativeEnactments ?? []).find(
      (row) =>
        row.measureId === measureId &&
        row.outcome === "enacted" &&
        row.resolvedAt <= assessment.earnedCutoff.asOfDate &&
        row.sequence < assessment.earnedCutoff.historySequenceExclusive,
    );
    if (
      !flow ||
      !work ||
      !completion ||
      !activity ||
      !state ||
      !terms ||
      !enactment ||
      !world.people[assessment.personId] ||
      assessment.recordedAt > paid.occurredAt ||
      assessment.sequence >= paid.sequence ||
      paid.resourceFlowId !== flow.id ||
      paid.periodStartsAt !== assessment.periodStartsAt ||
      paid.periodEndsAt !== assessment.periodEndsAt ||
      paid.attemptedAmount.currency !== assessment.assessedGross.currency ||
      paid.attemptedAmount.minorUnits !== assessment.assessedGross.minorUnits ||
      paid.transferredAmount.currency !== assessment.assessedGross.currency ||
      paid.transferredAmount.minorUnits !==
        assessment.assessedGross.minorUnits ||
      assessment.assessedGross.currency !==
        assessment.contractualGross.currency ||
      flow.recipient.kind !== "person" ||
      flow.recipient.personId !== assessment.personId ||
      flow.source.kind !== "organization" ||
      flow.source.organizationId !== assessment.organizationId ||
      flow.basisReference.kind !== "work" ||
      flow.basisReference.workRelationshipId !== work.id ||
      work.personId !== assessment.personId ||
      work.organizationId !== assessment.organizationId ||
      terms.id !== assessment.earnedTermsId ||
      terms.status !== "active" ||
      terms.cadenceKind !== "work:completed-shift" ||
      terms.amount.currency !== assessment.contractualGross.currency ||
      terms.amount.minorUnits !== assessment.contractualGross.minorUnits ||
      completion.type !== "life-paths2.work-session" ||
      assessment.earnedCutoff.asOfDate !== completion.occurredAt ||
      assessment.earnedCutoff.historySequenceExclusive !==
        completion.sequence + 1 ||
      assessment.periodStartsAt !== completion.occurredAt ||
      assessment.periodEndsAt !== completion.occurredAt ||
      !completion.involvedEntityIds.includes(work.id) ||
      !completion.involvedEntityIds.includes(assessment.personId) ||
      !completion.involvedEntityIds.includes(activity.id) ||
      !activity.sourceEntityIds.includes(work.id) ||
      !activity.participantPersonIds.includes(assessment.personId) ||
      state.activityId !== activity.id ||
      state.status !== "completed" ||
      state.sequence >= assessment.earnedCutoff.historySequenceExclusive ||
      simulationMinutesBetween(state.start, state.end) !==
        assessment.workedMinutes ||
      resolved.personId !== assessment.personId ||
      resolved.workId !== work.id ||
      resolved.payFlowId !== flow.id ||
      resolved.completedShift?.eventId !== completion.id ||
      resolved.completedShift.termsId !== terms.id ||
      resolved.effectiveAt !== completion.occurredAt ||
      assessment.lawEffectStamps.length !== 1 ||
      !stamp ||
      stamp.version !== "law-effect-stamp/v1" ||
      stamp.effectKind !== "pay" ||
      stamp.source !== "enacted" ||
      stamp.governingLawKey !== measureId ||
      stamp.operativeAt > assessment.earnedCutoff.asOfDate ||
      stamp.appliedAt !== assessment.recordedAt ||
      stamp.jurisdictionId !== resolved.jurisdictionId ||
      ![
        assessment.id,
        work.id,
        flow.id,
        terms.id,
        completion.id,
        activity.id,
        state.id,
      ].every((id) => stamp.sourceRecordIds?.includes(id)) ||
      !(paid.lawEffectStamps ?? []).some(
        (row) =>
          row.governingLawKey === measureId &&
          row.effectKind === "pay" &&
          row.sourceRecordIds?.includes(assessment.id),
      ) ||
      (resolved.action === "raise-saved-rule-hourly-floor" &&
        (resolved.authority.enactmentId !== enactment.id ||
          resolved.authority.operativeAt !== stamp.operativeAt ||
          !rule ||
          rule.measureId !== measureId ||
          rule.officeKey !== resolved.authority.officeKey ||
          rule.field !== resolved.authority.field ||
          rule.value !== resolved.amount.value ||
          ruleStamp?.ruleChangeProvisionId !== rule.id ||
          ruleStamp.enactmentId !== enactment.id ||
          ruleStamp.field !== rule.field)) ||
      (resolved.action === "raise-hourly-floor" &&
        resolved.law.origin !== "enacted")
    )
      continue;
    const delta =
      paid.transferredAmount.minorUnits -
      assessment.contractualGross.minorUnits;
    if (delta === 0) continue;
    changes.push({
      personId: assessment.personId,
      measureId,
      termsId: terms.id,
      earnedLawPayAssessmentId: assessment.id,
      sourceRecordId: paid.id,
      at: paid.occurredAt,
      amount: money(Math.abs(delta), paid.transferredAmount.currency),
      direction: delta > 0 ? "gain" : "cost",
    });
    seen.add(assessment.id);
  }
  return changes;
}

/**
 * The existing payday caller notices completed law-caused pay. The existing
 * law exposure schedules the one reflection on recorded signatures and votes,
 * through the same belief pipeline as other lived outcomes. No second writer,
 * reflection, attribution rule or belief weight is added.
 */
export function noticeLawPayChanges(world: World, since: IsoDate): World {
  let next = world;
  const noticed = new Set(
    (world.history.lawExposures ?? []).map((row) => row.stableKey),
  );
  for (const change of recordedLawPayChanges(
    world,
    addDays(since, -LOOK_BACK_DAYS),
  )) {
    const stableKey = `${LAW_EFFECTS_NOTICED_VERSION}:paid:${
      change.earnedLawPayAssessmentId
        ? `assessment:${change.earnedLawPayAssessmentId}`
        : change.termsId
    }`;
    if (
      noticed.has(stableKey) ||
      !world.people[change.personId] ||
      (next.history.lawExposures ?? []).some(
        (row) =>
          row.relation === "own" &&
          row.channel === "paycheck" &&
          row.measureId === change.measureId &&
          row.sourceRecordId === change.sourceRecordId,
      )
    )
      continue;
    next = recordLawExposure(next, {
      stableKey,
      personId: change.personId,
      measureId: change.measureId,
      channel: "paycheck",
      direction: change.direction,
      amount: change.amount,
      cadence: "one-time",
      sourceRecordId: change.sourceRecordId,
    });
    noticed.add(stableKey);
  }
  return next;
}
