import { describe, expect, it } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { currentHistoricalCutoff } from "../queries";
import { evaluateDecision, recordDurableDecisionTrace } from "../decisions";
import { lifePlaceStateIdentities } from "../life-places";
import { personName } from "../people";
import { pickDistinct, SeededRng } from "../rng";
import { deserializeWorld, serializeWorld } from "../serialization";
import type { SeatedBody } from "../legislation-scenarios";
import type { EntityId, World } from "../types";
import {
  assignCommitteeSeats,
  committeeAssignmentBodyForRound,
  committeeRoster,
  committeeRosters,
  committeesForMember,
  committeesForPerson,
  recordPlayerCommitteeRequest,
  type AssignableCommittee,
} from "./committee-assignment";
import {
  committeeSeatAssignmentsForChamber,
  memberCommitteeRequests,
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
  it("records a player's ordered request from the played durable choices", () => {
    const { result, body, jurisdictionId, assigner } = assignedInPlace(
      "OR",
      "b10-p3-player-request",
    );
    const member = body.members[2]!;
    const playerPersonId = member.personId!;
    let next: World = {
      ...result.world,
      control: { kind: "person" as const, personId: playerPersonId },
    };
    const decisionTraceIds: EntityId[] = [];
    for (const [index, optionKey] of ["education", "ways-and-means"].entries()) {
      const evaluation = evaluateDecision(next, {
        stableKey: `played-request:${index + 1}`,
        decisionType: "legislature.request-committee-membership",
        actorPersonId: playerPersonId,
        cutoff: currentHistoricalCutoff(next),
        subject: {
          kind: "context:committee-request",
          key: "house:2026-organizing",
          entityId: null,
        },
        options: [
          {
            key: optionKey,
            label: optionKey,
            description: "The player requests this committee.",
          },
          {
            key: "other",
            label: "Another committee",
            description: "The player does not request this committee here.",
          },
        ],
        constraints: [
          {
            stableKey: `played-request:${index + 1}:exclude-other`,
            optionKey: "other",
            kind: "not-selected-in-this-played-answer",
            explanation: "This recorded answer selected the requested committee.",
            sourceRefs: [],
          },
        ],
        considerations: [],
        perceptionIds: [],
        randomness: "none",
        retention: "durable",
      });
      next = recordDurableDecisionTrace(next, evaluation);
      decisionTraceIds.push(next.history.decisionTraces.at(-1)!.id);
    }
    const recorded = recordPlayerCommitteeRequest(next, {
      stableKey: "b10-p3:player-request",
      jurisdictionId,
      chamberKey: body.chamberKey,
      assignmentRoundKey: "2026-organizing",
      body,
      memberKey: member.memberKey,
      assignerPersonId: assigner,
      decisionTraceIds,
      committeeKeys: COMMITTEES.map((committee) => committee.committeeKey),
    });
    expect(recorded.preferences).toEqual(["education", "ways-and-means"]);
    expect(
      memberCommitteeRequests(recorded.world, {
        jurisdictionId,
        chamberKey: body.chamberKey,
        assignmentRoundKey: "2026-organizing",
        memberKey: member.memberKey,
      }).at(-1)?.decisionTraceIds,
    ).toEqual(decisionTraceIds);
  });

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
