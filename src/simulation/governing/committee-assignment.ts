import type { SeatedBody, SeatedMember } from "../legislation-scenarios";

/**
 * Who sits on which committee. No acquired source establishes the roster of a
 * generated legislature's committees, so the assignment is an authored,
 * labeled gameplay profile. What it is NOT is the shortcut it replaces:
 * `body.members.slice(0, size)` put the same handful of members on every
 * committee and could never seat a member who was not near the front of the
 * list — including the player, who is appended to a body they join.
 *
 * The profile is a deterministic function of facts already recorded: the
 * seated body, the chamber's compiled committee list and their compiled
 * sizes. It stores nothing, so it cannot drift from a save, and it returns
 * the same roster every time it is asked.
 */
export const COMMITTEE_ASSIGNMENT_PROFILE =
  "governing-committee-assignment/v2-recorded-seating";

export interface AssignableCommittee {
  readonly committeeKey: string;
  readonly appointedMembers: number;
}

/**
 * Deals members to committees so that everybody serves before anybody serves
 * twice. Committees are taken in compiled order, each one drawing the next
 * `appointedMembers` from the recorded seniority order of the body and wrapping around
 * when it reaches the end. A committee larger than its own chamber seats the
 * whole chamber once rather than seating anybody twice.
 */
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

/** One committee's roster, or the empty roster for a committee not compiled. */
export function committeeRoster(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  committeeKey: string,
  seedKey: string,
): readonly SeatedMember[] {
  return committeeRosters(body, committees, seedKey).get(committeeKey) ?? [];
}

/** The committees one seated member sits on, in compiled order. */
export function committeesForMember(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  memberKey: string,
  seedKey: string,
): readonly string[] {
  const rosters = committeeRosters(body, committees, seedKey);
  return committees
    .filter((committee) =>
      (rosters.get(committee.committeeKey) ?? []).some(
        (member) => member.memberKey === memberKey,
      ),
    )
    .map((committee) => committee.committeeKey);
}

/** The committees a person sits on, where the body seats them at all. */
export function committeesForPerson(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  personId: string,
  seedKey: string,
): readonly string[] {
  const seat = body.members.find((member) => member.personId === personId);
  return seat
    ? committeesForMember(body, committees, seat.memberKey, seedKey)
    : [];
}

/**
 * Actual seating date establishes seniority; equal dates use stable identity.
 * An incomplete or ambiguous body cannot establish a committee appointment.
 * Never substitute generated employment dates or a seed for seating evidence.
 */
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
