import { personName, SeededRng } from "../simulation";
import type { EntityId, Person, World } from "../simulation";
import {
  claimStanceOf,
  claimStanceTag,
  recordPlayerClaim,
  type ClaimStance,
  type EpistemicIntent,
  type SpeakerBelief,
} from "../simulation/claim-stances";
import { scheduleContradictionCheck } from "../simulation/claim-contradictions";
import { describePersonContext } from "../simulation/person-context";
import {
  SCENE_BINDING_REF_TAG_PREFIX,
  sceneBindingsFor,
  type BoundScene,
  type SceneBinding,
  type SceneFamily,
} from "../simulation/scene-bindings";
import type {
  ConversationCommitmentSpec,
  ConversationOutcome,
  ConversationRelationshipEffect,
} from "./conversation-consequences";
import type { ChoiceTruthIntent } from "./lie-marker";
import { SCENE_FAMILY_DEFINITIONS } from "./contextual-scene-families";
import type { ConversationCommitContract as ConversationCommitContractShape } from "./conversation-subjects";
import type {
  ConversationAddressee,
  ConversationAudibility,
  ConversationDialogueBeat,
  ConversationIntentOption,
  ConversationResolvedResponse,
  ConversationRoomContext,
} from "./run-b-conversation";

/**
 * Contextual scenes (PROSE B): six situation families on the one conversation
 * engine.
 *
 * Each family is an ordinary conversation subject. What makes it contextual is
 * that its facts come from a saved `SceneBinding` — the actual person, request,
 * place, event, promise and date — written by a producer when the world made
 * the situation answerable, and read back unchanged. A family's sentences can
 * name only what that binding holds; where the world did not say something,
 * the line does not say it either.
 *
 * Choices are specific: what is offered, promised, declined or asked. A choice
 * that asserts a fact the player's own record settles declares its
 * `truthIntent`, and the turn saves the exact proposition, belief, words and
 * listeners. An explicit Lie is offered only where the player's record
 * establishes the opposite of what the words say.
 *
 * Talking takes no time. Anything a choice agrees to is carried out by the
 * activity that already owns it.
 */

export const CONTEXTUAL_SCENE_SUBJECT = {
  "home-evening": "scene-home-evening",
  favor: "scene-favor",
  "party-invite": "scene-party-invite",
  "campaign-reaction": "scene-campaign-reaction",
  "staff-followup": "scene-staff-followup",
  "reporter-question": "scene-reporter-question",
  "study-peer": "scene-study-peer",
  "study-plan": "scene-study-plan",
} as const satisfies Record<SceneFamily, string>;

export type ContextualSceneSubject =
  (typeof CONTEXTUAL_SCENE_SUBJECT)[SceneFamily];

export const CONTEXTUAL_SCENE_SUBJECTS = Object.values(
  CONTEXTUAL_SCENE_SUBJECT,
) as readonly ContextualSceneSubject[];

export function isContextualSceneSubject(
  subject: string,
): subject is ContextualSceneSubject {
  return (CONTEXTUAL_SCENE_SUBJECTS as readonly string[]).includes(subject);
}

export function familyOfSubject(subject: ContextualSceneSubject): SceneFamily {
  const entry = Object.entries(CONTEXTUAL_SCENE_SUBJECT).find(
    ([, value]) => value === subject,
  );
  return entry![0] as SceneFamily;
}

export interface ContextualSceneProgress {
  readonly subject: ContextualSceneSubject;
  readonly bindingEventId: EntityId;
  readonly binding: SceneBinding;
  readonly phase: "opening" | "settled";
  /** Follow-up questions already asked, in order. */
  readonly asked: readonly string[];
  /** The answer that settled it. */
  readonly answer: string | null;
  readonly latestProposition: null;
  readonly pendingContributions: readonly [];
  readonly silenceSettled: boolean;
}

export function isContextualSceneProgress(progress: {
  readonly subject: string;
}): progress is ContextualSceneProgress {
  return isContextualSceneSubject(progress.subject);
}

/* -------------------------------------------------------------------------- */
/* What a family is made of                                                    */
/* -------------------------------------------------------------------------- */

/** Everything a line may name, drawn from the binding and nothing else. */
export interface SceneContext {
  readonly world: World;
  readonly binding: SceneBinding;
  readonly bindingEventId: EntityId;
  readonly player: Person;
  readonly speaker: Person;
  /** The speaker's given name. */
  readonly name: string;
  readonly fullName: string;
  /** What the speaker is to the player, when the record says. */
  readonly relationship: string | null;
  readonly isPartner: boolean;
  fact(key: string): string;
  has(key: string): boolean;
}

export interface SceneAnswerStance {
  readonly propositionKey: string;
  readonly proposition: string;
  readonly asserted: ClaimStance["asserted"];
  readonly speakerBelief: SpeakerBelief;
  readonly intent: EpistemicIntent;
  readonly beliefEvidenceIds: readonly EntityId[];
  readonly sourceEntityIds: readonly EntityId[];
  /** Only when the world already settles the proposition. */
  readonly worldTruth: "true" | "false" | "unknown";
}

export interface SceneAnswer {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  readonly truthIntent?: ChoiceTruthIntent;
  /** A question that does not end the exchange. */
  readonly followUp?: boolean;
  /** The player's exact words. */
  readonly statement: string;
  /** Ways the other person answers. Every variant means the same thing. */
  readonly replies: readonly string[];
  /** What the speaker now makes of the player, if anything. */
  readonly perception?: string;
  /** The record's sentence: "The player …". */
  readonly record: string;
  /** How the other person's answer landed, in the family's words. */
  readonly landed?: string;
  readonly outcome?: ConversationOutcome;
  readonly stance?: SceneAnswerStance;
  readonly relationship?: ConversationRelationshipEffect;
  readonly commitment?: ConversationCommitmentSpec;
  /** A real consequence, written through the mechanism that owns it. */
  readonly apply?: (
    world: World,
    turn: { readonly eventId: EntityId; readonly turnKey: string },
  ) => World;
}

export interface SceneFamilyDefinition {
  readonly family: SceneFamily;
  readonly eventType: `${string}.${string}`;
  readonly setting: string;
  readonly socialContext: string;
  readonly motivation: string;
  readonly interactionTags: readonly string[];
  /** The heading. Reads only the binding, so it can be shown anywhere. */
  topic(binding: SceneBinding): string;
  briefing(context: SceneContext): string;
  /** The speaker's first line. Variants must differ in substance or voice. */
  opening(context: SceneContext): readonly string[];
  answers(
    context: SceneContext,
    progress: ContextualSceneProgress,
  ): readonly SceneAnswer[];
  /** The line shown once the exchange is over. */
  settled(context: SceneContext, answer: string | null): string;
  /**
   * Whether an unanswered scene still describes the world. A scene whose
   * event was cancelled, or whose request was answered elsewhere, is not
   * offered.
   */
  relevant?(world: World, bound: BoundScene): boolean;
  /** Optional room; a two-person exchange by default. */
  room?(world: World, bound: BoundScene): ConversationRoomContext | null;
}

export function sceneFamily(family: SceneFamily): SceneFamilyDefinition {
  const definition = SCENE_FAMILY_DEFINITIONS[family];
  if (!definition) {
    throw new Error(`No contextual scene family is registered for ${family}.`);
  }
  return definition;
}

/* -------------------------------------------------------------------------- */
/* Context, rooms and progress                                                 */
/* -------------------------------------------------------------------------- */

export function sceneContext(
  world: World,
  bindingEventId: EntityId,
  binding: SceneBinding,
): SceneContext {
  const player = world.people[binding.playerPersonId];
  const speaker = world.people[binding.speakerPersonId];
  if (!player || !speaker) {
    throw new Error("A contextual scene names somebody the world lacks.");
  }
  const relationship =
    binding.relationship ??
    describePersonContext(world, player.id, speaker.id)?.relationship ??
    null;
  return {
    world,
    binding,
    bindingEventId,
    player,
    speaker,
    name: speaker.givenName,
    fullName: personName(speaker),
    relationship,
    isPartner: binding.facts.partner === "yes",
    has: (key) =>
      typeof binding.facts[key] === "string" &&
      binding.facts[key]!.trim() !== "",
    fact: (key) => {
      const value = binding.facts[key];
      if (typeof value !== "string" || !value.trim()) {
        throw new Error(
          `The ${binding.family} scene has no bound value for ${key}.`,
        );
      }
      return value;
    },
  };
}

/** A two-person exchange where only the speaker can hear. */
export function twoPersonRoom(
  world: World,
  bound: BoundScene,
): ConversationRoomContext | null {
  const { binding } = bound;
  if (!world.people[binding.speakerPersonId]) return null;
  if (!world.jurisdictions[binding.jurisdictionId]) return null;
  const present = [binding.playerPersonId, binding.speakerPersonId];
  return {
    sceneKey: `contextual:${binding.family}:${bound.eventId}`,
    roles: { "the-other-person": binding.speakerPersonId },
    locationLabel: binding.place,
    jurisdictionId: binding.jurisdictionId,
    playerPersonId: binding.playerPersonId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: present,
    eligibleAddresseePersonIds: [binding.speakerPersonId],
    normalHearingPersonIds: present,
    quietAmbientHearingPersonIds: [],
    privateAvailable: true,
    privateUnavailableReason: null,
  };
}

/** The tag every turn of one scene carries. */
export function sceneTurnTag(bindingEventId: EntityId): string {
  return `${SCENE_BINDING_REF_TAG_PREFIX}${bindingEventId}`;
}

function turnsFor(
  world: World,
  playerPersonId: EntityId,
  bindingEventId: EntityId,
) {
  const tag = sceneTurnTag(bindingEventId);
  return world.history.events.filter(
    (event) =>
      event.tags.includes(tag) &&
      event.involvedEntityIds.includes(playerPersonId) &&
      event.tags.some((entry) => entry.startsWith("conversation.intent.")),
  );
}

/** Tagged on a turn that ended its exchange. */
const SCENE_SETTLED_TAG = "scene.turn.settled";

export function replaySceneProgress(
  world: World,
  bound: BoundScene,
): ContextualSceneProgress {
  let progress: ContextualSceneProgress = {
    subject: CONTEXTUAL_SCENE_SUBJECT[bound.binding.family],
    bindingEventId: bound.eventId,
    binding: bound.binding,
    phase: "opening",
    asked: [],
    answer: null,
    latestProposition: null,
    pendingContributions: [],
    silenceSettled: false,
  };
  for (const event of turnsFor(
    world,
    bound.binding.playerPersonId,
    bound.eventId,
  )) {
    const intent = event.tags
      .find((tag) => tag.startsWith("conversation.intent."))!
      .slice("conversation.intent.".length);
    // The turn recorded whether it ended the exchange, so replay never
    // depends on what the world offers today.
    progress = event.tags.includes(SCENE_SETTLED_TAG)
      ? { ...progress, phase: "settled", answer: intent, silenceSettled: true }
      : { ...progress, asked: [...progress.asked, intent] };
  }
  return progress;
}

function advanceSceneProgress(
  progress: ContextualSceneProgress,
  answer: SceneAnswer,
): ContextualSceneProgress {
  if (progress.phase === "settled") return progress;
  if (answer.followUp) {
    return { ...progress, asked: [...progress.asked, answer.key] };
  }
  return {
    ...progress,
    phase: "settled",
    answer: answer.key,
    silenceSettled: true,
  };
}

/** The date the exchange was settled on, if it was. */
function settledOn(world: World, bound: BoundScene): string | null {
  const progress = replaySceneProgress(world, bound);
  if (progress.phase !== "settled") return null;
  const turns = turnsFor(world, bound.binding.playerPersonId, bound.eventId);
  return turns.at(-1)?.occurredAt ?? null;
}

/**
 * The binding a family currently offers this person: the latest one that is
 * still open and not past, or one settled today so its last line stays in
 * view for the rest of the day.
 */
export function activeSceneBinding(
  world: World,
  playerPersonId: EntityId,
  family: SceneFamily,
): BoundScene | null {
  const bound = sceneBindingsFor(world, playerPersonId, family);
  for (let index = bound.length - 1; index >= 0; index -= 1) {
    const entry = bound[index]!;
    if (!world.people[entry.binding.speakerPersonId]) continue;
    const settledDate = settledOn(world, entry);
    if (settledDate !== null) {
      if (settledDate === world.currentDate) return entry;
      continue;
    }
    if (entry.binding.expiresAt < world.currentDate) continue;
    const relevant = sceneFamily(entry.binding.family).relevant;
    if (relevant && !relevant(world, entry)) continue;
    return entry;
  }
  return null;
}

export function sceneRoom(
  world: World,
  playerPersonId: EntityId,
  family: SceneFamily,
): ConversationRoomContext | null {
  if (
    world.control.kind !== "person" ||
    world.control.personId !== playerPersonId
  ) {
    return null;
  }
  const bound = activeSceneBinding(world, playerPersonId, family);
  if (!bound) return null;
  const definition = sceneFamily(family);
  return (definition.room ?? twoPersonRoom)(world, bound);
}

export function sceneProgress(
  world: World,
  playerPersonId: EntityId,
  family: SceneFamily,
): ContextualSceneProgress | null {
  const bound = activeSceneBinding(world, playerPersonId, family);
  return bound ? replaySceneProgress(world, bound) : null;
}

/** An inert opening used only to read a family's static contract. */
export function placeholderSceneProgress(
  subject: ContextualSceneSubject,
): ContextualSceneProgress {
  return {
    subject,
    bindingEventId: "" as EntityId,
    binding: null as unknown as SceneBinding,
    phase: "opening",
    asked: [],
    answer: null,
    latestProposition: null,
    pendingContributions: [],
    silenceSettled: false,
  };
}

/* -------------------------------------------------------------------------- */
/* The subject presentation and commit contract                                */
/* -------------------------------------------------------------------------- */

function pick(world: World, context: string, lines: readonly string[]): string {
  if (lines.length === 0) throw new Error("A scene line bank is empty.");
  const rng = new SeededRng(world.seed).fork(`contextual-scene-v1:${context}`);
  return lines[rng.integer(0, lines.length)]!;
}

function available(
  context: SceneContext,
  progress: ContextualSceneProgress,
  definition: SceneFamilyDefinition,
): readonly SceneAnswer[] {
  if (progress.phase === "settled") return [];
  return definition
    .answers(context, progress)
    .filter(
      (answer) => !(answer.followUp && progress.asked.includes(answer.key)),
    );
}

export function contextualSceneTopic(
  progress: ContextualSceneProgress,
): string {
  if (!progress.binding) return "A conversation";
  return sceneFamily(progress.binding.family).topic(progress.binding);
}

export interface ContextualSubjectPresentation {
  topicLabel(progress: ContextualSceneProgress): string;
  describeBriefing(
    world: World,
    room: ConversationRoomContext,
    progress: ContextualSceneProgress,
  ): string;
  availableIntents(
    world: World,
    room: ConversationRoomContext,
    addressee: ConversationAddressee,
    progress: ContextualSceneProgress,
    silenceIsUseful: boolean,
    audibility: ConversationAudibility,
  ): readonly ConversationIntentOption[];
  openingBeat(
    world: World,
    room: ConversationRoomContext,
    addressee: ConversationAddressee,
    progress: ContextualSceneProgress,
  ): ConversationDialogueBeat;
  responseSpeaker(room: ConversationRoomContext): EntityId;
  resolveResponse(
    world: World,
    input: {
      readonly turnKey: string;
      readonly room: ConversationRoomContext;
      readonly speakerPersonId: EntityId;
      readonly intent: string;
      readonly audibility: ConversationAudibility;
      readonly progress: ContextualSceneProgress;
    },
    listeners: (
      room: ConversationRoomContext,
      audibility: ConversationAudibility,
    ) => readonly EntityId[],
  ): ConversationResolvedResponse;
}

export function contextualSubjectPresentation(): ContextualSubjectPresentation {
  return {
    topicLabel: contextualSceneTopic,
    describeBriefing(world, _room, progress) {
      const context = sceneContext(
        world,
        progress.bindingEventId,
        progress.binding,
      );
      return sceneFamily(progress.binding.family).briefing(context);
    },
    availableIntents(world, _room, addressee, progress) {
      if (addressee !== progress.binding.speakerPersonId) return [];
      const definition = sceneFamily(progress.binding.family);
      const context = sceneContext(
        world,
        progress.bindingEventId,
        progress.binding,
      );
      return available(context, progress, definition).map((answer) => ({
        key: answer.key,
        label: answer.label,
        description: answer.description,
        ...(answer.truthIntent ? { truthIntent: answer.truthIntent } : {}),
      }));
    },
    openingBeat(world, _room, _addressee, progress) {
      const definition = sceneFamily(progress.binding.family);
      const context = sceneContext(
        world,
        progress.bindingEventId,
        progress.binding,
      );
      const dialogue =
        progress.phase === "settled"
          ? definition.settled(context, progress.answer)
          : pick(
              world,
              `${progress.bindingEventId}:opening`,
              definition.opening(context),
            );
      return {
        speakerPersonId: context.speaker.id,
        speakerName: context.fullName,
        dialogue,
      };
    },
    responseSpeaker(room) {
      return room.roles["the-other-person"]!;
    },
    resolveResponse(world, input, listeners) {
      const { progress } = input;
      const definition = sceneFamily(progress.binding.family);
      const context = sceneContext(
        world,
        progress.bindingEventId,
        progress.binding,
      );
      const answer = available(context, progress, definition).find(
        (candidate) => candidate.key === input.intent,
      );
      if (!answer) {
        throw new Error("That is not something this conversation offers now.");
      }
      const heard = listeners(input.room, input.audibility).filter(
        (personId) => personId !== progress.binding.playerPersonId,
      );
      const tags = [sceneTurnTag(progress.bindingEventId)];
      if (!answer.followUp) tags.push(SCENE_SETTLED_TAG);
      if (answer.stance) {
        const stance: ClaimStance = {
          version: 1,
          propositionKey: answer.stance.propositionKey,
          proposition: answer.stance.proposition,
          asserted: answer.stance.asserted,
          speakerBelief: answer.stance.speakerBelief,
          intent: answer.stance.intent,
          statement: answer.statement,
          beliefEvidenceIds: answer.stance.beliefEvidenceIds,
          recipientPersonIds: [...heard].sort(),
          audibility: input.audibility,
          sourceEntityIds: answer.stance.sourceEntityIds,
        };
        tags.push(claimStanceTag(stance));
      }
      const next = advanceSceneProgress(progress, answer);
      const worldTruth = answer.stance?.worldTruth ?? "unknown";
      return {
        world,
        outcome:
          answer.outcome ?? (answer.followUp ? "continued" : "committed"),
        speakerPersonId: input.speakerPersonId,
        dialogue: pick(
          world,
          `${progress.bindingEventId}:${answer.key}`,
          answer.replies,
        ),
        perception: answer.perception ?? null,
        durableDecisionRecorded: false,
        progress: next as never,
        extraTags: tags,
        commit: turnContract(definition, context, answer, worldTruth) as never,
      };
    },
  };
}

function turnContract(
  definition: SceneFamilyDefinition,
  context: SceneContext,
  answer: SceneAnswer,
  worldTruth: "true" | "false" | "unknown",
): ConversationCommitContractShape {
  const base = staticContract(definition);
  return {
    ...base,
    setting: context.binding.place,
    choice: () => answer.record,
    pressure: () => (answer.followUp ? null : context.binding.request),
    consequence: () => (world, turn) => {
      let next = world;
      const event = next.history.events.find(
        (entry) => entry.id === turn.eventId,
      );
      const stance = event ? claimStanceOf(event) : null;
      if (event && stance) {
        next = recordPlayerClaim(next, {
          stableKey: turn.turnKey,
          eventId: event.id,
          speakerPersonId: context.binding.playerPersonId,
          audience: turn.audience,
          stance,
          worldTruth,
        });
        next = scheduleContradictionCheck(next, {
          stanceEventId: event.id,
          speakerPersonId: context.binding.playerPersonId,
          stance,
          jurisdictionId: context.binding.jurisdictionId,
        });
      }
      if (answer.apply) {
        next = answer.apply(next, {
          eventId: turn.eventId,
          turnKey: turn.turnKey,
        });
      }
      return next;
    },
    relationship: () => answer.relationship ?? null,
    commitment: () => answer.commitment ?? null,
    aftermath: () => null,
    landed: () => answer.landed ?? null,
  };
}

export function staticContract(
  definition: SceneFamilyDefinition,
): ConversationCommitContractShape {
  return {
    subject: CONTEXTUAL_SCENE_SUBJECT[definition.family],
    eventType: definition.eventType,
    contextTag: "conversation.contextual",
    subjectTag: `conversation.subject.${CONTEXTUAL_SCENE_SUBJECT[definition.family]}`,
    setting: definition.setting,
    socialContext: definition.socialContext,
    interactionTags: definition.interactionTags,
    interactionKind: (consequence) =>
      consequence === "strengthened"
        ? "contact:good-conversation"
        : "conflict:hard-conversation",
    motivation: definition.motivation,
    pressure: () => null,
    choice: (intent) => `The player chose to ${intent.replace(/-/g, " ")}.`,
  };
}
