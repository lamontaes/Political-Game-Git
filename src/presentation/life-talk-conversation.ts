import { currentOpeningLifeScene } from "./life-scene-flow";
import {
  commitLifeConversation,
  projectLifeConversation,
  type LifeTalkIntent,
} from "./life-conversation";
import type { ConversationRoomContext } from "./run-b-conversation";
import type { CommitConversationTurnInput } from "./run-b-conversation";
import type { CommitConversationTurnResult } from "./run-b-conversation";
import {
  createLifeTalkProgress,
  isLifeTalkConversationProgress,
  type LifeTalkConversationProgress,
} from "./run-b-conversation-progress";
import {
  activeChildAuthoritiesAt,
  describePersonContext,
  lifePlaceByJurisdictionId,
  personName,
  type EntityId,
  type World,
} from "../simulation";

/**
 * Speaking to somebody who is actually here.
 *
 * Opening-life already had a grounded talk producer in `life-conversation.ts`.
 * The shell's person action, though, only knew about the run-b subjects —
 * household errands, school projects, neighbourhood notices — and the
 * household one is correctly withheld from dependents. A child selecting their
 * guardian therefore hit "no conversation established" while the scene had the
 * guardian standing in it and `projectLifeConversation` ready to offer
 * choices.
 *
 * This module is the linkage: one more subject family on the existing engine,
 * backed by the life-talk writer rather than a parallel dialogue system.
 */

export function lifeTalkConversationRoom(
  world: World,
  personId: EntityId,
): ConversationRoomContext | null {
  const scene = currentOpeningLifeScene(world, personId);
  if (!scene) return null;
  const person = world.people[personId];
  if (!person) return null;

  const companions = scene.presentPersonIds.filter((id) => id !== personId);
  if (companions.length === 0) return null;

  const event = world.history.events.find((entry) => entry.id === scene.eventId);
  const place = lifePlaceByJurisdictionId(person.homeJurisdictionId);
  const jurisdictionId =
    place?.context.jurisdiction.id ?? person.homeJurisdictionId;
  if (!world.jurisdictions[jurisdictionId]) return null;

  const present = scene.presentPersonIds;
  const others = companions
    .map((id) => world.people[id])
    .filter((candidate) => candidate !== undefined);

  return {
    sceneKey: `opening-life:${scene.definition.setting}`,
    roles: {},
    locationLabel: event?.context.location?.label ?? scene.definition.setting,
    jurisdictionId,
    playerPersonId: personId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: companions,
    normalHearingPersonIds: present,
    quietAmbientHearingPersonIds: [],
    privateAvailable: companions.length === 1,
    privateUnavailableReason:
      companions.length === 1
        ? null
        : `${others
            .slice(1)
            .map((other) => other!.givenName)
            .join(" and ")} ${
            others.length > 2 ? "are" : "is"
          } here too, and this is not a private moment.`,
  };
}

/** Turns already spoken with this person today through the life-talk writer. */
export function lifeTalkTurnCount(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): number {
  return world.history.events.filter(
    (event) =>
      event.type === "life.conversation" &&
      event.occurredAt === world.currentDate &&
      event.participants.some(
        (participant) =>
          participant.personId === playerPersonId &&
          participant.role === "focus:subject",
      ) &&
      event.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === "coordination:counterpart",
      ),
  ).length;
}

export function lifeTalkSessionStart(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): number | null {
  const first = world.history.events.find(
    (event) =>
      event.type === "life.conversation" &&
      event.occurredAt === world.currentDate &&
      event.participants.some(
        (participant) =>
          participant.personId === playerPersonId &&
          participant.role === "focus:subject",
      ) &&
      event.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === "coordination:counterpart",
      ),
  );
  return first?.sequence ?? null;
}

/**
 * Why the shell cannot open talk with this person right now.
 *
 * Separates "nobody wired an offer" from "the grounded writer has nothing for
 * this person in this scene".
 */
export function lifeTalkUnavailableReason(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): string | null {
  const person = world.people[personId];
  const name = person ? personName(person) : "them";
  const scene = currentOpeningLifeScene(world, playerPersonId);

  if (!scene) {
    const guardian = activeChildAuthoritiesAt(world, playerPersonId).find(
      (entry) =>
        entry.authority.holder.kind === "person" &&
        entry.authority.holder.personId === personId,
    );
    if (guardian) {
      return `${name} is not in this scene with you right now.`;
    }
    return null;
  }

  if (!scene.presentPersonIds.includes(personId)) {
    const relation = describePersonContext(world, playerPersonId, personId);
    if (relation) {
      return `${name} is not here with you right now.`;
    }
    return `There is no conversation established with ${name} here yet.`;
  }

  if (!projectLifeConversation(world, playerPersonId, personId)) {
    return `There is nothing to say to ${name} in this moment.`;
  }

  return null;
}

export function commitLifeTalkConversationTurn(
  inputWorld: World,
  input: CommitConversationTurnInput,
  progress: LifeTalkConversationProgress,
): CommitConversationTurnResult {
  if (!isLifeTalkConversationProgress(progress)) {
    throw new Error("Life-talk commit requires life-talk progress.");
  }
  if (input.addressee === "everyone") {
    throw new Error("Life-talk is always addressed to one person.");
  }
  const addressee = input.addressee as EntityId;
  const view = projectLifeConversation(
    inputWorld,
    input.room.playerPersonId,
    addressee,
  );
  if (!view) {
    throw new Error("This life-talk is no longer available.");
  }
  if (!view.intents.some((option) => option.key === input.intent)) {
    throw new Error(
      `Conversation intent ${String(input.intent)} is unavailable for this addressee.`,
    );
  }

  const world = commitLifeConversation(inputWorld, {
    playerPersonId: input.room.playerPersonId,
    personId: addressee,
    intent: input.intent as LifeTalkIntent,
    revision: view.revision,
  });

  const turnKey = `${input.session.sessionKey}:turn:${input.turnOrdinal}`;
  const event = world.history.events.at(-1)!;
  const reply = event.context.immediateReaction ?? "";
  const intentLabel =
    view.intents.find((option) => option.key === input.intent)?.label ??
    input.intent;

  return {
    world,
    progress,
    semantic: {
      turnKey,
      outcome: "continued",
      responseSpeakerPersonId: addressee,
      actualListenerPersonIds: input.room.normalHearingPersonIds.filter(
        (id) => id !== input.room.playerPersonId,
      ),
      claimRecipientPersonIds: [addressee],
      claimAudience: null,
      durableDecisionRecorded: false,
      relationshipConsequence: null,
      commitmentId: null,
      aftermathScheduled: false,
      supersededPerceptionIds: [],
    },
    presentation: {
      beat: {
        speakerPersonId: addressee,
        speakerName: personName(world.people[addressee]!),
        dialogue: reply,
      },
      playerIntentLabel: intentLabel,
      playerActionDescription: `You · ${intentLabel}`,
      roomNarration: null,
      hearingDescription: `${personName(world.people[addressee]!)} replied.`,
    },
  };
}

export { isLifeTalkConversationProgress, createLifeTalkProgress };
