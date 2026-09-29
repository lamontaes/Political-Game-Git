import { compareSimulationMoments } from "./dates";
import { favorRecords } from "./favors";
import {
  assessCommitment,
  laterRecordedVoteOn,
  type LegislativeCommitmentStanding,
} from "./legislative-politics";
import { scheduledActivityState } from "./time-work";
import type {
  ClaimAudience,
  EntityId,
  FavorWeight,
  IsoDate,
  LifeCommitmentRecord,
  UndertakingAct,
  UndertakingFirmness,
  World,
} from "./types";

/**
 * One way to read every undertaking in the world, whoever made it.
 *
 * A promise between neighbors, a legislator's word on a bill and a
 * candidate's pledge were written by three different parts of the game, into
 * three stores that already existed before this file. This does not move them
 * into a fourth. It reads all three into one shape (who promised, to whom, what
 * act, how firmly, in front of whom, in what words) and judges each one the same
 * way: from what later happened, never from a stored verdict.
 *
 * A promise is a claim about the future held by the people who heard it. Kept
 * or broken is derived here on every read, so the words are never overwritten
 * by what became of them.
 */

export type UndertakingSource =
  | { readonly store: "lifeCommitments"; readonly recordId: EntityId }
  | { readonly store: "legislativeCommitments"; readonly recordId: EntityId }
  | { readonly store: "campaignCommitments"; readonly recordId: EntityId };

export interface Undertaking {
  readonly source: UndertakingSource;
  readonly holderPersonId: EntityId;
  /** Who it was promised to. Empty when it was said to the public at large. */
  readonly owedToPersonIds: readonly EntityId[];
  readonly heardByPersonIds: readonly EntityId[];
  readonly audience: ClaimAudience;
  readonly firmness: UndertakingFirmness;
  readonly statement: string;
  readonly statedAt: IsoDate;
  /** What would answer it. Null when only its own domain can say. */
  readonly act: UndertakingAct | null;
  readonly mattered: FavorWeight | null;
}

/**
 * Where an undertaking stands, read from the world.
 *
 * `kept` and `broken` are claimed only when a record answers the act. When no
 * record could (the occasion never came, the thing was never checkable) the
 * answer is `outstanding` while it can still come, and `lapsed` after, which
 * blames nobody.
 */
export type UndertakingStanding =
  | "outstanding"
  | "kept"
  | "broken"
  | "lapsed"
  | "superseded"
  | "withdrawn"
  | "moot";

export interface UndertakingAssessment {
  readonly standing: UndertakingStanding;
  /** One plain sentence saying why. Never a score or a probability. */
  readonly account: string;
  /** The record that answered it, when one did. */
  readonly evidenceId: EntityId | null;
}

/* -------------------------------------------------------------------------- */
/* Reading the three stores into one shape                                     */
/* -------------------------------------------------------------------------- */

function fromLife(record: LifeCommitmentRecord): Undertaking | null {
  const terms = record.undertaking;
  if (!terms) return null;
  return {
    source: { store: "lifeCommitments", recordId: record.id },
    holderPersonId: record.personId,
    owedToPersonIds: terms.owedToPersonIds,
    heardByPersonIds: terms.heardByPersonIds,
    audience: terms.audience,
    firmness: terms.firmness,
    statement: terms.statement,
    statedAt: record.startsAt,
    act: terms.act,
    mattered: terms.mattered,
  };
}

/** Every undertaking in the world, in the order each store recorded it. */
export function allUndertakings(world: World): readonly Undertaking[] {
  const life = world.history.lifeCommitments
    .map(fromLife)
    .filter((entry): entry is Undertaking => entry !== null);
  const legislative: Undertaking[] = (
    world.history.legislativeCommitments ?? []
  ).map((record) => ({
    source: { store: "legislativeCommitments", recordId: record.id },
    holderPersonId: record.holderPersonId,
    owedToPersonIds: record.heardByPersonIds.filter(
      (id) => id !== record.holderPersonId,
    ),
    heardByPersonIds: record.heardByPersonIds,
    audience: record.audience,
    firmness: record.firmness,
    statement: record.statement,
    statedAt: record.statedAt,
    act: null,
    mattered: null,
  }));
  const campaign: Undertaking[] = world.history.campaignCommitments.map(
    (record) => ({
      source: { store: "campaignCommitments", recordId: record.id },
      holderPersonId: record.personId,
      owedToPersonIds: [],
      heardByPersonIds: [],
      audience: "public",
      firmness:
        record.level === "pledge"
          ? "explicit"
          : record.level === "conditional"
            ? "qualified"
            : "provisional",
      statement: record.statement,
      statedAt: record.madeAt,
      act: null,
      mattered: null,
    }),
  );
  return [...life, ...legislative, ...campaign];
}

/** What this person has said they would do, in every domain. */
export function undertakingsHeldBy(
  world: World,
  personId: EntityId,
): readonly Undertaking[] {
  return allUndertakings(world).filter(
    (entry) => entry.holderPersonId === personId,
  );
}

/** What others have promised this person, or said where they could hear. */
export function undertakingsKnownTo(
  world: World,
  personId: EntityId,
): readonly Undertaking[] {
  return allUndertakings(world).filter(
    (entry) =>
      entry.holderPersonId !== personId &&
      (entry.owedToPersonIds.includes(personId) ||
        entry.heardByPersonIds.includes(personId)),
  );
}

/** The undertaking a life commitment carries, when it carries one. */
export function undertakingForLifeCommitment(
  world: World,
  commitmentId: EntityId,
): Undertaking | null {
  const record = world.history.lifeCommitments.find(
    (entry) => entry.id === commitmentId,
  );
  return record ? fromLife(record) : null;
}

/* -------------------------------------------------------------------------- */
/* Kept or broken, from what happened                                          */
/* -------------------------------------------------------------------------- */

const LEGISLATIVE_STANDING: Readonly<
  Record<LegislativeCommitmentStanding, UndertakingStanding>
> = {
  open: "outstanding",
  "conditions-met": "outstanding",
  "conditions-unmet": "outstanding",
  honored: "kept",
  "departed-from": "broken",
  superseded: "superseded",
};

/** Judges one undertaking against the world as it now stands. */
export function assessUndertaking(
  world: World,
  undertaking: Undertaking,
): UndertakingAssessment {
  const { source } = undertaking;
  if (source.store === "legislativeCommitments") {
    const assessed = assessCommitment(world, source.recordId);
    return {
      standing: LEGISLATIVE_STANDING[assessed.standing],
      account: assessed.account,
      evidenceId: null,
    };
  }
  if (source.store === "campaignCommitments") {
    const replaced = world.history.campaignCommitments.some(
      (record) => record.supersedesCommitmentId === source.recordId,
    );
    return replaced
      ? {
          standing: "superseded",
          account: "The candidate has since said something different about it.",
          evidenceId: null,
        }
      : {
          standing: "outstanding",
          account: "Nothing on record has tested it yet.",
          evidenceId: null,
        };
  }
  const record = world.history.lifeCommitments.find(
    (entry) => entry.id === source.recordId,
  )!;
  return assessLifeUndertaking(world, record, undertaking);
}

function holderDied(world: World, personId: EntityId): IsoDate | null {
  return (
    world.history.personDeaths.find((death) => death.personId === personId)
      ?.diedAt ?? null
  );
}

function assessLifeUndertaking(
  world: World,
  record: LifeCommitmentRecord,
  undertaking: Undertaking,
): UndertakingAssessment {
  const act = undertaking.act!;
  const answered = answerAct(world, record, undertaking, act);
  if (answered.standing !== "outstanding") return answered;

  // Nothing has answered it yet. It can still be answered unless the person
  // who made it is gone, or the time it named has passed.
  const died = holderDied(world, record.personId);
  if (died !== null) {
    return {
      standing: "withdrawn",
      account: "They died before it came due.",
      evidenceId: null,
    };
  }
  const dueBy = record.undertaking?.dueBy ?? null;
  if (dueBy !== null && dueBy < world.currentDate) {
    return {
      standing: "lapsed",
      account: "The time it named passed without anything to show either way.",
      evidenceId: null,
    };
  }
  if (record.endsAt !== null && record.endsAt <= world.currentDate) {
    return {
      standing: "lapsed",
      account: "It ended without anything to show either way.",
      evidenceId: null,
    };
  }
  return answered;
}

function answerAct(
  world: World,
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
      // No single record says whether help was given. Saying kept or broken
      // here would be a guess, so it stays open until it ends.
      return outstanding;

    case "attend": {
      const calledOff: UndertakingAssessment = {
        standing: "moot",
        account: "It was called off, so there was nothing to go to.",
        evidenceId: null,
      };
      const activity = world.history.scheduledActivities
        .filter(
          (entry) =>
            entry.stableKey === act.activityStableKey &&
            entry.participantPersonIds.includes(undertaking.holderPersonId),
        )
        .at(-1);
      if (!activity) {
        // The occasion is on somebody else's calendar, not theirs, so no
        // record could place them there or show them missing. Once it has
        // come and gone, that is all anybody can say.
        const occasion = world.history.scheduledActivities.find(
          (entry) => entry.stableKey === act.activityStableKey,
        );
        if (!occasion) return outstanding;
        const held = scheduledActivityState(world, occasion.id);
        if (held.status === "cancelled") return calledOff;
        return compareSimulationMoments(world.currentMoment, held.end) >= 0
          ? {
              standing: "lapsed",
              account: `It came and went (${act.description}), and nothing on record says whether they were there.`,
              evidenceId: occasion.id,
            }
          : outstanding;
      }
      // Being there is a record that places them in the room. A plan to go
      // names the same meeting and the same person, and is not being there.
      const presence = world.history.events.find(
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
      const state = scheduledActivityState(world, activity.id);
      if (state.status === "cancelled") return calledOff;
      if (compareSimulationMoments(world.currentMoment, state.end) >= 0) {
        return {
          standing: "broken",
          account: `It happened without them, after they said they would be there.`,
          evidenceId: activity.id,
        };
      }
      return outstanding;
    }

    case "vote":
      // A life undertaking to vote is answered by the recorded vote, the same
      // way a legislative one is. Until one is on record it is open.
      return answerVote(world, record, act) ?? outstanding;

    case "repay": {
      const repayment = favorRecords(world).find(
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
  world: World,
  record: LifeCommitmentRecord,
  act: Extract<UndertakingAct, { kind: "vote" }>,
): UndertakingAssessment | null {
  const vote = laterRecordedVoteOn(
    world,
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
