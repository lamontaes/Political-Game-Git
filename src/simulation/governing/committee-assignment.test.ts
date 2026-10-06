import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { lifePlaceStateIdentities } from "../life-places";
import { personName } from "../people";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { SeatedBody } from "../legislation-scenarios";
import type { EntityId } from "../types";
import {
  assignCommitteeSeats,
  committeeAssignmentBodyForRound,
  committeeRoster,
  committeeRosters,
  committeesForMember,
  committeesForPerson,
  type AssignableCommittee,
} from "./committee-assignment";
import {
  committeeSeatAssignmentsForChamber,
  recordMemberCommitteeRequest,
} from "./committee-assignment-records";

const COMMITTEES: readonly AssignableCommittee[] = [
  {
    committeeKey: "ways-and-means",
    name: "Ways and Means",
    appointedMembers: 3,
  },
  { committeeKey: "education", name: "Education", appointedMembers: 2 },
];

function assignedInPlace(place: string, seed: string) {
  const fixture = smallWorld({ place, seed, people: 5 });
  const { world, jurisdictionId } = fixture;
  const [first, second, third, fourth, assigner] = world.personOrder;
  if (!first || !second || !third || !fourth || !assigner)
    throw new Error("fixture needs five people");
  const members = [
    [first, "democratic"],
    [second, "democratic"],
    [third, "democratic"],
    [fourth, "republican"],
  ] as const;
  const body: SeatedBody = {
    chamberKey: "house",
    chamberName: "House",
    members: members.map(([personId, party], index) => ({
      memberKey: `seat-${index + 1}`,
      name: personName(world.people[personId]!),
      personId,
      partyKey: party,
      caucusLabel: party,
      tenureStartedAt: null,
      seatingEventId: null,
    })),
  };
  let requested = world;
  const request = (
    memberKey: string,
    memberPersonId: EntityId,
    preferences: readonly string[],
    reason: string,
  ) => {
    requested = recordMemberCommitteeRequest(requested, {
      stableKey: `test:${seed}:request:${memberKey}`,
      jurisdictionId,
      chamberKey: body.chamberKey,
      assignmentRoundKey: "2026-organizing",
      memberKey,
      memberPersonId,
      assignerPersonId: assigner,
      preferences,
      reason,
    });
  };
  request(
    "seat-1",
    first,
    ["ways-and-means"],
    "My district needs school funding.",
  );
  request(
    "seat-2",
    second,
    ["education", "ways-and-means"],
    "My work history is in school administration.",
  );
  request(
    "seat-4",
    fourth,
    ["ways-and-means"],
    "Local employers need tax expertise.",
  );
  const result = assignCommitteeSeats(requested, {
    stableKey: `test:${seed}:committee-assignment`,
    jurisdictionId,
    assignmentRoundKey: "2026-organizing",
    assignerPersonId: assigner,
    body,
    committees: [COMMITTEES[0]!],
    partyRatioRule: "proportional",
    seniorityImportance: "slight",
    districtFit: [
      {
        memberKey: "seat-1",
        committeeKey: "ways-and-means",
        importance: "decisive",
        confidence: "high",
        explanation:
          "Recorded district school needs and the member's work history fit this committee.",
        sourceRefs: [],
      },
    ],
  });
  return { result, body, jurisdictionId, assigner };
}

describe("recorded committee requests and assignments", () => {
  it("reads rosters only from the seat decisions on the body", () => {
    const { result } = assignedInPlace("OH", "recorded-roster");
    const roster = committeeRoster(
      result.body,
      COMMITTEES,
      "ways-and-means",
      "pack:house",
    );
    expect(roster).toHaveLength(3);
    expect(new Set(roster.map((member) => member.memberKey)).size).toBe(3);
    expect(committeeRosters(result.body, COMMITTEES, "other seed")).toEqual(
      committeeRosters(result.body, COMMITTEES, "pack:house"),
    );
    expect(
      committeesForMember(
        result.body,
        COMMITTEES,
        roster[0]!.memberKey,
        "pack:house",
      ),
    ).toContain("ways-and-means");
    expect(
      committeesForPerson(
        result.body,
        COMMITTEES,
        roster[0]!.personId!,
        "pack:house",
      ),
    ).toContain("ways-and-means");
    expect(
      committeeRosters(result.body, COMMITTEES, "pack:house").get("education"),
    ).toEqual([]);
  });

  it("holds the proportional party ratio in three seeded random states and replays deterministically", () => {
    const seed = "b10-p3-random-state-ratio";
    const places = pickDistinct(
      new SeededRng(seed),
      lifePlaceStateIdentities(),
      3,
    );
    expect(new Set(places.map((place) => place.jurisdictionKey)).size).toBe(3);
    for (const place of places) {
      const once = assignedInPlace(
        place.jurisdictionKey,
        `${seed}:${place.jurisdictionKey}`,
      );
      const twice = assignedInPlace(
        place.jurisdictionKey,
        `${seed}:${place.jurisdictionKey}`,
      );
      const roster = committeeRoster(
        once.result.body,
        COMMITTEES,
        "ways-and-means",
        "same-pack",
      );
      const parties = roster.map((member) => member.partyKey);
      expect(parties.filter((party) => party === "democratic")).toHaveLength(2);
      expect(parties.filter((party) => party === "republican")).toHaveLength(1);
      expect(once.result.assignments).toEqual(twice.result.assignments);
      expect(serializeWorld(once.result.world)).toBe(
        serializeWorld(twice.result.world),
      );
      const persisted = committeeSeatAssignmentsForChamber(once.result.world, {
        jurisdictionId: once.jurisdictionId,
        chamberKey: "house",
        assignmentRoundKey: "2026-organizing",
      });
      expect(persisted.map((row) => row.reasons.join(" ")).join(" ")).toContain(
        "Decision trace",
      );
    }
  });

  it("reloads the same recorded members and does not recreate an assignment", () => {
    const { result, body, jurisdictionId, assigner } = assignedInPlace(
      "WY",
      "b10-p3-save-continue",
    );
    const loaded = deserializeWorld(serializeWorld(result.world));
    const rereadBody = committeeAssignmentBodyForRound(loaded, body, {
      jurisdictionId,
      assignmentRoundKey: "2026-organizing",
    });
    expect(
      committeeRoster(
        rereadBody,
        COMMITTEES,
        "ways-and-means",
        "another-seed",
      ).map((member) => member.memberKey),
    ).toEqual(
      committeeRoster(
        result.body,
        COMMITTEES,
        "ways-and-means",
        "same-seed",
      ).map((member) => member.memberKey),
    );
    const repeated = assignCommitteeSeats(loaded, {
      stableKey: "b10-p3-save-continue:committee-assignment",
      jurisdictionId,
      assignmentRoundKey: "2026-organizing",
      assignerPersonId: assigner,
      body,
      committees: [COMMITTEES[0]!],
      partyRatioRule: "proportional",
      seniorityImportance: "slight",
    });
    expect(repeated.world.history.events.length).toBe(
      loaded.history.events.length,
    );
  });
});
