import { ageOnDate } from "../simulation";
import { readRelationshipStanding } from "../simulation/relationship-standing";
import type { EntityId, HistoricalEvent, World } from "../simulation";
import {
  composeGroundedLine,
  linePartsOf,
  type ComposedLineBank,
  type ComposedPart,
  type RelationshipCondition,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";

/**
 * Two small-talk replies built from reviewed parts: a person answering a
 * second greeting, and a person saying they had not heard about a matter the
 * player mentioned. Each replaces one fixed line ("Hi again." and "I hadn't
 * heard about that.") that the round-1 dialogue report found in 73 and 68 of
 * 567 turns. Drafted with the civic-prose writer from the packets below;
 * nothing here decides what anybody means, only how it is said.
 */

export interface SmallTalkLine {
  readonly text: string;
  readonly parts: readonly ComposedPart[];
}

const WARM: RelationshipCondition = {
  dimension: "warmth",
  bands: ["marked", "strong"],
  adverse: false,
};
const TENSE: RelationshipCondition = {
  dimension: "tension",
  bands: ["marked", "strong"],
};

/*
 * Openers end mid-sentence, cores start lower case so they read after an
 * opener or alone (the first letter of the line is capitalized), and closers
 * follow a finished sentence, so they start with a capital.
 */
const GREET_AGAIN: ComposedLineBank = {
  key: "small-talk.greet-again",
  version: "1",
  surface: "dialogue",
  act: "greet",
  parts: {
    opener: {
      variants: [
        { key: "oh", kind: "template", text: "oh,", weight: 2 },
        { key: "hey", kind: "template", text: "hey,", weight: 2 },
        { key: "oh-hey", kind: "template", text: "oh, hey," },
        { key: "well", kind: "template", text: "well," },
      ],
    },
    core: {
      variants: [
        { key: "hi-plain", kind: "template", text: "hi." },
        { key: "hello-again", kind: "template", text: "hello again." },
        { key: "hi-name", kind: "template", text: "hi, {{player-name}}." },
        { key: "back-again", kind: "template", text: "back again?" },
        {
          key: "we-just-talked",
          kind: "template",
          text: "we just talked {{earlier-today}}.",
        },
        {
          key: "good-to-see-you",
          kind: "template",
          text: "good to see you.",
          requiresRelationship: [WARM],
        },
        {
          key: "you-again",
          kind: "template",
          text: "you again?",
          requiresRelationship: [TENSE],
        },
        {
          key: "hi-youre-back",
          kind: "template",
          text: "hi! You're back.",
          stages: ["child"],
        },
        { key: "hello-flat", kind: "template", text: "hello." },
      ],
    },
    closer: {
      variants: [
        {
          key: "did-you-need",
          kind: "template",
          text: "Did you need something?",
        },
        {
          key: "whats-up",
          kind: "template",
          text: "What's up?",
        },
        {
          key: "want-to-talk",
          kind: "template",
          text: "Did you want to talk again?",
          stages: ["adult"],
        },
        { key: "go-ahead", kind: "template", text: "Go ahead." },
        { key: "whats-going-on", kind: "template", text: "What's going on?" },
        {
          key: "talk-some-more",
          kind: "template",
          text: "Wanna talk some more?",
          stages: ["child"],
        },
      ],
    },
  },
};

const MATTER_UNINFORMED: ComposedLineBank = {
  key: "small-talk.matter-uninformed",
  version: "1",
  surface: "dialogue",
  act: "answer",
  parts: {
    core: {
      variants: [
        {
          key: "hadnt-heard",
          kind: "template",
          text: "I hadn't heard about that.",
        },
        { key: "news-to-me", kind: "template", text: "that's news to me." },
        {
          key: "first-hearing",
          kind: "template",
          text: "this is the first I'm hearing of it.",
        },
        {
          key: "didnt-know",
          kind: "template",
          text: "no, I didn't know about that.",
        },
        {
          key: "not-a-thing",
          kind: "template",
          text: "I hadn't heard a thing about it.",
        },
        {
          key: "havent-seen",
          kind: "template",
          text: "I haven't seen anything about it.",
          stages: ["adult"],
        },
        {
          key: "child-didnt-know",
          kind: "template",
          text: "I didn't know that.",
          stages: ["child"],
        },
        { key: "huh-hadnt", kind: "template", text: "huh. I hadn't heard." },
      ],
    },
    closer: {
      variants: [
        { key: "what-happened", kind: "template", text: "What happened?" },
        { key: "tell-me", kind: "template", text: "Tell me about it." },
        {
          key: "what-do-you-know",
          kind: "template",
          text: "What do you know?",
        },
        {
          key: "fill-me-in",
          kind: "template",
          text: "Fill me in.",
          requiresRelationship: [WARM],
        },
        { key: "when-was-this", kind: "template", text: "When was this?" },
        { key: "go-on", kind: "template", text: "Go on." },
      ],
    },
  },
};

/** Parts this speaker used with the player in their recent saved turns. */
const RECENT_TURNS = 6;

function recentPartKeys(history: readonly HistoricalEvent[]): string[] {
  return history
    .slice(-RECENT_TURNS)
    .flatMap((event) => linePartsOf(event.tags) ?? []);
}

function stageOf(world: World, personId: EntityId): "child" | "adult" {
  return ageOnDate(world.people[personId]!.birthDate, world.currentDate) < 13
    ? "child"
    : "adult";
}

function compose(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
  packet: GroundedEnglishPacket,
  bank: ComposedLineBank,
): SmallTalkLine | null {
  const line = composeGroundedLine(packet, bank, {
    relationship: readRelationshipStanding(world, speakerId, playerPersonId),
    recentPartKeys: recentPartKeys(history),
  });
  return line.kind === "rendered"
    ? { text: line.text, parts: line.parts }
    : null;
}

/**
 * A person answering the player's greeting when the two have talked before.
 * `history` is their saved conversation, oldest first; the reply exists only
 * when there is an earlier turn to have learned the player's name from.
 */
export function greetAgainLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
): SmallTalkLine | null {
  const previous = history.at(-1);
  if (!previous) return null;
  const player = world.people[playerPersonId]!;
  const sameDay = previous.occurredAt === world.currentDate;
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `greet-again:${speakerId}:${playerPersonId}:${previous.id}:${history.length}`,
    worldSeed: world.seed,
    bankVersion: GREET_AGAIN.version,
    stage: stageOf(world, speakerId),
    sourceRecordIds: [previous.id],
    facts: {
      "player-name": {
        text: player.givenName,
        sourceRecordIds: [playerPersonId],
      },
      ...(sameDay
        ? {
            "earlier-today": {
              text: "earlier today",
              sourceRecordIds: [previous.id],
            },
          }
        : {}),
    },
    speaker: { personId: speakerId, traits: {} },
    viewer: { personId: playerPersonId, traits: {} },
    // The speaker learned the name, and that they talked, in that turn.
    knowledge: [
      {
        personId: speakerId,
        factKey: "player-name",
        sourceRecordIds: [previous.id],
      },
      ...(sameDay
        ? [
            {
              personId: speakerId,
              factKey: "earlier-today",
              sourceRecordIds: [previous.id],
            },
          ]
        : []),
    ],
  };
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packet,
    GREET_AGAIN,
  );
}

/**
 * A person saying they had not heard about the matter the player raised.
 * The caller has already read from the speaker's records that they had not.
 */
export function matterUninformedLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
  matterEventId: EntityId,
): SmallTalkLine | null {
  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `matter-uninformed:${speakerId}:${playerPersonId}:${matterEventId}:${history.length}`,
    worldSeed: world.seed,
    bankVersion: MATTER_UNINFORMED.version,
    stage: stageOf(world, speakerId),
    sourceRecordIds: [matterEventId],
    facts: {},
    speaker: { personId: speakerId, traits: {} },
    viewer: { personId: playerPersonId, traits: {} },
    knowledge: [],
  };
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packet,
    MATTER_UNINFORMED,
  );
}

/** Exported for review tooling and tests. */
export const SMALL_TALK_BANKS = [GREET_AGAIN, MATTER_UNINFORMED] as const;
