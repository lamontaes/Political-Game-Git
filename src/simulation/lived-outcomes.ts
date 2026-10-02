import { eventById, eventIndexOf } from "./event-index";
import { recordsByStringField } from "./history-index";
import {
  workRelationshipHistoryForPerson,
  workStatusHistory,
} from "./life-queries";
import { TOWN_JOB_END_REASONS } from "./living-world/town-labor-market";
import { crisisRecords } from "./crisis/records";
import type { HealthCoverageRecord } from "./crisis/types";
import type {
  EntityId,
  HistoricalEvent,
  IsoDate,
  MindSourceReference,
  World,
} from "./types";

/**
 * What a person actually went through, read from the records the game
 * already saves: a job they lost, public health coverage they lost, a rent
 * raise when their lease renewed, and a crime committed against them.
 *
 * Principle formation (`principles-from-life.ts`) reads the job and crime
 * records here, and belief formation reads all four, so a person's
 * principles and their views of policies and officials stand on the same
 * facts. Nothing is drawn: an outcome is listed only when a saved record
 * says it happened to this person, on or before today.
 */

export type LivedOutcomeKind =
  "job-lost" | "coverage-lost" | "rent-raised" | "crime-against";

export interface LivedOutcome {
  readonly kind: LivedOutcomeKind;
  /** The day it happened to the person. */
  readonly on: IsoDate;
  /** The saved record that says it happened. */
  readonly recordId: EntityId;
  readonly sourceRef: MindSourceReference;
}

/** Job ends a person did not choose: a layoff or the business closing. */
export function jobsLostBy(
  world: World,
  personId: EntityId,
): readonly LivedOutcome[] {
  const lost: LivedOutcome[] = [];
  for (const relationship of workRelationshipHistoryForPerson(world, personId))
    for (const status of workStatusHistory(world, relationship.id))
      if (
        status.status === "ended" &&
        (status.reason === TOWN_JOB_END_REASONS.laidOff ||
          status.reason === TOWN_JOB_END_REASONS.businessClosed)
      )
        lost.push({
          kind: "job-lost",
          on: status.effectiveAt,
          recordId: status.id,
          sourceRef: {
            kind: "life-history",
            reference: { family: "work-status", recordId: status.id },
          },
        });
  return lost;
}

const VICTIM_EVENTS = new WeakMap<
  readonly HistoricalEvent[],
  ReadonlyMap<EntityId, readonly EntityId[]>
>();

/** The crimes each person was the victim of, indexed once per history. */
export function crimesAgainst(
  world: World,
  personId: EntityId,
): readonly EntityId[] {
  const events = world.history.events;
  let index = VICTIM_EVENTS.get(events);
  if (!index) {
    const built = new Map<EntityId, EntityId[]>();
    for (const event of eventIndexOf(events).values())
      for (const participant of event.participants)
        if (
          participant.role === "impact:crime-victim" &&
          participant.personId
        ) {
          const list = built.get(participant.personId) ?? [];
          list.push(event.id);
          built.set(participant.personId, list);
        }
    VICTIM_EVENTS.set(events, built);
    index = built;
  }
  return (index.get(personId) ?? []).filter(
    (id) => (eventById(world, id)?.occurredAt ?? "") <= world.currentDate,
  );
}

/**
 * Public coverage the person held and then lost. A record that the person
 * was never covered is not a loss, and neither is a decision the game could
 * not make for missing facts: the coverage pass writes no record for those.
 */
export function coverageLostBy(
  world: World,
  personId: EntityId,
): readonly LivedOutcome[] {
  const lost: LivedOutcome[] = [];
  let held = false;
  for (const record of crisisRecords(world)) {
    if (record.kind !== "health-coverage") continue;
    const coverage = record as HealthCoverageRecord;
    if (coverage.personId !== personId) continue;
    if (coverage.effectiveAt > world.currentDate) continue;
    if (held && !coverage.covered)
      lost.push({
        kind: "coverage-lost",
        on: coverage.effectiveAt,
        recordId: coverage.id,
        sourceRef: { kind: "crisis-record", recordId: coverage.id },
      });
    held = coverage.covered;
  }
  return lost;
}

/**
 * Rent raised on a lease the person pays: new terms on the lease's payment
 * that replace earlier terms with a larger amount.
 */
export function rentRaisesFor(
  world: World,
  personId: EntityId,
): readonly LivedOutcome[] {
  const raised: LivedOutcome[] = [];
  const h = world.history;
  for (const obligation of h.resourceObligations) {
    if (!obligation.basisKind.startsWith("housing:lease")) continue;
    const flow = h.resourceFlows.find(
      (row) => row.id === obligation.resourceFlowId,
    );
    if (
      !flow ||
      flow.source.kind !== "person" ||
      flow.source.personId !== personId
    )
      continue;
    const terms = recordsByStringField(
      h.resourceFlowTerms,
      "resourceFlowId",
      flow.id,
    );
    for (const row of terms) {
      if (!row.supersedesTermsId || row.effectiveAt > world.currentDate)
        continue;
      const prior = terms.find(
        (earlier) => earlier.id === row.supersedesTermsId,
      );
      if (
        prior &&
        prior.amount.currency === row.amount.currency &&
        row.amount.minorUnits > prior.amount.minorUnits
      )
        raised.push({
          kind: "rent-raised",
          on: row.effectiveAt,
          recordId: row.id,
          sourceRef: {
            kind: "life-history",
            reference: { family: "resource-flow-terms", recordId: row.id },
          },
        });
    }
  }
  return raised;
}

/** Everything of the four the person lived through, oldest first. */
export function livedOutcomesOf(
  world: World,
  personId: EntityId,
): readonly LivedOutcome[] {
  const crimes: LivedOutcome[] = crimesAgainst(world, personId).map(
    (eventId) => ({
      kind: "crime-against",
      on: eventById(world, eventId)!.occurredAt,
      recordId: eventId,
      sourceRef: { kind: "historical-event", eventId },
    }),
  );
  return [
    ...jobsLostBy(world, personId),
    ...coverageLostBy(world, personId),
    ...rentRaisesFor(world, personId),
    ...crimes,
  ].sort((a, b) =>
    a.on < b.on ? -1 : a.on > b.on ? 1 : a.recordId < b.recordId ? -1 : 1,
  );
}
