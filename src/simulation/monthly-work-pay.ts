import { addDays, daysBetween, makeIsoDate } from "./dates";
import { recordById, recordsWithFieldValue } from "./history-index";
import { workStatusAt } from "./life-queries";
import { resourceFlowTermsAt } from "./resource-queries";
import type { EntityId, IsoDate, MoneyAmount, World } from "./types";

export interface MonthlyWorkPayInput {
  readonly resourceFlowId: EntityId;
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly onDate: IsoDate;
  readonly historySequenceExclusive: number;
}

export interface MonthlyWorkPayResult {
  readonly resourceFlowId: EntityId;
  readonly workRelationshipId: EntityId;
  readonly personId: EntityId;
  readonly organizationId: EntityId;
  readonly termsId: EntityId;
  readonly heldDays: number;
  readonly calendarDays: number;
  readonly gross: MoneyAmount;
}

export interface LegacyMonthlyPayCoverage {
  readonly outcomeId: EntityId;
  readonly resourceFlowId: EntityId;
  readonly termsId: EntityId;
  readonly periodStartsAt: IsoDate;
  readonly periodEndsAt: IsoDate;
  readonly nextPeriodStartsAt: IsoDate;
  readonly gross: MoneyAmount;
}

/** Ruling 20: interpret an already-saved first-of-month wage point, read-only.
 * The old local-business writer used general flow references, so this query
 * does not manufacture a work binding. It is not permission for a new write;
 * the payment writer remains strict and admission belongs to saved-record integrity.
 */
export function legacyMonthlyPayCoverage(
  world: World,
  outcomeId: EntityId,
): LegacyMonthlyPayCoverage | null {
  const outcome = recordById(world.history.resourceTransferOutcomes, outcomeId);
  if (
    !outcome ||
    outcome.sequence >= world.history.nextSequence ||
    outcome.occurredAt > world.currentDate ||
    !outcome.occurredAt.endsWith("-01") ||
    outcome.periodStartsAt !== outcome.occurredAt ||
    outcome.periodEndsAt !== outcome.occurredAt ||
    outcome.earnedLawPayAssessmentId !== undefined
  )
    return null;
  const flow = recordById(world.history.resourceFlows, outcome.resourceFlowId);
  if (
    !flow ||
    flow.sequence >= outcome.sequence ||
    flow.startsAt >= outcome.occurredAt ||
    flow.basisKind !== "compensation:wages" ||
    flow.source.kind !== "organization" ||
    flow.recipient.kind !== "person" ||
    outcome.stableKey !== `${flow.stableKey}:${outcome.occurredAt}`
  )
    return null;
  const terms = resourceFlowTermsAt(world, flow.id, {
    asOfDate: outcome.occurredAt,
    historySequenceExclusive: outcome.sequence,
  });
  if (
    !terms ||
    terms.status !== "active" ||
    terms.cadenceKind !== "schedule:monthly"
  )
    return null;
  const periodEndsAt = addDays(outcome.occurredAt, -1);
  return {
    outcomeId: outcome.id,
    resourceFlowId: flow.id,
    termsId: terms.id,
    periodStartsAt: makeIsoDate(`${periodEndsAt.slice(0, 8)}01`),
    periodEndsAt,
    nextPeriodStartsAt: outcome.occurredAt,
    gross: terms.amount,
  };
}

/** Read-only calendar earnings from saved work and terms, never a supplied gross.
 * Both payment and reload validation must use their own history frontier.
 * No pay-writer, resource-writer, or world-writer imports belong in this leaf.
 */
export function monthlyWorkPay(
  world: World,
  input: MonthlyWorkPayInput,
): MonthlyWorkPayResult {
  const { periodStartsAt, periodEndsAt, onDate, historySequenceExclusive } =
    input;
  if (
    !Number.isSafeInteger(historySequenceExclusive) ||
    historySequenceExclusive <= 0 ||
    historySequenceExclusive > world.history.nextSequence ||
    onDate > world.currentDate
  )
    throw new Error(
      "Monthly work pay requires an actual saved history frontier.",
    );
  const first = makeIsoDate(`${onDate.slice(0, 8)}01`);
  const [year, month] = onDate.split("-").map(Number) as [number, number];
  const last = makeIsoDate(
    `${onDate.slice(0, 8)}${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0")}`,
  );
  if (
    onDate !== last ||
    periodEndsAt !== last ||
    periodStartsAt < first ||
    periodStartsAt > last
  )
    throw new Error("Monthly work pay requires its actual calendar-month end.");
  const flow = recordById(world.history.resourceFlows, input.resourceFlowId);
  if (
    !flow ||
    flow.sequence >= historySequenceExclusive ||
    flow.startsAt > periodStartsAt ||
    flow.basisReference.kind !== "work" ||
    flow.source.kind !== "organization" ||
    flow.recipient.kind !== "person"
  )
    throw new Error(
      "Monthly work pay requires its saved worker and employer flow.",
    );
  const work = recordById(
    world.history.workRelationships,
    flow.basisReference.workRelationshipId,
  );
  const employer = recordById(
    world.history.organizations,
    flow.source.organizationId,
  );
  if (
    !work ||
    work.sequence >= historySequenceExclusive ||
    work.startedAt > periodStartsAt ||
    work.personId !== flow.recipient.personId ||
    work.organizationId !== flow.source.organizationId ||
    !world.people[work.personId] ||
    !employer ||
    employer.sequence >= historySequenceExclusive ||
    employer.formedAt > periodStartsAt
  )
    throw new Error(
      "Monthly work pay must bind the actual worker and employer.",
    );
  const terms = resourceFlowTermsAt(world, flow.id, {
    asOfDate: periodStartsAt,
    historySequenceExclusive,
  });
  if (
    !terms ||
    terms.status !== "active" ||
    terms.cadenceKind !== "schedule:monthly" ||
    !Number.isSafeInteger(terms.amount.minorUnits) ||
    terms.amount.minorUnits <= 0
  )
    throw new Error("Monthly work pay requires active saved monthly terms.");
  if (
    recordsWithFieldValue(
      world.history.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    ).some(
      (record) =>
        record.sequence < historySequenceExclusive &&
        record.effectiveAt > periodStartsAt &&
        record.effectiveAt <= periodEndsAt,
    )
  )
    throw new Error(
      "Monthly work pay cannot cross an unprorated terms change.",
    );
  const deaths = recordsWithFieldValue(
    world.history.personDeaths,
    "personId",
    work.personId,
  ).filter((record) => record.sequence < historySequenceExclusive);
  const calendarDays = daysBetween(first, last) + 1;
  let heldDays = 0;
  for (let day = periodStartsAt; day <= periodEndsAt; day = addDays(day, 1)) {
    if (deaths.some((death) => death.diedAt <= day)) continue;
    if (
      workStatusAt(world, work.id, {
        asOfDate: day,
        historySequenceExclusive,
      })?.status === "active"
    )
      heldDays += 1;
  }
  const grossMinor = Math.round(
    (terms.amount.minorUnits * heldDays) / calendarDays,
  );
  if (!Number.isSafeInteger(grossMinor))
    throw new Error(
      "Monthly work pay requires a safe whole minor-unit amount.",
    );
  return {
    resourceFlowId: flow.id,
    workRelationshipId: work.id,
    personId: work.personId,
    organizationId: work.organizationId,
    termsId: terms.id,
    heldDays,
    calendarDays,
    gross: { minorUnits: grossMinor, currency: terms.amount.currency },
  };
}
