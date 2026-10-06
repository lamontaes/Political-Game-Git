import { assertSimulationMoment, compareSimulationMoments } from "../dates";
import { recordWorldEvent } from "../world";
import { recordsByStringField } from "../history-index";
import type {
  EntityId,
  EvidenceRecordProvenance,
  SimulationMoment,
  World,
} from "../types";

/** A recorded interval away, not termination, unpaid leave, or an invented destination. */
export const WORK_ABSENCE_KIND = "life.whereabouts.absence-recorded";
export interface WorkAbsence {
  readonly personId: EntityId;
  readonly startsAt: SimulationMoment;
  readonly endsAt: SimulationMoment;
  readonly reason: string;
  readonly recordedMoment: SimulationMoment;
}

export function recordWorkAbsence(
  world: World,
  input: {
    readonly stableKey: string;
    readonly personId: EntityId;
    readonly startsAt: SimulationMoment;
    readonly endsAt: SimulationMoment;
    readonly reason: string;
    readonly provenance: EvidenceRecordProvenance;
  },
): World {
  assertSimulationMoment(input.startsAt);
  assertSimulationMoment(input.endsAt);
  if (!world.people[input.personId] || !input.reason.trim())
    throw new Error("Absence requires an existing person and a reason.");
  if (
    compareSimulationMoments(input.startsAt, world.currentMoment) < 0 ||
    compareSimulationMoments(input.endsAt, input.startsAt) <= 0
  )
    throw new Error("Absence must start now or later and end after its start.");
  const absence: WorkAbsence = {
    personId: input.personId,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    reason: input.reason,
    recordedMoment: world.currentMoment,
  };
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: WORK_ABSENCE_KIND,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [input.personId],
    participants: [
      { personId: input.personId, role: "focus:subject", detail: input.reason },
    ],
    personFactConstraints: [],
    visibility: "private",
    summary: input.reason,
    tags: [
      `whereabouts-absence:v1:${JSON.stringify(absence)}`,
      `provenance:${JSON.stringify(input.provenance)}`,
    ],
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: input.reason,
      motivation: null,
      immediateReaction: null,
    },
  });
}

type AbsenceRow = {
  recordId: EntityId;
  sequence: number;
  absence: WorkAbsence;
};
const INDEXES = new WeakMap<
  object,
  ReadonlyMap<EntityId, readonly AbsenceRow[]>
>();

/** Indexed by the unchanged absence event group, not rebuilt on unrelated writes. */
export function workAbsenceAt(
  world: World,
  personId: EntityId,
  moment: SimulationMoment,
) {
  const records = recordsByStringField(
    world.history.events,
    "type",
    WORK_ABSENCE_KIND,
  );
  let index = INDEXES.get(records);
  if (!index) {
    const byPerson = new Map<
      EntityId,
      { recordId: EntityId; sequence: number; absence: WorkAbsence }[]
    >();
    for (const record of records) {
      const tag = record.tags.find((value) =>
        value.startsWith("whereabouts-absence:v1:"),
      );
      if (!tag) continue;
      try {
        const absence = JSON.parse(
          tag.slice("whereabouts-absence:v1:".length),
        ) as WorkAbsence;
        if (
          !record.involvedEntityIds.includes(absence.personId) ||
          !absence.startsAt ||
          !absence.endsAt ||
          !absence.recordedMoment ||
          !absence.reason
        )
          continue;
        assertSimulationMoment(absence.startsAt);
        assertSimulationMoment(absence.endsAt);
        assertSimulationMoment(absence.recordedMoment);
        if (compareSimulationMoments(absence.endsAt, absence.startsAt) <= 0)
          continue;
        const rows = byPerson.get(absence.personId) ?? [];
        rows.push({ recordId: record.id, sequence: record.sequence, absence });
        byPerson.set(absence.personId, rows);
      } catch {
        /* Malformed legacy evidence cannot authorize presence or absence. */
      }
    }
    index = byPerson;
    INDEXES.set(records, index);
  }
  return (
    (index.get(personId) ?? [])
      .filter(
        ({ absence }) =>
          compareSimulationMoments(absence.recordedMoment, moment) <= 0 &&
          compareSimulationMoments(absence.startsAt, moment) <= 0 &&
          compareSimulationMoments(moment, absence.endsAt) < 0,
      )
      .at(-1) ?? null
  );
}
