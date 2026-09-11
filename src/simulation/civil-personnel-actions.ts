import sourceData from "./civil-personnel-sources.json";
import { addDays, daysBetween, makeIsoDate } from "./dates";
import { addSimulationMinutes } from "./dates";
import { evaluateDecision, recordDurableDecisionTrace } from "./decisions";
import { recordEvidenceArtifact, recordEvidenceDiscovery } from "./evidence";
import { createStableId } from "./ids";
import { createWorkRelationship, recordWorkStatus } from "./life";
import {
  lifePlaceByJurisdictionId,
  stateJurisdictionForKey,
} from "./life-places";
import {
  activeOrganizationParticipationsAt,
  activeWorkRelationshipsAt,
  currentLifeCutoff,
  organizationProfileAt,
  workRoleAt,
  workStatusAt,
} from "./life-queries";
import { currentHistoricalCutoff } from "./queries";
import { personName } from "./people";
import { recordEventKnowledge } from "./records";
import {
  createScheduledActivity,
  createWorkItem,
  performScheduledActivity,
  scheduledActivityState,
  workItemState,
} from "./time-work";
import { isPersonAliveAt } from "./vitality-integrity";
import { assertWorldIntegrity, recordWorldEvent } from "./world";
import { personnelRecords } from "./civil-personnel-integrity";
import type {
  PersonnelProcedure,
  PersonnelProcedureKey,
  PersonnelSourceProjection,
} from "./civil-personnel-contract";
import type {
  EntityId,
  EventParticipant,
  FutureTransitionHandlerRegistry,
  HistoricalCutoff,
  IsoDate,
  OrganizationParticipationRoleKind,
  PersonnelAppealRecord,
  PersonnelAuthorityBasis,
  PersonnelAuthorityDesignationRecord,
  PersonnelCivilClass,
  PersonnelDisciplinaryActionRecord,
  PersonnelIncumbencyRecord,
  PersonnelJustCauseGround,
  PersonnelOfferResponseRecord,
  PersonnelPositionRecord,
  PersonnelPower,
  PersonnelRecord,
  PersonnelReinstatementOfferRecord,
  World,
} from "./types";

const sources = sourceData as unknown as PersonnelSourceProjection;
const PREFIX = "civil-personnel";

export type PersonnelResult =
  | { readonly ok: true; readonly world: World; readonly recordId: EntityId }
  | { readonly ok: false; readonly world: World; readonly reason: string };

// ---------------------------------------------------------------------------
// Sourced procedures and their dates
// ---------------------------------------------------------------------------

export function personnelProcedure(
  key: PersonnelProcedureKey,
): PersonnelProcedure {
  const found = sources.procedures.find((p) => p.key === key);
  if (!found) throw new Error(`Missing personnel procedure ${key}.`);
  return found;
}

export function personnelProcedures(): readonly PersonnelProcedure[] {
  return sources.procedures;
}

/**
 * Current publisher text supports dates on or after its observation and no
 * earlier date, matching the accepted qualification consumer. It is never
 * back-dated into a character's past.
 */
export function procedureApplicability(
  key: PersonnelProcedureKey,
  onDate: IsoDate,
):
  | { readonly state: "SUPPORTED" }
  | { readonly state: "UNKNOWN"; readonly reason: string } {
  const procedure = personnelProcedure(key);
  if (onDate < procedure.validity.observedOn)
    return {
      state: "UNKNOWN",
      reason: `${procedure.citation.citation} was observed in current text on ${procedure.validity.observedOn}; that does not establish it on ${onDate}.`,
    };
  return { state: "SUPPORTED" };
}

function numberTerm(key: PersonnelProcedureKey, name: string): number {
  const value = personnelProcedure(key).terms[name];
  if (typeof value !== "number")
    throw new Error(`${key} does not fix numeric term ${name}.`);
  return value;
}

export function justCauseGrounds(): readonly PersonnelJustCauseGround[] {
  const value = personnelProcedure("mn-just-cause-grounds").terms.grounds;
  if (!Array.isArray(value))
    throw new Error("Just-cause grounds are not transcribed.");
  return value as readonly PersonnelJustCauseGround[];
}

// ---------------------------------------------------------------------------
// Canonical reads
// ---------------------------------------------------------------------------

function cutoffOn(world: World, date: IsoDate): HistoricalCutoff {
  return {
    asOfDate: date,
    historySequenceExclusive: world.history.nextSequence,
  };
}

function recordById<K extends PersonnelRecord["kind"]>(
  world: World,
  id: EntityId,
  kind: K,
): Extract<PersonnelRecord, { kind: K }> | null {
  const found = personnelRecords(world).find((r) => r.id === id);
  return found && found.kind === kind
    ? (found as Extract<PersonnelRecord, { kind: K }>)
    : null;
}

function recordsOf<K extends PersonnelRecord["kind"]>(
  world: World,
  kind: K,
): readonly Extract<PersonnelRecord, { kind: K }>[] {
  return personnelRecords(world).filter(
    (r): r is Extract<PersonnelRecord, { kind: K }> => r.kind === kind,
  );
}

/** A state key is read from the organization's recorded location, never its name. */
export function personnelStateKeyForJurisdiction(
  jurisdictionId: EntityId | null,
): string | null {
  if (!jurisdictionId) return null;
  const place = lifePlaceByJurisdictionId(jurisdictionId);
  if (place?.stateJurisdictionKey) return place.stateJurisdictionKey;
  for (const profile of sources.profiles) {
    if (profile.employerLevel !== "state") continue;
    if (stateJurisdictionForKey(profile.jurisdictionKey)?.id === jurisdictionId)
      return profile.jurisdictionKey;
  }
  return null;
}

export function personnelPositions(
  world: World,
): readonly PersonnelPositionRecord[] {
  return recordsOf(world, "position");
}

export function personnelIncumbencyForWork(
  world: World,
  workRelationshipId: EntityId,
): PersonnelIncumbencyRecord | null {
  return (
    recordsOf(world, "incumbency").find(
      (i) => i.workRelationshipId === workRelationshipId,
    ) ?? null
  );
}

/** An incumbency is current only while its LIFE work relationship is active. */
export function incumbencyIsActive(
  world: World,
  incumbency: PersonnelIncumbencyRecord,
): boolean {
  return (
    workStatusAt(world, incumbency.workRelationshipId)?.status === "active"
  );
}

function separationDate(
  world: World,
  incumbency: PersonnelIncumbencyRecord,
): IsoDate | null {
  const status = workStatusAt(world, incumbency.workRelationshipId);
  return status?.status === "ended" ? status.effectiveAt : null;
}

export function positionIsVacant(world: World, positionId: EntityId): boolean {
  return !recordsOf(world, "incumbency").some((i) => {
    if (i.positionId !== positionId) return false;
    const status = workStatusAt(world, i.workRelationshipId)?.status;
    return status !== "ended";
  });
}

export type PersonnelAuthorityResolution =
  | {
      readonly ok: true;
      readonly designation: PersonnelAuthorityDesignationRecord;
    }
  | { readonly ok: false; readonly reason: string };

/**
 * The person must currently hold the exact leadership role an active
 * designation empowers. A title, kinship, friendship or bargaining right does
 * not stand in for that role.
 */
export function personnelAuthority(
  world: World,
  personId: EntityId,
  power: PersonnelPower,
  target: {
    readonly organizationId: EntityId | null;
    readonly jurisdictionKey: string;
  },
): PersonnelAuthorityResolution {
  const cutoff = currentLifeCutoff(world);
  if (!world.people[personId] || !isPersonAliveAt(world, personId, cutoff))
    return { ok: false, reason: "Only a living person can act." };
  const designations = recordsOf(world, "authority-designation").filter(
    (d) =>
      d.power === power &&
      d.jurisdictionKey === target.jurisdictionKey &&
      d.recordedAt <= world.currentDate &&
      (d.scope === "jurisdiction" ||
        d.organizationId === target.organizationId),
  );
  if (designations.length === 0)
    return {
      ok: false,
      reason:
        power === "appointing-authority"
          ? "No appointing authority is established for this employer. Acquired law names none, and no charter designates one."
          : "No holder of this statutory office is established in this world.",
    };
  const roles = activeOrganizationParticipationsAt(world, personId, cutoff);
  const designation = designations.find((d) =>
    roles.some(
      (r) =>
        r.participation.organizationId === d.organizationId &&
        r.state.roleKind === d.roleKind,
    ),
  );
  if (!designation)
    return {
      ok: false,
      reason:
        power === "appointing-authority"
          ? "You do not hold this employer's designated appointing-authority role."
          : "You do not hold the statutory office that makes this decision.",
    };
  return { ok: true, designation };
}

function controlledActor(world: World): EntityId | null {
  if (world.control.kind !== "person") return null;
  const personId = world.control.personId;
  return isPersonAliveAt(world, personId, currentLifeCutoff(world))
    ? personId
    : null;
}

function refuse(world: World, reason: string): PersonnelResult {
  return { ok: false, world, reason };
}

function text(value: string, label: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 0 || trimmed.length > 4000
    ? `${label} must be between 1 and 4,000 characters.`
    : null;
}

// ---------------------------------------------------------------------------
// Record appending
// ---------------------------------------------------------------------------

type NewRecord = PersonnelRecord extends infer R
  ? R extends PersonnelRecord
    ? Omit<R, "id" | "sequence" | "recordedAt" | "eventId" | "stableKey">
    : never
  : never;

function appendRecord(
  world: World,
  stableKey: string,
  eventId: EntityId,
  record: NewRecord,
): { world: World; id: EntityId } {
  const id = createStableId("personnel-record", `${world.id}:${stableKey}`);
  const full = {
    ...record,
    id,
    stableKey,
    sequence: world.history.nextSequence,
    recordedAt: world.currentDate,
    eventId,
  } as PersonnelRecord;
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      personnelRecords: [...personnelRecords(world), full],
    },
  };
  assertWorldIntegrity(next);
  return { world: next, id };
}

function personnelEvent(
  world: World,
  input: {
    readonly stableKey: string;
    readonly kind: PersonnelRecord["kind"];
    readonly jurisdictionId: EntityId | null;
    readonly involved: readonly EntityId[];
    readonly participants: readonly EventParticipant[];
    readonly visibility: "private" | "limited" | "public";
    readonly summary: string;
    readonly choice: string | null;
    readonly setting: string;
  },
): { world: World; eventId: EntityId } {
  const next = recordWorldEvent(world, {
    stableKey: `${input.stableKey}:event`,
    type: `${PREFIX}.${input.kind}`,
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [...new Set(input.involved)],
    participants: input.participants,
    personFactConstraints: [],
    visibility: input.visibility,
    tags: [PREFIX, `${PREFIX}.${input.kind}`],
    summary: input.summary,
    context: {
      location: input.jurisdictionId
        ? {
            jurisdictionId: input.jurisdictionId,
            label: input.setting,
            setting: "Public personnel procedure",
          }
        : null,
      socialContext: "A public personnel procedure.",
      pressure: null,
      choice: input.choice,
      motivation: null,
      immediateReaction: null,
    },
  });
  return { world: next, eventId: next.history.events.at(-1)!.id };
}

function completeWorkItem(
  world: World,
  workItemId: EntityId,
  outcomeEventId: EntityId,
  key: string,
): World {
  const previous = workItemState(world, workItemId);
  if (previous.status !== "active") return world;
  const stableKey = `${key}:state:completed`;
  const next: World = {
    ...world,
    history: {
      ...world.history,
      nextSequence: world.history.nextSequence + 1,
      workItemStates: [
        ...world.history.workItemStates,
        {
          ...previous,
          id: createStableId("work-item-state", `${world.id}:${stableKey}`),
          stableKey,
          sequence: world.history.nextSequence,
          recordedAt: world.currentMoment,
          status: "completed",
          playerRequirement: "none",
          waitingOnPersonIds: [],
          blocker: null,
          outcomeEventId,
          supersedesStateId: previous.id,
        },
      ],
    },
  };
  assertWorldIntegrity(next);
  return next;
}

function organizationJurisdiction(
  world: World,
  organizationId: EntityId,
): EntityId | null {
  return (
    organizationProfileAt(world, organizationId)?.locationJurisdictionId ?? null
  );
}

// ---------------------------------------------------------------------------
// Authored setup. These are scenario and content writers, never panel actions:
// no player can designate their own authority.
// ---------------------------------------------------------------------------

export interface EstablishPersonnelDesignationInput {
  readonly stableKey: string;
  readonly organizationId: EntityId;
  readonly roleKind: OrganizationParticipationRoleKind;
  readonly power: PersonnelPower;
  readonly jurisdictionKey: string;
  readonly basis: PersonnelAuthorityBasis;
}

export function establishPersonnelDesignation(
  world: World,
  input: EstablishPersonnelDesignationInput,
): PersonnelResult {
  const profile = organizationProfileAt(world, input.organizationId);
  if (!profile) return refuse(world, "The organization must already exist.");
  const stateKey = personnelStateKeyForJurisdiction(
    profile.locationJurisdictionId,
  );
  if (
    input.basis.kind === "authored-charter" &&
    stateKey !== input.jurisdictionKey
  )
    return refuse(
      world,
      "A charter can designate authority only for an employer located in its state.",
    );
  const basis = input.basis;
  if (basis.kind === "statute") {
    const procedure = sources.procedures.find(
      (p) => p.key === basis.procedureKey,
    );
    if (!procedure || procedure.jurisdictionKey !== input.jurisdictionKey)
      return refuse(
        world,
        "That statute does not belong to this jurisdiction.",
      );
  }
  try {
    const event = personnelEvent(world, {
      stableKey: `${PREFIX}:${input.stableKey}`,
      kind: "authority-designation",
      jurisdictionId: profile.locationJurisdictionId,
      involved: [input.organizationId],
      participants: [],
      visibility: "public",
      summary:
        input.basis.kind === "statute"
          ? `${profile.name} holds a statutory personnel office.`
          : `${profile.name}'s charter designates its appointing authority.`,
      choice: null,
      setting: profile.name,
    });
    const scope =
      input.basis.kind === "statute"
        ? "jurisdiction"
        : "employing-organization";
    const result = appendRecord(
      event.world,
      `${PREFIX}:${input.stableKey}`,
      event.eventId,
      {
        kind: "authority-designation",
        jurisdictionKey: input.jurisdictionKey,
        organizationId: input.organizationId,
        roleKind: input.roleKind,
        power: input.power,
        scope,
        basis: input.basis,
      },
    );
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

export interface EstablishPersonnelPositionInput {
  readonly stableKey: string;
  readonly organizationId: EntityId;
  readonly title: string;
  readonly classKey: string;
  readonly civilClass: PersonnelCivilClass;
  readonly bargainingCoverage: PersonnelPositionRecord["bargainingCoverage"];
  readonly agreementCoverage: PersonnelPositionRecord["agreementCoverage"];
  readonly note: string;
}

export function establishPersonnelPosition(
  world: World,
  input: EstablishPersonnelPositionInput,
): PersonnelResult {
  const profile = organizationProfileAt(world, input.organizationId);
  const stateKey = personnelStateKeyForJurisdiction(
    profile?.locationJurisdictionId ?? null,
  );
  if (!profile || !stateKey)
    return refuse(
      world,
      "A position needs an employer located in a known state.",
    );
  try {
    const event = personnelEvent(world, {
      stableKey: `${PREFIX}:${input.stableKey}`,
      kind: "position",
      jurisdictionId: profile.locationJurisdictionId,
      involved: [input.organizationId],
      participants: [],
      visibility: "public",
      summary: `${profile.name} has an authorized ${input.title} position.`,
      choice: null,
      setting: profile.name,
    });
    const result = appendRecord(
      event.world,
      `${PREFIX}:${input.stableKey}`,
      event.eventId,
      {
        kind: "position",
        jurisdictionKey: stateKey,
        organizationId: input.organizationId,
        title: input.title,
        classKey: input.classKey,
        civilClass: input.civilClass,
        bargainingCoverage: input.bargainingCoverage,
        agreementCoverage: input.agreementCoverage,
        basis: { kind: "authored-charter", note: input.note },
      },
    );
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

/** Binds an existing LIFE employment to a position for an authored scenario. */
export function establishPersonnelIncumbency(
  world: World,
  input: {
    readonly stableKey: string;
    readonly positionId: EntityId;
    readonly workRelationshipId: EntityId;
    readonly tenure: PersonnelIncumbencyRecord["tenure"];
    readonly note: string;
  },
): PersonnelResult {
  const position = recordById(world, input.positionId, "position");
  const work = world.history.workRelationships.find(
    (w) => w.id === input.workRelationshipId,
  );
  if (!position || !work || work.organizationId !== position.organizationId)
    return refuse(
      world,
      "The employment must be with the position's employer.",
    );
  if (workStatusAt(world, work.id)?.status !== "active")
    return refuse(world, "Only active employment can occupy a position.");
  if (!positionIsVacant(world, position.id))
    return refuse(world, "That position is already occupied.");
  try {
    const event = personnelEvent(world, {
      stableKey: `${PREFIX}:${input.stableKey}`,
      kind: "incumbency",
      jurisdictionId: organizationJurisdiction(world, position.organizationId),
      involved: [work.personId, work.id, position.organizationId],
      participants: [
        {
          personId: work.personId,
          role: "focus:incumbent",
          detail: position.title,
        },
      ],
      visibility: "limited",
      summary: `An employee holds the ${position.title} position.`,
      choice: null,
      setting: position.title,
    });
    const result = appendRecord(
      event.world,
      `${PREFIX}:${input.stableKey}`,
      event.eventId,
      {
        kind: "incumbency",
        jurisdictionKey: position.jurisdictionKey,
        positionId: position.id,
        workRelationshipId: work.id,
        personId: work.personId,
        tenure: input.tenure,
        basis: { kind: "authored-scenario", note: input.note },
      },
    );
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Minnesota discipline of permanent classified employees (§ 43A.33)
// ---------------------------------------------------------------------------

export type DisciplineAssessment =
  | {
      readonly available: true;
      readonly designation: PersonnelAuthorityDesignationRecord;
      readonly position: PersonnelPositionRecord;
      readonly incumbency: PersonnelIncumbencyRecord;
    }
  | { readonly available: false; readonly reason: string };

/** Every gate is field-local; the first unmet one is reported. */
export function assessMinnesotaDiscipline(
  world: World,
  actorPersonId: EntityId,
  incumbencyId: EntityId,
  step: "informal-resolution" | "discipline",
): DisciplineAssessment {
  const incumbency = recordById(world, incumbencyId, "incumbency");
  const position = incumbency
    ? recordById(world, incumbency.positionId, "position")
    : null;
  if (!incumbency || !position)
    return {
      available: false,
      reason: "This employment has no civil-service position record.",
    };
  if (position.jurisdictionKey !== "US-MN")
    return {
      available: false,
      reason:
        position.jurisdictionKey === "US-AK"
          ? "Alaska disciplinary measures are set by personnel rules under AS 39.25.150(15)-(16), which are not acquired."
          : `No disciplinary procedure is compiled for ${position.jurisdictionKey}.`,
    };
  for (const key of [
    "mn-just-cause",
    "mn-just-cause-grounds",
    "mn-discipline-notice",
  ] as const) {
    const applicability = procedureApplicability(key, world.currentDate);
    if (applicability.state === "UNKNOWN")
      return { available: false, reason: applicability.reason };
  }
  if (!incumbencyIsActive(world, incumbency))
    return {
      available: false,
      reason: "The employee does not currently hold this position.",
    };
  if (incumbency.personId === actorPersonId)
    return {
      available: false,
      reason: "An appointing authority cannot discipline themselves.",
    };
  if (position.civilClass !== "classified")
    return {
      available: false,
      reason:
        position.civilClass === "unknown"
          ? "The position's civil-service class is not established."
          : `Section 43A.33 protects classified employees; this position is ${position.civilClass}, and its removal authority is not established.`,
    };
  if (incumbency.tenure === "probationary")
    return {
      available: false,
      reason: `${personnelProcedure("mn-probationary-grievance").citation.citation}: probationary discipline follows the plan, which is not acquired.`,
    };
  if (incumbency.tenure !== "permanent")
    return {
      available: false,
      reason: "The employee's permanent status is not established.",
    };
  if (position.agreementCoverage === "covered")
    return {
      available: false,
      reason: `${personnelProcedure("mn-agreement-procedures").citation.citation}: the collective bargaining agreement governs, and its terms are not represented.`,
    };
  if (position.agreementCoverage !== "not-covered")
    return {
      available: false,
      reason:
        "Whether a collective bargaining agreement covers this employee is not established.",
    };
  const authority = personnelAuthority(
    world,
    actorPersonId,
    "appointing-authority",
    {
      organizationId: position.organizationId,
      jurisdictionKey: position.jurisdictionKey,
    },
  );
  if (!authority.ok) return { available: false, reason: authority.reason };
  if (step === "discipline" && !unusedInformalAttempt(world, incumbency.id))
    return {
      available: false,
      reason:
        "Managers and employees must first attempt informal resolution (§ 43A.33, subd. 1).",
    };
  return {
    available: true,
    designation: authority.designation,
    position,
    incumbency,
  };
}

function unusedInformalAttempt(world: World, incumbencyId: EntityId) {
  const used = new Set(
    recordsOf(world, "disciplinary-action").map((a) => a.informalResolutionId),
  );
  return (
    recordsOf(world, "informal-resolution")
      .filter((r) => r.incumbencyId === incumbencyId && !used.has(r.id))
      .at(-1) ?? null
  );
}

/** A real meeting on the canonical clock, attended by both people. */
export function recordInformalResolutionAttempt(
  world: World,
  input: {
    readonly incumbencyId: EntityId;
    readonly note: string;
    readonly transitionHandlers?: FutureTransitionHandlerRegistry;
  },
): PersonnelResult {
  const actor = controlledActor(world);
  if (!actor) return refuse(world, "Choose a living person to act.");
  const assessment = assessMinnesotaDiscipline(
    world,
    actor,
    input.incumbencyId,
    "informal-resolution",
  );
  if (!assessment.available) return refuse(world, assessment.reason);
  const noteError = text(input.note, "The meeting note");
  if (noteError) return refuse(world, noteError);
  const { incumbency, position, designation } = assessment;
  const jurisdictionId = organizationJurisdiction(
    world,
    position.organizationId,
  );
  const count = recordsOf(world, "informal-resolution").filter(
    (r) => r.incumbencyId === incumbency.id,
  ).length;
  const key = `${PREFIX}:informal:${incumbency.id}:${count + 1}`;
  try {
    let next = createScheduledActivity(world, {
      stableKey: `${key}:meeting`,
      title: "Informal resolution meeting",
      summary: input.note.trim(),
      kind: "confirmed",
      start: world.currentMoment,
      end: addSimulationMinutes(world.currentMoment, 30),
      participantPersonIds: [actor, incumbency.personId],
      responsiblePersonId: actor,
      location: {
        jurisdictionId,
        label:
          organizationProfileAt(world, position.organizationId)?.name ??
          position.title,
        locationKey: `${PREFIX}:${position.organizationId}`,
      },
      sourceEntityIds: [incumbency.workRelationshipId],
      flexibility: { kind: "fixed" },
      access: { kind: "private", personIds: [actor, incumbency.personId] },
    });
    const activityId = next.history.scheduledActivities.at(-1)!.id;
    next = performScheduledActivity(next, activityId, input.transitionHandlers);
    if (scheduledActivityState(next, activityId).status !== "completed")
      return refuse(
        world,
        "An earlier commitment must be handled before this meeting.",
      );
    const event = personnelEvent(next, {
      stableKey: key,
      kind: "informal-resolution",
      jurisdictionId,
      involved: [
        actor,
        incumbency.personId,
        activityId,
        incumbency.workRelationshipId,
      ],
      participants: [
        { personId: actor, role: "agency:appointing-authority", detail: null },
        {
          personId: incumbency.personId,
          role: "presence:employee",
          detail: null,
        },
      ],
      visibility: "limited",
      summary:
        "An informal attempt to resolve a workplace dispute did not settle it.",
      choice: input.note.trim(),
      setting: position.title,
    });
    const result = appendRecord(event.world, key, event.eventId, {
      kind: "informal-resolution",
      jurisdictionKey: position.jurisdictionKey,
      incumbencyId: incumbency.id,
      actorPersonId: actor,
      designationId: designation.id,
      scheduledActivityId: activityId,
      note: input.note.trim(),
    });
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

/** Reprimand or discharge for an enumerated just cause, with written notice. */
export function issueMinnesotaDiscipline(
  world: World,
  input: {
    readonly incumbencyId: EntityId;
    readonly action: "reprimand" | "discharge";
    readonly ground: PersonnelJustCauseGround;
    readonly reasons: string;
  },
): PersonnelResult {
  const actor = controlledActor(world);
  if (!actor) return refuse(world, "Choose a living person to act.");
  const assessment = assessMinnesotaDiscipline(
    world,
    actor,
    input.incumbencyId,
    "discipline",
  );
  if (!assessment.available) return refuse(world, assessment.reason);
  if (input.action !== "reprimand" && input.action !== "discharge")
    return refuse(
      world,
      "Suspension and demotion need class, pay and return terms that are not represented.",
    );
  if (!justCauseGrounds().includes(input.ground))
    return refuse(
      world,
      "Choose one of the just-cause grounds the statute names; other grounds are not established as just cause here.",
    );
  const reasonError = text(input.reasons, "The specific reasons");
  if (reasonError) return refuse(world, reasonError);
  const { incumbency, position, designation } = assessment;
  const attempt = unusedInformalAttempt(world, incumbency.id)!;
  const jurisdictionId = organizationJurisdiction(
    world,
    position.organizationId,
  );
  const effectiveOn = world.currentDate;
  const discharge = input.action === "discharge";
  const appealDeadline = discharge
    ? addDays(
        effectiveOn,
        numberTerm("mn-discipline-notice", "appealWithinCalendarDays"),
      )
    : null;
  const filingDeadline = discharge
    ? addDays(
        effectiveOn,
        numberTerm(
          "mn-discipline-notice",
          "commissionerFilingWithinCalendarDays",
        ),
      )
    : null;
  const key = `${PREFIX}:discipline:${incumbency.id}:${attempt.id}`;
  const noticeText = [
    `${discharge ? "Discharge" : "Reprimand"} effective ${effectiveOn} for ${input.ground.replaceAll("-", " ")}.`,
    `Reasons: ${input.reasons.trim()}`,
    ...(discharge
      ? [
          `You may elect to appeal this action to the Bureau of Mediation Services within 30 calendar days following the effective date, by ${appealDeadline}.`,
        ]
      : []),
  ].join(" ");
  try {
    const event = personnelEvent(world, {
      stableKey: key,
      kind: "disciplinary-action",
      jurisdictionId,
      involved: [actor, incumbency.personId, incumbency.workRelationshipId],
      participants: [
        {
          personId: actor,
          role: "agency:appointing-authority",
          detail: input.action,
        },
        {
          personId: incumbency.personId,
          role: "impact:disciplined",
          detail: input.ground,
        },
      ],
      visibility: "limited",
      summary: discharge
        ? `An appointing authority discharged an employee from the ${position.title} position for just cause.`
        : `An appointing authority reprimanded an employee in the ${position.title} position for just cause.`,
      choice: input.reasons.trim(),
      setting: position.title,
    });
    let next = recordEvidenceArtifact(event.world, {
      stableKey: `${key}:notice`,
      evidenceKind: "record:personnel-notice",
      createdAt: effectiveOn,
      recordedAt: effectiveOn,
      relatedEntityIds: [event.eventId],
      access: "restricted",
      description: noticeText,
      provenance: { kind: "simulated", sourceEntityIds: [event.eventId] },
    });
    const noticeId = next.history.evidenceArtifacts.at(-1)!.id;
    next = recordEvidenceDiscovery(next, {
      stableKey: `${key}:notice-received`,
      personId: incumbency.personId,
      evidenceArtifactId: noticeId,
      discoveredAt: effectiveOn,
      recordedAt: effectiveOn,
      methodKey: "personnel:written-notice",
      provenance: { kind: "simulated", sourceEntityIds: [noticeId] },
    });
    next = recordEventKnowledge(next, {
      stableKey: `${key}:known-by-employee`,
      personId: incumbency.personId,
      eventId: event.eventId,
      learnedAt: effectiveOn,
      believedSummary: noticeText,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    let endedStatusId: EntityId | null = null;
    let workItemId: EntityId | null = null;
    if (discharge) {
      const status = workStatusAt(next, incumbency.workRelationshipId)!;
      next = recordWorkStatus(next, {
        stableKey: `${key}:ended`,
        workRelationshipId: incumbency.workRelationshipId,
        effectiveAt: effectiveOn,
        status: "ended",
        reason: `Discharged for just cause (${input.ground.replaceAll("-", " ")}).`,
        provenance: { kind: "simulated-event", eventId: event.eventId },
        supersedesStatusId: status.id,
      });
      endedStatusId = next.history.workStatuses.at(-1)!.id;
      next = createWorkItem(next, {
        stableKey: `${key}:commissioner-filing`,
        title: "File the discharge notice with the commissioner",
        summary: `File the notice and any reply with the commissioner by ${filingDeadline}.`,
        jurisdictionId,
        sourceEntityIds: [event.eventId],
        focus: {
          kind: "other",
          targetKey: `${PREFIX}:commissioner-filing`,
          sourceEntityId: event.eventId,
        },
        effort: null,
        access: { kind: "private", personIds: [actor] },
        assignedPersonIds: [actor],
        playerRequirement: "action",
        waitingOnPersonIds: [],
        blocker: null,
        scheduledActivityId: null,
      });
      workItemId = next.history.workItems.at(-1)!.id;
    }
    const result = appendRecord(next, key, event.eventId, {
      kind: "disciplinary-action",
      jurisdictionKey: position.jurisdictionKey,
      incumbencyId: incumbency.id,
      actorPersonId: actor,
      designationId: designation.id,
      informalResolutionId: attempt.id,
      action: input.action,
      ground: input.ground,
      reasons: input.reasons.trim(),
      effectiveOn,
      noticeEvidenceId: noticeId,
      appealDeadline,
      commissionerFilingDeadline: filingDeadline,
      endedWorkStatusId: endedStatusId,
      workItemId,
    });
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

function dischargeFor(world: World, actionId: EntityId) {
  const action = recordById(world, actionId, "disciplinary-action");
  if (!action || action.action !== "discharge") return null;
  const incumbency = recordById(world, action.incumbencyId, "incumbency")!;
  const position = recordById(world, incumbency.positionId, "position")!;
  return { action, incumbency, position };
}

/** The appointing authority's filing; a late filing is recorded as late. */
export function fileNoticeWithCommissioner(
  world: World,
  input: { readonly actionId: EntityId },
): PersonnelResult {
  const actor = controlledActor(world);
  const found = dischargeFor(world, input.actionId);
  if (!actor || !found || found.action.actorPersonId !== actor)
    return refuse(
      world,
      "Only the appointing authority who acted files this notice.",
    );
  if (
    recordsOf(world, "commissioner-filing").some(
      (f) => f.actionId === input.actionId,
    )
  )
    return refuse(world, "This notice is already filed.");
  const timely =
    daysBetween(found.action.effectiveOn, world.currentDate) <=
    numberTerm("mn-discipline-notice", "commissionerFilingWithinCalendarDays");
  const key = `${PREFIX}:filing:${input.actionId}`;
  try {
    const involved: EntityId[] = [actor, found.action.noticeEvidenceId];
    if (found.action.workItemId) involved.push(found.action.workItemId);
    const event = personnelEvent(world, {
      stableKey: key,
      kind: "commissioner-filing",
      jurisdictionId: organizationJurisdiction(
        world,
        found.position.organizationId,
      ),
      involved,
      participants: [
        { personId: actor, role: "agency:appointing-authority", detail: null },
      ],
      visibility: "limited",
      summary: timely
        ? "The discharge notice was filed with the commissioner."
        : "The discharge notice was filed with the commissioner after the ten-day deadline.",
      choice: null,
      setting: found.position.title,
    });
    let next = event.world;
    if (found.action.workItemId)
      next = completeWorkItem(
        next,
        found.action.workItemId,
        event.eventId,
        key,
      );
    const result = appendRecord(next, key, event.eventId, {
      kind: "commissioner-filing",
      jurisdictionKey: found.position.jurisdictionKey,
      actionId: input.actionId,
      actorPersonId: actor,
      timely,
    });
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

function appealRefusal(
  world: World,
  found: NonNullable<ReturnType<typeof dischargeFor>>,
): string | null {
  const applicability = procedureApplicability(
    "mn-discipline-notice",
    world.currentDate,
  );
  if (applicability.state === "UNKNOWN") return applicability.reason;
  if (world.currentDate > found.action.appealDeadline!)
    return `The 30-calendar-day appeal period ended on ${found.action.appealDeadline}.`;
  if (recordsOf(world, "appeal").some((a) => a.actionId === found.action.id))
    return "The appeal is already filed.";
  return null;
}

function fileAppeal(
  world: World,
  found: NonNullable<ReturnType<typeof dischargeFor>>,
  statement: string,
  decisionTraceId: EntityId | null,
): PersonnelResult {
  const appellant = found.incumbency.personId;
  const key = `${PREFIX}:appeal:${found.action.id}`;
  try {
    const event = personnelEvent(world, {
      stableKey: key,
      kind: "appeal",
      jurisdictionId: organizationJurisdiction(
        world,
        found.position.organizationId,
      ),
      involved: [appellant, found.action.actorPersonId],
      participants: [
        { personId: appellant, role: "agency:appellant", detail: null },
        {
          personId: found.action.actorPersonId,
          role: "focus:appointing-authority",
          detail: null,
        },
      ],
      visibility: "limited",
      summary:
        "A discharged employee appealed to the Bureau of Mediation Services; the appeal is pending.",
      choice: statement,
      setting: "Bureau of Mediation Services",
    });
    const next = recordEventKnowledge(event.world, {
      stableKey: `${key}:known`,
      personId: found.action.actorPersonId,
      eventId: event.eventId,
      learnedAt: event.world.currentDate,
      believedSummary: event.world.history.events.at(-1)!.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const result = appendRecord(next, key, event.eventId, {
      kind: "appeal",
      jurisdictionKey: found.position.jurisdictionKey,
      actionId: found.action.id,
      personId: appellant,
      forum: "mn-bureau-of-mediation-services",
      statement,
      decisionTraceId,
    });
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

function traceFor(world: World, stableKey: string) {
  return (
    world.history.decisionTraces.find(
      (t) => t.context.stableKey === stableKey,
    ) ?? null
  );
}

const appealDecisionKey = (actionId: EntityId) =>
  `${PREFIX}:appeal-decision:${actionId}`;

/**
 * A discharged NPC decides once whether to appeal, through the general
 * decision architecture. Checking again never rerolls; a decision not to
 * appeal is final and files nothing.
 */
export function produceDischargedEmployeeAppealChoice(
  world: World,
  input: { readonly actionId: EntityId },
): PersonnelResult {
  const actor = controlledActor(world);
  const found = dischargeFor(world, input.actionId);
  if (!actor || !found || found.action.actorPersonId !== actor)
    return refuse(
      world,
      "Only the appointing authority who acted can check this.",
    );
  const employee = found.incumbency.personId;
  if (employee === actor)
    return refuse(world, "The controlled person decides for themselves.");
  if (traceFor(world, appealDecisionKey(found.action.id)))
    return refuse(world, "The employee has already decided.");
  const refusal = appealRefusal(world, found);
  if (refusal) return refuse(world, refusal);
  try {
    const evaluation = evaluateDecision(world, {
      stableKey: appealDecisionKey(found.action.id),
      decisionType: "civil-personnel.discharge-appeal",
      actorPersonId: employee,
      cutoff: currentHistoricalCutoff(world),
      subject: {
        kind: "context:personnel-discharge",
        key: found.action.stableKey,
        entityId: null,
      },
      options: [
        {
          key: "appeal",
          label: "Appeal the discharge",
          description: "Elect to appeal to the Bureau of Mediation Services.",
        },
        {
          key: "no-appeal",
          label: "Do not appeal",
          description: "Let the appeal period pass.",
        },
      ],
      constraints: [],
      considerations: [],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    const next = recordDurableDecisionTrace(world, evaluation);
    const traceId = next.history.decisionTraces.at(-1)!.id;
    if (evaluation.selectedOptionKey !== "appeal")
      return { ok: true, world: next, recordId: traceId };
    return fileAppeal(
      next,
      found,
      "I elect to appeal this discharge to the Bureau of Mediation Services.",
      traceId,
    );
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

export function appealDecisionFor(
  world: World,
  actionId: EntityId,
): "appealed" | "declined" | "undecided" {
  if (recordsOf(world, "appeal").some((a) => a.actionId === actionId))
    return "appealed";
  return traceFor(world, appealDecisionKey(actionId))
    ? "declined"
    : "undecided";
}

function settlementRefusal(
  world: World,
  appeal: PersonnelAppealRecord,
): string | null {
  const applicability = procedureApplicability(
    "mn-commissioner-settlement",
    world.currentDate,
  );
  if (applicability.state === "UNKNOWN") return applicability.reason;
  if (
    recordsOf(world, "settlement-decision").some(
      (d) => d.appealId === appeal.id,
    )
  )
    return "The commissioner has already decided this.";
  return null;
}

function recordSettlement(
  world: World,
  appeal: PersonnelAppealRecord,
  commissioner: EntityId,
  designation: PersonnelAuthorityDesignationRecord,
  decision: "settlement-directed" | "settlement-not-directed",
  reasons: string,
  decisionTraceId: EntityId | null,
): PersonnelResult {
  const found = dischargeFor(world, appeal.actionId)!;
  if (
    commissioner === found.action.actorPersonId ||
    commissioner === appeal.personId
  )
    return refuse(
      world,
      "A party to the dispute cannot decide its settlement.",
    );
  const key = `${PREFIX}:settlement:${appeal.id}`;
  try {
    const event = personnelEvent(world, {
      stableKey: key,
      kind: "settlement-decision",
      jurisdictionId: organizationJurisdiction(
        world,
        found.position.organizationId,
      ),
      involved: [commissioner, appeal.personId, found.action.actorPersonId],
      participants: [
        {
          personId: commissioner,
          role: "agency:commissioner",
          detail: decision,
        },
        { personId: appeal.personId, role: "impact:appellant", detail: null },
        {
          personId: found.action.actorPersonId,
          role: "impact:appointing-authority",
          detail: null,
        },
      ],
      visibility: "limited",
      summary:
        decision === "settlement-directed"
          ? "The commissioner directed the appointing authority to settle before a hearing."
          : "The commissioner did not direct a settlement; the appeal remains pending.",
      choice: reasons,
      setting: "Commissioner's decision",
    });
    let next = event.world;
    for (const personId of [appeal.personId, found.action.actorPersonId])
      next = recordEventKnowledge(next, {
        stableKey: `${key}:known:${personId}`,
        personId,
        eventId: event.eventId,
        learnedAt: next.currentDate,
        believedSummary: event.world.history.events.at(-1)!.summary,
        accuracy: "accurate",
        confidence: "high",
        source: { kind: "direct" },
      });
    const result = appendRecord(next, key, event.eventId, {
      kind: "settlement-decision",
      jurisdictionKey: appeal.jurisdictionKey,
      appealId: appeal.id,
      actorPersonId: commissioner,
      designationId: designation.id,
      decision,
      reasons,
      decisionTraceId,
    });
    return { ok: true, world: result.world, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

/** The single living holder of the statutory office, if the world has one. */
export function statutoryOfficeHolder(
  world: World,
  power: PersonnelPower,
  jurisdictionKey: string,
): EntityId | null {
  const holders = world.personOrder.filter(
    (personId) =>
      personnelAuthority(world, personId, power, {
        organizationId: null,
        jurisdictionKey,
      }).ok,
  );
  return holders.length === 1 ? holders[0]! : null;
}

/**
 * An NPC commissioner decides once, through the general decision
 * architecture. Neither outcome is a ruling on the merits.
 */
export function produceCommissionerSettlementDecision(
  world: World,
  input: { readonly appealId: EntityId },
): PersonnelResult {
  const actor = controlledActor(world);
  const appeal = recordById(world, input.appealId, "appeal");
  const found = appeal ? dischargeFor(world, appeal.actionId) : null;
  if (!actor || !appeal || !found)
    return refuse(world, "No filed appeal awaits this decision.");
  if (actor !== appeal.personId && actor !== found.action.actorPersonId)
    return refuse(
      world,
      "Only a party to the appeal can check for this decision.",
    );
  const refusal = settlementRefusal(world, appeal);
  if (refusal) return refuse(world, refusal);
  const commissioner = statutoryOfficeHolder(
    world,
    "commissioner-settlement",
    appeal.jurisdictionKey,
  );
  if (!commissioner)
    return refuse(
      world,
      "No single holder of the commissioner's statutory office is established in this world.",
    );
  if (commissioner === actor)
    return refuse(world, "The controlled commissioner decides for themselves.");
  const authority = personnelAuthority(
    world,
    commissioner,
    "commissioner-settlement",
    {
      organizationId: null,
      jurisdictionKey: appeal.jurisdictionKey,
    },
  );
  if (!authority.ok) return refuse(world, authority.reason);
  try {
    const evaluation = evaluateDecision(world, {
      stableKey: `${PREFIX}:settlement-decision:${appeal.id}`,
      decisionType: "civil-personnel.commissioner-settlement",
      actorPersonId: commissioner,
      cutoff: currentHistoricalCutoff(world),
      subject: {
        kind: "context:personnel-appeal",
        key: appeal.stableKey,
        entityId: null,
      },
      options: [
        {
          key: "settlement-directed",
          label: "Direct a settlement",
          description:
            "Require the appointing authority to settle before a hearing.",
        },
        {
          key: "settlement-not-directed",
          label: "Do not direct a settlement",
          description: "Leave the appeal to its hearing procedure.",
        },
      ],
      constraints: [],
      considerations: [],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    const next = recordDurableDecisionTrace(world, evaluation);
    const traceId = next.history.decisionTraces.at(-1)!.id;
    return recordSettlement(
      next,
      appeal,
      commissioner,
      authority.designation,
      evaluation.selectedOptionKey === "settlement-directed"
        ? "settlement-directed"
        : "settlement-not-directed",
      "The record states no further reasons.",
      traceId,
    );
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Minnesota direct reinstatement (§ 43A.15, subd. 15; § 43A.16, subd. 1)
// ---------------------------------------------------------------------------

function yearsAfter(date: IsoDate, years: number): IsoDate {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const target = new Date(Date.UTC(y + years, m - 1, d));
  if (target.getUTCMonth() !== m - 1) target.setUTCDate(0);
  return makeIsoDate(target.toISOString().slice(0, 10));
}

export type ReinstatementAssessment =
  | {
      readonly available: true;
      readonly designation: PersonnelAuthorityDesignationRecord;
      readonly position: PersonnelPositionRecord;
      readonly former: PersonnelIncumbencyRecord;
      readonly probationAllowed: boolean;
    }
  | { readonly available: false; readonly reason: string };

/** Qualification is former class service within four years; kinship is irrelevant. */
export function assessMinnesotaReinstatement(
  world: World,
  actorPersonId: EntityId,
  positionId: EntityId,
  personId: EntityId,
): ReinstatementAssessment {
  const position = recordById(world, positionId, "position");
  if (!position)
    return { available: false, reason: "No authorized position is recorded." };
  if (position.jurisdictionKey !== "US-MN")
    return {
      available: false,
      reason: `No appointment procedure is compiled for ${position.jurisdictionKey}; selection, qualification and pay instruments are not acquired.`,
    };
  const applicability = procedureApplicability(
    "mn-reinstatement",
    world.currentDate,
  );
  if (applicability.state === "UNKNOWN")
    return { available: false, reason: applicability.reason };
  if (position.civilClass !== "classified")
    return {
      available: false,
      reason: "Direct reinstatement applies to classified job classes.",
    };
  const authority = personnelAuthority(
    world,
    actorPersonId,
    "appointing-authority",
    {
      organizationId: position.organizationId,
      jurisdictionKey: position.jurisdictionKey,
    },
  );
  if (!authority.ok) return { available: false, reason: authority.reason };
  if (personId === actorPersonId)
    return {
      available: false,
      reason: "An appointing authority cannot reinstate themselves.",
    };
  if (
    !world.people[personId] ||
    !isPersonAliveAt(world, personId, currentLifeCutoff(world))
  )
    return { available: false, reason: "The person must be living." };
  if (!positionIsVacant(world, position.id))
    return { available: false, reason: "The position is not vacant." };
  const limit = numberTerm("mn-reinstatement", "withinYearsOfSeparation");
  const former = recordsOf(world, "incumbency")
    .filter((i) => {
      if (i.personId !== personId || i.tenure === "unknown") return false;
      const formerPosition = recordById(world, i.positionId, "position");
      const separated = separationDate(world, i);
      return (
        formerPosition?.classKey === position.classKey &&
        formerPosition.jurisdictionKey === "US-MN" &&
        separated !== null &&
        world.currentDate <= yearsAfter(separated, limit)
      );
    })
    .at(-1);
  if (!former)
    return {
      available: false,
      reason:
        "Only a former permanent or probationary employee of this job class, within four years of separation, may be directly reinstated.",
    };
  if (
    recordsOf(world, "reinstatement-offer").some(
      (o) =>
        o.positionId === position.id &&
        o.personId === personId &&
        !recordsOf(world, "offer-response").some((r) => r.offerId === o.id),
    )
  )
    return {
      available: false,
      reason: "An offer to this person is already awaiting an answer.",
    };
  const formerPosition = recordById(world, former.positionId, "position")!;
  return {
    available: true,
    designation: authority.designation,
    position,
    former,
    // Read narrowly: the text clearly reaches former employees of a different
    // appointing authority; same-authority probation is not established.
    probationAllowed: formerPosition.organizationId !== position.organizationId,
  };
}

export function offerMinnesotaReinstatement(
  world: World,
  input: {
    readonly positionId: EntityId;
    readonly personId: EntityId;
    readonly probation: "required" | "not-required";
  },
): PersonnelResult {
  const actor = controlledActor(world);
  if (!actor) return refuse(world, "Choose a living person to act.");
  const assessment = assessMinnesotaReinstatement(
    world,
    actor,
    input.positionId,
    input.personId,
  );
  if (!assessment.available) return refuse(world, assessment.reason);
  if (input.probation === "required" && !assessment.probationAllowed)
    return refuse(
      world,
      "Probation on reinstatement is established only for former employees of a different appointing authority.",
    );
  const { position, former, designation } = assessment;
  const count = recordsOf(world, "reinstatement-offer").filter(
    (o) => o.positionId === position.id && o.personId === input.personId,
  ).length;
  const key = `${PREFIX}:reinstatement-offer:${position.id}:${input.personId}:${count + 1}`;
  try {
    const event = personnelEvent(world, {
      stableKey: key,
      kind: "reinstatement-offer",
      jurisdictionId: organizationJurisdiction(world, position.organizationId),
      involved: [actor, input.personId, position.organizationId],
      participants: [
        {
          personId: actor,
          role: "agency:appointing-authority",
          detail: position.title,
        },
        {
          personId: input.personId,
          role: "focus:offered-reinstatement",
          detail: null,
        },
      ],
      visibility: "limited",
      summary: `An appointing authority offered direct reinstatement to the ${position.title} position.`,
      choice:
        input.probation === "required"
          ? "Probation required."
          : "No probation required.",
      setting: position.title,
    });
    let next = recordEventKnowledge(event.world, {
      stableKey: `${key}:known`,
      personId: input.personId,
      eventId: event.eventId,
      learnedAt: event.world.currentDate,
      believedSummary: event.world.history.events.at(-1)!.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    const result = appendRecord(next, key, event.eventId, {
      kind: "reinstatement-offer",
      jurisdictionKey: position.jurisdictionKey,
      positionId: position.id,
      personId: input.personId,
      actorPersonId: actor,
      designationId: designation.id,
      formerIncumbencyId: former.id,
      probation: input.probation,
    });
    next = result.world;
    return { ok: true, world: next, recordId: result.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

function openOffer(world: World, offerId: EntityId) {
  const offer = recordById(world, offerId, "reinstatement-offer");
  if (!offer) return null;
  if (recordsOf(world, "offer-response").some((r) => r.offerId === offerId))
    return null;
  return offer;
}

function applyOfferResponse(
  world: World,
  offer: PersonnelReinstatementOfferRecord,
  response: "accepted" | "declined",
  decisionTraceId: EntityId | null,
): PersonnelResult {
  const position = recordById(world, offer.positionId, "position")!;
  const former = recordById(world, offer.formerIncumbencyId, "incumbency")!;
  const jurisdictionId = organizationJurisdiction(
    world,
    position.organizationId,
  );
  // Consent does not override a vacancy filled or authority lost meanwhile.
  if (response === "accepted") {
    if (!positionIsVacant(world, position.id))
      return refuse(world, "The position is no longer vacant.");
    const authority = personnelAuthority(
      world,
      offer.actorPersonId,
      "appointing-authority",
      {
        organizationId: position.organizationId,
        jurisdictionKey: position.jurisdictionKey,
      },
    );
    if (!authority.ok)
      return refuse(
        world,
        "The offering appointing authority no longer holds that role.",
      );
    const busy = activeWorkRelationshipsAt(world, offer.personId).some(
      (w) => w.relationship.organizationId === position.organizationId,
    );
    if (busy)
      return refuse(world, "The person already works for this employer.");
  }
  const key = `${PREFIX}:offer-response:${offer.id}`;
  try {
    const event = personnelEvent(world, {
      stableKey: key,
      kind: "offer-response",
      jurisdictionId,
      involved: [offer.personId, offer.actorPersonId, position.organizationId],
      participants: [
        {
          personId: offer.personId,
          role: "agency:appointee",
          detail: response,
        },
        {
          personId: offer.actorPersonId,
          role: "observation:appointing-authority",
          detail: null,
        },
      ],
      visibility: "limited",
      summary:
        response === "accepted"
          ? `The offer of reinstatement to the ${position.title} position was accepted.`
          : `The offer of reinstatement to the ${position.title} position was declined.`,
      choice: response,
      setting: position.title,
    });
    let next = recordEventKnowledge(event.world, {
      stableKey: `${key}:known`,
      personId: offer.actorPersonId,
      eventId: event.eventId,
      learnedAt: event.world.currentDate,
      believedSummary: event.world.history.events.at(-1)!.summary,
      accuracy: "accurate",
      confidence: "high",
      source: { kind: "direct" },
    });
    let workRelationshipId: EntityId | null = null;
    if (response === "accepted") {
      const formerRole = workRoleAt(next, former.workRelationshipId, {
        asOfDate: separationDate(next, former) ?? next.currentDate,
        historySequenceExclusive: next.history.nextSequence,
      });
      next = createWorkRelationship(next, {
        stableKey: `${key}:employment`,
        personId: offer.personId,
        organizationId: position.organizationId,
        startedAt: next.currentDate,
        kind: "employment:civil-service",
        compensation: "paid",
        authority: "directed",
        dependency: "dependent",
        economicRisk: "organization-borne",
        provenance: { kind: "simulated-event", eventId: event.eventId },
        initialRole: {
          title: position.title,
          occupationClassification: null,
          locationJurisdictionId: jurisdictionId,
          // The former class role's recorded demands; no schedule is invented.
          timeDemand: formerRole!.timeDemand,
        },
      });
      workRelationshipId = next.history.workRelationships.at(-1)!.id;
    }
    const responseRecord = appendRecord(next, key, event.eventId, {
      kind: "offer-response",
      jurisdictionKey: position.jurisdictionKey,
      offerId: offer.id,
      personId: offer.personId,
      response,
      decisionTraceId,
      workRelationshipId,
    });
    next = responseRecord.world;
    if (workRelationshipId) {
      const seated = personnelEvent(next, {
        stableKey: `${key}:incumbency`,
        kind: "incumbency",
        jurisdictionId,
        involved: [offer.personId, workRelationshipId, position.organizationId],
        participants: [
          {
            personId: offer.personId,
            role: "focus:incumbent",
            detail: position.title,
          },
        ],
        visibility: "limited",
        summary: `A reinstated employee holds the ${position.title} position.`,
        choice: null,
        setting: position.title,
      });
      const incumbency = appendRecord(
        seated.world,
        `${key}:incumbency`,
        seated.eventId,
        {
          kind: "incumbency",
          jurisdictionKey: position.jurisdictionKey,
          positionId: position.id,
          workRelationshipId,
          personId: offer.personId,
          // Probation length is plan-defined; permanence after an unprobated
          // reinstatement is not established by the acquired text.
          tenure: offer.probation === "required" ? "probationary" : "unknown",
          basis: {
            kind: "reinstatement",
            offerId: offer.id,
            responseId: responseRecord.id,
          },
        },
      );
      next = incumbency.world;
    }
    return { ok: true, world: next, recordId: responseRecord.id };
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

/**
 * An NPC's answer, produced once through the general decision architecture and
 * persisted; reopening or reloading never rerolls it.
 */
export function produceReinstatementResponse(
  world: World,
  input: { readonly offerId: EntityId },
): PersonnelResult {
  const actor = controlledActor(world);
  const offer = openOffer(world, input.offerId);
  if (!actor || !offer || offer.actorPersonId !== actor)
    return refuse(
      world,
      "Only the offering appointing authority can hear this answer.",
    );
  if (
    world.control.kind === "person" &&
    world.control.personId === offer.personId
  )
    return refuse(world, "The controlled person answers for themselves.");
  const goals = new Map<string, (typeof world.history.goalStates)[number]>();
  for (const g of world.history.goalStates.filter(
    (g) => g.personId === offer.personId,
  ))
    goals.set(g.goalKey, g);
  const unwilling = [...goals.values()].some(
    (g) => g.status === "active" && g.goalKey === "life-paths2:decline-work",
  );
  const seeking = [...goals.values()].some(
    (g) => g.status === "active" && g.goalKey === "life-paths2:seek-work",
  );
  const rigid = activeWorkRelationshipsAt(world, offer.personId).some(
    (w) => w.role.timeDemand.scheduleRigidity === "rigid",
  );
  try {
    const evaluation = evaluateDecision(world, {
      stableKey: `${PREFIX}:offer-decision:${offer.id}`,
      decisionType: "civil-personnel.reinstatement-response",
      actorPersonId: offer.personId,
      cutoff: currentHistoricalCutoff(world),
      subject: {
        kind: "context:personnel-offer",
        key: offer.stableKey,
        entityId: null,
      },
      options: [
        {
          key: "accept",
          label: "Accept reinstatement",
          description: "Return to the job class.",
        },
        {
          key: "decline",
          label: "Decline reinstatement",
          description: "Stay in current circumstances.",
        },
      ],
      constraints: [
        ...(unwilling
          ? [
              {
                stableKey: "civil-personnel:declines-work",
                optionKey: "accept",
                kind: "goal:decline-work",
                explanation: "They have said they are not seeking work.",
                sourceRefs: [],
              },
            ]
          : []),
        ...(rigid
          ? [
              {
                stableKey: "civil-personnel:rigid-schedule",
                optionKey: "accept",
                kind: "availability:schedule",
                explanation: "Their current work has a rigid schedule.",
                sourceRefs: [],
              },
            ]
          : []),
      ],
      considerations: seeking
        ? [
            {
              stableKey: "civil-personnel:seeking-work",
              optionKey: "accept",
              sourceType: "mind:goal",
              direction: "supports",
              importance: "strong",
              confidence: "high",
              explanation: "They are looking for work.",
              sourceRefs: [],
            },
          ]
        : [],
      perceptionIds: [],
      randomness: "close-choices",
      retention: "durable",
    });
    const next = recordDurableDecisionTrace(world, evaluation);
    const traceId = next.history.decisionTraces.at(-1)!.id;
    return applyOfferResponse(
      next,
      offer,
      evaluation.selectedOptionKey === "accept" ? "accepted" : "declined",
      traceId,
    );
  } catch (error) {
    return refuse(world, (error as Error).message);
  }
}

// ---------------------------------------------------------------------------
// Player projection
// ---------------------------------------------------------------------------

export interface PersonnelStep {
  readonly key: string;
  readonly label: string;
  readonly available: boolean;
  readonly reason: string | null;
}

export interface PersonnelMatterView {
  readonly id: EntityId;
  readonly kind: "position" | "action" | "offer";
  readonly heading: string;
  readonly facts: readonly string[];
  readonly steps: readonly PersonnelStep[];
}

function position(world: World, incumbency: PersonnelIncumbencyRecord) {
  return recordById(world, incumbency.positionId, "position")!;
}

function nameOf(world: World, personId: EntityId): string {
  const person = world.people[personId];
  return person ? personName(person) : "Unknown person";
}

function blockedArbitration(): PersonnelStep {
  return {
    key: "arbitration",
    label: "Arbitrator list, selection and hearing",
    available: false,
    reason: `${personnelProcedure("mn-arbitration").citation.citation}: Bureau rules and the plan that govern these steps are not acquired.`,
  };
}

/** Everything the controlled person can see and do; reads never write. */
export function personnelMatters(world: World): readonly PersonnelMatterView[] {
  const actor = controlledActor(world);
  if (!actor) return [];
  const views: PersonnelMatterView[] = [];
  const actions = recordsOf(world, "disciplinary-action");
  const filings = recordsOf(world, "commissioner-filing");
  const appeals = recordsOf(world, "appeal");
  const decisions = recordsOf(world, "settlement-decision");
  for (const incumbency of recordsOf(world, "incumbency")) {
    const job = position(world, incumbency);
    const active = incumbencyIsActive(world, incumbency);
    const mine = incumbency.personId === actor;
    const authorityHere = personnelAuthority(
      world,
      actor,
      "appointing-authority",
      {
        organizationId: job.organizationId,
        jurisdictionKey: job.jurisdictionKey,
      },
    ).ok;
    if (!active || (!mine && !authorityHere)) continue;
    const informal = assessMinnesotaDiscipline(
      world,
      actor,
      incumbency.id,
      "informal-resolution",
    );
    const discipline = assessMinnesotaDiscipline(
      world,
      actor,
      incumbency.id,
      "discipline",
    );
    views.push({
      id: incumbency.id,
      kind: "position",
      heading: mine
        ? `Your ${job.title} position`
        : `${nameOf(world, incumbency.personId)}, ${job.title}`,
      facts: [
        `Civil-service class: ${job.civilClass}. Tenure: ${incumbency.tenure}.`,
        `Bargaining coverage: ${job.bargainingCoverage}. Agreement coverage: ${job.agreementCoverage}.`,
        "Pay follows the applicable plan or agreement, which is not represented.",
      ],
      steps: mine
        ? []
        : [
            {
              key: "informal-resolution",
              label: "Hold an informal resolution meeting (30 minutes)",
              available: informal.available,
              reason: informal.available ? null : informal.reason,
            },
            {
              key: "discipline",
              label: "Issue a reprimand or discharge",
              available: discipline.available,
              reason: discipline.available ? null : discipline.reason,
            },
          ],
    });
  }
  for (const action of actions) {
    const incumbency = recordById(world, action.incumbencyId, "incumbency")!;
    const employee = incumbency.personId === actor;
    const authority = action.actorPersonId === actor;
    if (!employee && !authority) continue;
    const appeal = appeals.find((a) => a.actionId === action.id);
    const filing = filings.find((f) => f.actionId === action.id);
    const decision = appeal
      ? decisions.find((d) => d.appealId === appeal.id)
      : undefined;
    const discharge = action.action === "discharge";
    const found = discharge ? dischargeFor(world, action.id) : null;
    const appealBlock = found ? appealRefusal(world, found) : null;
    const choice = appealDecisionFor(world, action.id);
    const steps: PersonnelStep[] = [];
    if (discharge && authority) {
      steps.push({
        key: "commissioner-filing",
        label: "File the notice with the commissioner",
        available: !filing,
        reason: filing ? "Filed." : null,
      });
      steps.push({
        key: "check-appeal",
        label: "Check whether the employee appealed",
        available: choice === "undecided" && appealBlock === null,
        reason:
          choice === "appealed"
            ? "The employee appealed."
            : choice === "declined"
              ? "The employee decided not to appeal."
              : appealBlock,
      });
    }
    if (appeal) {
      const settlementBlock = settlementRefusal(world, appeal);
      const commissioner = statutoryOfficeHolder(
        world,
        "commissioner-settlement",
        appeal.jurisdictionKey,
      );
      steps.push({
        key: "check-settlement",
        label: "Check for the commissioner's settlement decision",
        available: settlementBlock === null && commissioner !== null,
        reason:
          settlementBlock ??
          (commissioner
            ? null
            : "No single holder of the commissioner's office is established."),
      });
      steps.push(blockedArbitration());
    }
    views.push({
      id: action.id,
      kind: "action",
      heading: `${discharge ? "Discharge" : "Reprimand"} of ${nameOf(world, incumbency.personId)}, effective ${action.effectiveOn}`,
      facts: [
        `Ground: ${action.ground.replaceAll("-", " ")}. Reasons: ${action.reasons}`,
        ...(discharge
          ? [
              `Appeal deadline: ${action.appealDeadline}. Commissioner filing deadline: ${action.commissionerFilingDeadline}.`,
            ]
          : ["A reprimand carries no statutory appeal to the Bureau."]),
        ...(filing
          ? [
              filing.timely
                ? "Filed with the commissioner on time."
                : "Filed with the commissioner late.",
            ]
          : []),
        ...(appeal
          ? ["Appeal filed. No one has decided it on the merits."]
          : choice === "declined"
            ? ["The employee decided not to appeal."]
            : []),
        ...(decision
          ? [
              decision.decision === "settlement-directed"
                ? "The commissioner directed a settlement. Its terms are not represented."
                : "The commissioner did not direct a settlement.",
            ]
          : []),
        `Plan-prescribed notice content and reply procedure are not represented (${personnelProcedure("mn-notice-plan-content").citation.citation}).`,
      ],
      steps,
    });
  }
  for (const offer of recordsOf(world, "reinstatement-offer")) {
    if (offer.personId !== actor && offer.actorPersonId !== actor) continue;
    const response = recordsOf(world, "offer-response").find(
      (r) => r.offerId === offer.id,
    );
    const job = recordById(world, offer.positionId, "position")!;
    views.push({
      id: offer.id,
      kind: "offer",
      heading: `Reinstatement offer to ${nameOf(world, offer.personId)}, ${job.title}`,
      facts: [
        offer.probation === "required"
          ? "Probation required. The plan that sets its length is not acquired."
          : "No probation required. Permanent status after reinstatement is not established.",
        "Pay follows the applicable plan or agreement, which is not represented.",
        response ? `Answer: ${response.response}.` : "Awaiting an answer.",
      ],
      steps:
        response || offer.actorPersonId !== actor
          ? []
          : [
              {
                key: "hear-answer",
                label: "Hear their answer",
                available: true,
                reason: null,
              },
            ],
    });
  }
  return views;
}

/** Vacant positions this person may fill, with eligible former employees. */
export function reinstatementOpportunities(world: World) {
  const actor = controlledActor(world);
  if (!actor) return [];
  return personnelPositions(world).flatMap((job) => {
    const authority = personnelAuthority(world, actor, "appointing-authority", {
      organizationId: job.organizationId,
      jurisdictionKey: job.jurisdictionKey,
    });
    if (!authority.ok || !positionIsVacant(world, job.id)) return [];
    const candidates = [
      ...new Set(recordsOf(world, "incumbency").map((i) => i.personId)),
    ].flatMap((personId) => {
      const assessment = assessMinnesotaReinstatement(
        world,
        actor,
        job.id,
        personId,
      );
      return assessment.available
        ? [
            {
              personId,
              name: nameOf(world, personId),
              probationAllowed: assessment.probationAllowed,
            },
          ]
        : [];
    });
    return [{ position: job, candidates }];
  });
}

export function personnelAppealsFor(
  world: World,
): readonly PersonnelAppealRecord[] {
  return recordsOf(world, "appeal");
}

export function personnelDisciplinaryActions(
  world: World,
): readonly PersonnelDisciplinaryActionRecord[] {
  return recordsOf(world, "disciplinary-action");
}

export function personnelOfferResponses(
  world: World,
): readonly PersonnelOfferResponseRecord[] {
  return recordsOf(world, "offer-response");
}

export { cutoffOn as personnelCutoffOn };

export type ExecutiveOfficeStaffBoundary =
  | {
      readonly state: "known";
      readonly civilClass: "unclassified" | "exempt";
      readonly statement: string;
      readonly citation: string;
      /** What the class leaves unestablished; never a staffing permission. */
      readonly unestablished: readonly string[];
    }
  | { readonly state: "unknown"; readonly reason: string };

/**
 * EXEC's civil-service boundary input for staff of a governor's office. The
 * class is sourced; who may appoint or remove those staff is not, so this
 * answers a boundary question and authorizes nothing.
 */
export function executiveOfficeStaffBoundary(
  jurisdictionKey: string,
  onDate: IsoDate,
): ExecutiveOfficeStaffBoundary {
  const key: PersonnelProcedureKey | null =
    jurisdictionKey === "US-MN"
      ? "mn-unclassified-offices"
      : jurisdictionKey === "US-AK"
        ? "ak-governor-office-exempt"
        : null;
  if (!key)
    return {
      state: "unknown",
      reason: `No civil-service boundary is compiled for ${jurisdictionKey}.`,
    };
  const applicability = procedureApplicability(key, onDate);
  if (applicability.state === "UNKNOWN")
    return { state: "unknown", reason: applicability.reason };
  const procedure = personnelProcedure(key);
  return {
    state: "known",
    civilClass: key === "mn-unclassified-offices" ? "unclassified" : "exempt",
    statement: procedure.statement,
    citation: procedure.citation.citation,
    unestablished: [
      "Who may appoint, discipline or remove these staff is not in the acquired text.",
      "Pay terms are set by instruments that are not represented.",
    ],
  };
}
