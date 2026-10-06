import { recordRelationshipInteraction } from "../simulation/records";
import type {
  EntityId,
  IsoDate,
  RelationshipInteractionKind,
  RelationshipSignificance,
  World,
} from "../simulation";

/**
 * Put a conversation on the two people's shared record.
 *
 * Before this, talking to somebody wrote an event and what each person heard,
 * and nothing between the two of them: after an afternoon of talk and a game,
 * the person card still said they last spoke months ago, and time apart could
 * not be measured because time together was never recorded.
 *
 * One day's talk is one episode, whatever the number of turns, so the record
 * says the two of them spoke that day and not that they spoke eleven times, as
 * the conduct rubric for `what-moves-a-relationship` asks. All of it is contact
 * that keeps the two of them in touch and moves none of the five lines on its
 * own: a chat is slight, half an hour together or an agreed date is more, and
 * none of it is affection earned by repetition. What either of them does with
 * that time is its own conduct. A refusal writes no extra record: it is the
 * other person's answer, not a mark against anyone.
 */
export function recordConversationContact(
  world: World,
  input: {
    readonly playerPersonId: EntityId;
    readonly personId: EntityId;
    readonly eventId: EntityId;
    readonly occurredAt: IsoDate;
    readonly timeTogether: boolean;
    readonly date: boolean;
  },
): World {
  const event = world.history.events.find(
    (record) => record.id === input.eventId,
  );
  if (
    !event ||
    event.occurredAt !== input.occurredAt ||
    input.playerPersonId === input.personId ||
    !event.involvedEntityIds.includes(input.playerPersonId) ||
    !event.involvedEntityIds.includes(input.personId)
  )
    throw new Error(
      "Conversation contact requires the actual recorded exchange and people.",
    );
  // Keep saved life-talk keys while treating a reply from either person as the same episode.
  const pair = [input.playerPersonId, input.personId].sort();
  const anchor =
    world.control.kind === "person" && pair.includes(world.control.personId)
      ? world.control.personId
      : pair[0]!;
  const counterpart = pair.find((id) => id !== anchor)!;
  const base = `life-talk:${input.occurredAt}:${anchor}:${counterpart}`;
  const episodes: {
    key: string;
    kind: RelationshipInteractionKind;
    significance: RelationshipSignificance;
    summary: string;
  }[] = [
    {
      key: `${base}:spoke`,
      kind: "contact:conversation",
      significance: "minor",
      summary: "Spoke together.",
    },
  ];
  if (input.timeTogether) {
    episodes.push({
      key: `${base}:time-together`,
      kind: "contact:time-together",
      significance: "meaningful",
      summary: "Spent time together.",
    });
  }
  if (input.date) {
    episodes.push({
      key: `${base}:date`,
      kind: "contact:date",
      significance: "meaningful",
      summary: "Agreed this was a date.",
    });
  }
  let next = world;
  for (const episode of episodes) {
    if (
      next.history.relationshipInteractions.some(
        (interaction) => interaction.stableKey === episode.key,
      )
    ) {
      continue;
    }
    next = recordRelationshipInteraction(next, {
      stableKey: episode.key,
      personIds: [input.playerPersonId, input.personId],
      eventId: input.eventId,
      occurredAt: input.occurredAt,
      kind: episode.kind,
      change: "maintained",
      significance: episode.significance,
      summary: episode.summary,
      tags: ["life.conversation"],
    });
  }
  return next;
}
