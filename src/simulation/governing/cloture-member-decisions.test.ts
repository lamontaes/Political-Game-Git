import { describe, expect, it } from "vitest";

import { smallWorld } from "../../../tests/fixtures/small-world";
import { makeIsoDate } from "../dates";
import {
  introduceMeasure,
  measurePosition,
  placeMeasureOnCalendar,
  recordCommitteeDisposition,
  recordDebateExtension,
  referMeasure,
} from "../legislation";
import { billOnTheFloor } from "../vote-bundle.fixture";
import { US_CONGRESS_RULE_PACK } from "../congress-rule-pack";
import {
  decideChamberVote,
  decideFloorHold,
  seatedChamberForPack,
} from "./chamber-votes";
import { chamberByKey } from "../legislature-rules";
import { seatEveryone } from "../vote-bundle.fixture";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../national-election-geography";

describe("cloture member decisions", () => {
  it("lets a supplied recorded leader strain weigh on the member's vote", () => {
    const { setup, members } = seatEveryone(billOnTheFloor());
    const member = members[0]!;
    const personId = member.personId!;
    const reason = {
      stableKey: "b12:moderate-deal:leader-strain",
      optionKey: "vote-yea",
      sourceType: "context:recorded-leader-strain" as const,
      direction: "supports" as const,
      importance: "strong" as const,
      confidence: "high" as const,
      explanation: "The member has a recorded strain with their own leaders.",
      sourceRefs: [],
    };
    const vote = decideChamberVote(setup.world, {
      stableKey: "b12:moderate-deal:vote",
      members,
      question: {
        question: {
          measureId: setup.measureId,
          purpose: "floor-stage",
          forumKey: "legislature",
          floorStageKey: "final-passage",
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Vote on the measure",
      },
      leaderStrainByMember: new Map([[personId, [reason]]]),
    });

    expect(vote.find((row) => row.personId === personId)?.reason).toBe(
      "b12:moderate-deal",
    );
  });

  it("does not allow a floor hold where the body has no unlimited debate", () => {
    const setup = billOnTheFloor();
    expect(() =>
      recordDebateExtension(setup.world, {
        measureId: setup.measureId,
        stableKey: "b12:floor-hold:no-unlimited-debate",
        chamberKey: "legislature",
        memberPersonId: setup.memberId,
        actorLabel: "Member",
        rationale: "The Nebraska rules do not allow an unlimited-debate hold.",
        resumeAt: makeIsoDate("2026-01-06"),
      }),
    ).toThrow("This chamber has no recorded unlimited-debate rule.");
  });

  it("records each senator's own cloture reason without a party tally shortcut", () => {
    let world = ensureNationalElectionJurisdiction(
      smallWorld({
        place: "US-CA",
        date: "2026-01-05",
        seed: "b12-cloture-members",
        offices: ["congress"],
      }).world,
    );
    const senate = seatedChamberForPack(
      world,
      US_CONGRESS_RULE_PACK.packId,
      "senate",
      "Senate",
    );
    if (!senate || senate.body.members.length < 2)
      throw new Error("The fixture has no seated senators.");
    const sponsor = senate.body.members.find((member) => member.personId);
    if (!sponsor?.personId)
      throw new Error("The fixture has no senator to sponsor the measure.");
    world = introduceMeasure(world, {
      stableKey: "b12:cloture:measure",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_RULE_PACK.packId,
      designation: "S. 35",
      shortTitle: "Cloture reasons",
      summary: "Fixture measure for individual cloture decisions.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "senate",
      sponsorPersonId: sponsor.personId,
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    const input = {
      stableKey: "b12:cloture:vote",
      members: senate.body.members,
      question: {
        question: {
          measureId: measure.id,
          purpose: "floor-stage" as const,
          forumKey: "senate",
          floorStageKey: "cloture",
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Vote to end debate?",
      },
      contested: true,
    };
    const votes = decideChamberVote(world, input);
    const repeat = decideChamberVote(world, input);

    expect(votes).toEqual(repeat);
    expect(votes).toHaveLength(senate.body.members.length);
    expect(votes.every((vote) => Boolean(vote.reason))).toBe(true);
    expect(
      votes.some((vote) => vote.reason?.startsWith("member:party-cue:")),
    ).toBe(true);
  });

  it("records a member's floor hold only for a body with unlimited debate", () => {
    let world = ensureNationalElectionJurisdiction(
      smallWorld({
        place: "US-CA",
        date: "2026-01-05",
        seed: "b12-floor-hold",
        offices: ["congress"],
      }).world,
    );
    const senate = seatedChamberForPack(
      world,
      US_CONGRESS_RULE_PACK.packId,
      "senate",
      "Senate",
    );
    if (!senate) throw new Error("The fixture has no seated senators.");
    const member = senate.body.members.find((candidate) => candidate.personId);
    if (!member?.personId) throw new Error("The fixture has no senator.");
    const memberPersonId = member.personId;
    world = introduceMeasure(world, {
      stableKey: "b12:floor-hold:measure",
      jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
      rulePackId: US_CONGRESS_RULE_PACK.packId,
      designation: "S. 36",
      shortTitle: "Floor hold",
      summary: "Fixture measure for a member's floor hold.",
      origin: "member-introduction",
      subjectClass: "general-policy",
      originChamberKey: "senate",
      sponsorPersonId: memberPersonId,
    });
    const measure = world.history.legislativeMeasures!.at(-1)!;
    const chamber = chamberByKey(US_CONGRESS_RULE_PACK, "senate");
    const committee = chamber.committees[0]!;
    world = referMeasure(world, {
      stableKey: "b12:floor-hold:referral",
      measureId: measure.id,
      committeeKey: committee.committeeKey,
    });
    world = recordCommitteeDisposition(world, {
      stableKey: "b12:floor-hold:committee",
      measureId: measure.id,
      recommendation: "favorable",
      dispositions: senate.body.members
        .slice(0, committee.appointedMembers)
        .map((row) => ({
          memberKey: row.memberKey,
          personId: row.personId,
          disposition: "yea" as const,
        })),
      rationale: "The committee reported the measure.",
      provenance: {
        method: "authored-fixture",
        note: "Authored committee result for the floor-hold test.",
        sourceEntityIds: [],
      },
    });
    world = placeMeasureOnCalendar(world, {
      stableKey: "b12:floor-hold:calendar",
      measureId: measure.id,
    });
    expect(measurePosition(world, measure.id).phase).toBe("on-floor");

    const held = decideFloorHold(world, {
      measureId: measure.id,
      chamberKey: "senate",
      memberPersonId,
      stableKey: "b12:floor-hold:decision",
      actorLabel: member.name,
      resumeAt: makeIsoDate("2026-01-06"),
      leadershipRequest: {
        stableKey: "minority-leader:request-hold",
        optionKey: "hold-floor",
        sourceType: "context:recorded-leadership-request",
        direction: "supports",
        importance: "decisive",
        confidence: "high",
        explanation: "The minority leader asked the member to hold the floor.",
        sourceRefs: [],
      },
    });

    expect(held.held).toBe(true);
    expect(held.world.history.legislativeActions!.at(-1)).toMatchObject({
      kind: "debate-extended",
      resumeAt: "2026-01-06",
      actorLabel: member.name,
    });
    expect(
      decideFloorHold(world, {
        measureId: measure.id,
        chamberKey: "senate",
        memberPersonId,
        stableKey: "b12:floor-hold:no-request",
        actorLabel: member.name,
        resumeAt: makeIsoDate("2026-01-06"),
      }).held,
    ).toBe(false);
  });
});
