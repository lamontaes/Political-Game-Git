/**
 * What a reply move does, so that four replies can be four different answers
 * (owner, Oct 27: "four replies are four different answers, never one
 * reworded"). The groups live in `data/reply-meanings.json`; both composers
 * (everyday talk, `conversation.ts`, and scenes with a purpose,
 * `scene-talk.ts`) offer at most one reply of a group, and the rule
 * `four-replies-are-four-answers` (data/english/line-rules.json) reads the
 * same table.
 */
// stopgapId: SG-DIRECTOR-reply-groups-gaps
import meaningsJson from "./data/reply-meanings.json" with { type: "json" };

interface ReplyMeanings {
  groups: Readonly<Record<string, string>>;
  everyday: Readonly<Record<string, Readonly<Record<string, string>>>>;
  scene: Readonly<Record<string, string>>;
}

export const REPLY_MEANINGS = meaningsJson as unknown as ReplyMeanings;

/**
 * The group of an everyday reply: the subject it answers and the choice it
 * makes. An acknowledgment offered from the shared bank is `ack:<choice>`. A
 * move with no group stands alone (its own group) and fails the guard test, so
 * a missing row never hides two wordings of one answer.
 */
export function everydayMeaning(subject: string, choice: string): string {
  if (choice.startsWith("ack:")) return REPLY_MEANINGS.everyday.ack!.right!;
  return (
    REPLY_MEANINGS.everyday[subject]?.[choice] ??
    `unplaced:${subject}.${choice}`
  );
}

/** The group of a scene reply, by the move it makes. */
export function sceneMeaning(move: string): string {
  return REPLY_MEANINGS.scene[move] ?? `unplaced:${move}`;
}
