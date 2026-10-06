import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { deserializeWorld, serializeWorld } from "../serialization";
import {
  committeeSeatAssignments,
  committeeSeatAssignmentsForChamber,
  memberCommitteeRequests,
  recordCommitteeSeatAssignment,
  recordMemberCommitteeRequest,
} from "./committee-assignment-records";

describe("durable committee assignment records", () => {
  it("records requests and seat decisions append-only with stable, queryable reasons", () => {
    const fixture = smallWorld({ place: "OH", people: 3 });
    const { world, jurisdictionId } = fixture;
    const [memberPersonId, assignerPersonId] = world.personOrder;
    if (!memberPersonId || !assignerPersonId)
      throw new Error("fixture needs two people");
    const request = {
      stableKey: "test:committee-request:house:round-1:member-1",
      jurisdictionId,
      chamberKey: "house",
      assignmentRoundKey: "2026-organizing",
      memberKey: "member-1",
      memberPersonId,
      assignerPersonId,
      preferences: ["judiciary", "education", "energy"],
      reason: "My district needs work on energy and schools.",
    } as const;
    const requested = recordMemberCommitteeRequest(world, request);
    expect(recordMemberCommitteeRequest(requested, request)).toBe(requested);
    expect(
      memberCommitteeRequests(requested, { chamberKey: "house" }),
    ).toMatchObject([
      {
        memberKey: "member-1",
        preferences: request.preferences,
        reason: request.reason,
      },
    ]);

    const assignment = {
      jurisdictionId,
      chamberKey: "house",
      assignmentRoundKey: "2026-organizing",
      committeeKey: "judiciary",
      memberKey: "member-1",
      memberPersonId,
      assignerPersonId,
      seatNumber: 1,
      reasons: [
        "Senior member",
        "District requested judicial access",
        "Party ratio preserved",
      ],
    } as const;
    const seated = recordCommitteeSeatAssignment(requested, assignment);
    const roster = committeeSeatAssignmentsForChamber(seated, {
      jurisdictionId,
      chamberKey: "house",
      assignmentRoundKey: "2026-organizing",
    });
    expect(roster).toMatchObject([
      {
        committeeKey: "judiciary",
        memberKey: "member-1",
        seatNumber: 1,
        reasons: assignment.reasons,
      },
    ]);
    expect(
      committeeSeatAssignments(seated, { committeeKey: "energy" }),
    ).toEqual([]);
    expect(recordCommitteeSeatAssignment(seated, assignment)).toBe(seated);
    expect(() =>
      recordCommitteeSeatAssignment(seated, {
        ...assignment,
        memberKey: "member-2",
        memberPersonId: assignerPersonId,
      }),
    ).toThrow(/already has a recorded member/);

    const loaded = deserializeWorld(serializeWorld(seated));
    expect(
      committeeSeatAssignmentsForChamber(loaded, {
        jurisdictionId,
        chamberKey: "house",
        assignmentRoundKey: "2026-organizing",
      }),
    ).toEqual(roster);
    expect(loaded.history.events.length).toBe(world.history.events.length + 2);
  });

  it("keeps distinct seat records in seat order and prevents duplicate membership", () => {
    const fixture = smallWorld({ place: "OH", people: 3 });
    const { world, jurisdictionId } = fixture;
    const [first, second, assigner] = world.personOrder;
    if (!first || !second || !assigner)
      throw new Error("fixture needs three people");
    const base = {
      jurisdictionId,
      chamberKey: "house",
      assignmentRoundKey: "round-a",
      committeeKey: "ways-and-means",
      assignerPersonId: assigner,
      reasons: ["Fit"],
    } as const;
    const one = recordCommitteeSeatAssignment(world, {
      ...base,
      memberKey: "m1",
      memberPersonId: first,
      seatNumber: 2,
    });
    const two = recordCommitteeSeatAssignment(one, {
      ...base,
      memberKey: "m2",
      memberPersonId: second,
      seatNumber: 1,
    });
    expect(
      committeeSeatAssignments(two, { committeeKey: "ways-and-means" }).map(
        (record) => record.seatNumber,
      ),
    ).toEqual([2, 1]);
    expect(() =>
      recordCommitteeSeatAssignment(two, {
        ...base,
        memberKey: "m1",
        memberPersonId: first,
        seatNumber: 1,
      }),
    ).toThrow(/cannot occupy two seats/);
  });
});
