import type {
  ChamberRule,
  RuleValue,
} from "../../simulation/legislature-rules";
import type { FloorVoteInput } from "../../simulation/legislation";
import { measurePosition, type MeasureReplayFacts } from "./measure-replay";
import { chamberByKey, floorStageByKey } from "./pack-queries";
import { nextFloorStageKey } from "./procedure-steps";
import {
  buildLegislativeVoteRecord,
  type VoteRecordFacts,
} from "./vote-record";
import { resolveRequiredVotes } from "./votes";
import { addDays } from "../elections/calendar";
export interface FloorVoteFacts extends MeasureReplayFacts, VoteRecordFacts {}
export function requireKnown<T>(value: RuleValue<T>, label: string): T {
  if (value.kind === "known") return value.value;
  if (value.kind === "unknown") {
    throw new Error(`${label} is unknown in this legislature: ${value.note}`);
  }
  throw new Error(`${label} does not apply in this legislature: ${value.note}`);
}

export function requireFormalSeatCount(chamber: ChamberRule): number {
  return requireKnown(
    chamber.seats,
    `formal seat count for the ${chamber.name}`,
  );
}
function assertFloorPhase(facts: FloorVoteFacts) {
  const position = measurePosition(facts, facts.measure.id);
  if (position.phase !== "on-floor")
    throw new Error(
      `Cannot take a floor vote: the measure is currently ${position.phase}.`,
    );
  return position;
}
export function electedMembersFor(
  chamber: ChamberRule,
  electedMembers?: number,
): number {
  if (electedMembers === undefined) return requireFormalSeatCount(chamber);
  if (!Number.isSafeInteger(electedMembers) || electedMembers <= 0) {
    throw new Error(
      `The ${chamber.name} needs a positive count of elected officials.`,
    );
  }
  if (
    chamber.seats.kind === "known" &&
    electedMembers > chamber.seats.value + (chamber.seatsMayGrowBy ?? 0)
  ) {
    throw new Error(
      `The ${chamber.name} cannot have more members elected than its ${chamber.seats.value} formal seats.`,
    );
  }
  return electedMembers;
}

export function takeFloorVote(facts: FloorVoteFacts, input: FloorVoteInput) {
  const measure = facts.measure;
  const position = assertFloorPhase(facts);
  const pack = facts.pack;
  const chamber = chamberByKey(
    pack,
    position.chamberKey ?? measure.originChamberKey,
  );
  const stage = floorStageByKey(chamber, position.floorStageKey ?? "");
  const threshold = requireKnown(stage.vote, `${stage.label} vote threshold`);
  if (stage.minimumDaysFromIntroduction) {
    const days = requireKnown(
      stage.minimumDaysFromIntroduction,
      `${stage.label} introduction interval`,
    );
    const earliest = addDays(measure.introducedAt, days);
    if (facts.onDate < earliest)
      throw new Error(
        `${stage.label} cannot be taken until ${earliest}: the declared introduction interval is ${days} elapsed days.`,
      );
  }
  if (stage.readingIntervalDays) {
    const days = requireKnown(
      stage.readingIntervalDays,
      `${stage.label} reading interval`,
    );
    const last = facts.actions
      .filter((row) => row.measureId === measure.id)
      .slice()
      .sort((a, b) => a.sequence - b.sequence)
      .filter((action) => action.kind === "floor-stage-passed")
      .at(-1);
    if (last && facts.onDate < addDays(last.occurredAt, days))
      throw new Error(
        `${stage.label} cannot be taken until ${addDays(last.occurredAt, days)}: the declared reading interval is ${days} elapsed days.`,
      );
  }
  if (
    position.earliestNextFloorDate !== null &&
    facts.onDate < position.earliestNextFloorDate
  ) {
    throw new Error(
      `${stage.label} cannot be taken until ${position.earliestNextFloorDate}: the ${chamber.name} takes its stages on separate legislative days.`,
    );
  }
  const vote = buildLegislativeVoteRecord(facts, {
    stableKey: `${input.stableKey}:vote`,
    measureId: measure.id,
    forum: { kind: "chamber", chamberKey: chamber.chamberKey },
    purpose: "floor-stage",
    floorStageKey: stage.stageKey,
    threshold,
    eligibleMembers: electedMembersFor(chamber, input.electedMembers),
    presentMembers: input.presentMembers ?? null,
    dispositions: input.dispositions,
    provenance: input.provenance,
  });
  const quorum = requireKnown(chamber.quorum, `${chamber.name} quorum`);
  const tally = vote.tally;
  const present = tally.yea + tally.nay + tally.presentNotVoting;
  const elected = electedMembersFor(chamber, input.electedMembers);
  const membership =
    quorum.countedAgainst === "members-elected"
      ? elected
      : chamber.seats.kind === "known"
        ? chamber.seats.value
        : elected;
  const requiredQuorum = resolveRequiredVotes(
    quorum,
    quorum.countedAgainst === "members-present"
      ? present
      : quorum.countedAgainst === "members-voting"
        ? tally.yea + tally.nay
        : membership,
  );
  if (present < requiredQuorum.requiredVotes)
    return {
      measure,
      kind: "quorum-not-present",
      stableKey: `${input.stableKey}:quorum-not-present`,
      chamberKey: chamber.chamberKey,
      committeeKey: null,
      floorStageKey: stage.stageKey,
      actorLabel: chamber.name,
      rationale: `${quorum.label}: ${present} present, ${requiredQuorum.requiredVotes} required`,
      summary: `${chamber.name}: quorum-not-present on ${measure.designation}, ${present} present, ${requiredQuorum.requiredVotes} required`,
      eventType: "legislation.quorum-not-present",
      tags: ["legislation.procedure"],
      vote,
    };
  const passed = vote.outcome === "passed";
  const onward = nextFloorStageKey(chamber, stage.stageKey);
  const summary = passed
    ? onward
      ? `${measure.designation} advanced past ${stage.label} in the ${chamber.name} (${vote.tally.yea}-${vote.tally.nay}).`
      : `The ${chamber.name} passed ${measure.designation} (${vote.tally.yea}-${vote.tally.nay}).`
    : `${measure.designation} failed at ${stage.label} in the ${chamber.name} (${vote.tally.yea}-${vote.tally.nay}); it needed ${vote.requiredVotes}.`;
  return {
    measure,
    kind: passed ? "floor-stage-passed" : "floor-stage-failed",
    stableKey: `${input.stableKey}:${passed ? "passed" : "failed"}`,
    chamberKey: chamber.chamberKey,
    committeeKey: null,
    floorStageKey: stage.stageKey,
    actorLabel: chamber.name,
    rationale:
      input.rationale ??
      `${stage.label} required ${vote.requiredVotes} of ${vote.denominatorValue} (${threshold.label}).`,
    summary,
    eventType: passed
      ? "legislation.floor-stage-passed"
      : "legislation.floor-stage-failed",
    tags: [
      passed ? "legislation.passed-stage" : "legislation.failed",
      `chamber:${chamber.chamberKey}`,
      `stage:${stage.stageKey}`,
    ],
    vote,
  };
}
