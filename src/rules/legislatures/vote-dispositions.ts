import type { SeatedMember } from "../../simulation/legislation-scenarios";
import type {
  LegislativeVoteDisposition,
  LegislativeMemberDisposition,
} from "../../simulation/types";
// stopgapId: "legislatures.fractional-authored-vote-counts"
export function dispositionsFromCounts(
  members: readonly SeatedMember[],
  counts: {
    readonly yea: number;
    readonly nay?: number;
    readonly presentNotVoting?: number;
    readonly absent?: number;
    readonly excused?: number;
  },
): readonly LegislativeVoteDisposition[] {
  const plan: [LegislativeMemberDisposition, number][] = [
    ["yea", counts.yea],
    ["nay", counts.nay ?? 0],
    ["present-not-voting", counts.presentNotVoting ?? 0],
    ["absent", counts.absent ?? 0],
    ["excused", counts.excused ?? 0],
  ];
  const total = plan.reduce((sum, [, count]) => sum + count, 0);
  if (total > members.length) {
    throw new Error(
      `Authored vote assigns ${total} dispositions to a body of ${members.length}.`,
    );
  }
  const dispositions: LegislativeVoteDisposition[] = [];
  let cursor = 0;
  for (const [disposition, count] of plan) {
    for (let index = 0; index < count; index += 1) {
      const member = members[cursor]!;
      dispositions.push({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition,
      });
      cursor += 1;
    }
  }
  return dispositions;
}
