import { describePersonContext, personName } from "../simulation";
import type { EntityId, HistoricalEvent, IsoDate, World } from "../simulation";
import { claimStanceOf } from "../simulation/claim-stances";
import {
  recordedConversationTurns,
  recognizes,
} from "./conversation-continuity";
import { currentLifeTalkScene } from "./life-talk-presence";
import type { ConversationSubjectKey } from "./run-b-conversation-progress";
import {
  currentStorySceneRequest,
  currentStorySceneSituation,
} from "./story-scene-day";
import {
  resolveStoryScene,
  type StorySceneSnapshot,
} from "./story-scene-resolver";
import {
  composePlayedSceneLine,
  PLAYED_SCENE_ENGLISH_VERSION,
  type PlayedScenePrimitive,
} from "./small-talk-english";
import type { GroundedEnglishPacket } from "./grounded-english";
import type { ComposedLineResult } from "./english-composition";
import { speakerTraits } from "./speaker-traits";
import { resolveOpeningPlaySceneContext } from "./play-scene-context";
import { resolvePersonPortrait } from "./person-visual";
import { sceneBindingOf } from "../simulation/scene-bindings";
import { recordedRoomPresence } from "./recorded-room-presence";

/** Only an actual recorded request or contribution can open the foreground. */
export function nextPlayedSceneSpeaker(world: World, viewer: EntityId) {
  const situation = currentStorySceneSituation(world, viewer);
  const presence = recordedRoomPresence(world, viewer);
  if (situation?.status !== "current" || !presence) return null;
  if (
    world.history.events.some(
      (event) =>
        event.type === "life.conversation" &&
        event.tags.includes("scene.composed-turn") &&
        event.tags.includes(`scene:${presence.eventId}`),
    )
  )
    return null;
  const source = world.history.events.find(
    (event) => event.id === presence.eventId,
  )!;
  const people = [
    ...new Set([
      ...situation.pendingRequests.map((row) => row.binding.speakerPersonId),
      ...source.participants
        .filter(
          (person) =>
            person.role.startsWith("coordination:") &&
            situation.currentActivity !== null &&
            source.context.socialContext,
        )
        .map((person) => person.personId),
    ]),
  ].filter((id) => id !== viewer && presence.personIds.includes(id));
  for (const personId of people) {
    const scene = projectPlayedSceneExchange(world, viewer, personId);
    if (scene?.contributions.length) return personId;
  }
  return null;
}

export type PlayedSceneLine = Extract<ComposedLineResult, { kind: "rendered" }>;
export interface PlayedSceneReply {
  readonly key: string;
  readonly primitive: PlayedScenePrimitive;
  readonly sourceEventId: EntityId;
  readonly knowledgeId: EntityId | null;
  readonly line: PlayedSceneLine;
}
export interface PlayedSceneExchange {
  readonly snapshot: StorySceneSnapshot;
  readonly presenceEventId: EntityId;
  readonly participantPersonIds: readonly EntityId[];
  readonly addresseePersonId: EntityId;
  readonly contributions: readonly {
    readonly speakerPersonId: EntityId;
    readonly sourceEventId: EntityId;
    readonly line: PlayedSceneLine;
  }[];
  readonly replies: readonly PlayedSceneReply[];
  readonly art: ReturnType<typeof resolveOpeningPlaySceneContext>;
  readonly recognition: ReturnType<typeof recognizes>;
  readonly portraits: readonly {
    readonly personId: EntityId;
    readonly visual: ReturnType<typeof resolvePersonPortrait>;
  }[];
}

/** Semantic slots come from typed records, never by trimming a prose summary. */
function playedRecordSpeechFacts(
  world: World,
  event: HistoricalEvent,
  speaker: EntityId,
  focus: "event" | "meeting-agenda",
): GroundedEnglishPacket["facts"] {
  const fact = (text: string, sources: readonly EntityId[] = [event.id]) => ({
    text,
    sourceRecordIds: sources,
  });
  if (
    focus === "meeting-agenda" ||
    event.type === "civic.meeting-agenda-item" ||
    event.type === "civic.meeting-notice"
  ) {
    const tag = event.tags.find((value) =>
      value.startsWith("civic.meeting-agenda.v1:"),
    );
    if (!tag) return {};
    let raw: unknown;
    try {
      raw = JSON.parse(tag.slice("civic.meeting-agenda.v1:".length));
    } catch {
      return {};
    }
    if (
      !raw ||
      typeof raw !== "object" ||
      !("items" in raw) ||
      !Array.isArray(raw.items)
    )
      return {};
    if (!("bodyId" in raw) || typeof raw.bodyId !== "string") return {};
    if (!raw.items.length) return { "speech-kind": fact("meeting-routine") };
    const items = raw.items.flatMap((item: unknown) => {
      if (!item || typeof item !== "object" || !("measureId" in item))
        return [];
      const measure = world.history.legislativeMeasures?.find(
        (row) =>
          row.id === item.measureId &&
          row.sequence < event.sequence &&
          row.introducedAt <= event.occurredAt,
      );
      return measure ? [measure] : [];
    });
    if (items.length !== raw.items.length) return {};
    return {
      "speech-kind": fact("meeting-agenda"),
      "agenda-title": fact(items.map((item) => item.shortTitle).join("; "), [
        event.id,
        ...items.map((item) => item.id),
      ]),
    };
  }
  if (
    event.type === "civic.meeting-entered" ||
    event.type === "civic.meeting-attended"
  ) {
    const chair = event.participants.find(
      (person) => person.role === "coordination:chair",
    );
    const person = chair && world.people[chair.personId];
    if (!person) return {};
    return {
      "speech-kind": fact("meeting-chair"),
      "chair-name": fact(personName(person)),
      "speaker-chair": fact(chair.personId === speaker ? "yes" : "no"),
    };
  }
  if (
    event.type === "life.education-work-crossroad" &&
    event.participants.some(
      (person) =>
        person.personId === speaker && person.role === "focus:subject",
    )
  )
    return { "speech-kind": fact("education-work-crossroad") };
  return {};
}

/** Pure packet seam shared by scene and clerk consumers. Participation or
 * saved knowledge establishes each fact; a date alone never establishes it. */
export function playedSceneEnglishPacket(
  world: World,
  viewer: EntityId,
  speaker: EntityId,
  sourceEventId: EntityId,
  matter: string,
  surface: GroundedEnglishPacket["surface"] = "dialogue",
  knowledgeId: EntityId | null = null,
  focus: "event" | "meeting-agenda" = "event",
): GroundedEnglishPacket | null {
  const event = world.history.events.find(
    (row) =>
      row.id === sourceEventId &&
      row.sequence < world.history.nextSequence &&
      row.occurredAt <= world.currentDate &&
      row.recordedAt <= world.currentDate,
  );
  const knowledge =
    knowledgeId === null
      ? null
      : world.history.knowledge.find(
          (row) =>
            row.id === knowledgeId &&
            row.personId === speaker &&
            row.eventId === sourceEventId &&
            row.sequence < world.history.nextSequence &&
            row.learnedAt <= world.currentDate &&
            row.accuracy === "accurate",
        );
  if (
    !event ||
    (!knowledge &&
      !event.participants.some((row) => row.personId === speaker) &&
      sceneBindingOf(event)?.speakerPersonId !== speaker)
  )
    return null;
  const basis = knowledge ? [event.id, knowledge.id] : [event.id];
  const facts = {
    matter: { text: matter, sourceRecordIds: [event.id] },
    ...playedRecordSpeechFacts(world, event, speaker, focus),
  };
  return {
    surface,
    momentKey: `${JSON.stringify(world.currentMoment)}:${world.history.nextSequence}:${sourceEventId}:${speaker}`,
    worldSeed: world.seed,
    bankVersion: PLAYED_SCENE_ENGLISH_VERSION,
    stage: "current",
    sourceRecordIds: basis,
    facts,
    speaker: { personId: speaker, traits: speakerTraits(world, speaker) },
    viewer: { personId: viewer, traits: speakerTraits(world, viewer) },
    knowledge: Object.keys(facts).map((factKey) => ({
      personId: speaker,
      factKey,
      sourceRecordIds: basis,
    })),
  };
}

/** The same primitives compose requests and replies from the current World.
 * No cast, past episode, knowledge or attendance is created by inspection. */
export function projectPlayedSceneExchange(
  world: World,
  viewer: EntityId,
  addresseePersonId: EntityId,
): PlayedSceneExchange | null {
  const request = currentStorySceneRequest(world, viewer);
  const situation = currentStorySceneSituation(world, viewer);
  if (!request || situation?.status !== "current") return null;
  const resolved = resolveStoryScene(world, request);
  const presenceEventId = situation.location!.sourceRecordIds[0]!;
  const presence = world.history.events.find(
    (row) => row.id === presenceEventId,
  )!;
  const present = resolved.presentPeople.filter(
    (person) =>
      person.reason === "recorded-presence" &&
      person.evidence.some(
        (ref) => ref.kind === "event" && ref.id === presenceEventId,
      ),
  );
  const participantPersonIds = [
    ...new Set(present.map((person) => person.personId)),
  ];
  if (
    viewer === addresseePersonId ||
    !participantPersonIds.includes(viewer) ||
    !participantPersonIds.includes(addresseePersonId)
  )
    return null;
  const contributions: PlayedSceneExchange["contributions"][number][] = [];
  for (const pending of situation.pendingRequests) {
    if (!participantPersonIds.includes(pending.binding.speakerPersonId))
      continue;
    const packet = playedSceneEnglishPacket(
      world,
      viewer,
      pending.binding.speakerPersonId,
      pending.eventId,
      pending.binding.request,
    );
    // A contextual binding's author is a saved knowledge basis, not an attendee.
    // Its packet is admitted below only for that recorded author.
    if (!packet) continue;
    const line = composePlayedSceneLine(packet, "recorded-request");
    if (line.kind === "rendered")
      contributions.push({
        speakerPersonId: pending.binding.speakerPersonId,
        sourceEventId: pending.eventId,
        line,
      });
  }
  if (
    presence.context.socialContext &&
    presence.participants.some(
      (person) =>
        person.personId === addresseePersonId &&
        person.role === "coordination:chair",
    )
  ) {
    const packet = playedSceneEnglishPacket(
      world,
      viewer,
      addresseePersonId,
      presence.id,
      presence.context.socialContext,
      "dialogue",
      null,
      "meeting-agenda",
    );
    if (packet) {
      const line = composePlayedSceneLine(packet, "recorded-observation");
      if (line.kind === "rendered")
        contributions.push({
          speakerPersonId: addresseePersonId,
          sourceEventId: presence.id,
          line,
        });
    }
  }
  const replies: PlayedSceneReply[] = [];
  const sources = world.history.knowledge.filter(
    (row) =>
      row.personId === viewer &&
      row.learnedAt <= world.currentDate &&
      row.sequence < world.history.nextSequence &&
      row.accuracy === "accurate",
  );
  const seen = new Set<EntityId>();
  for (const knowledge of [...sources].reverse()) {
    if (seen.has(knowledge.eventId)) continue;
    const event = world.history.events.find(
      (row) => row.id === knowledge.eventId,
    );
    if (
      !event ||
      event.type === "life.conversation" ||
      event.type === "scene.contextual-bound" ||
      event.jurisdictionId !== situation.location!.jurisdictionId
    )
      continue;
    seen.add(event.id);
    const packet = playedSceneEnglishPacket(
      world,
      viewer,
      viewer,
      event.id,
      knowledge.believedSummary,
      "dialogue",
      knowledge.id,
    );
    if (!packet) continue;
    for (const primitive of [
      "ask-record",
      "tell-record",
      "deny-record",
    ] as const) {
      const line = composePlayedSceneLine(packet, primitive);
      if (line.kind === "rendered")
        replies.push({
          key: `${event.id}:${primitive}`,
          primitive,
          sourceEventId: event.id,
          knowledgeId: knowledge.id,
          line,
        });
    }
  }
  const packet = playedSceneEnglishPacket(
    world,
    viewer,
    viewer,
    presence.id,
    presence.summary,
  );
  if (packet) {
    const line = composePlayedSceneLine(packet, "depart");
    if (line.kind === "rendered")
      replies.push({
        key: `${presence.id}:depart`,
        primitive: "depart",
        sourceEventId: presence.id,
        knowledgeId: null,
        line,
      });
  }
  const art = resolveOpeningPlaySceneContext(world, viewer);
  return {
    snapshot: resolved.snapshot,
    presenceEventId,
    participantPersonIds,
    addresseePersonId,
    contributions,
    replies,
    art: {
      ...art,
      presentPeople: art.presentPeople.filter((person) =>
        participantPersonIds.includes(person.personId),
      ),
    },
    recognition: recognizes(world, viewer, addresseePersonId),
    portraits: participantPersonIds
      .filter((id) => id !== viewer)
      .map((personId) => ({
        personId,
        visual: resolvePersonPortrait(world.people[personId]!),
      })),
  };
}

/**
 * What has been said in a conversation, read back from the record.
 *
 * The scene's conversation box shows one exchange at a time — the last thing
 * the player did and what came back — and pages back through the earlier ones
 * in the same box. Neither needs a store of its own: every turn already
 * writes a canonical event carrying who spoke, who answered and who else was
 * there to hear it. This module reads those events and nothing else. It is a
 * projection over the existing writers, not a second conversation system, and
 * it never decides what anybody says.
 *
 * Reading the record is also what makes switching addressee honest. A turn
 * with one person does not vanish when the player turns to another; it stays
 * the last thing that happened in the room, and the record says whether the
 * new addressee was there to hear it.
 */

export interface ConversationExchangeTurn {
  readonly eventId: EntityId;
  readonly sequence: number;
  readonly date: IsoDate;
  /** True when the turn belongs to the exchange going on right now. */
  readonly current: boolean;
  /** The player's recorded words when available, otherwise their action. */
  readonly playerLine: string | null;
  /** Who answered, when somebody did. */
  readonly speakerPersonId: EntityId | null;
  readonly speakerName: string | null;
  /** The answer as recorded — a line of dialogue, or what the room did. */
  readonly reply: string;
  /** Everybody else the record says was there to hear it. */
  readonly heardByPersonIds: readonly EntityId[];
}

/**
 * Every recorded turn of this conversation, oldest first.
 *
 * For an ordinary talk with somebody in the scene that is the history with
 * that person plus anything said to anybody else in this same scene today —
 * so a turn with one housemate stays in view after turning to the other. For
 * the household, school and neighborhood subjects it is the subject's own
 * recorded turns, which is what their progress is already rebuilt from.
 */
export function conversationExchangeTurns(
  world: World,
  playerPersonId: EntityId,
  subject: ConversationSubjectKey,
  addresseePersonId: EntityId | null,
): readonly ConversationExchangeTurn[] {
  if (subject === "life-talk") {
    /*
     * The scene the talk is recorded in: an opening scene, or the quiet room
     * a player walks into (life-talk-presence.ts), the one the recorder tags.
     * Reading only the opening scene left every turn in the quiet room not
     * "current", so the box never said what the player had just said.
     */
    const sceneId =
      currentLifeTalkScene(world, playerPersonId)?.eventId ?? null;
    // A quiet room is named by its moment; a half hour spent together moves
    // the moment on, and it is still the same room that day.
    const quietRoom = `quiet-home:${playerPersonId}:`;
    const inThisScene = (event: HistoricalEvent) =>
      sceneId !== null &&
      (event.tags.includes(`scene:${sceneId}`) ||
        (sceneId.startsWith(quietRoom) &&
          event.tags.some((tag) => tag.startsWith(`scene:${quietRoom}`))));
    return world.history.events
      .filter(
        (event) =>
          event.type === "life.conversation" &&
          event.occurredAt <= world.currentDate &&
          hasRole(event, playerPersonId, "focus:subject") &&
          (counterpart(event) === addresseePersonId ||
            (event.occurredAt === world.currentDate && inThisScene(event))),
      )
      .sort((left, right) => left.sequence - right.sequence)
      .map((event) => {
        const speaker = counterpart(event);
        return {
          eventId: event.id,
          sequence: event.sequence,
          date: event.occurredAt,
          current: event.occurredAt === world.currentDate && inThisScene(event),
          playerLine: event.context.choice
            ? `You ${lowerFirst(endSentence(event.context.choice))}`
            : null,
          speakerPersonId: speaker,
          speakerName: speaker ? nameOf(world, speaker) : null,
          reply: event.context.immediateReaction ?? "",
          heardByPersonIds: event.participants
            .filter((entry) => entry.role === "observation:witness")
            .map((entry) => entry.personId),
        };
      });
  }

  const byId = new Map(world.history.events.map((event) => [event.id, event]));
  return recordedConversationTurns(world, playerPersonId, subject).flatMap(
    (turn) => {
      const event = byId.get(turn.eventId);
      if (!event) return [];
      const spokenStatement = claimStanceOf(event)?.statement;
      const speaker =
        event.participants.find((entry) => entry.role === "focus:respondent")
          ?.personId ?? null;
      return [
        {
          eventId: event.id,
          sequence: event.sequence,
          date: event.occurredAt,
          current: event.occurredAt === world.currentDate,
          playerLine:
            (spokenStatement?.trim() ? spokenStatement : null) ??
            (event.context.choice
              ? recordLineInSecondPerson(event.context.choice)
              : null),
          speakerPersonId: speaker,
          speakerName: speaker ? nameOf(world, speaker) : null,
          reply: event.context.immediateReaction ?? "",
          heardByPersonIds: event.participants
            .filter(
              (entry) =>
                entry.personId !== playerPersonId && entry.personId !== speaker,
            )
            .map((entry) => entry.personId),
        },
      ];
    },
  );
}

/** The turn to show as "what just happened", when one belongs to now. */
export function currentExchangeTurn(
  turns: readonly ConversationExchangeTurn[],
): ConversationExchangeTurn | null {
  const last = turns.at(-1);
  return last && last.current ? last : null;
}

/**
 * Whether the person now being spoken to was there for the last turn.
 *
 * Switching addressee is a change of who the player faces, not a new
 * conversation. What survives the switch is what the record says: the new
 * addressee either answered the last turn, heard it, or did neither — and the
 * box says which rather than greeting them as though nothing had been said.
 */
export function addresseeHeardTurn(
  turn: ConversationExchangeTurn,
  addresseePersonId: EntityId,
): "answered" | "heard" | "not-heard" {
  if (turn.speakerPersonId === addresseePersonId) return "answered";
  return turn.heardByPersonIds.includes(addresseePersonId)
    ? "heard"
    : "not-heard";
}

export interface ConversationHistoryPage {
  readonly turns: readonly ConversationExchangeTurn[];
  /** Zero is the newest page. */
  readonly index: number;
  readonly count: number;
}

/**
 * Earlier turns, a fixed number at a time, newest page first.
 *
 * Paged rather than scrolled: the conversation box keeps one height, and
 * looking further back replaces what is in it instead of growing a transcript
 * down the screen. The page never includes the turn the box is already
 * showing as "what just happened".
 */
export function conversationHistoryPage(
  turns: readonly ConversationExchangeTurn[],
  index: number,
  pageSize = 3,
): ConversationHistoryPage {
  const current = currentExchangeTurn(turns);
  const earlier = current ? turns.slice(0, -1) : turns;
  const count = Math.max(1, Math.ceil(earlier.length / pageSize));
  const bounded = Math.min(Math.max(0, index), count - 1);
  const end = earlier.length - bounded * pageSize;
  return {
    turns: earlier.slice(Math.max(0, end - pageSize), end),
    index: bounded,
    count: earlier.length === 0 ? 0 : count,
  };
}

/** Who this person is to the player, in the record's own words. */
export function conversationRelationship(
  world: World,
  playerPersonId: EntityId,
  personId: EntityId,
): string | null {
  return (
    describePersonContext(world, playerPersonId, personId)?.relationship ?? null
  );
}

function hasRole(
  event: HistoricalEvent,
  personId: EntityId,
  role: string,
): boolean {
  return event.participants.some(
    (entry) => entry.personId === personId && entry.role === role,
  );
}

function counterpart(event: HistoricalEvent): EntityId | null {
  return (
    event.participants.find(
      (entry) => entry.role === "coordination:counterpart",
    )?.personId ?? null
  );
}

function nameOf(world: World, personId: EntityId): string {
  const person = world.people[personId];
  return person ? personName(person) : "Somebody";
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/**
 * The record's sentence about the player, addressed to the player.
 *
 * Ordinary subjects write their choice as "The player brought up the week's
 * errands with Pollard." That is the record's voice and it stays the record.
 * Shown to the player it is the same sentence with the subject turned to
 * "You"; nothing else about it is rewritten.
 */
/**
 * A choice that already ends a sentence keeps its own mark: "Mention the
 * news: …shared waters." must not become "…shared waters..".
 */
function endSentence(choice: string): string {
  return /[.?!…]["”’)]?$/.test(choice.trimEnd())
    ? choice.trimEnd()
    : `${choice}.`;
}

/**
 * A record line about the player, said to the player.
 *
 * "The player said they would go to the meeting." is about one person, so in
 * second person the "they" that reports what the player said is "you" too:
 * "You said you would go to the meeting." Only a "they" right after a
 * reporting verb whose subject is the player changes; a "they" meaning
 * somebody else is left alone.
 */
export function recordLineInSecondPerson(sentence: string): string {
  if (!/^The player\b/.test(sentence)) return sentence;
  return sentence
    .replace(/^The player's\b/, "Your")
    .replace(/^The player\b/, "You")
    .replace(
      /^(You (?:said|agreed|promised|decided|thought|admitted|offered|hoped)) they\b/,
      "$1 you",
    )
    .replace(/\bthemselves\b/g, "yourself");
}
