import type { LegislativeVoteDisposition } from "../../simulation/types";
import type { QuorumAttendanceDecision } from "../../simulation/governing/chamber-votes";
export function applyQuorumAttendanceToBallots(
  ballots: readonly LegislativeVoteDisposition[],
  attendance: readonly QuorumAttendanceDecision[],
): readonly LegislativeVoteDisposition[] {
  const byMember = new Map(
    attendance.map((decision) => [decision.memberKey, decision]),
  );
  return ballots.map((ballot) => {
    const decision = byMember.get(ballot.memberKey);
    return decision?.attendance === "walk-out"
      ? { ...ballot, disposition: "absent", reason: decision.reason }
      : ballot;
  });
}
