import { speakerTraits } from "./speaker-traits";
import {
  speechMovesOf,
  type ElectionSpeechMove,
} from "../simulation/campaign-speeches";
import { requireElectionContest } from "../simulation/election-contests";
import { speechReception } from "../simulation/speech-reception";
import type { EntityId, HistoricalEvent, World } from "../simulation";
import {
  composeAddress,
  type AddressMove,
  type ComposedLineBank,
  type ComposedMove,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";

/**
 * An election-night speech in words (design D-3, step 3).
 *
 * The simulation recorded what the speaker did, move by move: thanked the
 * room, named the other candidate or congratulated the winner, spoke of a
 * parent they lost when their own record holds that loss and they are not a
 * private person, turned to the work or to what comes next, and said good
 * night. This file only words those moves, each from its own reviewed bank,
 * under the election-night register, so contrasts and other devices appear
 * only in a public address. Every name and place is copied from the record.
 * The words are chosen stably from the saved event, so the speech reads the
 * same after Save and Continue.
 */

const VERSION = "1";

function bank(
  key: string,
  act: ComposedLineBank["act"],
  variants: ComposedLineBank["parts"]["core"]["variants"],
): ComposedLineBank {
  return {
    key: `election-night.${key}`,
    version: VERSION,
    surface: "dialogue",
    act,
    parts: { core: { variants } },
  };
}

const THANKS = bank("thanks", "greet", [
  { key: "thank-you-all", kind: "template", text: "thank you. Thank you all." },
  {
    key: "thank-you-place",
    kind: "template",
    text: "thank you, {{place-name}}.",
  },
  {
    key: "thank-you-tonight",
    kind: "template",
    text: "thank you all for being here tonight.",
  },
  {
    key: "thank-you-so-much",
    kind: "template",
    text: "thank you. Thank you so much.",
  },
]);

const OPPONENT = bank("opponent", "praise", [
  {
    key: "thank-for-running",
    kind: "template",
    text: "I want to thank {{opponent-name}} for running.",
  },
  {
    key: "respect-running",
    kind: "template",
    text: "{{opponent-name}} ran too, and I respect that.",
  },
  {
    key: "put-name-forward",
    kind: "template",
    text: "It takes something to put your name on a ballot, and {{opponent-name}} did.",
  },
]);

const CONGRATULATE = bank("congratulate", "praise", [
  {
    key: "congratulations",
    kind: "template",
    text: "congratulations to {{winner-name}}.",
  },
  {
    key: "voters-chose",
    kind: "template",
    text: "the voters chose {{winner-name}}, and I respect that.",
  },
  {
    key: "wish-well",
    kind: "template",
    text: "{{winner-name}} won this race, and I wish {{winner-given-name}} well.",
  },
]);

const LOST_PARENT = bank("lost-parent", "tell", [
  {
    key: "didnt-live",
    kind: "template",
    text: "my {{parent-word}}, {{parent-name}}, didn't live to see tonight.",
    device: "disclosure",
  },
  {
    key: "wish-here",
    kind: "template",
    text: "I wish my {{parent-word}} were here. {{parent-name}} would have liked this.",
    device: "disclosure",
  },
  {
    key: "thinking-of",
    kind: "template",
    text: "I'm thinking tonight about my {{parent-word}}, {{parent-name}}.",
    device: "disclosure",
  },
]);

const THE_WORK = bank("the-work", "tell", [
  {
    key: "work-starts",
    kind: "template",
    text: "now the work starts.",
  },
  {
    key: "job-to-do",
    kind: "template",
    text: "you gave me a job to do, and I intend to do it.",
  },
  {
    key: "not-about-me",
    kind: "template",
    text: "this was never about me. It was about {{place-name}}.",
    device: "contrast",
  },
  {
    key: "win-tonight",
    kind: "template",
    text: "we won tonight. Tomorrow we go to work for {{place-name}}.",
    device: "contrast",
  },
]);

const KEEP_GOING = bank("keep-going", "tell", [
  {
    key: "proud",
    kind: "template",
    text: "I'm proud of the race we ran.",
  },
  {
    key: "thanks-work",
    kind: "template",
    text: "thank you for everything you did in this campaign.",
  },
  {
    key: "lost-race",
    kind: "template",
    text: "we lost a race tonight. We didn't lose the reasons we ran.",
    device: "contrast",
  },
]);

// The speech opened with thanks, so it closes without thanking again.
const CLOSE = bank("close", "greet", [
  { key: "good-night", kind: "template", text: "good night." },
  {
    key: "good-night-everybody",
    kind: "template",
    text: "good night, everybody.",
  },
]);

const MOVE_BANKS: Readonly<
  Record<ElectionSpeechMove["move"], ComposedLineBank>
> = {
  thanks: THANKS,
  opponent: OPPONENT,
  congratulate: CONGRATULATE,
  "lost-parent": LOST_PARENT,
  "the-work": THE_WORK,
  "keep-going": KEEP_GOING,
  close: CLOSE,
};

/** Exported for review tooling and tests. */
export const ELECTION_SPEECH_BANKS = Object.values(MOVE_BANKS);

export interface ElectionSpeechWords {
  readonly opening: string;
  readonly text: string;
  readonly moves: readonly ComposedMove[];
  /** Who heard it and how they took it, as recorded; null when nobody was there. */
  readonly heard: string | null;
}

function fullName(world: World, personId: EntityId): string | null {
  const person = world.people[personId];
  return person ? `${person.givenName} ${person.familyName}` : null;
}

/** "mother" or "father" only where the record says so; otherwise "parent". */
function parentWord(world: World, personId: EntityId): string {
  const gender = world.people[personId]?.identity?.gender;
  return gender === "female"
    ? "mother"
    : gender === "male"
      ? "father"
      : "parent";
}

/**
 * The words of a recorded election-night speech, or null for a speech saved
 * before its moves were recorded (its summary still stands).
 */
export function electionSpeechWords(
  world: World,
  event: HistoricalEvent,
): ElectionSpeechWords | null {
  const moves = speechMovesOf(event.tags);
  if (!moves) return null;
  const speakerId = event.participants.find(
    (row) => row.role === "focus:subject",
  )?.personId;
  const contestId = event.tags
    .find((tag) => tag.startsWith("election.contest:"))
    ?.slice("election.contest:".length) as EntityId | undefined;
  if (!speakerId || !contestId) return null;
  const contest = requireElectionContest(world, contestId);
  const place = world.jurisdictions[contest.jurisdictionId];

  const facts: Record<string, GroundedEnglishPacket["facts"][string]> = {};
  const own: EntityId[] = [];
  // A place is called what people there call it: "Los Angeles", not
  // "Los Angeles, California".
  if (place)
    facts["place-name"] = {
      text: place.name.split(",")[0]!.trim(),
      sourceRecordIds: [contest.jurisdictionId, contest.id],
    };
  for (const move of moves) {
    if (move.move === "opponent" || move.move === "congratulate") {
      const name = fullName(world, move.personId);
      if (name)
        facts[move.move === "opponent" ? "opponent-name" : "winner-name"] = {
          text: name,
          sourceRecordIds: [move.personId, contest.id],
        };
      if (name && move.move === "congratulate")
        facts["winner-given-name"] = {
          text: world.people[move.personId]!.givenName,
          sourceRecordIds: [move.personId, contest.id],
        };
    }
    if (move.move === "lost-parent") {
      const person = world.people[move.personId];
      if (!person) continue;
      own.push(move.kinshipId, move.deathId, move.personId);
      facts["parent-name"] = {
        text: person.givenName,
        sourceRecordIds: [move.kinshipId, move.personId],
      };
      facts["parent-word"] = {
        text: parentWord(world, move.personId),
        sourceRecordIds: [move.kinshipId, move.personId],
      };
    }
  }

  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: event.stableKey,
    worldSeed: world.seed,
    bankVersion: VERSION,
    stage: "adult",
    sourceRecordIds: [event.id],
    facts,
    speaker: { personId: speakerId, traits: speakerTraits(world, speakerId) },
    knowledge: Object.entries(facts).map(([factKey, fact]) => ({
      personId: speakerId,
      factKey,
      sourceRecordIds: fact!.sourceRecordIds,
    })),
  };
  const addressMoves: AddressMove[] = moves.map((move, index) => ({
    key: `${index}-${move.move}`,
    bank: MOVE_BANKS[move.move],
    required: move.move === "thanks",
  }));
  const address = composeAddress(packet, "election-night", addressMoves, {
    speakerOwnRecordIds: own,
  });
  if (address.kind !== "rendered") return null;
  return {
    // Quoted: these are the speaker's own words.
    opening: `“${address.moves[0]!.text}”`,
    text: address.text,
    moves: address.moves,
    heard: speechReception(world, event)?.event.summary ?? null,
  };
}
