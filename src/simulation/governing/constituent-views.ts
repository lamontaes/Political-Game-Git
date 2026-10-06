import { UNRESEARCHED_ISSUE_RECORD } from "../issue-record";
import { whoCaresAbout } from "../provision-public-face";
import {
  civicMessagesForPropositions,
  type CivicMessageRecord,
} from "../living-world/civic-actions";
import { personName } from "../people";
import type {
  DecisionConsideration,
  EntityId,
  PropositionAnswerRef,
  World,
} from "../types";

/**
 * How the voters of `jurisdictionId` hold the answers on the table, as a
 * reason for a member who answers to them. Read from the people of the place:
 * every eligible voter's own held view, weighted by how much the question
 * matters to them with the issue record's salience weights
 * (`UNRESEARCHED_ISSUE_RECORD`), so a member counts a voter as that voter's
 * own judgment of the record does. Null when nobody there holds a settled
 * view, the sides are even, or too few hold one to tell a lean from chance.
 *
 * A member reads a lean only where it would pass the conventional 95 percent
 * test of a sample proportion: the people on the leading side are a share of
 * those holding a view that stands more than 1.96 standard errors from an even
 * split. One voter's view, or three against two, is not a town's lean.
 *
 * GAME ASSUMPTION (Build 25), hand-set until the research on how local
 * officials weigh their voters is read: the voters' side is a "moderate"
 * reason where it outweighs the other side two to one, and a "slight" one
 * otherwise.
 */
/**
 * Whether `leading` of `total` people differs from an even split at the
 * conventional 95 percent level (z = 1.96, the normal approximation to a
 * sample proportion).
 */
function distinguishable(leading: number, total: number): boolean {
  if (total === 0) return false;
  return Math.abs(leading / total - 0.5) > 1.96 * Math.sqrt(0.25 / total);
}

export function constituentsConsideration(
  world: World,
  jurisdictionId: EntityId,
  answers: readonly PropositionAnswerRef[],
): DecisionConsideration | null {
  const weight = UNRESEARCHED_ISSUE_RECORD.salienceWeight;
  let forIt = 0;
  let against = 0;
  let people = 0;
  let peopleFor = 0;
  const messagesByProposition = civicMessagesForPropositions(
    world,
    jurisdictionId,
    answers.map((answer) => answer.propositionId),
  );
  const messageSenders = new Map<
    string,
    {
      readonly senderId: EntityId;
      readonly eventId: EntityId;
      readonly stance: "for" | "against";
      readonly weight: number;
    }
  >();
  for (const answer of answers) {
    const views = whoCaresAbout(world, answer.propositionId, jurisdictionId);
    const weigh = (side: typeof views.support) =>
      side.bySalience.low * weight.low +
      side.bySalience.moderate * weight.moderate +
      side.bySalience.high * weight.high +
      side.bySalience.central * weight.central;
    const yes = weigh(views.support);
    const no = weigh(views.oppose);
    people += views.support.people + views.oppose.people;
    peopleFor +=
      answer.answer === "yes" ? views.support.people : views.oppose.people;
    forIt += answer.answer === "yes" ? yes : no;
    against += answer.answer === "yes" ? no : yes;

    const latestMessages = new Map<EntityId, CivicMessageRecord>();
    for (const message of messagesByProposition.get(answer.propositionId) ??
      []) {
      const prior = latestMessages.get(message.senderId);
      if (
        !prior ||
        message.occurredAt > prior.occurredAt ||
        (message.occurredAt === prior.occurredAt &&
          message.sequence > prior.sequence)
      )
        latestMessages.set(message.senderId, message);
    }
    for (const message of latestMessages.values()) {
      messageSenders.set(`${answer.propositionId}:${message.senderId}`, {
        senderId: message.senderId,
        eventId: message.eventId,
        stance: message.stance === answer.answer ? "for" : "against",
        weight: UNRESEARCHED_ISSUE_RECORD.salienceWeight[message.salience],
      });
    }
  }
  let messageFor = 0;
  let messageAgainst = 0;
  for (const message of messageSenders.values()) {
    if (message.stance === "for") messageFor += message.weight;
    else messageAgainst += message.weight;
  }
  const combinedFor = forIt + messageFor;
  const combinedAgainst = against + messageAgainst;
  if (
    combinedFor === combinedAgainst ||
    (messageSenders.size === 0 && !distinguishable(peopleFor, people))
  )
    return null;
  const favor = combinedFor > combinedAgainst;
  const [more, less] = favor
    ? [combinedFor, combinedAgainst]
    : [combinedAgainst, combinedFor];
  const senders = [
    ...new Set([...messageSenders.values()].map((message) => message.senderId)),
  ].sort((left, right) =>
    personName(world.people[left]!).localeCompare(
      personName(world.people[right]!),
    ),
  );
  const senderNames = senders.map((id) => personName(world.people[id]!));
  const messageRefs = [...messageSenders.values()].map((message) => ({
    kind: "historical-event" as const,
    eventId: message.eventId,
  }));
  return {
    stableKey: favor
      ? "member:constituents:for"
      : "member:constituents:against",
    optionKey: favor ? "vote-yea" : "vote-nay",
    sourceType: "context:constituents",
    direction: "supports",
    importance: more >= 2 * less ? "moderate" : "slight",
    confidence: "medium",
    explanation:
      messageRefs.length > 0
        ? `Of the ${people} voters here who hold a settled view, and constituents who wrote their elected officials (${senderNames.join(", ")}), the stronger recorded considerations lean ${favor ? "for" : "against"} it.`
        : `Of the ${people} voters here who hold a settled view, those who care most lean ${favor ? "for" : "against"} it.`,
    sourceRefs: messageRefs,
  };
}
