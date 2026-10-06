import { describe, expect, it } from "vitest";

import { smallWorld } from "../../../tests/fixtures/small-world";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import {
  bodyForChamber,
  dispositionsFromCounts,
} from "../legislation-scenarios";
import {
  introduceMeasure,
  placeMeasureOnCalendar,
  recordCommitteeDisposition,
  referMeasure,
  takeFloorVote,
} from "../legislation";
import { chamberByKey } from "../legislature-rules";
import { billOnTheFloor } from "../vote-bundle.fixture";
import {
  applyQuorumAttendanceToBallots,
  decideQuorumAttendance,
  seatedChamberForPack,
  type QuorumAttendanceReason,
} from "./chamber-votes";

const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored attendance dispositions for this test.",
  sourceEntityIds: [] as const,
};

function attendanceReason(
  stableKey: string,
  optionKey: "stay" | "walk-out",
): QuorumAttendanceReason {
  return {
    stableKey,
    optionKey,
    sourceType: "context:recorded-leadership-request",
    direction: "supports" as const,
    importance: "decisive" as const,
    confidence: "high" as const,
    explanation:
      optionKey === "walk-out"
        ? "The minority leader asked the member to stay away."
        : "The floor leader asked the member to attend.",
    sourceRefs: [],
  };
}

describe("quorum denial", () => {
  it("records a failed quorum in a Nebraska chamber", () => {
    const setup = billOnTheFloor();
    const members = bodyForChamber(setup.scenario, "legislature").members;
    const absent = members.length - 24;
    const after = takeFloorVote(setup.world, {
      stableKey: "b12:quorum:nebraska-denial",
      measureId: setup.measureId,
      dispositions: dispositionsFromCounts(members, { yea: 24, nay: 0 }),
      presentMembers: 24,
      electedMembers: members.length,
      provenance: AUTHORED,
    });

    expect(absent).toBeGreaterThan(0);
    expect(after.history.legislativeActions!.at(-1)).toMatchObject({
      kind: "quorum-not-present",
    });
    expect(after.history.legislativeVotes!.at(-1)).toMatchObject({
      purpose: "floor-stage",
      presentMembers: 24,
    });
  });

  it("lets the same attendance writer proceed when a Congress quorum remains", () => {
    let world = ensureNationalElectionJurisdiction(
      smallWorld({
        place: "US-CA",
        date: "2026-01-05",
        seed: "b12-quorum-congress",
        offices: ["congress"],
      }).world,
    );
    const senate = seatedChamberForPack(
      world,
      US_CONGRESS_RULE_PACK.packId,
      "senate",
      "Senate",
    );
    if (!senate || senate.body.members.length !== 100)
      throw new Error("The test needs all one hundred Senate seats.");
    const sponsor = senate.body.members.find((member) => member.personId);
    if (!sponsor?.personId) throw new Error("The fixture has no senator.");
    world = introduceMeasure(world, {
      stableKey: "b12:quorum:measure",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_RULE_PACK.packId,
      designation: "S. 37",
      shortTitle: "Quorum test measure",
      summary: "Fixture measure for common quorum handling.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "senate",
      sponsorPersonId: sponsor.personId,
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    const chamber = chamberByKey(US_CONGRESS_RULE_PACK, "senate");
    const committee = chamber.committees[0]!;
    world = referMeasure(world, {
      stableKey: "b12:quorum:referral",
      measureId: measure.id,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: "b12:quorum:committee",
      measureId: measure.id,
      recommendation: "favorable",
      dispositions: senate.body.members
        .slice(0, committee.appointedMembers)
        .map((member) => ({
          memberKey: member.memberKey,
          personId: member.personId,
          disposition: "yea" as const,
        })),
      rationale: "The committee reported the bill.",
      provenance: AUTHORED,
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: "b12:quorum:calendar",
      measureId: measure.id,
    });

    const requests = new Map(
      senate.body.members.map((member, index) => [
        member.personId!,
        attendanceReason(
          `b12:quorum:request:${index}`,
          index < 40 ? "walk-out" : "stay",
        ),
      ]),
    );
    const attendance = decideQuorumAttendance(world, {
      measureId: measure.id,
      chamberKey: "senate",
      stableKey: "b12:quorum:attendance",
      members: senate.body.members,
      leadershipRequests: requests,
    });
    const walkedOut = attendance.filter(
      (decision) => decision.attendance === "walk-out",
    );
    const ballots = applyQuorumAttendanceToBallots(
      dispositionsFromCounts(senate.body.members, { yea: 100, nay: 0 }),
      attendance,
    );
    const after = takeFloorVote(world, {
      stableKey: "b12:quorum:senate-floor",
      measureId: measure.id,
      dispositions: ballots,
      presentMembers: senate.body.members.length - walkedOut.length,
      electedMembers: senate.seats,
      provenance: AUTHORED,
    });

    expect(walkedOut).toHaveLength(40);
    expect(after.history.legislativeActions!.at(-1)?.kind).toBe(
      "floor-stage-passed",
    );
    expect(
      after.history.legislativeActions!.some(
        (action) => action.kind === "quorum-not-present",
      ),
    ).toBe(false);
  });
});
