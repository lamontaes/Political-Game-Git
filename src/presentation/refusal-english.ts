import { speakerTraits } from "./speaker-traits";
import { ageOnDate } from "../simulation";
import { LIFE_MIND_IDS } from "../simulation/life-mind-content";
import {
  latestPersonalValue,
  latestPersonalityTendency,
} from "../simulation/queries";
import { readRelationshipStanding } from "../simulation/relationship-standing";
import type { EntityId, HistoricalEvent, World } from "../simulation";
import {
  composeGroundedLine,
  linePartsOf,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import type { SmallTalkLine } from "./small-talk-english";

/**
 * Yes and no to an invitation, worded the way people actually say them.
 *
 * Saying no takes work (design D-3, step 2): a person turning down a game or
 * a date gives the reason their own record holds (they want time to
 * themselves, they would rather try something new, they would rather play a
 * game they know) and, unless they are at odds with the player, eases into
 * it. Saying yes is short. The decision itself is made elsewhere, from the
 * same records; this file only words it. Each reason copies a fact the
 * person's own goals, values or habits establish, and nothing else.
 */

export type InvitationKind = "game" | "quiet" | "date";

/** Why this person would rather not, read from their own records. */
interface RefusalReason {
  readonly key: "privacy" | "wants-new" | "wants-familiar" | "keep-as-is";
  readonly sourceRecordIds: readonly EntityId[];
}

const COMPANY_DECLINE: ComposedLineBank = {
  key: "invitation.company-decline",
  version: "1",
  surface: "dialogue",
  act: "decline",
  parts: {
    core: {
      variants: [
        { key: "not-right-now", kind: "template", text: "not right now." },
        {
          key: "no-not-now",
          kind: "template",
          text: "no, not right now.",
        },
        {
          key: "pass",
          kind: "template",
          text: "I'll pass for now.",
          stages: ["adult"],
        },
        {
          key: "not-a-game",
          kind: "template",
          text: "not a game right now.",
          requiresFacts: ["game"],
        },
        {
          key: "not-sitting",
          kind: "template",
          text: "I don't feel like just sitting right now.",
          requiresFacts: ["quiet"],
        },
      ],
    },
    reason: {
      variants: [
        {
          key: "time-alone",
          kind: "template",
          text: "I need some time to myself.",
          requiresFacts: ["privacy"],
        },
        {
          key: "alone-a-while",
          kind: "template",
          text: "I want to be on my own for a while.",
          requiresFacts: ["privacy"],
        },
        {
          key: "something-new",
          kind: "template",
          text: "I'd rather try something new.",
          requiresFacts: ["wants-new"],
        },
        {
          key: "something-different",
          kind: "template",
          text: "I'm in the mood for something different.",
          requiresFacts: ["wants-new"],
        },
        {
          key: "game-we-know",
          kind: "template",
          text: "I'd rather play a game we both know.",
          requiresFacts: ["wants-familiar"],
        },
        {
          key: "usual-game",
          kind: "template",
          text: "I'd rather do one of our usual games.",
          requiresFacts: ["wants-familiar"],
        },
      ],
    },
    closer: {
      variants: [
        { key: "another-time", kind: "template", text: "Maybe another time." },
        { key: "thanks-asking", kind: "template", text: "Thanks for asking." },
      ],
    },
  },
};

const DATE_DECLINE: ComposedLineBank = {
  key: "invitation.date-decline",
  version: "1",
  surface: "dialogue",
  act: "decline",
  parts: {
    core: {
      variants: [
        { key: "no-thank-you", kind: "template", text: "no, thank you." },
        { key: "dont-think-so", kind: "template", text: "I don't think so." },
      ],
    },
    reason: {
      variants: [
        {
          key: "time-alone",
          kind: "template",
          text: "I need some time to myself right now.",
          requiresFacts: ["privacy"],
        },
        {
          key: "keep-as-is",
          kind: "template",
          text: "I'd like to keep this as it is.",
          requiresFacts: ["keep-as-is"],
        },
        {
          key: "like-things-now",
          kind: "template",
          text: "I like how things are between us now.",
          requiresFacts: ["keep-as-is"],
        },
      ],
    },
  },
};

const COMPANY_AGREE: ComposedLineBank = {
  key: "invitation.company-agree",
  version: "1",
  surface: "dialogue",
  act: "agree",
  parts: {
    core: {
      variants: [
        {
          key: "sure-play",
          kind: "template",
          text: "sure, let's play.",
          requiresFacts: ["game"],
        },
        {
          key: "yeah-play",
          kind: "template",
          text: "yeah, let's play.",
          requiresFacts: ["game"],
        },
        {
          key: "okay-game",
          kind: "template",
          text: "okay. What game?",
          requiresFacts: ["game"],
        },
        {
          key: "sure-sit",
          kind: "template",
          text: "sure, let's sit for a while.",
          requiresFacts: ["quiet"],
        },
        {
          key: "yes-talk",
          kind: "template",
          text: "yes, let's talk.",
          requiresFacts: ["quiet"],
        },
      ],
    },
  },
};

function stageOf(world: World, personId: EntityId): "child" | "adult" {
  return ageOnDate(world.people[personId]!.birthDate, world.currentDate) < 13
    ? "child"
    : "adult";
}

function activeGoalRecord(
  world: World,
  personId: EntityId,
  goal: "privacy" | "learning" | "connection",
) {
  const latest = world.history.goalStates
    .filter(
      (record) =>
        record.personId === personId &&
        record.goalKey === `opening-life:${goal}`,
    )
    .at(-1);
  return latest?.status === "active" ? latest : null;
}

/**
 * The reason on this person's record for turning the invitation down, in the
 * same order the decision reads them: time alone first, then what they would
 * rather do.
 */
function refusalReason(
  world: World,
  personId: EntityId,
  kind: InvitationKind,
): RefusalReason | null {
  const privacy = activeGoalRecord(world, personId, "privacy");
  if (privacy) return { key: "privacy", sourceRecordIds: [privacy.id] };
  if (kind === "date") {
    const connection = latestPersonalValue(
      world,
      personId,
      LIFE_MIND_IDS.connection,
    );
    return {
      key: "keep-as-is",
      // With no recorded value at all, their not choosing it is still theirs.
      sourceRecordIds: [connection?.id ?? personId],
    };
  }
  const learningGoal = activeGoalRecord(world, personId, "learning");
  if (learningGoal)
    return { key: "wants-new", sourceRecordIds: [learningGoal.id] };
  if (activeGoalRecord(world, personId, "connection")) return null;
  const learning = latestPersonalValue(world, personId, LIFE_MIND_IDS.learning);
  if (learning?.orientation === "embraces")
    return { key: "wants-new", sourceRecordIds: [learning.id] };
  const leisure = latestPersonalityTendency(
    world,
    personId,
    LIFE_MIND_IDS.leisure,
  );
  if (kind === "quiet" && (leisure?.expressionKey ?? "familiar") === "familiar")
    return {
      key: "wants-familiar",
      sourceRecordIds: [leisure?.id ?? personId],
    };
  return null;
}

function packetFor(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  sceneKey: string,
  historyLength: number,
  bank: ComposedLineBank,
  facts: GroundedEnglishPacket["facts"],
): GroundedEnglishPacket {
  return {
    surface: "dialogue",
    momentKey: `${bank.key}:${speakerId}:${playerPersonId}:${sceneKey}:${historyLength}`,
    worldSeed: world.seed,
    bankVersion: bank.version,
    stage: stageOf(world, speakerId),
    // The people themselves: the player asked, the speaker answers.
    sourceRecordIds: [speakerId, playerPersonId],
    facts,
    speaker: { personId: speakerId, traits: speakerTraits(world, speakerId) },
    viewer: {
      personId: playerPersonId,
      traits: speakerTraits(world, playerPersonId),
    },
    // Every fact here is about the speaker's own wishes or the invitation
    // they just heard, so the speaker knows it from the same records.
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: speakerId,
      factKey,
      sourceRecordIds: fact!.sourceRecordIds,
    })),
  };
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
    recentPartKeys: history
      .slice(-6)
      .flatMap((event) => linePartsOf(event.tags) ?? []),
    register: "small-talk",
  });
  return line.kind === "rendered"
    ? { text: line.text, parts: line.parts }
    : null;
}

/**
 * A person turning down the player's invitation, with the reason their own
 * record gives, or null when the record gives none (the caller then keeps its
 * plain line).
 */
export function invitationDeclineLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
  sceneKey: string,
  kind: InvitationKind,
): SmallTalkLine | null {
  const reason = refusalReason(world, speakerId, kind);
  if (!reason) return null;
  const bank = kind === "date" ? DATE_DECLINE : COMPANY_DECLINE;
  const facts: GroundedEnglishPacket["facts"] = {
    [reason.key]: { text: reason.key, sourceRecordIds: reason.sourceRecordIds },
    ...(kind === "date"
      ? {}
      : { [kind]: { text: kind, sourceRecordIds: [playerPersonId] } }),
  };
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packetFor(
      world,
      speakerId,
      playerPersonId,
      sceneKey,
      history.length,
      bank,
      facts,
    ),
    bank,
  );
}

/** A person saying yes to a game or to sitting and talking: short. */
export function invitationAgreeLine(
  world: World,
  speakerId: EntityId,
  playerPersonId: EntityId,
  history: readonly HistoricalEvent[],
  sceneKey: string,
  kind: Exclude<InvitationKind, "date">,
): SmallTalkLine | null {
  return compose(
    world,
    speakerId,
    playerPersonId,
    history,
    packetFor(
      world,
      speakerId,
      playerPersonId,
      sceneKey,
      history.length,
      COMPANY_AGREE,
      { [kind]: { text: kind, sourceRecordIds: [playerPersonId] } },
    ),
    COMPANY_AGREE,
  );
}

/** Exported for review tooling and tests. */
export const INVITATION_BANKS = [
  COMPANY_DECLINE,
  DATE_DECLINE,
  COMPANY_AGREE,
] as const;
