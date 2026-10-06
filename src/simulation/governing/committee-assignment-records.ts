import { makeIsoDate } from "../dates";
import { personName } from "../people";
import { recordWorldEvent } from "../world";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../types";

const REQUEST_EVENT = "governing.committee-request-recorded";
const ASSIGNMENT_EVENT = "governing.committee-seat-assigned";
const TAG_PREFIX = "committee-record:";

export interface MemberCommitteeRequest {
  readonly eventId: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly chamberKey: string;
  readonly assignmentRoundKey: string;
  readonly memberKey: string;
  readonly memberPersonId: EntityId;
  readonly assignerPersonId: EntityId;
  readonly preferences: readonly string[];
  readonly reason: string;
}

export interface CommitteeSeatAssignment {
  readonly eventId: EntityId;
  readonly stableKey: string;
  readonly sequence: number;
  readonly occurredAt: IsoDate;
  readonly jurisdictionId: EntityId;
  readonly chamberKey: string;
  readonly assignmentRoundKey: string;
  readonly committeeKey: string;
  readonly memberKey: string;
  readonly memberPersonId: EntityId;
  readonly assignerPersonId: EntityId;
  readonly seatNumber: number;
  readonly reasons: readonly string[];
}

export interface RecordMemberCommitteeRequestInput {
  readonly stableKey: string;
  readonly jurisdictionId: EntityId;
  readonly chamberKey: string;
  readonly assignmentRoundKey: string;
  readonly memberKey: string;
  readonly memberPersonId: EntityId;
  readonly assignerPersonId: EntityId;
  readonly preferences: readonly string[];
  readonly reason: string;
  readonly occurredAt?: IsoDate;
}

export interface RecordCommitteeSeatAssignmentInput {
  readonly jurisdictionId: EntityId;
  readonly chamberKey: string;
  readonly assignmentRoundKey: string;
  readonly committeeKey: string;
  readonly memberKey: string;
  readonly memberPersonId: EntityId;
  readonly assignerPersonId: EntityId;
  /** One-based position in the committee's recorded seat order. */
  readonly seatNumber: number;
  readonly reasons: readonly string[];
  readonly occurredAt?: IsoDate;
}

/** Requests are append-only event records, oldest first. */
export function memberCommitteeRequests(
  world: World,
  filter: Partial<
    Pick<
      MemberCommitteeRequest,
      "jurisdictionId" | "chamberKey" | "assignmentRoundKey" | "memberKey"
    >
  > = {},
): readonly MemberCommitteeRequest[] {
  return world.history.events
    .filter((event) => event.type === REQUEST_EVENT)
    .map(parseRequest)
    .filter((record): record is MemberCommitteeRequest => record !== null)
    .filter((record) =>
      Object.entries(filter).every(
        ([key, value]) =>
          value === undefined || record[key as keyof typeof filter] === value,
      ),
    );
}

/** Read durable assignments for one chamber and assignment round. */
export function committeeSeatAssignmentsForChamber(
  world: World,
  input: {
    readonly jurisdictionId: EntityId;
    readonly chamberKey: string;
    readonly assignmentRoundKey: string;
  },
): readonly CommitteeSeatAssignment[] {
  return committeeSeatAssignments(world, input);
}

/** Assignment events are the durable seat-by-seat roster, oldest first. */
export function committeeSeatAssignments(
  world: World,
  filter: Partial<
    Pick<
      CommitteeSeatAssignment,
      | "jurisdictionId"
      | "chamberKey"
      | "assignmentRoundKey"
      | "committeeKey"
      | "memberKey"
    >
  > = {},
): readonly CommitteeSeatAssignment[] {
  return world.history.events
    .filter((event) => event.type === ASSIGNMENT_EVENT)
    .map(parseAssignment)
    .filter((record): record is CommitteeSeatAssignment => record !== null)
    .filter((record) =>
      Object.entries(filter).every(
        ([key, value]) =>
          value === undefined || record[key as keyof typeof filter] === value,
      ),
    );
}

/** Record a member's ordered preferences and the reason they gave. */
export function recordMemberCommitteeRequest(
  world: World,
  input: RecordMemberCommitteeRequestInput,
): World {
  const prior = world.history.events.find(
    (event) => event.stableKey === input.stableKey,
  );
  if (prior) {
    if (prior.type !== REQUEST_EVENT)
      throw new Error("Committee request stable key belongs to another event.");
    return world;
  }
  requireText(input.chamberKey, "chamber key");
  requireText(input.assignmentRoundKey, "assignment round key");
  requireText(input.memberKey, "member key");
  requireText(input.reason, "request reason");
  if (new Set(input.preferences).size !== input.preferences.length)
    throw new Error("A committee request cannot repeat a preference.");
  for (const preference of input.preferences)
    requireText(preference, "committee preference");
  const occurredAt = makeIsoDate(input.occurredAt ?? world.currentDate);
  return recordWorldEvent(world, {
    stableKey: input.stableKey,
    type: REQUEST_EVENT,
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.jurisdictionId,
      input.memberPersonId,
      input.assignerPersonId,
    ],
    participants: [
      {
        personId: input.memberPersonId,
        role: "agency:committee-requester",
        detail: "Recorded committee preferences.",
      },
      {
        personId: input.assignerPersonId,
        role: "agency:committee-request-recipient",
        detail: "Received the member's committee preferences.",
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      tag("kind", "request"),
      tag("chamber", input.chamberKey),
      tag("round", input.assignmentRoundKey),
      tag("member", input.memberKey),
      ...input.preferences.map((preference, index) =>
        tag(`preference-${index + 1}`, preference),
      ),
      tag("reason", input.reason),
    ],
    summary: `${world.people[input.memberPersonId] ? personName(world.people[input.memberPersonId]!) : input.memberKey} requested committee assignments.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label:
          world.jurisdictions[input.jurisdictionId]?.name ??
          input.jurisdictionId,
        setting: null,
      },
      socialContext: "Committee assignment",
      pressure: null,
      choice: "Requested committee preferences",
      motivation: input.reason,
      immediateReaction: null,
    },
  });
}

/** Record exactly one member's appointment to one numbered committee seat. */
export function recordCommitteeSeatAssignment(
  world: World,
  input: RecordCommitteeSeatAssignmentInput,
): World {
  requireText(input.chamberKey, "chamber key");
  requireText(input.assignmentRoundKey, "assignment round key");
  requireText(input.committeeKey, "committee key");
  requireText(input.memberKey, "member key");
  if (!Number.isSafeInteger(input.seatNumber) || input.seatNumber < 1)
    throw new Error("Committee seat number must be a positive integer.");
  if (input.reasons.length === 0)
    throw new Error("A committee assignment must record its reasons.");
  for (const reason of input.reasons) requireText(reason, "assignment reason");
  const stableKey = [
    "committee-seat",
    input.jurisdictionId,
    input.chamberKey,
    input.assignmentRoundKey,
    input.committeeKey,
    input.seatNumber,
  ].join(":");
  const previous = committeeSeatAssignments(world, {
    jurisdictionId: input.jurisdictionId,
    chamberKey: input.chamberKey,
    assignmentRoundKey: input.assignmentRoundKey,
    committeeKey: input.committeeKey,
  });
  const occupied = previous.find(
    (record) => record.seatNumber === input.seatNumber,
  );
  const priorMembership = previous.find(
    (record) => record.memberKey === input.memberKey,
  );
  if (priorMembership && priorMembership.seatNumber !== input.seatNumber)
    throw new Error(
      "A member cannot occupy two seats on the same committee in one assignment round.",
    );
  if (occupied) {
    if (occupied.memberKey !== input.memberKey)
      throw new Error("This committee seat already has a recorded member.");
    return world;
  }
  const occurredAt = makeIsoDate(input.occurredAt ?? world.currentDate);
  return recordWorldEvent(world, {
    stableKey,
    type: ASSIGNMENT_EVENT,
    occurredAt,
    recordedAt: world.currentDate,
    jurisdictionId: input.jurisdictionId,
    involvedEntityIds: [
      input.jurisdictionId,
      input.memberPersonId,
      input.assignerPersonId,
    ],
    participants: [
      {
        personId: input.memberPersonId,
        role: "agency:committee-seat-holder",
        detail: `Holds seat ${input.seatNumber} on ${input.committeeKey}.`,
      },
      {
        personId: input.assignerPersonId,
        role: "agency:committee-assigner",
        detail: `Selected the member for seat ${input.seatNumber}.`,
      },
    ],
    personFactConstraints: [],
    visibility: "public",
    tags: [
      tag("kind", "assignment"),
      tag("chamber", input.chamberKey),
      tag("round", input.assignmentRoundKey),
      tag("committee", input.committeeKey),
      tag("member", input.memberKey),
      tag("seat", String(input.seatNumber)),
      ...input.reasons.map((reason, index) =>
        tag(`reason-${index + 1}`, reason),
      ),
    ],
    summary: `${world.people[input.memberPersonId] ? personName(world.people[input.memberPersonId]!) : input.memberKey} was assigned seat ${input.seatNumber} on ${input.committeeKey}.`,
    context: {
      location: {
        jurisdictionId: input.jurisdictionId,
        label:
          world.jurisdictions[input.jurisdictionId]?.name ??
          input.jurisdictionId,
        setting: null,
      },
      socialContext: "Committee assignment",
      pressure: null,
      choice: `Assigned to ${input.committeeKey}`,
      motivation: input.reasons.join("; "),
      immediateReaction: null,
    },
  });
}

function parseRequest(event: HistoricalEvent): MemberCommitteeRequest | null {
  const values = valuesFrom(event.tags);
  if (values.kind !== "request") return null;
  const personId = event.participants.find(
    (participant) => participant.role === "agency:committee-requester",
  )?.personId;
  const assignerPersonId = event.participants.find(
    (participant) => participant.role === "agency:committee-request-recipient",
  )?.personId;
  if (
    !personId ||
    !assignerPersonId ||
    !event.jurisdictionId ||
    !values.chamber ||
    !values.round ||
    !values.member ||
    !values.reason
  )
    return null;
  const preferences = Object.entries(values)
    .filter(([key]) => key.startsWith("preference-"))
    .sort(([a], [b]) => Number(a.slice(11)) - Number(b.slice(11)))
    .map(([, value]) => value);
  return {
    eventId: event.id,
    stableKey: event.stableKey,
    sequence: event.sequence,
    occurredAt: event.occurredAt,
    jurisdictionId: event.jurisdictionId,
    chamberKey: values.chamber,
    assignmentRoundKey: values.round,
    memberKey: values.member,
    memberPersonId: personId,
    assignerPersonId,
    preferences,
    reason: values.reason,
  };
}

function parseAssignment(
  event: HistoricalEvent,
): CommitteeSeatAssignment | null {
  const values = valuesFrom(event.tags);
  if (values.kind !== "assignment") return null;
  const holderId = event.participants.find(
    (participant) => participant.role === "agency:committee-seat-holder",
  )?.personId;
  const assignerId = event.participants.find(
    (participant) => participant.role === "agency:committee-assigner",
  )?.personId;
  const seatNumber = Number(values.seat);
  if (
    !holderId ||
    !assignerId ||
    !event.jurisdictionId ||
    !values.chamber ||
    !values.round ||
    !values.committee ||
    !values.member ||
    !Number.isSafeInteger(seatNumber)
  )
    return null;
  const reasons = Object.entries(values)
    .filter(([key]) => key.startsWith("reason-"))
    .sort(([a], [b]) => Number(a.slice(7)) - Number(b.slice(7)))
    .map(([, value]) => value);
  return {
    eventId: event.id,
    stableKey: event.stableKey,
    sequence: event.sequence,
    occurredAt: event.occurredAt,
    jurisdictionId: event.jurisdictionId,
    chamberKey: values.chamber,
    assignmentRoundKey: values.round,
    committeeKey: values.committee,
    memberKey: values.member,
    memberPersonId: holderId,
    assignerPersonId: assignerId,
    seatNumber,
    reasons,
  };
}

function valuesFrom(tags: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const tagValue of tags) {
    if (!tagValue.startsWith(TAG_PREFIX)) continue;
    const separator = tagValue.indexOf("=", TAG_PREFIX.length);
    if (separator < 0) continue;
    const key = tagValue.slice(TAG_PREFIX.length, separator);
    try {
      values[key] = decodeURIComponent(tagValue.slice(separator + 1));
    } catch {
      /* malformed legacy tag: ignore it */
    }
  }
  return values;
}

function tag(key: string, value: string): string {
  return `${TAG_PREFIX}${key}=${encodeURIComponent(value)}`;
}

function requireText(value: string, label: string): void {
  if (!value.trim()) throw new Error(`${label} must not be empty.`);
}
