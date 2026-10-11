import type {
  EntityId,
  LegislativeVoteDisposition,
  LegislativeVoteTally,
} from "../../simulation/types";
import type { MunicipalReading } from "../../simulation/municipal-government";
import type { MunicipalManagerElection } from "../../simulation/municipal-public-work";
import type {
  RuleSourceRef,
  VoteThresholdRule,
} from "../../simulation/legislature-rules";
import { resolveRequiredVotes } from "./votes";
import { municipalVoteThresholdRule } from "./municipal-thresholds";
export interface CouncilVoteFacts {
  readonly reading: MunicipalReading | null;
  readonly councilors: readonly { readonly personId: EntityId }[];
  readonly quorumSource: RuleSourceRef;
  readonly appointmentSource: RuleSourceRef;
  readonly managerElectionThreshold: VoteThresholdRule | null;
}
export function tallyDispositions(
  dispositions: readonly LegislativeVoteDisposition[],
): LegislativeVoteTally {
  const tally = {
    yea: 0,
    nay: 0,
    presentNotVoting: 0,
    absent: 0,
    excused: 0,
  };
  for (const entry of dispositions) {
    switch (entry.disposition) {
      case "yea":
        tally.yea += 1;
        break;
      case "nay":
        tally.nay += 1;
        break;
      case "present-not-voting":
        tally.presentNotVoting += 1;
        break;
      case "absent":
        tally.absent += 1;
        break;
      case "excused":
        tally.excused += 1;
        break;
    }
  }
  return tally;
}
function presentDisposition(
  disposition: LegislativeVoteDisposition["disposition"],
): boolean {
  return (
    disposition === "yea" ||
    disposition === "nay" ||
    disposition === "present-not-voting"
  );
}

export function evaluateMunicipalManagerElection(
  facts: CouncilVoteFacts,
  input: {
    readonly governmentKey: string;
    readonly dispositions: readonly LegislativeVoteDisposition[];
  },
): MunicipalManagerElection {
  const government = facts.reading;
  if (!government) {
    return { ok: false, reason: "No municipal government is compiled." };
  }
  const reading = government;
  const councilors = facts.councilors;
  if (councilors.length === 0) {
    return {
      ok: false,
      reason: `${reading.bodyName ?? reading.displayName} has no seated members to elect a manager.`,
    };
  }
  if (input.dispositions.length === 0) {
    return {
      ok: false,
      reason: `${reading.bodyName ?? reading.displayName} has not recorded a collective decision to elect its manager. One member's standing is not that election.`,
    };
  }
  const seatedByPerson = new Map(
    councilors.map((seat) => [seat.personId, seat]),
  );
  const seen = new Set<string>();
  const seenPeople = new Set<EntityId>();
  for (const entry of input.dispositions) {
    if (entry.memberKey.trim().length === 0) {
      return { ok: false, reason: "Every recorded vote needs a member key." };
    }
    if (seen.has(entry.memberKey)) {
      return {
        ok: false,
        reason: `A member voted twice on this election: ${entry.memberKey}`,
      };
    }
    seen.add(entry.memberKey);
    if (entry.personId && seenPeople.has(entry.personId)) {
      return {
        ok: false,
        reason:
          "The same council member cannot supply more than one disposition.",
      };
    }
    if (entry.personId) seenPeople.add(entry.personId);
    if (!entry.personId || !seatedByPerson.has(entry.personId)) {
      return {
        ok: false,
        reason: `This recorded decision is not a vote of ${reading.bodyName ?? reading.displayName}.`,
      };
    }
  }
  const quorumThreshold = reading.procedure.quorumRule;
  if (!quorumThreshold) {
    return {
      ok: false,
      reason: `${reading.displayName} cannot prove a lawful election: no instrument read states this body's quorum.`,
    };
  }
  const quorumRule = municipalVoteThresholdRule(
    quorumThreshold,
    reading.procedure.quorumText ?? "Quorum.",
    facts.quorumSource,
  );
  const tally = tallyDispositions(input.dispositions);
  const presentMembers = input.dispositions.filter((entry) =>
    presentDisposition(entry.disposition),
  ).length;
  const eligibleMembers = councilors.length;
  const quorumDenominator =
    quorumRule.countedAgainst === "members-present"
      ? presentMembers
      : quorumRule.countedAgainst === "members-voting"
        ? tally.yea + tally.nay
        : eligibleMembers;
  const quorum = resolveRequiredVotes(quorumRule, quorumDenominator);
  if (presentMembers < quorum.requiredVotes) {
    return {
      ok: false,
      reason: `${reading.bodyName ?? reading.displayName} cannot transact this election: ${reading.procedure.quorumText ?? "the instrument names a quorum"} (${presentMembers} present, ${quorum.requiredVotes} required).`,
    };
  }
  const appointment = reading.powers.find(
    (power) =>
      power.power === "APPOINTMENT" &&
      (power.heldByRole === "COUNCIL" || power.heldByRole === "COMMISSION"),
  );
  const title = reading.manager?.title ?? "professional manager";
  const electionRule = appointment?.threshold
    ? municipalVoteThresholdRule(
        appointment.threshold,
        appointment.conditions.join(" ") || `Election of the ${title}.`,
        facts.appointmentSource,
      )
    : facts.managerElectionThreshold;
  if (!electionRule) {
    return {
      ok: false,
      reason:
        "The manager-election voting threshold has not been established for this government.",
    };
  }
  if (tally.yea + tally.nay === 0) {
    return {
      ok: false,
      reason: `${reading.bodyName ?? reading.displayName} recorded no yeas or nays on the election of its ${title}.`,
    };
  }
  const election = resolveRequiredVotes(
    electionRule,
    electionRule.countedAgainst === "members-present"
      ? presentMembers
      : electionRule.countedAgainst === "members-elected"
        ? eligibleMembers
        : tally.yea + tally.nay,
  );
  if (tally.yea < election.requiredVotes) {
    return {
      ok: false,
      reason: `${reading.bodyName ?? reading.displayName} did not elect its ${title} (${tally.yea}-${tally.nay}; ${election.requiredVotes} required under ${electionRule.label}).`,
    };
  }
  return {
    ok: true,
    tally,
    presentMembers,
    requiredQuorum: quorum.requiredVotes,
    requiredYeas: election.requiredVotes,
    dispositions: input.dispositions,
  };
}
export function checkCouncilVote(
  facts: CouncilVoteFacts,
  governmentKey: string,
  dispositions: readonly LegislativeVoteDisposition[],
):
  | {
      readonly ok: true;
      readonly present: number;
      readonly seats: number;
    }
  | {
      readonly ok: false;
      readonly reason: string;
    } {
  const government = facts.reading!;
  const reading = government;
  const seats = facts.councilors;
  const seated = new Set(seats.map((seat) => seat.personId));
  const people = new Set<EntityId>();
  for (const entry of dispositions) {
    if (!entry.personId || !seated.has(entry.personId)) {
      return {
        ok: false,
        reason: `This recorded decision is not a vote of ${reading.bodyName ?? reading.displayName}.`,
      };
    }
    if (people.has(entry.personId)) {
      return {
        ok: false,
        reason: "A councilor cannot vote twice on one question.",
      };
    }
    people.add(entry.personId);
  }
  if (seats.length === 0) {
    return { ok: false, reason: "No councilors are seated to vote." };
  }
  const tally = tallyDispositions(dispositions);
  const present = tally.yea + tally.nay + tally.presentNotVoting;
  const quorum = reading.procedure.quorumRule;
  if (!quorum) {
    return {
      ok: false,
      reason: `${reading.displayName} cannot prove a lawful vote: no instrument read states the quorum.`,
    };
  }
  const quorumRule = municipalVoteThresholdRule(
    quorum,
    reading.procedure.quorumText ?? "Quorum.",
    facts.quorumSource,
  );
  const membership = Math.max(seats.length, reading.bodySize ?? 0);
  const required = resolveRequiredVotes(
    quorumRule,
    quorumRule.countedAgainst === "members-present"
      ? present
      : quorumRule.countedAgainst === "members-voting"
        ? tally.yea + tally.nay
        : membership,
  );
  if (present < required.requiredVotes) {
    return {
      ok: false,
      reason: `${reading.bodyName ?? reading.displayName} cannot transact business: ${reading.procedure.quorumText ?? "the instrument names a quorum"} (${present} present, ${required.requiredVotes} required).`,
    };
  }
  return { ok: true, present, seats: seats.length };
}

// stopgapId: "SG-P14-legislatures-council-denominators"
