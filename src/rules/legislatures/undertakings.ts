import type {
  EntityId,
  IsoDate,
  SimulationMoment,
  PersonDeathRecord,
  ScheduledActivityRecord,
  HistoricalEvent,
  FavorRecord,
  LifeCommitmentRecord,
  UndertakingAct,
  LegislativeQuestionIdentity,
  LegislativeVoteRecord,
  LegislativeAmendmentRecord,
  LegislativeProvisionRecord,
} from "../../simulation/types";
import type {
  Undertaking,
  UndertakingAssessment,
} from "../../simulation/undertakings";
import type { scheduledActivityState } from "../../simulation/time-work";
import { compareSimulationMoments } from "./moments";
export interface UndertakingFacts {
  readonly onDate: IsoDate;
  readonly currentMoment: SimulationMoment;
  readonly deaths: readonly PersonDeathRecord[];
  readonly activities: readonly ScheduledActivityRecord[];
  readonly activityStates: ReadonlyMap<
    EntityId,
    ReturnType<typeof scheduledActivityState>
  >;
  readonly events: readonly HistoricalEvent[];
  readonly favors: readonly FavorRecord[];
  readonly votes: readonly LegislativeVoteRecord[];
  readonly amendments: readonly LegislativeAmendmentRecord[];
  readonly provisions: readonly LegislativeProvisionRecord[];
}
export function legislativeQuestionAnswers(
  promised: LegislativeQuestionIdentity,
  put: LegislativeQuestionIdentity,
): boolean {
  if (promised.measureId !== put.measureId) return false;
  if (promised.purpose !== put.purpose) return false;
  if (promised.amendmentStableKey !== put.amendmentStableKey) return false;
  if (promised.provisionKey !== put.provisionKey) return false;
  if (promised.forumKey !== null && promised.forumKey !== put.forumKey) {
    return false;
  }
  if (
    promised.floorStageKey !== null &&
    promised.floorStageKey !== put.floorStageKey
  ) {
    return false;
  }
  return true;
}

export function questionPutByVote(
  facts: UndertakingFacts,
  vote: LegislativeVoteRecord,
): LegislativeQuestionIdentity {
  const amendment =
    vote.purpose === "amendment"
      ? ((facts.amendments ?? []).find((record) => record.voteId === vote.id) ??
        null)
      : null;
  return {
    measureId: vote.measureId,
    purpose: vote.purpose,
    forumKey: voteForumKey(vote),
    floorStageKey: vote.floorStageKey,
    amendmentStableKey: amendment?.stableKey ?? null,
    provisionKey: amendment
      ? (provisionKeyCarriedBy(facts, amendment.id) ?? null)
      : null,
  };
}

function voteForumKey(vote: LegislativeVoteRecord): string {
  const forum = vote.forum;
  switch (forum.kind) {
    case "chamber":
      return forum.chamberKey;
    case "committee":
      return `${forum.chamberKey}:${forum.committeeKey}`;
    case "joint-session":
      return forum.forumName;
  }
}

function provisionKeyCarriedBy(
  facts: UndertakingFacts,
  amendmentId: EntityId,
): string | null {
  return (
    (facts.provisions ?? []).find(
      (record) => record.originAmendmentId === amendmentId,
    )?.provisionKey ?? null
  );
}

function questionInWords(question: LegislativeQuestionIdentity): string {
  switch (question.purpose) {
    case "floor-stage":
      return "the bill's passage";
    case "concurrence":
      return "agreeing to the other chamber's changes";
    case "veto-override":
      return "the override";
    case "committee-report":
      return "reporting the bill out of committee";
    case "amendment":
      return "the amendment";
    case "procedural-motion":
      return "the procedural motion";
  }
}

export function laterRecordedVoteOn(
  facts: UndertakingFacts,
  personId: EntityId,
  question: LegislativeQuestionIdentity,
  afterSequence: number,
): {
  readonly voteId: EntityId;
  readonly disposition: "yea" | "nay";
  readonly questionLabel: string;
} | null {
  const votes = (facts.votes ?? [])
    .filter(
      (vote) =>
        vote.sequence > afterSequence &&
        legislativeQuestionAnswers(question, questionPutByVote(facts, vote)),
    )
    .slice()
    .sort((a, b) => a.sequence - b.sequence);
  for (const vote of votes) {
    const disposition = vote.dispositions.find(
      (record) => record.personId === personId,
    );
    if (
      disposition &&
      (disposition.disposition === "yea" || disposition.disposition === "nay")
    ) {
      return {
        voteId: vote.id,
        disposition: disposition.disposition,
        questionLabel: questionInWords(question),
      };
    }
  }
  return null;
}
function holderDied(
  facts: UndertakingFacts,
  personId: EntityId,
): IsoDate | null {
  return (
    facts.deaths.find((death) => death.personId === personId)?.diedAt ?? null
  );
}

export function assessLifeUndertaking(
  facts: UndertakingFacts,
  record: LifeCommitmentRecord,
  undertaking: Undertaking,
): UndertakingAssessment {
  const act = undertaking.act!;
  const answered = answerAct(facts, record, undertaking, act);
  if (answered.standing !== "outstanding") return answered;
  const died = holderDied(facts, record.personId);
  if (died !== null) {
    return {
      standing: "withdrawn",
      account: "They died before it came due.",
      evidenceId: null,
    };
  }
  const dueBy = record.undertaking?.dueBy ?? null;
  if (dueBy !== null && dueBy < facts.onDate) {
    return {
      standing: "lapsed",
      account: "The time it named passed without anything to show either way.",
      evidenceId: null,
    };
  }
  if (record.endsAt !== null && record.endsAt <= facts.onDate) {
    return {
      standing: "lapsed",
      account: "It ended without anything to show either way.",
      evidenceId: null,
    };
  }
  return answered;
}

function answerAct(
  facts: UndertakingFacts,
  record: LifeCommitmentRecord,
  undertaking: Undertaking,
  act: UndertakingAct,
): UndertakingAssessment {
  const outstanding: UndertakingAssessment = {
    standing: "outstanding",
    account: "Nothing has tested it yet.",
    evidenceId: null,
  };
  switch (act.kind) {
    case "help":
      return outstanding;
    case "attend": {
      const calledOff: UndertakingAssessment = {
        standing: "moot",
        account: "It was called off, so there was nothing to go to.",
        evidenceId: null,
      };
      const activity = facts.activities
        .filter(
          (entry) =>
            entry.stableKey === act.activityStableKey &&
            entry.participantPersonIds.includes(undertaking.holderPersonId),
        )
        .at(-1);
      if (!activity) {
        const occasion = facts.activities.find(
          (entry) => entry.stableKey === act.activityStableKey,
        );
        if (!occasion) return outstanding;
        const held = facts.activityStates.get(occasion.id)!;
        if (held.status === "cancelled") return calledOff;
        return compareSimulationMoments(facts.currentMoment, held.end) >= 0
          ? {
              standing: "lapsed",
              account: `It came and went (${act.description}), and nothing on record says whether they were there.`,
              evidenceId: occasion.id,
            }
          : outstanding;
      }
      const presence = facts.events.find(
        (event) =>
          event.involvedEntityIds.includes(activity.id) &&
          event.participants.some(
            (participant) =>
              participant.personId === undertaking.holderPersonId &&
              participant.role === "presence:participant",
          ),
      );
      if (presence) {
        return {
          standing: "kept",
          account: `They were there: ${act.description}.`,
          evidenceId: presence.id,
        };
      }
      const state = facts.activityStates.get(activity.id)!;
      if (state.status === "cancelled") return calledOff;
      if (compareSimulationMoments(facts.currentMoment, state.end) >= 0) {
        return {
          standing: "broken",
          account: `It happened without them, after they said they would be there.`,
          evidenceId: activity.id,
        };
      }
      return outstanding;
    }
    case "vote":
      return answerVote(facts, record, act) ?? outstanding;
    case "repay": {
      const repayment = facts.favors.find(
        (favor) =>
          favor.inReturnForFavorId === act.favorId &&
          favor.giverPersonId === record.personId,
      );
      return repayment
        ? {
            standing: "kept",
            account: `They returned it: ${repayment.description}.`,
            evidenceId: repayment.id,
          }
        : outstanding;
    }
  }
}

function answerVote(
  facts: UndertakingFacts,
  record: LifeCommitmentRecord,
  act: Extract<
    UndertakingAct,
    {
      kind: "vote";
    }
  >,
): UndertakingAssessment | null {
  const vote = laterRecordedVoteOn(
    facts,
    record.personId,
    act.question,
    record.sequence,
  );
  if (!vote) return null;
  return vote.disposition === act.direction
    ? {
        standing: "kept",
        account: `They voted ${vote.disposition} on ${vote.questionLabel}, as they said they would.`,
        evidenceId: vote.voteId,
      }
    : {
        standing: "broken",
        account: `They voted ${vote.disposition} on ${vote.questionLabel} after saying ${act.direction}.`,
        evidenceId: vote.voteId,
      };
}

// stopgapId: "SG-P14-legislatures-undertaking-future-death"
