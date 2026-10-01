import { addDays, daysBetween } from "./dates";
import { recordById, recordsWithFieldValue } from "./history-index";
import { recordLawExposure } from "./law-exposure";
import { money } from "./resources";
import type { EntityId, IsoDate, MoneyAmount, World } from "./types";

/** Law-attributed changes between actual, comparable completed paychecks. */
export interface RecordedLawPayChange {
  readonly personId: EntityId;
  readonly measureId: EntityId;
  readonly termsId: EntityId;
  readonly previousOutcomeId: EntityId;
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
 * This reader writes no pay and invents no tax counterfactual or monthly sum.
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
  const changes: RecordedLawPayChange[] = [];
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
    const stableKey = `${LAW_EFFECTS_NOTICED_VERSION}:paid:${change.termsId}`;
    if (noticed.has(stableKey) || !world.people[change.personId]) continue;
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
