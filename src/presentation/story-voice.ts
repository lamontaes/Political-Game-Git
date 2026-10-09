/**
 * The words of a situation's lines (story director, part 3).
 *
 * A situation decides what each person means: a speech act, the person they
 * say it to and the facts the records give. This module only words it, from
 * the English part banks named in `data/english/story-voice.json`, through the
 * same bank composer as every other mined line. It writes no sentence: when no
 * bank part fits the act and the facts, there is no line, and the situation
 * that needed it is not offered. A part the owner graded down is not chosen.
 *
 * Pure: reads the packet, never the clock, and writes nothing.
 */
import storyVoiceData from "../../data/english/story-voice.json" with { type: "json" };
import type { EntityId } from "../simulation";
import { composeFromBank, stableHash, type EnglishBank } from "./bank-english";
import type { SpeechAct } from "./english-composition";
import { PART_GRADES, type PartGradeLedger } from "./english-grades";

/** What a situation hands the engine for one line. */
export interface StoryLinePacket {
  readonly act: SpeechAct;
  /** The situation type, so a bank can word a line for one type only. */
  readonly typeKey: string;
  readonly speakerPersonId: EntityId;
  readonly listenerPersonId: EntityId;
  /** Slot values from the records; a slot the records leave empty is absent. */
  readonly facts: Readonly<Record<string, string>>;
  /** The records the facts come from. */
  readonly sourceRecordIds: readonly EntityId[];
  /** Stable for one line of one saved situation, so a reload says the same. */
  readonly momentKey: string;
}

export interface StoryLine {
  readonly text: string;
  /** The bank parts the line was made from, for the owner's grades. */
  readonly parts: readonly string[];
  readonly sourceRecordIds: readonly EntityId[];
}

/** The banks a voice reads and which of their moves word each act. */
export interface StoryVoice {
  readonly fits: Readonly<Record<string, readonly string[]>>;
  readonly banks: Readonly<Record<string, EnglishBank>>;
}

/**
 * The banks the story's fits may name, by register. The English engine's lane
 * adds a bank here when it files one for the story's acts.
 */
const STORY_BANKS: Readonly<Record<string, EnglishBank>> = {};

export const STORY_VOICE: StoryVoice = {
  fits: (storyVoiceData as { fits: Record<string, readonly string[]> }).fits,
  banks: STORY_BANKS,
};

/** The slots a story line may fill, from the voice's data. */
export const STORY_SLOTS: readonly string[] = Object.keys(
  (storyVoiceData as { slots: Record<string, string> }).slots,
);

/**
 * The line for this packet, or null when no bank part can word it. Fits named
 * for the packet's situation type are tried before the act's own.
 */
export function voiceStoryLine(
  packet: StoryLinePacket,
  voice: StoryVoice = STORY_VOICE,
  grades: PartGradeLedger = PART_GRADES,
): StoryLine | null {
  const keys = [`${packet.act}@${packet.typeKey}`, packet.act];
  for (const key of keys) {
    const lines = (voice.fits[key] ?? []).flatMap((fit) => {
      const [register, move] = fit.split(":");
      const bank = register ? voice.banks[register] : undefined;
      if (!bank || !move) return [];
      const line = composeFromBank(
        bank,
        move,
        { ...packet.facts },
        packet.momentKey,
        undefined,
        grades,
      );
      return line ? [line] : [];
    });
    // One line among the fitting moves, by a stable hash of the line's key.
    const line =
      lines[stableHash(`${packet.momentKey}:fit`, 32) % lines.length];
    if (line)
      return {
        text: line.text,
        parts: [`bank:${line.partKey}`],
        sourceRecordIds: packet.sourceRecordIds,
      };
  }
  return null;
}
