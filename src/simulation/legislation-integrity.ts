import { makeIsoDate } from "./dates";
import {
  chamberByKey,
  committeeByKey,
  floorStageByKey,
  requireKnown,
  resolveRequiredVotes,
  type VoteDenominator,
} from "./legislature-rules";
import { rulePackById } from "./legislature-rule-packs";
import {
  measureActions,
  measurePosition,
  replayMeasure,
  tallyDispositions,
} from "./legislation";
import type { EntityId, LegislativeVoteRecord, World } from "./types";

/**
 * Integrity rules for the legislative record families.
 *
 * These checks reconstruct each vote's arithmetic from its own dispositions and
 * re-derive every measure's position, so a snapshot cannot claim an outcome its
 * recorded members did not produce.
 */

const RECORD_KINDS = {
  measure: "legislative-measure",
  action: "legislative-action",
  referral: "legislative-referral",
  committeeAction: "legislative-committee-action",
  amendment: "legislative-amendment",
  vote: "legislative-vote",
  disposition: "executive-disposition",
  enactment: "legislative-enactment",
} as const;

function assertIdentity(
  ids: Set<EntityId>,
  record: { readonly id: EntityId; readonly sequence: number },
  kind: string,
): void {
  if (ids.has(record.id)) {
    throw new Error(`Duplicate history record identity: ${record.id}`);
  }
  ids.add(record.id);
  if (!record.id.startsWith(`${kind}_`)) {
    throw new Error(
      `Record ID does not match entity kind ${kind}: ${record.id}`,
    );
  }
  if (!Number.isSafeInteger(record.sequence) || record.sequence < 0) {
    throw new Error(
      `Record sequence must be a non-negative safe integer: ${record.id}`,
    );
  }
}

function denominatorValueFor(
  vote: LegislativeVoteRecord,
  context: {
    readonly committeeMembers: number | null;
    readonly jointSeats: number | null;
  },
): number {
  const tally = vote.tally;
  switch (vote.denominatorKind as VoteDenominator) {
    case "members-elected":
      return vote.eligibleMembers;
    case "members-present":
      if (vote.presentMembers === null) {
        throw new Error(
          `Vote ${vote.id} counts against presence but records none.`,
        );
      }
      return vote.presentMembers;
    case "members-voting":
      return tally.yea + tally.nay;
    case "committee-members-appointed":
      if (context.committeeMembers === null) {
        throw new Error(
          `Vote ${vote.id} counts against committee membership outside a committee.`,
        );
      }
      return context.committeeMembers;
    case "joint-total-membership":
      if (context.jointSeats === null) {
        throw new Error(
          `Vote ${vote.id} counts against a joint sitting outside one.`,
        );
      }
      return context.jointSeats;
    default:
      throw new Error(`Vote ${vote.id} has an unknown denominator.`);
  }
}

export function assertLegislationIntegrity(
  world: World,
  ids: Set<EntityId>,
): void {
  const measures = world.history.legislativeMeasures ?? [];
  const actions = world.history.legislativeActions ?? [];
  const referrals = world.history.committeeReferrals ?? [];
  const committeeActions = world.history.committeeActions ?? [];
  const amendments = world.history.legislativeAmendments ?? [];
  const votes = world.history.legislativeVotes ?? [];
  const dispositions = world.history.executiveDispositions ?? [];
  const enactments = world.history.legislativeEnactments ?? [];

  const measureById = new Map<EntityId, (typeof measures)[number]>();
  for (const measure of measures) {
    assertIdentity(ids, measure, RECORD_KINDS.measure);
    measureById.set(measure.id, measure);

    if (!world.jurisdictions[measure.jurisdictionId]) {
      throw new Error(
        `Legislative measure references a missing jurisdiction: ${measure.id}`,
      );
    }
    const pack = rulePackById(measure.rulePackId);
    chamberByKey(pack, measure.originChamberKey);
    makeIsoDate(measure.introducedAt);
    if (measure.designation.trim().length === 0) {
      throw new Error(`Legislative measure has no designation: ${measure.id}`);
    }
    if (measure.sponsorPersonId && !world.people[measure.sponsorPersonId]) {
      throw new Error(
        `Legislative measure references a missing sponsor: ${measure.id}`,
      );
    }
    for (const alternativeId of measure.policyAlternativeIds) {
      if (
        !world.history.policyAlternatives.some(
          (record) => record.id === alternativeId,
        )
      ) {
        throw new Error(
          `Legislative measure references a missing policy alternative: ${alternativeId}`,
        );
      }
    }
  }

  const voteById = new Map<EntityId, LegislativeVoteRecord>();
  for (const vote of votes) {
    assertIdentity(ids, vote, RECORD_KINDS.vote);
    voteById.set(vote.id, vote);

    const measure = measureById.get(vote.measureId);
    if (!measure) {
      throw new Error(
        `Legislative vote references a missing measure: ${vote.id}`,
      );
    }
    const pack = rulePackById(measure.rulePackId);
    makeIsoDate(vote.takenAt);

    if (vote.dispositions.length === 0) {
      throw new Error(`Legislative vote records no members: ${vote.id}`);
    }
    const seen = new Set<string>();
    for (const entry of vote.dispositions) {
      if (seen.has(entry.memberKey)) {
        throw new Error(
          `Legislative vote records a member twice: ${vote.id} / ${entry.memberKey}`,
        );
      }
      seen.add(entry.memberKey);
      if (entry.personId && !world.people[entry.personId]) {
        throw new Error(
          `Legislative vote references a missing person: ${entry.personId}`,
        );
      }
    }
    if (vote.dispositions.length > vote.eligibleMembers) {
      throw new Error(
        `Legislative vote records more members than are eligible: ${vote.id}`,
      );
    }

    const recomputed = tallyDispositions(vote.dispositions);
    if (
      recomputed.yea !== vote.tally.yea ||
      recomputed.nay !== vote.tally.nay ||
      recomputed.presentNotVoting !== vote.tally.presentNotVoting ||
      recomputed.absent !== vote.tally.absent ||
      recomputed.excused !== vote.tally.excused
    ) {
      throw new Error(
        `Legislative vote tally does not match its member dispositions: ${vote.id}`,
      );
    }
    if (vote.presentMembers !== null) {
      const acted =
        recomputed.yea + recomputed.nay + recomputed.presentNotVoting;
      if (vote.presentMembers < acted) {
        throw new Error(
          `Legislative vote presence is smaller than the members who acted: ${vote.id}`,
        );
      }
      if (vote.presentMembers > vote.eligibleMembers) {
        throw new Error(
          `Legislative vote presence exceeds eligibility: ${vote.id}`,
        );
      }
    }

    let committeeMembers: number | null = null;
    let jointSeats: number | null = null;
    let threshold;
    if (vote.forum.kind === "committee") {
      const chamber = chamberByKey(pack, vote.forum.chamberKey);
      const committee = committeeByKey(chamber, vote.forum.committeeKey);
      committeeMembers = committee.appointedMembers;
      threshold = committee.reportThreshold;
    } else if (vote.forum.kind === "joint-session") {
      const override = pack.executive.override;
      if (override.kind !== "joint-session") {
        throw new Error(
          `Vote ${vote.id} sits jointly, but ${pack.displayName} does not.`,
        );
      }
      jointSeats = override.combinedSeats;
      threshold =
        measure.subjectClass === "general-policy"
          ? override.threshold
          : requireKnown(
              override.appropriationsThreshold,
              `the override threshold for a ${measure.subjectClass} measure in ${pack.displayName}`,
            );
    } else {
      const chamber = chamberByKey(pack, vote.forum.chamberKey);
      if (vote.eligibleMembers > chamber.seats) {
        throw new Error(
          `Vote ${vote.id} counts more members than the ${chamber.name} has seats.`,
        );
      }
      if (vote.purpose === "veto-override") {
        const override = pack.executive.override;
        if (override.kind !== "each-chamber") {
          throw new Error(
            `Vote ${vote.id} overrides per chamber, but ${pack.displayName} sits jointly.`,
          );
        }
        threshold = override.threshold;
      } else if (vote.purpose === "concurrence") {
        if (pack.interChamber.kind !== "second-chamber") {
          throw new Error(
            `Vote ${vote.id} concurs, but ${pack.displayName} has one chamber.`,
          );
        }
        threshold = pack.interChamber.concurrenceThreshold;
      } else {
        const stage = floorStageByKey(chamber, vote.floorStageKey ?? "");
        if (stage.vote.kind !== "known") {
          throw new Error(
            `Vote ${vote.id} was taken at a stage with no resolved threshold.`,
          );
        }
        threshold = stage.vote.value;
      }
    }

    if (threshold.label !== vote.thresholdLabel) {
      throw new Error(
        `Vote ${vote.id} records a threshold its rule pack does not impose.`,
      );
    }
    const denominatorValue = denominatorValueFor(vote, {
      committeeMembers,
      jointSeats,
    });
    if (denominatorValue !== vote.denominatorValue) {
      throw new Error(
        `Vote ${vote.id} denominator does not match its rule and record.`,
      );
    }
    const resolution = resolveRequiredVotes(threshold, denominatorValue);
    if (resolution.requiredVotes !== vote.requiredVotes) {
      throw new Error(
        `Vote ${vote.id} required-vote count does not follow from its threshold.`,
      );
    }
    const expected = vote.tally.yea >= vote.requiredVotes ? "passed" : "failed";
    if (expected !== vote.outcome) {
      throw new Error(
        `Vote ${vote.id} outcome does not follow from its tally and threshold.`,
      );
    }
  }

  const referralById = new Map<EntityId, (typeof referrals)[number]>();
  for (const referral of referrals) {
    assertIdentity(ids, referral, RECORD_KINDS.referral);
    referralById.set(referral.id, referral);
    const measure = measureById.get(referral.measureId);
    if (!measure) {
      throw new Error(
        `Committee referral references a missing measure: ${referral.id}`,
      );
    }
    const pack = rulePackById(measure.rulePackId);
    const chamber = chamberByKey(pack, referral.chamberKey);
    committeeByKey(chamber, referral.committeeKey);
    makeIsoDate(referral.referredAt);
    if (referral.sequence <= measure.sequence) {
      throw new Error(
        `Committee referral does not follow its measure: ${referral.id}`,
      );
    }
  }

  for (const action of committeeActions) {
    assertIdentity(ids, action, RECORD_KINDS.committeeAction);
    const measure = measureById.get(action.measureId);
    if (!measure) {
      throw new Error(
        `Committee action references a missing measure: ${action.id}`,
      );
    }
    const referral = referralById.get(action.referralId);
    if (!referral) {
      throw new Error(
        `Committee action references a missing referral: ${action.id}`,
      );
    }
    if (!voteById.has(action.voteId)) {
      throw new Error(
        `Committee action references a missing vote: ${action.id}`,
      );
    }
    if (action.sequence <= referral.sequence) {
      throw new Error(
        `Committee action does not follow its referral: ${action.id}`,
      );
    }
    makeIsoDate(action.actedAt);
  }

  for (const amendment of amendments) {
    assertIdentity(ids, amendment, RECORD_KINDS.amendment);
    const measure = measureById.get(amendment.measureId);
    if (!measure) {
      throw new Error(
        `Amendment references a missing measure: ${amendment.id}`,
      );
    }
    const pack = rulePackById(measure.rulePackId);
    const chamber = chamberByKey(pack, amendment.chamberKey);
    if (amendment.floorStageKey) {
      floorStageByKey(chamber, amendment.floorStageKey);
    }
    const vote = voteById.get(amendment.voteId);
    if (!vote) {
      throw new Error(`Amendment references a missing vote: ${amendment.id}`);
    }
    const expected = vote.outcome === "passed" ? "adopted" : "rejected";
    if (expected !== amendment.status) {
      throw new Error(
        `Amendment status does not match its recorded vote: ${amendment.id}`,
      );
    }
    makeIsoDate(amendment.offeredAt);
  }

  for (const disposition of dispositions) {
    assertIdentity(ids, disposition, RECORD_KINDS.disposition);
    const measure = measureById.get(disposition.measureId);
    if (!measure) {
      throw new Error(
        `Executive disposition references a missing measure: ${disposition.id}`,
      );
    }
    makeIsoDate(disposition.actedAt);
    if (disposition.sequence <= measure.sequence) {
      throw new Error(
        `Executive disposition does not follow its measure: ${disposition.id}`,
      );
    }
    // One act, one date. The disposition, the action it produced and the
    // presentment it answers must agree about when the executive acted.
    const measureHistory = measureActions(world, measure.id);
    const paired = measureHistory.find(
      (action) => action.kind === disposition.action,
    );
    if (!paired) {
      throw new Error(
        `Executive disposition has no matching '${disposition.action}' action: ${disposition.id}`,
      );
    }
    if (paired.occurredAt !== disposition.actedAt) {
      throw new Error(
        `Executive disposition is dated ${disposition.actedAt} but its action happened on ${paired.occurredAt}: ${disposition.id}`,
      );
    }
    const pairedEvent = world.history.events.find(
      (event) => event.id === paired.eventId,
    );
    if (pairedEvent && pairedEvent.occurredAt !== disposition.actedAt) {
      throw new Error(
        `Executive disposition and its recorded event disagree about the date: ${disposition.id}`,
      );
    }
    const presentment = measureHistory.find(
      (action) => action.kind === "presented-to-executive",
    );
    if (!presentment) {
      throw new Error(
        `Executive disposition precedes any presentment: ${disposition.id}`,
      );
    }
    if (disposition.actedAt < presentment.occurredAt) {
      throw new Error(
        `The executive cannot act on ${disposition.actedAt}, before the bill reached the desk on ${presentment.occurredAt}: ${disposition.id}`,
      );
    }
  }

  const actionsByMeasure = new Map<EntityId, number>();
  for (const action of actions) {
    assertIdentity(ids, action, RECORD_KINDS.action);
    const measure = measureById.get(action.measureId);
    if (!measure) {
      throw new Error(
        `Legislative action references a missing measure: ${action.id}`,
      );
    }
    if (action.sequence <= measure.sequence) {
      throw new Error(
        `Legislative action does not follow its measure: ${action.id}`,
      );
    }
    if (!world.history.events.some((event) => event.id === action.eventId)) {
      throw new Error(
        `Legislative action references a missing event: ${action.id}`,
      );
    }
    if (action.voteId && !voteById.has(action.voteId)) {
      throw new Error(
        `Legislative action references a missing vote: ${action.id}`,
      );
    }
    const pack = rulePackById(measure.rulePackId);
    if (action.chamberKey) chamberByKey(pack, action.chamberKey);
    makeIsoDate(action.occurredAt);
    actionsByMeasure.set(
      action.measureId,
      (actionsByMeasure.get(action.measureId) ?? 0) + 1,
    );
  }

  for (const enactment of enactments) {
    assertIdentity(ids, enactment, RECORD_KINDS.enactment);
    const measure = measureById.get(enactment.measureId);
    if (!measure) {
      throw new Error(
        `Enactment references a missing measure: ${enactment.id}`,
      );
    }
    if (
      !world.history.events.some(
        (event) => event.id === enactment.outcomeEventId,
      )
    ) {
      throw new Error(
        `Enactment references a missing outcome event: ${enactment.id}`,
      );
    }
    makeIsoDate(enactment.resolvedAt);
    if (enactment.effectiveAt !== null) {
      makeIsoDate(enactment.effectiveAt);
    }
  }

  // A measure resolves once. Two enactment records, or an enactment record
  // that disagrees with the history it sits on, are contradictory truth rather
  // than two facts.
  const enactmentsByMeasure = new Map<EntityId, number>();
  for (const enactment of enactments) {
    const count = (enactmentsByMeasure.get(enactment.measureId) ?? 0) + 1;
    if (count > 1) {
      throw new Error(
        `A measure cannot be resolved twice: ${enactment.measureId}`,
      );
    }
    enactmentsByMeasure.set(enactment.measureId, count);
    const derived = measurePosition(world, enactment.measureId).outcome;
    if (derived !== enactment.outcome) {
      throw new Error(
        `Enactment records '${enactment.outcome}' but the measure's own history says '${derived ?? "unresolved"}': ${enactment.id}`,
      );
    }
  }

  // Every measure's history must be a legal sequence against its own rule
  // pack: each action legal from the state immediately before it, nothing at
  // all after a terminal action, and no reference to a chamber, committee or
  // stage the measure was not actually in.
  for (const measure of measures) {
    const replay = replayMeasure(world, measure.id);
    if (replay.violations.length > 0) {
      throw new Error(replay.violations[0]!);
    }
  }
}
