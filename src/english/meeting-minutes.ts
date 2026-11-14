/**
 * The minutes of a meeting, worded from its records with the pieces the owner
 * graded good (data/english/parts/minutes.json): what the meeting took up, in
 * the order it took it up, and who voted against each action. Nothing here
 * decides anything; every topic is an item on the meeting's agenda and every
 * name is on the item's roll call.
 */
import { screenLine } from "./screen-words";
import { joinList } from "./bill-names";
import { BILL_SECTIONS } from "./bill-sections";

/** One item the meeting took up: its topic as the bill's name words it, and the members who voted against it. */
export interface MinutesItem {
  readonly topic: string;
  readonly against: readonly string[];
  /** The office whose holder ran the meeting, from the meeting's record (the manager, a chair, a mayor); null when the record names no one. */
  readonly ranBy?: string | null;
  /** The body that met as its place names it ("council", "school board"); a council's minutes never say "Participants discussed". */
  readonly body?: string;
}

/**
 * The lines of a meeting's minutes. The first item is what the participants
 * discussed; each later one is what the manager turned to next, said only when the meeting's record says the manager ran it (a board run by a chair or a mayor gets no such line); an item with
 * members voting against it says so. A line whose slots the record cannot fill
 * is left out (the bank piece gives nothing).
 */
export function minutesOf(items: readonly MinutesItem[]): string[] {
  const lines: string[] = [];
  items.forEach((item, index) => {
    const key =
      index === 0
        ? item.body
          ? "minutes.discussion.the-body-discussed-topic"
          : "minutes.discussion.participants-discussed-topic"
        : item.ranBy === "manager"
          ? "minutes.discussion.the-manager-turned-next-to-topic"
          : null;
    const taken = key
      ? screenLine("minutes", key, {
          topic: item.topic,
          ...(item.body ? { body: item.body } : {}),
        })
      : null;
    if (taken) lines.push(taken);
    if (item.against.length) {
      const voted = screenLine(
        "minutes",
        "minutes.vote.voting-against-this-action-members",
        { members: joinList(item.against, BILL_SECTIONS.joiners.subjects) },
      );
      if (voted) lines.push(voted);
    }
  });
  return lines;
}
