import type { EntityId, World } from "../simulation";
import { recordRelationshipInteraction } from "../simulation";
import { describePersonContext } from "../simulation/person-context";
import { ageOnDate } from "../simulation/dates";
import type {
  BoundScene,
  SceneBinding,
  SceneSharedMoment,
} from "../simulation/scene-bindings";
import { recordById } from "../simulation/history-index";
import { storyMoments } from "../simulation/story/moments";
import {
  situationOf,
  type BoundSituation,
} from "../simulation/story/situation-binding";
import {
  answeringMoves,
  chooseSituationMove,
  moveAftermath,
  situationType,
  storyMove,
  type SituationType,
} from "../simulation/story/situations";
import type {
  SceneAnswer,
  SceneAnswerStance,
  SceneContext,
  SceneFamilyDefinition,
} from "./contextual-scenes";
import type { SpeechAct } from "./english-composition";
import type { ConversationRoomContext } from "./run-b-conversation";
import { recordedRoomPresence } from "./recorded-room-presence";
import { voiceStoryLine, type StoryLine } from "./story-voice";

/**
 * The situation family: every situation type on the one conversation engine
 * (story director, part 3).
 *
 * The binding says which type, who fills each role and which record opened
 * it. Everything a person says is decided here and worded by the English
 * engine from the records: the opener's move is the one the opening record
 * already is, or the one their decision picks; the player's choices are their
 * role's moves; the other person answers with a move that answers the
 * player's, chosen through the ordinary decision path. Nothing is drawn by
 * chance, and no sentence is written here. A line the engine cannot word is
 * not said, and a situation that cannot be worded is not offered.
 *
 * What a move does to the two people is the move's aftermath, written through
 * the relationship interaction writer when the turn is committed. A Lie is
 * offered beside telling only where the player's own record is what would be
 * told, so the record settles what the words deny.
 */

/** The always-open question; it keeps the exchange going. */
const ASK = "ask";
/** The move whose words a Lie replaces. */
const TELL = "tell";
const LIE = "lie";
/** Bringing up a shared earlier moment; open only when the scene carries one. */
const RECALL = "recall";
const RECALL_ACT = "recall";

interface SituationScene {
  readonly world: World;
  readonly binding: SceneBinding;
  readonly bindingEventId: EntityId;
  readonly situation: BoundSituation;
  readonly type: SituationType;
  readonly playerId: EntityId;
  /** The other person the player speaks with. */
  readonly otherId: EntityId;
  /** The role that other person fills. */
  readonly otherRole: string;
}

function sceneOf(
  world: World,
  bindingEventId: EntityId,
  binding: SceneBinding,
): SituationScene | null {
  const situation = situationOf(binding);
  if (!situation) return null;
  const type = situationType(situation.typeKey);
  const otherRole = type.roles.find(
    (role) =>
      role.present !== false &&
      role.key !== situation.playerRole &&
      (situation.cast[role.key] ?? []).includes(binding.speakerPersonId),
  );
  if (!otherRole) return null;
  return {
    world,
    binding,
    bindingEventId,
    situation,
    type,
    playerId: binding.playerPersonId,
    otherId: binding.speakerPersonId,
    otherRole: otherRole.key,
  };
}

/* -------------------------------------------------------------------------- */
/* Lines                                                                       */
/* -------------------------------------------------------------------------- */

/** The strongest earlier moment the two share, when the scene carries one. */
function recalledMoment(scene: SituationScene): SceneSharedMoment | null {
  return scene.binding.sharedHistory?.[0] ?? null;
}

/** A move that brings up the past is open only with a past to bring up. */
function moveOpen(scene: SituationScene, moveKey: string): boolean {
  return moveKey !== RECALL || recalledMoment(scene) !== null;
}

/** The facts a line may name, from the records and nothing else. */
function lineFacts(
  scene: SituationScene,
  act: SpeechAct,
  speakerId: EntityId,
  listenerId: EntityId,
): Record<string, string> {
  const facts: Record<string, string> = {};
  const listener = scene.world.people[listenerId];
  if (
    listener &&
    describePersonContext(scene.world, speakerId, listenerId)?.relationship
  )
    facts.name = listener.givenName;
  const absent = scene.type.roles
    .filter((role) => role.present === false)
    .flatMap((role) => scene.situation.cast[role.key] ?? [])
    .find((id) => id !== speakerId && id !== listenerId);
  const about = absent ? scene.world.people[absent] : undefined;
  if (about) facts.about = about.givenName;
  const recalled = act === RECALL_ACT ? recalledMoment(scene) : null;
  if (recalled) {
    facts.recalled = recalled.row;
    facts.yearsAgo = String(
      ageOnDate(recalled.occurredAt, scene.world.currentDate),
    );
    if (recalled.placeThen) facts.placeThen = recalled.placeThen;
    const speakerAge = recalled.agesThen[speakerId];
    const listenerAge = recalled.agesThen[listenerId];
    if (speakerAge !== undefined) facts.speakerAgeThen = String(speakerAge);
    if (listenerAge !== undefined) facts.listenerAgeThen = String(listenerAge);
  }
  return facts;
}

function say(
  scene: SituationScene,
  act: SpeechAct,
  speakerId: EntityId,
  listenerId: EntityId,
  lineKey: string,
): StoryLine | null {
  const recalled = act === RECALL_ACT ? recalledMoment(scene) : null;
  return voiceStoryLine({
    act,
    typeKey: scene.type.key,
    speakerPersonId: speakerId,
    listenerPersonId: listenerId,
    facts: lineFacts(scene, act, speakerId, listenerId),
    sourceRecordIds: [
      ...scene.binding.knownRecordIds,
      ...(recalled?.sourceRecordIds ?? []),
    ],
    momentKey: `${scene.bindingEventId}:${lineKey}`,
  });
}

function actOf(moveKey: string): SpeechAct | null {
  return storyMove(moveKey).speechAct as SpeechAct | null;
}

/* -------------------------------------------------------------------------- */
/* What the other person does                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The opener's first move: the one the opening record already is, or the one
 * their decision picks. Someone with no reason to favor one move greets.
 */
function openingMove(scene: SituationScene): string | null {
  if (scene.situation.opener === scene.situation.playerRole) return null;
  if (scene.situation.opening) return scene.situation.opening;
  const candidates = scene.type.roles
    .find((role) => role.key === scene.otherRole)!
    .moves.filter((move) => moveOpen(scene, move));
  // One open move leaves nothing to decide.
  if (candidates.length <= 1) return candidates[0] ?? null;
  const decision = chooseSituationMove(scene.world, {
    stableKey: `${scene.bindingEventId}:opening`,
    typeKey: scene.type.key,
    roleKey: scene.otherRole,
    personId: scene.otherId,
    towardPersonIds: [scene.playerId],
    candidates,
  });
  return decision.outcomeKind === "selected"
    ? decision.selectedOptionKey
    : null;
}

function openingLine(scene: SituationScene): StoryLine | null {
  const move = openingMove(scene);
  const act = move ? actOf(move) : "greet";
  return act ? say(scene, act, scene.otherId, scene.playerId, "opening") : null;
}

/**
 * How the other person answers the player's move: with a move that answers
 * it, chosen through the decision path. Torn between them, they say so.
 */
function reply(
  scene: SituationScene,
  playerMove: string,
): { readonly move: string | null; readonly line: StoryLine | null } {
  const candidates = answeringMoves(playerMove).filter((move) =>
    moveOpen(scene, move),
  );
  if (candidates.length === 0) return { move: null, line: null };
  // A move with one answer, such as a goodbye, leaves nothing to decide.
  if (candidates.length === 1) {
    const only = candidates[0]!;
    const act = actOf(only);
    return {
      move: only,
      line: act
        ? say(scene, act, scene.otherId, scene.playerId, `reply:${playerMove}`)
        : null,
    };
  }
  const decision = chooseSituationMove(scene.world, {
    stableKey: `${scene.bindingEventId}:reply:${playerMove}`,
    typeKey: scene.type.key,
    roleKey: scene.otherRole,
    personId: scene.otherId,
    towardPersonIds: [scene.playerId],
    candidates,
  });
  const move =
    decision.outcomeKind === "selected" ? decision.selectedOptionKey : null;
  const act = move ? actOf(move) : "undecided";
  return {
    move,
    line: act
      ? say(scene, act, scene.otherId, scene.playerId, `reply:${playerMove}`)
      : null,
  };
}

/* -------------------------------------------------------------------------- */
/* The player's choices                                                        */
/* -------------------------------------------------------------------------- */

/** The record that opened it, when it is the player's own life. */
function playersOwnRecord(scene: SituationScene): EntityId | null {
  const moment = recordById(
    storyMoments(scene.world),
    scene.situation.momentId,
  );
  return moment && moment.personId === scene.playerId
    ? moment.sourceRecordId
    : null;
}

function quoted(line: StoryLine): string {
  return `“${line.text}”`;
}

function answerFor(
  scene: SituationScene,
  moveKey: string,
  lie: { readonly ownRecordId: EntityId } | null,
): SceneAnswer | null {
  const act = actOf(moveKey);
  if (!act) return null;
  const words = say(scene, act, scene.playerId, scene.otherId, moveKey);
  if (!words) return null;
  const answer = reply(scene, moveKey);
  if (!answer.line) return null;
  // What each move does depends on what it answers: the player's move answers
  // the opening, and the other person's answers the player's.
  const own = moveAftermath(scene.type, moveKey, openingMove(scene));
  const theirs = answer.move
    ? moveAftermath(scene.type, answer.move, moveKey)
    : null;
  const stance: SceneAnswerStance | undefined = lie
    ? {
        propositionKey: `story-moment:${scene.situation.momentId}`,
        // The sourced scale row the opening record was weighed by.
        proposition: scene.binding.request,
        asserted: moveKey === LIE ? "denies" : "affirms",
        speakerBelief: "believes-true",
        intent: moveKey === LIE ? "deceive" : "truthful",
        beliefEvidenceIds: [lie.ownRecordId],
        sourceEntityIds: [lie.ownRecordId],
        worldTruth: "true",
      }
    : undefined;
  return {
    key: moveKey,
    label: words.text,
    description: "",
    statement: words.text,
    replies: [answer.line.text],
    record: quoted(words),
    ...(moveKey === ASK ? { followUp: true } : {}),
    ...(lie
      ? moveKey === LIE
        ? { truthIntent: "deliberate-deception" as const, lieVariantOf: TELL }
        : { truthIntent: "sincere" as const }
      : {}),
    ...(stance ? { stance } : {}),
    ...(own
      ? {
          relationship: {
            kind: own.kind,
            change: own.change,
            significance: own.significance,
            summary: () => quoted(words),
          },
        }
      : {}),
    ...(theirs && answer.move
      ? {
          apply: (
            world: World,
            turn: { readonly eventId: EntityId; readonly turnKey: string },
          ) =>
            recordRelationshipInteraction(world, {
              stableKey: `${turn.turnKey}:story-reply`,
              personIds:
                scene.playerId.localeCompare(scene.otherId) <= 0
                  ? [scene.playerId, scene.otherId]
                  : [scene.otherId, scene.playerId],
              eventId: turn.eventId,
              occurredAt: world.currentDate,
              kind: theirs.kind,
              change: theirs.change,
              significance: theirs.significance,
              summary: quoted(answer.line!),
              tags: [
                "story.situation",
                "story.reply",
                `story.type.${scene.type.key}`,
                `story.move.${answer.move}`,
              ],
            }),
        }
      : {}),
  };
}

/** The player's choices: their role's moves, then asking, each as worded. */
function situationAnswers(scene: SituationScene): SceneAnswer[] {
  const role = scene.type.roles.find(
    (entry) => entry.key === scene.situation.playerRole,
  )!;
  const ownRecordId = playersOwnRecord(scene);
  const canLie =
    ownRecordId !== null &&
    role.moves.includes(TELL) &&
    role.moves.includes(LIE);
  const moves = [
    ...role.moves.filter((move) => move !== LIE && moveOpen(scene, move)),
    ASK,
  ];
  if (canLie) moves.push(LIE);
  return moves.flatMap((moveKey) => {
    const answer = answerFor(
      scene,
      moveKey,
      canLie && (moveKey === TELL || moveKey === LIE)
        ? { ownRecordId: ownRecordId! }
        : null,
    );
    return answer ? [answer] : [];
  });
}

/* -------------------------------------------------------------------------- */
/* The family                                                                  */
/* -------------------------------------------------------------------------- */

function sceneFromContext(context: SceneContext): SituationScene | null {
  return sceneOf(context.world, context.bindingEventId, context.binding);
}

/** Everyone the records put in the room. */
function situationRoom(
  world: World,
  bound: BoundScene,
): ConversationRoomContext | null {
  const scene = sceneOf(world, bound.eventId, bound.binding);
  if (!scene || !world.jurisdictions[bound.binding.jurisdictionId]) return null;
  const present = [
    ...new Set([
      scene.playerId,
      scene.otherId,
      ...scene.type.roles
        .filter((role) => role.present !== false)
        .flatMap((role) => scene.situation.cast[role.key] ?? []),
    ]),
  ].filter((id) => world.people[id]);
  return {
    sceneKey: `contextual:situation:${bound.eventId}`,
    roles: { "the-other-person": scene.otherId },
    locationLabel: bound.binding.place,
    jurisdictionId: bound.binding.jurisdictionId,
    playerPersonId: scene.playerId,
    physicallyPresentPersonIds: present,
    activeParticipantPersonIds: [scene.playerId, scene.otherId],
    eligibleAddresseePersonIds: [scene.otherId],
    normalHearingPersonIds: present,
    quietAmbientHearingPersonIds: [],
    // A word aside to the one addressed is open with others in the room.
    privateAvailable: true,
    privateUnavailableReason: null,
  };
}

/**
 * Whether the engine can word the situation: the opening line, and at least
 * one choice that settles it besides asking.
 */
function voiced(scene: SituationScene): boolean {
  if (!openingLine(scene)) return false;
  return situationAnswers(scene).some((answer) => !answer.followUp);
}

/**
 * Whether the English engine can word a bound situation yet: its opening and
 * a choice that settles it. The coverage report counts those it cannot.
 */
export function situationVoiced(world: World, bound: BoundScene): boolean {
  const scene = sceneOf(world, bound.eventId, bound.binding);
  return scene !== null && voiced(scene);
}

export const situationFamily: SceneFamilyDefinition = {
  family: "situation",
  eventType: "conversation.situation-turn",
  // Developer record fields; a turn's setting is the binding's place.
  setting: "Where the records place the situation",
  socialContext: "A situation the story director bound from a recorded moment.",
  motivation: "Answer the situation's opening move.",
  interactionTags: ["story.situation"],
  // The other person's name, from the record.
  topic: (binding) => binding.facts.speakerName ?? binding.request,
  // The scene shows who is there; it narrates nothing the records do not say.
  briefing: () => "",
  opening(context) {
    const scene = sceneFromContext(context);
    const line = scene ? openingLine(scene) : null;
    return line ? [line.text] : [];
  },
  answers(context) {
    const scene = sceneFromContext(context);
    return scene ? situationAnswers(scene) : [];
  },
  settled(context, answer) {
    const scene = sceneFromContext(context);
    if (!scene || !answer) return "";
    return reply(scene, answer).line?.text ?? "";
  },
  relevant(world, bound) {
    // Not before the day its timing opens it, and a scene that waits for the
    // two to be together only once the records put them in one place.
    const { facts } = bound.binding;
    if (facts.opensOn && facts.opensOn > world.currentDate) return false;
    if (
      facts.timing === "next-together" &&
      !(
        recordedRoomPresence(world, bound.binding.playerPersonId)?.personIds ??
        []
      ).includes(bound.binding.speakerPersonId)
    )
      return false;
    return situationVoiced(world, bound);
  },
  room: situationRoom,
};
