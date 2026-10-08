import { speakerTraits } from "./speaker-traits";
import { CONCESSION_EVENT, VICTORY_SPEECH_EVENT } from "../simulation";
import type { EntityId, HistoricalEvent, World } from "../simulation";
import type { ElectionSpeechMove } from "../simulation/speech-moves";
import { electionSpeechWords } from "./election-speech-english";
import {
  composeGroundedLine,
  type ComposedLineBank,
} from "./english-composition";
import type { GroundedEnglishPacket } from "./grounded-english";
import type { SmallTalkLine } from "./small-talk-english";

/**
 * A person remembering the player's election-night speech, in their own words
 * (design D-3, step 8: attribution and quotation).
 *
 * Only someone the record says knows the speech can bring it up: they heard
 * it in the room, or someone told them. How much they recall follows their
 * recorded memory. A faint memory recalls that there was a speech; a clearer
 * one quotes a line, copied from the speech as it was given. Someone who was
 * told says who told them. Nothing here invents what was said.
 */

const VERSION = "1";

const SPEECH_REMEMBERED: ComposedLineBank = {
  key: "small-talk.speech-remembered",
  version: VERSION,
  surface: "dialogue",
  act: "tell",
  parts: {
    core: {
      variants: [
        {
          key: "heard-quote",
          kind: "template",
          text: "I remember your speech on election night. You said, “{{quote}}”",
          requiresFacts: ["heard-it"],
        },
        {
          key: "still-think-quote",
          kind: "template",
          text: "I still think about what you said on election night: “{{quote}}”",
          requiresFacts: ["heard-it"],
        },
        {
          key: "heard-faint",
          kind: "template",
          text: "I was there for your speech on election night. I couldn't tell you now what you said.",
          requiresFacts: ["heard-it", "faint"],
        },
        {
          key: "heard-faint-not-much",
          kind: "template",
          text: "I was at your speech on election night, but I don't remember much of it.",
          requiresFacts: ["heard-it", "faint"],
        },
        {
          key: "heard-faint-crowd",
          kind: "template",
          text: "I heard you speak on election night. I remember being there more than what you said.",
          requiresFacts: ["heard-it", "faint"],
        },
        {
          key: "told-quote",
          kind: "template",
          text: "{{teller-name}} told me about your speech on election night. You said, “{{quote}}”",
        },
        {
          key: "told-faint",
          kind: "template",
          text: "{{teller-name}} told me you gave a speech on election night.",
          requiresFacts: ["faint"],
        },
      ],
    },
  },
};

/** The line most worth repeating: a loss the speaker named, then the rest. */
const QUOTED_MOVES: readonly ElectionSpeechMove["move"][] = [
  "lost-parent",
  "keep-going",
  "the-work",
  "opponent",
  "congratulate",
];

function playerSpeech(
  world: World,
  playerPersonId: EntityId,
): HistoricalEvent | null {
  return (
    world.history.events
      .filter(
        (event) =>
          (event.type === VICTORY_SPEECH_EVENT ||
            event.type === CONCESSION_EVENT) &&
          event.participants.some(
            (row) =>
              row.personId === playerPersonId && row.role === "focus:subject",
          ),
      )
      .at(-1) ?? null
  );
}

/**
 * What a person says when asked what they remember, about the player's own
 * speech, or null when the record gives them nothing to say about it.
 */
export function speechRememberedLine(
  world: World,
  personId: EntityId,
  playerPersonId: EntityId,
): SmallTalkLine | null {
  const speech = playerSpeech(world, playerPersonId);
  if (!speech || personId === playerPersonId) return null;
  const memory = world.history.memories
    .filter((row) => row.personId === personId && row.eventId === speech.id)
    .at(-1);
  const knowledge = world.history.knowledge.find(
    (row) => row.personId === personId && row.eventId === speech.id,
  );
  if (!memory || !knowledge) return null;

  const basis = [memory.id, knowledge.id];
  const facts: Record<string, GroundedEnglishPacket["facts"][string]> = {};
  const flag = (key: string) => {
    facts[key] = { text: key, sourceRecordIds: basis };
  };
  if (knowledge.source.kind === "direct") flag("heard-it");
  if (knowledge.source.kind === "told-by") {
    const teller = world.people[knowledge.source.sourcePersonId];
    if (!teller) return null;
    facts["teller-name"] = {
      text: teller.givenName,
      sourceRecordIds: [knowledge.id, teller.id],
    };
  }
  if (memory.strength === "faint") flag("faint");
  else {
    const words = electionSpeechWords(world, speech);
    const quoted = QUOTED_MOVES.map((move) =>
      words?.moves.find((row) => row.move.endsWith(`-${move}`)),
    ).find((row) => row !== undefined);
    if (!quoted) return null;
    facts.quote = {
      text: quoted.text,
      sourceRecordIds: [speech.id, ...basis],
    };
  }

  const packet: GroundedEnglishPacket = {
    surface: "dialogue",
    momentKey: `speech-remembered:${personId}:${speech.id}:${memory.id}`,
    worldSeed: world.seed,
    bankVersion: VERSION,
    stage: "adult",
    sourceRecordIds: basis,
    facts,
    speaker: { personId, traits: speakerTraits(world, personId) },
    // Their memory and how they came to know the speech are the record of
    // their knowing each of these.
    knowledge: Object.keys(facts).map((factKey) => ({
      personId,
      factKey,
      sourceRecordIds: basis,
    })),
  };
  // A faint memory never quotes; a clear one always does.
  const bank: ComposedLineBank = {
    ...SPEECH_REMEMBERED,
    parts: {
      core: {
        variants: SPEECH_REMEMBERED.parts.core.variants.filter(
          (variant) =>
            (memory.strength === "faint") ===
            (variant.requiresFacts?.includes("faint") ?? false),
        ),
      },
    },
  };
  const line = composeGroundedLine(packet, bank);
  return line.kind === "rendered"
    ? { text: line.text, parts: line.parts }
    : null;
}
