import { UNRESEARCHED_ISSUE_RECORD } from "../issue-record";
import { whoCaresAbout } from "../provision-public-face";
import type {
  DecisionConsideration,
  EntityId,
  PropositionAnswerRef,
  World,
} from "../types";
import { CONSTITUENT_CONTACT_TAGS } from "./public-pressure-channels";

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
  }
  if (forIt === against || !distinguishable(peopleFor, people)) return null;
  const favor = forIt > against;
  const [more, less] = favor ? [forIt, against] : [against, forIt];
  return {
    stableKey: favor
      ? "member:constituents:for"
      : "member:constituents:against",
    optionKey: favor ? "vote-yea" : "vote-nay",
    sourceType: "context:constituents",
    direction: "supports",
    importance: more >= 2 * less ? "moderate" : "slight",
    confidence: "medium",
    explanation: `Of the ${people} voters here who hold a settled view, those who care most lean ${favor ? "for" : "against"} it.`,
    sourceRefs: [],
  };
}

/** Recorded constituents who directly asked this member to vote a direction. */
export function constituentContactsConsideration(
  world: World,
  personId: EntityId,
  measureId: EntityId,
): DecisionConsideration | null {
  const contacts = (world.history.events ?? []).filter(
    (event) =>
      event.tags.includes(CONSTITUENT_CONTACT_TAGS.event) &&
      event.tags.includes(CONSTITUENT_CONTACT_TAGS.forMeasure(measureId)) &&
      (world.history.knowledge ?? []).some(
        (record) => record.personId === personId && record.eventId === event.id,
      ) &&
      event.participants.some(
        (participant) =>
          participant.personId === personId &&
          participant.role === CONSTITUENT_CONTACT_TAGS.targetRole,
      ) &&
      (event.tags.includes(CONSTITUENT_CONTACT_TAGS.forVote) ||
        event.tags.includes(CONSTITUENT_CONTACT_TAGS.againstVote)),
  );
  const yea = contacts.filter((event) =>
    event.tags.includes(CONSTITUENT_CONTACT_TAGS.forVote),
  ).length;
  const nay = contacts.length - yea;
  if (yea === nay) return null;
  const direction = yea > nay ? "yea" : "nay";
  return {
    stableKey: `member:constituent-contacts:${measureId}`,
    optionKey: direction === "yea" ? "vote-yea" : "vote-nay",
    sourceType: "context:constituent-contact",
    direction: "supports",
    importance: "slight",
    confidence: "medium",
    explanation: `Recorded constituents contacted the member to urge a ${direction} vote.`,
    sourceRefs: contacts.map((event) => ({
      kind: "historical-event" as const,
      eventId: event.id,
    })),
  };
}
