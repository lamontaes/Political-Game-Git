import { isSelectedDecision, recordDurableDecisionTrace } from "../decisions";
import { eventById } from "../event-index";
import { recordByStableKey } from "../history-index";
import {
  currentLifeCutoff,
  organizationParticipationStateAt,
} from "../life-queries";
import { isPersonAliveAt } from "../vitality";
import { recordWorldEvent } from "../world";
import type { HistoricalEvent, World } from "../types";
import {
  CLEMENCY_BOARD_APPOINTED,
  clemencyBoardAppointmentProfiles,
} from "./clemency-board-seating";
import {
  CLEMENCY_GRANT,
  clemencyQuestionFor,
  evaluateClemency,
} from "./clemency-reasoning";

export const CLEMENCY_BOARD_MEMBER_VOTE = "justice.clemency-board-member-voted";

/** Actual appointed members answer through the existing clemency decision.
 * Only a profile's explicit quorum/action threshold admits a board answer.
 * Panel selection, attendance rules and missing legal thresholds are not inferred.
 */
export function decideRecordedClemencyBoard(
  world: World,
  petition: HistoricalEvent,
  jurisdictionKey: string,
  bodyKey: string,
): {
  readonly world: World;
  readonly favorable: boolean | null;
  readonly votes: readonly HistoricalEvent[];
} {
  const profile = clemencyBoardAppointmentProfiles.find(
    (row) => row.jurisdictionKey === jurisdictionKey && row.bodyKey === bodyKey,
  );
  const question = clemencyQuestionFor(world, petition);
  if (
    !profile ||
    !question ||
    profile.quorum === null ||
    profile.minimumFavorableVotes === null
  )
    return { world, favorable: null, votes: [] };
  const boardKey = `clemency-board:${jurisdictionKey}:${bodyKey}`;
  const board = world.history.organizations.find(
    (row) => row.stableKey === boardKey,
  );
  if (!board) return { world, favorable: null, votes: [] };
  const cutoff = currentLifeCutoff(world);
  const members = world.history.organizationParticipations.filter((row) => {
    if (
      row.organizationId !== board.id ||
      row.kind !== "membership:clemency-board" ||
      row.startedAt > world.currentDate ||
      organizationParticipationStateAt(world, row.id, cutoff)?.status !==
        "active" ||
      organizationParticipationStateAt(world, row.id, cutoff)?.roleKind !==
        "member:board" ||
      !isPersonAliveAt(world, row.personId, cutoff) ||
      row.provenance.kind !== "simulated-event"
    )
      return false;
    const appointment = eventById(world, row.provenance.eventId);
    return (
      appointment?.type === CLEMENCY_BOARD_APPOINTED &&
      appointment.occurredAt <= world.currentDate &&
      appointment.tags.includes(`board-key:${boardKey}`) &&
      appointment.participants.some(
        (person) =>
          person.role === "agency:appointee" &&
          person.personId === row.personId,
      )
    );
  });
  const unique = [
    ...new Map(members.map((row) => [row.personId, row])).values(),
  ];
  if (unique.length < profile.quorum)
    return { world, favorable: null, votes: [] };
  let next = world;
  const votes: HistoricalEvent[] = [];
  for (const member of unique) {
    const voteKey = `${petition.stableKey}:board:${bodyKey}:member:${member.personId}`;
    const existing = recordByStableKey(next.history.events, voteKey);
    if (existing) {
      votes.push(existing);
      continue;
    }
    // A controlled member must make their own choice through an admitted action.
    if (
      next.control.kind === "person" &&
      next.control.personId === member.personId
    )
      continue;
    const traceKey = `${petition.stableKey}:decider:${member.personId}:trace`;
    const saved = recordByStableKey(next.history.decisionTraces, traceKey);
    const evaluation =
      saved ??
      evaluateClemency(next, member.personId, question, {
        stateUsps: null,
        termEndsAt: null,
      });
    if (
      evaluation.context.actorPersonId !== member.personId ||
      evaluation.context.subject.key !== petition.stableKey ||
      evaluation.context.decisionType !== "justice.clemency-decision" ||
      !isSelectedDecision(evaluation)
    )
      continue;
    if (!saved) next = recordDurableDecisionTrace(next, evaluation);
    const favorable = evaluation.selectedOptionKey === CLEMENCY_GRANT;
    const reason = evaluation.context.considerations
      .filter(
        (row) =>
          row.optionKey === evaluation.selectedOptionKey &&
          row.direction === "supports",
      )
      .map((row) => row.explanation)
      .join(" ");
    const trace = recordByStableKey(next.history.decisionTraces, traceKey)!;
    next = recordWorldEvent(next, {
      stableKey: voteKey,
      type: CLEMENCY_BOARD_MEMBER_VOTE,
      occurredAt: next.currentDate,
      recordedAt: next.currentDate,
      jurisdictionId: petition.jurisdictionId,
      visibility: "limited",
      involvedEntityIds: [
        ...new Set([member.personId, question.petitionerId, board.id]),
      ],
      participants: [
        {
          personId: member.personId,
          role: "agency:decider",
          detail: profile.label,
        },
      ],
      personFactConstraints: [],
      tags: [
        `petition:${petition.id}`,
        `board-key:${boardKey}`,
        `membership:${member.id}`,
        `decision-trace:${trace.id}`,
        `vote:${favorable ? "for" : "against"}`,
      ],
      summary: `A recorded member of ${profile.label} voted ${favorable ? "for" : "against"} the request.`,
      context: {
        location: null,
        socialContext: profile.label,
        pressure: null,
        choice: favorable ? "For" : "Against",
        motivation: reason || null,
        immediateReaction: null,
      },
    });
    votes.push(next.history.events.at(-1)!);
  }
  const forCount = votes.filter((vote) =>
    vote.tags.includes("vote:for"),
  ).length;
  const againstCount = votes.filter((vote) =>
    vote.tags.includes("vote:against"),
  ).length;
  return {
    world: next,
    votes,
    favorable:
      votes.length < profile.quorum
        ? null
        : forCount >= profile.minimumFavorableVotes
          ? true
          : againstCount >= profile.minimumFavorableVotes
            ? false
            : null,
  };
}
