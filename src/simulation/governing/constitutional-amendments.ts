import {
  ARTICLE_V_STATE_KEYS,
  constitutionalPosition,
} from "../constitutional-process";
import { addDays } from "../dates";
import { scheduleFutureDueItem } from "../future-transitions";
import { SeededRng } from "../rng";
import type {
  EntityId,
  FutureDueItem,
  FutureTransitionHandlerResult,
  ProposeConstitutionalMeasureInput,
  World,
} from "../types";
import { proposeConstitutionalMeasure } from "../constitutional-process";

type ProposalInput = Omit<
  ProposeConstitutionalMeasureInput,
  "textVersion" | "sponsorPersonId" | "delayedOperativeAt" | "ordinaryMeasureId"
> &
  Partial<
    Pick<
      ProposeConstitutionalMeasureInput,
      | "textVersion"
      | "sponsorPersonId"
      | "delayedOperativeAt"
      | "ordinaryMeasureId"
    >
  >;

export interface AmendmentStateSchedule {
  readonly transitionKey: FutureDueItem["transitionKey"];
  readonly jurisdictionId: EntityId;
  readonly minimumDays: number;
  readonly maximumDays: number;
  readonly provenanceNote: string;
}

/** Save the canonical proposal record without deciding it. */
export function proposeAmendment(world: World, input: ProposalInput): World {
  const {
    textVersion = "v1",
    sponsorPersonId = null,
    delayedOperativeAt = null,
    ordinaryMeasureId = null,
    ...proposal
  } = input;
  return proposeConstitutionalMeasure(world, {
    ...proposal,
    textVersion,
    sponsorPersonId,
    delayedOperativeAt,
    ordinaryMeasureId,
  });
}

/** The sole amendment proposer: save once, record the proposing vote, then calendar state action. */
export function proposeAndVoteAmendment(
  world: World,
  input: {
    readonly proposal: ProposalInput;
    readonly recordProposalVotes: (world: World, measureId: EntityId) => World;
    readonly stateSchedule?: AmendmentStateSchedule;
  },
): World {
  const existing = (world.history.constitutionalMeasures ?? []).find(
    (measure) => measure.stableKey === input.proposal.stableKey,
  );
  if (
    existing &&
    constitutionalPosition(world, existing.id).phase !== "consideration"
  )
    return world;

  let next = world;
  const measureId =
    existing?.id ??
    (() => {
      const {
        textVersion = "v1",
        sponsorPersonId = null,
        delayedOperativeAt = null,
        ordinaryMeasureId = null,
        ...proposal
      } = input.proposal;
      next = proposeAmendment(next, {
        ...proposal,
        textVersion,
        sponsorPersonId,
        delayedOperativeAt,
        ordinaryMeasureId,
      });
      return next.history.constitutionalMeasures!.at(-1)!.id;
    })();

  if (constitutionalPosition(next, measureId).phase === "consideration")
    next = input.recordProposalVotes(next, measureId);
  if (
    !input.stateSchedule ||
    constitutionalPosition(next, measureId).phase !== "ratification"
  )
    return next;

  const schedule = input.stateSchedule;
  const spread = new SeededRng(next.seed).fork(input.proposal.stableKey);
  for (const stateKey of ARTICLE_V_STATE_KEYS) {
    const days = spread
      .fork(`state:${stateKey}:day`)
      .integer(schedule.minimumDays, schedule.maximumDays);
    next = scheduleFutureDueItem(next, {
      stableKey: `${input.proposal.stableKey}:state:${stateKey}`,
      dueAt: addDays(next.currentDate, days),
      transitionKey: schedule.transitionKey,
      entityIds: [schedule.jurisdictionId],
      jurisdictionId: schedule.jurisdictionId,
      provenance: { kind: "authored", note: schedule.provenanceNote },
    });
  }
  return next;
}

/** The sole state-action handler shell for every federal amendment producer. */
export function handleAmendmentStateAction(
  world: World,
  due: FutureDueItem,
  decide: (world: World, measureId: EntityId, stateKey: string) => World | null,
  accepts: (world: World, measureId: EntityId) => boolean = () => true,
): FutureTransitionHandlerResult {
  const match = /^(.+):state:(US-[A-Z]{2})$/.exec(due.stableKey);
  const measure = match
    ? (world.history.constitutionalMeasures ?? []).find(
        (candidate) => candidate.stableKey === match[1],
      )
    : undefined;
  const done = (
    result: World,
    context: string,
  ): FutureTransitionHandlerResult => ({
    world: result,
    status: "resolved",
    reasonKey: null,
    context,
    outcomeEventId: null,
  });
  if (!match || !measure || !accepts(world, measure.id))
    return done(world, "No amendment matches this state action.");
  if (constitutionalPosition(world, measure.id).phase !== "ratification")
    return done(world, "The amendment is no longer before the states.");

  const stateKey = match[2]!;
  const next = decide(world, measure.id, stateKey);
  if (!next)
    return done(
      world,
      "The state action remains pending: its actual chambers, quorum or sourced ratification admission are unavailable.",
    );
  const after = constitutionalPosition(next, measure.id);
  const approved = after.ratifiedStates.includes(stateKey);
  return done(
    next,
    after.phase === "operative" || after.phase === "ratified"
      ? `${stateKey.slice(3)} ratified ${measure.designation}, the ${after.ratifiedStates.length}th state; it is now part of the Constitution.`
      : approved
        ? `${stateKey.slice(3)} ratified ${measure.designation}.`
        : `${stateKey.slice(3)} declined to ratify ${measure.designation}.`,
  );
}
