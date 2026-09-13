import type {
  EntityId,
  HistoricalEvent,
  PersonnelJustCauseGround,
  World,
} from "../simulation/types";

export const PERSONNEL_INFORMAL_SUBJECT_TAG =
  "personnel:informal-resolution-subject";
export const PERSONNEL_JUST_CAUSE_TAG_PREFIX = "personnel:just-cause:";

export const PERSONNEL_GROUND_LABELS: Record<PersonnelJustCauseGround, string> =
  {
    "consistent-failure-to-perform":
      "Consistent failure to perform assigned duties",
    "substandard-performance": "Substandard performance",
    insubordination: "Insubordination",
    "serious-policy-violation":
      "Serious violation of written policies applied uniformly",
  };

export interface PersonnelEvidenceOption {
  readonly eventId: EntityId;
  readonly occurredAt: string;
  readonly summary: string;
  readonly label: string;
}

function controlledPersonId(world: World): EntityId | null {
  return world.control.kind === "person" ? world.control.personId : null;
}

function incumbentPersonId(
  world: World,
  incumbencyId: EntityId,
): EntityId | null {
  const record = (world.history.personnelRecords ?? []).find(
    (candidate) => candidate.id === incumbencyId,
  );
  return record?.kind === "incumbency" ? record.personId : null;
}

function actorKnowsEvent(
  world: World,
  actorPersonId: EntityId,
  event: HistoricalEvent,
): boolean {
  if (event.participants.some((entry) => entry.personId === actorPersonId)) {
    return true;
  }
  return world.history.knowledge.some(
    (entry) =>
      entry.personId === actorPersonId &&
      entry.eventId === event.id &&
      entry.accuracy === "accurate",
  );
}

/**
 * The form cannot author its own allegation. A selectable record must already
 * be a dated canonical event about this employee, be accurately known to the
 * controlled authority, and carry the feature tag supplied by its producer.
 */
export function personnelEvidenceOptions(
  world: World,
  incumbencyId: EntityId,
  purpose:
    | { readonly kind: "informal-resolution" }
    | {
        readonly kind: "discipline";
        readonly ground: PersonnelJustCauseGround;
      },
): readonly PersonnelEvidenceOption[] {
  const actorPersonId = controlledPersonId(world);
  const employeePersonId = incumbentPersonId(world, incumbencyId);
  if (!actorPersonId || !employeePersonId) return [];
  const requiredTag =
    purpose.kind === "informal-resolution"
      ? PERSONNEL_INFORMAL_SUBJECT_TAG
      : `${PERSONNEL_JUST_CAUSE_TAG_PREFIX}${purpose.ground}`;
  return world.history.events
    .filter(
      (event) =>
        event.occurredAt <= world.currentDate &&
        event.tags.includes(requiredTag) &&
        (event.involvedEntityIds.includes(employeePersonId) ||
          event.participants.some(
            (entry) => entry.personId === employeePersonId,
          )) &&
        actorKnowsEvent(world, actorPersonId, event),
    )
    .sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) ||
        right.sequence - left.sequence,
    )
    .map((event) => ({
      eventId: event.id,
      occurredAt: event.occurredAt,
      summary: event.summary,
      label: `${event.occurredAt} — ${event.summary}`,
    }));
}

export function generatedInformalResolutionNote(
  evidence: PersonnelEvidenceOption,
): string {
  return `Discussed the recorded episode from ${evidence.occurredAt}: ${evidence.summary}`;
}

export function generatedDisciplineReasons(
  ground: PersonnelJustCauseGround,
  evidence: PersonnelEvidenceOption,
): string {
  return `${PERSONNEL_GROUND_LABELS[ground]}. The supporting record dated ${evidence.occurredAt} states: ${evidence.summary}`;
}

export function generatedDisciplineNoticePreview(
  heading: string,
  action: "reprimand" | "discharge",
  ground: PersonnelJustCauseGround,
  evidence: PersonnelEvidenceOption,
): string {
  const actionLabel = action === "discharge" ? "Discharge" : "Reprimand";
  return `${actionLabel} notice for ${heading}. Cause: ${PERSONNEL_GROUND_LABELS[ground]}. Supporting record, ${evidence.occurredAt}: ${evidence.summary}`;
}
