import { payWorkplaceAt } from "./pay-coverage-predicates";
import { validateEarnedLawPayAssessment } from "./earned-law-pay-integrity";
import { recordById } from "./history-index";
import { createStableId } from "./ids";
import { recordWorldMetricObservation } from "./world-metrics";
import type { EntityId, ResourceTransferOutcome, World } from "./types";

/** Observe completed gross; never add another payment or income-state effect. */
export function recordEarnedPayObservations(
  world: World,
  outcomeIds: readonly EntityId[],
): World {
  if (outcomeIds.length === 0) return world;
  const metricId = createStableId(
    "world-metric-definition",
    "definition:labor.aggregate-income",
  );
  const requested = new Set(outcomeIds);
  const groups = new Map<
    string,
    {
      jurisdictionId: EntityId;
      rows: ResourceTransferOutcome[];
      affected: boolean;
    }
  >();
  for (const payment of world.history.resourceTransferOutcomes) {
    if (
      payment.status !== "completed" ||
      !payment.earnedLawPayAssessmentId ||
      payment.occurredAt > world.currentDate
    )
      continue;
    const assessment = recordById(
      world.history.earnedLawPayAssessments ?? [],
      payment.earnedLawPayAssessmentId,
    );
    if (!assessment)
      throw new Error(
        "Completed payroll observation references a missing earned assessment.",
      );
    validateEarnedLawPayAssessment(world, assessment);
    const flow = recordById(
      world.history.resourceFlows,
      payment.resourceFlowId,
    );
    if (
      !flow ||
      flow.basisReference.kind !== "work" ||
      flow.basisReference.workRelationshipId !==
        assessment.workRelationshipId ||
      flow.recipient.kind !== "person" ||
      flow.recipient.personId !== assessment.personId ||
      payment.resourceFlowId !== assessment.resourceFlowId ||
      payment.periodStartsAt !== assessment.periodStartsAt ||
      payment.periodEndsAt !== assessment.periodEndsAt ||
      payment.transferredAmount.currency !==
        assessment.assessedGross.currency ||
      payment.transferredAmount.minorUnits !==
        assessment.assessedGross.minorUnits
    )
      throw new Error(
        "Completed payroll observation must bind the assessed work and actual gross transfer.",
      );
    const workplace = payWorkplaceAt(
      world,
      assessment.workRelationshipId,
      assessment.earnedCutoff,
    );
    // Legal coverage is not geography. Preserve the payment without inventing a location.
    if (!workplace.jurisdictionId) continue;
    const jurisdictionId = workplace.jurisdictionId;
    const key = JSON.stringify([
      jurisdictionId,
      payment.periodStartsAt,
      payment.periodEndsAt,
      payment.transferredAmount.currency,
    ]);
    const group = groups.get(key) ?? {
      jurisdictionId,
      rows: [],
      affected: false,
    };
    group.rows.push(payment);
    group.affected ||= requested.has(payment.id);
    groups.set(key, group);
  }
  let next = world;
  for (const [key, group] of groups) {
    if (!group.affected) continue;
    if (!world.metricCatalog.definitions[metricId])
      throw new Error(
        "Completed payroll observations require the admitted labor income definition.",
      );
    const first = group.rows[0]!;
    const ids = group.rows.map((row) => row.id).sort();
    const stableKey = `earned-pay-observation:${createStableId("metric-observation", JSON.stringify([key, ids]))}`;
    if (
      next.history.metricObservations.some((row) => row.stableKey === stableKey)
    )
      continue;
    const currency = first.transferredAmount.currency;
    const segmentKey = `payroll.earned.${currency.toLowerCase()}` as const;
    const previous = next.history.metricObservations
      .filter(
        (row) =>
          row.metricId === metricId &&
          row.scope.jurisdictionId === group.jurisdictionId &&
          row.scope.segmentKey === segmentKey &&
          row.referencePeriod.kind === "interval" &&
          row.referencePeriod.startsAt === first.periodStartsAt &&
          row.referencePeriod.endsAt === first.periodEndsAt &&
          row.sourceSeriesKey === "payroll.completed-gross",
      )
      .at(-1);
    const minorUnits = group.rows.reduce(
      (sum, row) => sum + row.transferredAmount.minorUnits,
      0,
    );
    if (!Number.isSafeInteger(minorUnits))
      throw new Error(
        "Completed payroll total exceeds exact integer precision.",
      );
    next = recordWorldMetricObservation(next, {
      stableKey,
      metricId,
      scope: { jurisdictionId: group.jurisdictionId, segmentKey },
      referencePeriod: {
        kind: "interval",
        startsAt: first.periodStartsAt,
        endsAt: first.periodEndsAt,
      },
      value: { kind: "money", money: { minorUnits, currency } },
      sourceSeriesKey: "payroll.completed-gross",
      sourceLabel: "Completed earned-law gross payments",
      sourceReference: {
        title: "Recorded gross transfers and their earned assessments",
        locator: JSON.stringify(
          group.rows.map((row) => ({
            paymentId: row.id,
            assessmentId: row.earnedLawPayAssessmentId,
            workplaceFactIds: payWorkplaceAt(
              world,
              recordById(
                world.history.earnedLawPayAssessments ?? [],
                row.earnedLawPayAssessmentId!,
              )!.workRelationshipId,
              recordById(
                world.history.earnedLawPayAssessments ?? [],
                row.earnedLawPayAssessmentId!,
              )!.earnedCutoff,
            ).factRecordIds,
          })),
        ),
      },
      methodologyKey: "payroll.recorded-completed-gross",
      releaseDate: world.currentDate,
      recordedAt: world.currentDate,
      vintageKey: `payroll.sequence-${next.history.nextSequence}`,
      uncertainty: { kind: "none" },
      supersedesObservationId: previous?.id ?? null,
      underlyingStateId: null,
    });
  }
  return next;
}
