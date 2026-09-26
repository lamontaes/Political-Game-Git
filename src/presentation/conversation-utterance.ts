import type { HistoricalEvent } from "../simulation";

/**
 * The words chosen for a turn belong to its canonical event. The event's
 * `choice` remains the subject's action summary; this tag preserves what was
 * actually said without changing the meaning of older saves or adding a
 * second conversation store.
 */
export const PLAYER_UTTERANCE_TAG_PREFIX = "conversation.player-words.v1:";

export function playerUtteranceTag(words: string): string {
  if (!words.trim()) throw new Error("A spoken turn needs nonempty words.");
  return `${PLAYER_UTTERANCE_TAG_PREFIX}${JSON.stringify(words)}`;
}

export function playerUtteranceOf(event: HistoricalEvent): string | null {
  const tags = event.tags.filter((tag) =>
    tag.startsWith(PLAYER_UTTERANCE_TAG_PREFIX),
  );
  if (tags.length !== 1) return null;
  try {
    const words = JSON.parse(
      tags[0]!.slice(PLAYER_UTTERANCE_TAG_PREFIX.length),
    );
    return typeof words === "string" && words.trim() ? words : null;
  } catch {
    return null;
  }
}
