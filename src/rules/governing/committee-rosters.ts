// Lifted unchanged from src/simulation/governing/committee-assignment.ts; RULES-3, 2026-10-11.
import type {
  SeatedBody,
  SeatedMember,
} from "../../simulation/legislation-scenarios";

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
  // Retained caller argument identifies the institution, never a random order.
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
    // Wrapping can revisit a member the same committee already seated when
    // the committee is nearly as large as the chamber; take the next one.
    let guard = 0;
    while (roster.length < seats && guard < order.length * 2) {
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

export function seatingOrder(body: SeatedBody): readonly SeatedMember[] {
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
