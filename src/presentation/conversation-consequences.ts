import {
  currentLifeCutoff,
  householdMembershipsAt,
  kinshipRelationshipsAt,
  personName,
  recordLifeCommitment,
  scheduleAftermath,
} from "../simulation";
import type {
  AdultAftermathKind,
  EntityId,
  IsoDate,
  LifeCommitmentKind,
  RelationshipChange,
  RelationshipInteractionKind,
  RelationshipSignificance,
  World,
} from "../simulation";

/**
 * What a conversation turn changes about a life.
 *
 * The engine already recorded conversations well — an event, a claim, who
 * learned what, and what each of them made of it. What it almost never did was
 * change anything. Fifteen intents shared a two-entry table between them
 * (`reassure` strengthened a relationship, `press` strained one, and the other
 * thirteen did nothing at all), nothing a person said in a room could become a
 * commitment they were holding a week later, and no promise made in a
 * conversation could come back.
 *
 * The three things below are what a subject may declare about its own intents:
 * what an exchange does to the people in it, what it obliges the speaker to,
 * and what may return. All three are declarations, not a universal table, and
 * all three take the *resolved outcome* rather than the intent alone — because
 * asking somebody to take the week and being refused is not the same exchange
 * as asking and being agreed with, and a record that filed them identically
 * would be describing something that did not happen.
 *
 * None of it consults the player model. Which beat a player was offered is the
 * adaptive layer's business; what an exchange did to the people in it is the
 * world's, and the two must not meet here.
 */

/** How a turn came out. Owned here so a consequence can be a function of it. */
export type ConversationOutcome =
  | "committed"
  | "deferred"
  | "boundary-held"
  | "reassured"
  | "bystander-interjected"
  | "continued"
  | "silence-held"
  | "position-explained"
  | "commitment-offered"
  | "proposal-accepted"
  | "proposal-refused"
  | "proposal-countered"
  | "inducement-refused"
  | "commitment-recalled";

/** Canonical evidence supplied only after the turn's event and claim exist. */
export interface ConversationConsequenceContext {
  readonly turnKey: string;
  readonly eventId: EntityId;
  readonly claimId: EntityId | null;
  readonly audience: import("../simulation").ClaimAudience;
  readonly listenerPersonIds: readonly EntityId[];
  readonly statement: string;
}

export type ConversationWorldConsequence = (
  world: World,
  context: ConversationConsequenceContext,
) => World;

/** The names a consequence sentence is allowed to reach for. */
export interface ConversationEffectNames {
  /** The player, said the way a record should say it. */
  readonly playerName: string;
  /** Whoever answered. */
  readonly otherName: string;
}

/**
 * What an exchange did to the two people in it.
 *
 * `change` is the canonical vocabulary rather than the engine's old pair, so an
 * exchange that settled something without moving anybody can be recorded as
 * `maintained` instead of being rounded up to `strengthened` or dropped.
 */
export interface ConversationRelationshipEffect {
  readonly kind: RelationshipInteractionKind;
  readonly change: RelationshipChange;
  readonly significance: RelationshipSignificance;
  summary(names: ConversationEffectNames): string;
}

/**
 * Something the speaker is now holding.
 *
 * Written through the accepted life-commitment machinery rather than left as
 * prose, so the hours it costs land in the same load calculation as a job or a
 * committee, and so a later scene can require it.
 */
export interface ConversationCommitmentSpec {
  /**
   * Whose commitment it is.
   *
   * Asking somebody else to take the week, and being agreed with, creates an
   * obligation — theirs, not the speaker's. Recording it against the player
   * because the player did the asking would put the hours on the wrong life.
   */
  readonly holder: "player" | "counterpart";
  readonly kind: LifeCommitmentKind;
  readonly label: string;
  /** Lower and upper weekly hours, as the accepted time-demand profile wants. */
  readonly weeklyHours: readonly [number, number];
}

/** What a conversation may leave behind, in the accepted aftermath vocabulary. */
export type ConversationAftermathSpec = AdultAftermathKind;

/* -------------------------------------------------------------------------- */
/* Writing them                                                                */
/* -------------------------------------------------------------------------- */

export interface WriteConversationCommitmentInput {
  readonly personId: EntityId;
  readonly eventId: EntityId;
  readonly stableKey: string;
  readonly jurisdictionId: EntityId | null;
  readonly spec: ConversationCommitmentSpec;
}

/**
 * Records what somebody undertook, pointing at the sentence that undertook it.
 *
 * The provenance is the conversation event itself, so the commitment is
 * answerable: a reader can go from "this person is spending two hours a week on
 * this" back to the exact turn in which they said they would.
 */
export function writeConversationCommitment(
  world: World,
  input: WriteConversationCommitmentInput,
): World {
  return recordLifeCommitment(world, {
    stableKey: `${input.stableKey}:commitment`,
    personId: input.personId,
    startsAt: world.currentDate,
    endsAt: null,
    kind: input.spec.kind,
    label: input.spec.label,
    timeDemand: {
      expectedWeekly: {
        minimumHours: input.spec.weeklyHours[0],
        maximumHours: input.spec.weeklyHours[1],
      },
      attention: "moderate",
      concurrency: "partly-concurrent",
      scheduleRigidity: "mixed",
      interruptibility: "interruptible",
      locationJurisdictionId: input.jurisdictionId,
    },
    provenance: { kind: "simulated-event", eventId: input.eventId },
  });
}

export interface ScheduleConversationAftermathInput {
  readonly personId: EntityId;
  readonly counterpartPersonId: EntityId | null;
  readonly eventId: EntityId;
  readonly stableKey: string;
  readonly subject: string;
  readonly intent: string;
  readonly occurredAt: IsoDate;
  readonly aftermath: ConversationAftermathSpec;
}

/**
 * Lets a promise made in a room come back.
 *
 * This is the accepted life-callback machinery, unchanged and unforked: the
 * same three questions are asked (is this the kind of thing that can return, is
 * there anybody to hold it, would anybody have been in a position to notice),
 * the same delays apply, and the same six honest reasons are available when the
 * answer is no. A second scheduler for conversations would have been a second
 * set of rules about what a promise is worth.
 */
export function scheduleConversationAftermath(
  world: World,
  input: ScheduleConversationAftermathInput,
): World {
  return scheduleAftermath({
    world,
    personId: input.personId,
    situationKey: `conversation:${input.subject}`,
    optionKey: input.intent,
    aftermath: input.aftermath,
    counterpartPersonId: input.counterpartPersonId,
    occurredAt: input.occurredAt,
    eventId: input.eventId,
    stableKey: input.stableKey,
  });
}

/* -------------------------------------------------------------------------- */
/* Revising an opinion rather than accumulating one                            */
/* -------------------------------------------------------------------------- */

/**
 * The opinion this new one replaces, if it replaces one.
 *
 * A perception is an opinion somebody holds, and holding two contradictory ones
 * about the same person on the same subject is not a richer model of a mind: it
 * is a record that never made up its own. The field for saying so has existed
 * since perceptions did and nothing used it.
 *
 * What counts as "the same subject" is deliberately narrow. Matching on the
 * speaker alone would make an opinion formed at home about the week's errands
 * silently overwrite one formed at a neighbourhood meeting about a notice —
 * they are about the same person and nothing else. The subject key carries the
 * conversation subject for exactly this reason, so a revision is only ever a
 * revision of the same person's position on the same thing.
 *
 * Nothing is deleted. The superseded record stays where it is, and the new one
 * names it.
 */
export function priorConversationPerceptionId(
  world: World,
  personId: EntityId,
  subjectKey: string,
): EntityId | null {
  const superseded = new Set(
    world.history.perceptions
      .map((record) => record.supersedesPerceptionId)
      .filter((id): id is EntityId => id !== null),
  );
  for (let index = world.history.perceptions.length - 1; index >= 0; index--) {
    const candidate = world.history.perceptions[index]!;
    if (candidate.personId !== personId) continue;
    if (candidate.subjectKind !== "entity:conversation-position") continue;
    if (candidate.subjectKey !== subjectKey) continue;
    if (superseded.has(candidate.id)) continue;
    return candidate.id;
  }
  return null;
}

/**
 * The subject key a conversation perception is filed under.
 *
 * Carries the subject as well as the speaker, so two opinions about the same
 * person on two different topics never collide.
 */
export function conversationPerceptionSubjectKey(
  subject: string,
  speakerPersonId: EntityId,
): string {
  return `conversation-response:${subject}:${speakerPersonId}`;
}

/* -------------------------------------------------------------------------- */
/* What the responders are allowed to read                                     */
/* -------------------------------------------------------------------------- */

/**
 * What the world already records about these two people.
 *
 * This is the whole input surface a responder may use to choose between
 * authored lines or to make a decision. Everything in it is a record somebody
 * wrote for its own reasons; nothing is derived from how the player was
 * profiled, because an NPC reading the player model would be the game telling
 * somebody what to think of you.
 */
export interface ConversationStanding {
  /** Recorded interactions between the pair, oldest first. */
  readonly interactionIds: readonly EntityId[];
  /** How the most recent recorded interaction between them went. */
  readonly latestChange: RelationshipChange | null;
  /** How many recorded interactions between them were strained. */
  readonly strainedCount: number;
  /** How many were strengthened. */
  readonly strengthenedCount: number;
  /** They are on the same household record right now. */
  readonly sharesHousehold: boolean;
  /** The world records a kinship between them. */
  readonly isKin: boolean;
  /** Commitments the other person is already carrying. */
  readonly counterpartCommitmentCount: number;
  /**
   * The other person's own household-membership record, when they have one.
   *
   * Carried as an id rather than a boolean because a decision that weighs
   * "they live here too" has to be able to cite the record that says so.
   */
  readonly counterpartHouseholdMembershipId: EntityId | null;
  /** The most recent commitment record of theirs, for the same reason. */
  readonly counterpartCommitmentId: EntityId | null;
  /** Turns already recorded between them on this conversation subject. */
  readonly priorTurnsOnSubject: number;
}

/**
 * Reads the standing between the player and whoever is answering.
 *
 * Deterministic and record-only: two worlds with the same history produce the
 * same standing, and a world that records nothing about a pair produces a
 * standing that says so rather than one that guesses.
 */
export function conversationStanding(
  world: World,
  personId: EntityId,
  counterpartPersonId: EntityId,
  subjectTag: string,
): ConversationStanding {
  const pair = new Set([personId, counterpartPersonId]);
  const interactions = world.history.relationshipInteractions.filter(
    (record) =>
      record.personIds.length === 2 &&
      pair.has(record.personIds[0]!) &&
      pair.has(record.personIds[1]!) &&
      record.personIds[0] !== record.personIds[1],
  );
  const cutoff = currentLifeCutoff(world);
  const mine = new Set(
    householdMembershipsAt(world, personId, cutoff).map(
      (entry) => entry.membership.householdId,
    ),
  );
  const theirs = householdMembershipsAt(world, counterpartPersonId, cutoff);
  const shared = theirs.find((entry) => mine.has(entry.membership.householdId));
  const kin = kinshipRelationshipsAt(world, personId, cutoff);
  const theirCommitments = world.history.lifeCommitments.filter(
    (record) => record.personId === counterpartPersonId,
  );

  return {
    interactionIds: interactions.map((record) => record.id),
    latestChange: interactions.at(-1)?.change ?? null,
    strainedCount: interactions.filter((record) => record.change === "strained")
      .length,
    strengthenedCount: interactions.filter(
      (record) => record.change === "strengthened",
    ).length,
    sharesHousehold: shared !== undefined,
    counterpartHouseholdMembershipId: shared?.membership.id ?? null,
    counterpartCommitmentId: theirCommitments.at(-1)?.id ?? null,
    isKin: kin.some((relationship) =>
      relationship.personIds.includes(counterpartPersonId),
    ),
    counterpartCommitmentCount: theirCommitments.length,
    priorTurnsOnSubject: world.history.events.filter((event) =>
      event.tags.includes(subjectTag),
    ).length,
  };
}

/** A short name for a consequence sentence, without reaching into the room. */
export function effectNames(
  world: World,
  playerPersonId: EntityId,
  otherPersonId: EntityId,
): ConversationEffectNames {
  const player = world.people[playerPersonId];
  const other = world.people[otherPersonId];
  if (!player || !other) {
    throw new Error(
      "A consequence needs both people to still be in the world.",
    );
  }
  return { playerName: personName(player), otherName: personName(other) };
}
