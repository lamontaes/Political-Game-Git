import { describe, expect, it } from "vitest";

import type { SeatedBody } from "../legislation-scenarios";
import {
  committeeRoster,
  committeeRosters,
  committeesForMember,
  committeesForPerson,
  type AssignableCommittee,
} from "./committee-assignment";

function chamber(size: number): SeatedBody {
  return {
    chamberKey: "house",
    chamberName: "House",
    members: Array.from({ length: size }, (_, index) => ({
      memberKey: `member-${index}`,
      name: `Member ${index}`,
      personId: index === size - 1 ? "person-last" : null,
      caucusLabel: index % 2 === 0 ? "Blue" : "Green",
    })),
  };
}

const COMMITTEES: readonly AssignableCommittee[] = [
  { committeeKey: "ways-and-means", appointedMembers: 7 },
  { committeeKey: "judiciary", appointedMembers: 5 },
  { committeeKey: "education", appointedMembers: 5 },
];

describe("GOVERNING D1: committees have rosters, not the first names on the list", () => {
  it("seats everybody once before it seats anybody twice", () => {
    const body = chamber(20);
    const rosters = committeeRosters(body, COMMITTEES, "pack:house");
    const seated = [...rosters.values()].flat();
    expect(seated).toHaveLength(17); // 7 + 5 + 5, none of them doubled
    expect(new Set(seated.map((member) => member.memberKey)).size).toBe(17);
    // No committee seats the same member twice.
    for (const roster of rosters.values())
      expect(new Set(roster.map((member) => member.memberKey)).size).toBe(
        roster.length,
      );
  });

  it("seats a member the old slice could never reach", () => {
    // The shortcut this replaces took body.members.slice(0, size), so a member
    // added at the end of a chamber — which is where a player joining one is
    // put — was on no committee however many committees there were.
    const body = chamber(20);
    const last = body.members[body.members.length - 1]!;
    expect(body.members.slice(0, 7)).not.toContainEqual(last);

    // With seats for everybody, everybody sits somewhere, the last member
    // included. Seventeen seats across three committees cannot seat twenty
    // members, so this asks for a fourth rather than asserting the
    // impossible.
    const seatsForAll = [
      ...COMMITTEES,
      { committeeKey: "rules", appointedMembers: 5 },
    ];
    expect(
      seatsForAll.reduce((total, row) => total + row.appointedMembers, 0),
    ).toBeGreaterThanOrEqual(body.members.length);
    for (const member of body.members)
      expect(
        committeesForMember(body, seatsForAll, member.memberKey, "pack:house"),
      ).not.toHaveLength(0);

    // With fewer seats than members somebody must miss out, but who misses
    // out is not simply everybody past the cut-off the slice used.
    const seated = new Set(
      [...committeeRosters(body, COMMITTEES, "pack:house").values()]
        .flat()
        .map((member) => member.memberKey),
    );
    const slice = new Set(
      body.members.slice(0, seated.size).map((member) => member.memberKey),
    );
    expect([...seated].sort()).not.toEqual([...slice].sort());
    // And the same seat is reachable by the person who holds it.
    expect(
      committeesForPerson(body, seatsForAll, "person-last", "pack:house"),
    ).toEqual(
      committeesForMember(body, seatsForAll, last.memberKey, "pack:house"),
    );
    expect(
      committeesForPerson(body, COMMITTEES, "nobody-here", "pack:house"),
    ).toEqual([]);
  });

  it("gives the same roster every time it is asked", () => {
    const body = chamber(20);
    const once = committeeRoster(body, COMMITTEES, "judiciary", "pack:house");
    const twice = committeeRoster(body, COMMITTEES, "judiciary", "pack:house");
    expect(twice.map((member) => member.memberKey)).toEqual(
      once.map((member) => member.memberKey),
    );
    // A different chamber of the same legislature gets its own roster.
    const senate = committeeRoster(
      { ...body, chamberKey: "senate" },
      COMMITTEES,
      "judiciary",
      "pack:senate",
    );
    expect(senate.map((member) => member.memberKey)).not.toEqual(
      once.map((member) => member.memberKey),
    );
  });

  it("seats a small chamber once rather than seating anybody twice", () => {
    const body = chamber(4);
    const roster = committeeRoster(
      body,
      [{ committeeKey: "whole", appointedMembers: 9 }],
      "whole",
      "pack:house",
    );
    expect(roster).toHaveLength(4);
    expect(new Set(roster.map((member) => member.memberKey)).size).toBe(4);
  });

  it("answers an empty chamber and an uncompiled committee without inventing", () => {
    const empty: SeatedBody = {
      chamberKey: "house",
      chamberName: "House",
      members: [],
    };
    expect(committeeRoster(empty, COMMITTEES, "judiciary", "pack:house")).toEqual(
      [],
    );
    expect(
      committeeRoster(chamber(20), COMMITTEES, "not-a-committee", "pack:house"),
    ).toEqual([]);
  });
});
