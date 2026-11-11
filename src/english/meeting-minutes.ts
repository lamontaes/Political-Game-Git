/**
 * The minutes of a meeting, worded from its records with the pieces the owner
 * graded good (data/english/parts/minutes.json): what the meeting took up, in
 * the order it took it up, and who voted against each action. Nothing here
 * decides anything; every topic is an item on the meeting's agenda and every
 * name is on the item's roll call.
 */
import { screenLine } from "./screen-words";

/** One item the meeting took up: its topic as the bill's name words it, and the members who voted against it. */
export interface MinutesItem {
  readonly topic: string;
  readonly against: readonly string[];
}

/** "A", "A and B", "A, B and C". */
function joinNames(names: readonly string[]): string {
  if (names.length < 2) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/**
 * The lines of a meeting's minutes. The first item is what the participants
 * discussed; each later one is what the manager turned to next; an item with
 * members voting against it says so. A line whose slots the record cannot fill
 * is left out (the bank piece gives nothing).
 */
export function minutesOf(items: readonly MinutesItem[]): string[] {
  const lines: string[] = [];
  items.forEach((item, index) => {
    const taken = screenLine(
      "minutes",
      index === 0
        ? "minutes.discussion.participants-discussed-topic"
        : "minutes.discussion.the-manager-turned-next-to-topic",
      { topic: item.topic },
    );
    if (taken) lines.push(taken);
    if (item.against.length) {
      const voted = screenLine(
        "minutes",
        "minutes.vote.voting-against-this-action-members",
        { members: joinNames(item.against) },
      );
      if (voted) lines.push(voted);
    }
  });
  return lines;
}
