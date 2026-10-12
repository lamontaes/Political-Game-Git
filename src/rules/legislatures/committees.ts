import type {
  SeatedBody,
  SeatedMember,
} from "../../simulation/legislation-scenarios";
import { PROCEDURE_PARAMETERS } from "./parameters";
// stopgapId: "SG-P14-legislatures-committee-assignment"
export interface AssignableCommittee {
  readonly committeeKey: string;
  readonly appointedMembers: number;
}

export function committeeRosters(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  seedKey: string,
): ReadonlyMap<string, readonly SeatedMember[]> {
  const rosters = new Map<string, readonly SeatedMember[]>();
  void seedKey;
  const order = seatingOrder(body);
  if (order.length === 0) {
    for (const committee of committees) rosters.set(committee.committeeKey, []);
    return rosters;
  }
  let cursor = 0;
  for (const committee of committees) {
    const seats = Math.min(committee.appointedMembers, order.length);
    const roster: SeatedMember[] = [];
    let guard = 0;
    while (
      roster.length < seats &&
      guard < order.length * PROCEDURE_PARAMETERS.committeeWrapGuard.value
    ) {
      const member = order[cursor % order.length]!;
      cursor += 1;
      guard += 1;
      if (!roster.some((seated) => seated.memberKey === member.memberKey))
        roster.push(member);
    }
    rosters.set(committee.committeeKey, roster);
  }
  return rosters;
}

function seatingOrder(body: SeatedBody): readonly SeatedMember[] {
  const identities = new Set<string>();
  const people = new Set<string>();
  for (const member of body.members) {
    if (
      !member.personId ||
      !member.seatingEventId ||
      !member.tenureStartedAt ||
      identities.has(member.memberKey) ||
      people.has(member.personId)
    )
      return [];
    identities.add(member.memberKey);
    people.add(member.personId);
  }
  return [...body.members].sort(
    (left, right) =>
      left.tenureStartedAt!.localeCompare(right.tenureStartedAt!) ||
      (left.memberKey < right.memberKey
        ? -1
        : left.memberKey > right.memberKey
          ? 1
          : 0),
  );
}
