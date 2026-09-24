import { SeededRng } from "../rng";
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
export const COMMITTEE_ASSIGNMENT_PROFILE = "governing-committee-assignment/v1";

export interface AssignableCommittee {
  readonly committeeKey: string;
  readonly appointedMembers: number;
}

/**
 * Deals members to committees so that everybody serves before anybody serves
 * twice. Committees are taken in compiled order, each one drawing the next
 * `appointedMembers` from a seeded ordering of the body and wrapping around
 * when it reaches the end. A committee larger than its own chamber seats the
 * whole chamber once rather than seating anybody twice.
 */
export function committeeRosters(
  body: SeatedBody,
  committees: readonly AssignableCommittee[],
  seedKey: string,
): ReadonlyMap<string, readonly SeatedMember[]> {
  const rosters = new Map<string, readonly SeatedMember[]>();
  const order = seatingOrder(body, seedKey);
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
 * A seeded ordering of the chamber. Seeding on the chamber and the body's own
 * membership means the roster is stable for a given legislature and changes
 * when its membership does, which is what a reseated chamber should do.
 */
function seatingOrder(
  body: SeatedBody,
  seedKey: string,
): readonly SeatedMember[] {
  const rng = new SeededRng(
    `${COMMITTEE_ASSIGNMENT_PROFILE}:${seedKey}:${body.chamberKey}:${body.members.length}`,
  );
  const pool = [...body.members];
  const order: SeatedMember[] = [];
  while (pool.length > 0)
    order.push(pool.splice(rng.integer(0, pool.length), 1)[0]!);
  return order;
}
