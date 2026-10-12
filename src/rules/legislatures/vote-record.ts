import type {
  EntityId,
  IsoDate,
  LegislativeVotePurpose,
  LegislativeVoteRecord,
  LegislativeVoteTally,
} from "../../simulation/types";
import type { VoteDenominator } from "../../simulation/legislature-rules";
import type { RecordVoteInput } from "../../simulation/legislation";
import { tallyDispositions } from "./council-vote";
import { resolveRequiredVotes } from "./votes";
export interface VoteRecordFacts {
  readonly personIds: ReadonlySet<EntityId>;
  readonly onDate: IsoDate;
  readonly nextSequence: number;
  readonly recordId: EntityId;
}
function denominatorValueFor(
  denominator: VoteDenominator,
  context: {
    readonly eligibleMembers: number;
    readonly presentMembers: number | null;
    readonly tally: LegislativeVoteTally;
    readonly committeeMembers: number | null;
    readonly jointSeats: number | null;
    readonly label: string;
  },
): number {
  switch (denominator) {
    case "members-elected":
      return context.eligibleMembers;
    case "members-present":
      if (context.presentMembers === null) {
        throw new Error(
          `${context.label} counts against members present, but this vote does not record presence.`,
        );
      }
      return context.presentMembers;
    case "members-voting":
      return context.tally.yea + context.tally.nay;
    case "committee-members-appointed":
      if (context.committeeMembers === null) {
        throw new Error(
          `${context.label} counts against committee membership outside a committee.`,
        );
      }
      return context.committeeMembers;
    case "joint-total-membership":
      if (context.jointSeats === null) {
        throw new Error(
          `${context.label} counts against a joint sitting outside one.`,
        );
      }
      return context.jointSeats;
  }
}

export function buildLegislativeVoteRecord<
  Purpose extends
    | LegislativeVotePurpose
    | "constitutional-proposal"
    | "constitutional-ratification",
>(
  facts: VoteRecordFacts,
  input: RecordVoteInput<Purpose>,
): Omit<LegislativeVoteRecord, "purpose"> & {
  readonly purpose: Purpose;
} {
  if (input.dispositions.length === 0) {
    throw new Error("A legislative vote must record member dispositions.");
  }
  const seen = new Set<string>();
  for (const entry of input.dispositions) {
    if (entry.memberKey.trim().length === 0) {
      throw new Error("Every vote disposition needs a member key.");
    }
    if (seen.has(entry.memberKey)) {
      throw new Error(`Member voted twice on one question: ${entry.memberKey}`);
    }
    seen.add(entry.memberKey);
    if (entry.personId && !facts.personIds.has(entry.personId)) {
      throw new Error(
        `Vote disposition references a missing person: ${entry.personId}`,
      );
    }
  }
  if (
    !Number.isSafeInteger(input.eligibleMembers) ||
    input.eligibleMembers <= 0
  ) {
    throw new Error("A legislative vote needs a positive eligible membership.");
  }
  if (input.dispositions.length > input.eligibleMembers) {
    throw new Error(
      "A legislative vote recorded more members than are eligible to vote.",
    );
  }
  const tally = tallyDispositions(input.dispositions);
  const presentMembers = input.presentMembers ?? null;
  if (presentMembers !== null) {
    const actuallyPresent = tally.yea + tally.nay + tally.presentNotVoting;
    if (presentMembers < actuallyPresent) {
      throw new Error(
        "Recorded presence is smaller than the number of members who acted.",
      );
    }
    if (presentMembers > input.eligibleMembers) {
      throw new Error("More members were present than are eligible to vote.");
    }
  }
  const resolution = resolveRequiredVotes(
    input.threshold,
    denominatorValueFor(input.threshold.countedAgainst, {
      eligibleMembers: input.eligibleMembers,
      presentMembers,
      tally,
      committeeMembers: input.committeeMembers ?? null,
      jointSeats: input.jointSeats ?? null,
      label: `Threshold '${input.threshold.label}'`,
    }),
  );
  return {
    id: facts.recordId,
    stableKey: input.stableKey,
    sequence: facts.nextSequence,
    measureId: input.measureId,
    forum: input.forum,
    purpose: input.purpose,
    floorStageKey: input.floorStageKey ?? null,
    takenAt: input.takenAt ?? facts.onDate,
    eligibleMembers: input.eligibleMembers,
    presentMembers,
    dispositions: input.dispositions.map((entry) => ({ ...entry })),
    tally,
    thresholdLabel: input.threshold.label,
    denominatorKind: input.threshold.countedAgainst,
    denominatorValue: resolution.denominatorValue,
    requiredVotes: resolution.requiredVotes,
    outcome: tally.yea >= resolution.requiredVotes ? "passed" : "failed",
    provenance: {
      method: input.provenance.method,
      note: input.provenance.note,
      sourceEntityIds: [...input.provenance.sourceEntityIds],
    },
  };
}

// stopgapId: "SG-P14-legislatures-vote-person-duplicates"
