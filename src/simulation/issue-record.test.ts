import { describe, expect, it } from "vitest";

import {
  bodyForChamber,
  createLegislativeScenario,
  type LegislativeScenario,
} from "./legislation-scenarios";
import {
  introduceMeasure,
  placeMeasureOnCalendar,
  recordCommitteeDisposition,
  referMeasure,
  takeFloorVote,
} from "./legislation";
import { chamberByKey } from "./legislature-rules";
import {
  createPolicyDomainDefinition,
  createPolicyIssueDefinition,
  createPolicyPropositionDefinition,
} from "./policy";
import { createFormationContext, recordPrivateBelief } from "./politics";
import {
  isEligibleVoterIn,
  issueRecordFor,
  issueStandingsFor,
  judgeIssueRecord,
  UNRESEARCHED_ISSUE_RECORD,
} from "./issue-record";
import { startingSupportAdjustment } from "./record-in-office";
import type {
  BeliefPosition,
  EntityId,
  LegislativeMemberDisposition,
  LegislativeVoteDisposition,
  PoliticalSalience,
  World,
} from "./types";
import { assertWorldIntegrity } from "./world";

// Nebraska's one-house legislature keeps the path to a recorded roll call
// short. The question is authored for the test and names no real bill.
const CHAMBER = "legislature";
const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this test.",
  sourceEntityIds: [] as readonly EntityId[],
};

function withQuestion(world: World): {
  readonly world: World;
  readonly propositionId: EntityId;
} {
  const domain = createPolicyDomainDefinition(
    "test:transport",
    "Transport",
    "How people move.",
  );
  const issue = createPolicyIssueDefinition(
    "test:rural-transit",
    domain.id,
    "Rural transit",
    "Service where density does not pay for it.",
  );
  const proposition = createPolicyPropositionDefinition(
    "test:fund-rural-transit",
    issue.id,
    "Fund rural transit",
    "Should the state pay for bus service where fares cannot?",
  );
  const catalog = world.policyCatalog;
  return {
    world: {
      ...world,
      policyCatalog: {
        ...catalog,
        domains: { ...catalog.domains, [domain.id]: domain },
        domainOrder: [...catalog.domainOrder, domain.id],
        issues: { ...catalog.issues, [issue.id]: issue },
        issueOrder: [...catalog.issueOrder, issue.id],
        propositions: {
          ...catalog.propositions,
          [proposition.id]: proposition,
        },
        propositionOrder: [...catalog.propositionOrder, proposition.id],
      },
    },
    propositionId: proposition.id,
  };
}

interface Setup {
  readonly scenario: LegislativeScenario;
  readonly world: World;
  readonly propositionId: EntityId;
  readonly measureId: EntityId;
  /** The seated member whose record is judged. */
  readonly memberId: EntityId;
  readonly jurisdictionId: EntityId;
}

function billOnTheFloor(answer: "yes" | "no" | null): Setup {
  const scenario = createLegislativeScenario("nebraska");
  const { world: withCatalog, propositionId } = withQuestion(scenario.world);
  const jurisdictionId = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!.jurisdictionId;
  let world = introduceMeasure(withCatalog, {
    stableKey: "issue-record:bill",
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: "LB 901",
    shortTitle: "Rural bus service",
    summary: "Written to exercise how voters read a vote.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: CHAMBER,
    propositionIds: [propositionId],
    ...(answer ? { propositionAnswers: [{ propositionId, answer }] } : {}),
  });
  const measureId = world.history.legislativeMeasures!.find(
    (measure) => measure.stableKey === "issue-record:bill",
  )!.id;
  const chamber = chamberByKey(scenario.pack, CHAMBER);
  const committee = chamber.committees[0]!;
  const body = bodyForChamber(scenario, CHAMBER);
  world = referMeasure(world, {
    stableKey: "issue-record:referral",
    measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: "issue-record:committee",
    measureId,
    recommendation: "favorable",
    dispositions: body.members
      .slice(0, committee.appointedMembers)
      .map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: "yea",
      })),
    rationale: "The committee reported the bill.",
    provenance: AUTHORED,
  });
  world = placeMeasureOnCalendar(world, {
    stableKey: "issue-record:calendar",
    measureId,
  });
  return {
    scenario,
    world,
    propositionId,
    measureId,
    memberId: body.members[0]!.personId!,
    jurisdictionId,
  };
}

/** Everyone votes yea except the judged member, who casts `theirs`. */
function floorVote(
  setup: Setup,
  world: World,
  theirs: LegislativeMemberDisposition,
): World {
  const body = bodyForChamber(setup.scenario, CHAMBER);
  const dispositions: LegislativeVoteDisposition[] = body.members.map(
    (member) => ({
      memberKey: member.memberKey,
      personId: member.personId,
      disposition: member.personId === setup.memberId ? theirs : "yea",
    }),
  );
  return takeFloorVote(world, {
    stableKey: "issue-record:floor",
    measureId: setup.measureId,
    dispositions,
    electedMembers: body.members.length,
    provenance: AUTHORED,
  });
}

function believe(
  setup: Setup,
  world: World,
  personId: EntityId,
  position: BeliefPosition,
  salience: PoliticalSalience,
): World {
  return recordPrivateBelief(world, {
    stableKey: `issue-record:belief:${personId}`,
    personId,
    propositionId: setup.propositionId,
    formedAt: world.currentDate,
    position,
    conviction: "moderate",
    salience,
    flexibility: "negotiable",
    rationale: null,
    formation: createFormationContext("reflection:initial"),
    supersedesBeliefId: null,
  });
}

function otherVoters(setup: Setup, world: World): readonly EntityId[] {
  return world.personOrder.filter(
    (personId) =>
      personId !== setup.memberId &&
      isEligibleVoterIn(
        world,
        personId,
        setup.jurisdictionId,
        world.currentDate,
      ),
  );
}

describe("voters weighing an officeholder's record, question by question", () => {
  it("reads a yea on a bill that answers yes as a vote for the question", () => {
    const setup = billOnTheFloor("yes");
    const world = floorVote(setup, setup.world, "yea");
    const record = issueRecordFor(world, setup.memberId);
    // The committee yea and the floor yea are one bill; the later one counts.
    expect(record).toHaveLength(1);
    expect(record[0]).toMatchObject({
      propositionId: setup.propositionId,
      measureId: setup.measureId,
      act: "voted-yea",
      stance: "for",
    });
  });

  it("reads a nay on a bill that answers no as a vote for the question", () => {
    const setup = billOnTheFloor("no");
    const world = floorVote(setup, setup.world, "nay");
    expect(issueStandingsFor(world, setup.memberId)).toEqual([
      expect.objectContaining({
        propositionId: setup.propositionId,
        stance: "for",
      }),
    ]);
  });

  it("puts nothing on the record for a bill that does not say which way it answers", () => {
    const setup = billOnTheFloor(null);
    const world = floorVote(setup, setup.world, "yea");
    expect(issueRecordFor(world, setup.memberId)).toEqual([]);
    expect(
      judgeIssueRecord(world, setup.memberId, setup.jurisdictionId),
    ).toBeNull();
  });

  it("does not count a vote the member did not cast", () => {
    const setup = billOnTheFloor("yes");
    const world = floorVote(setup, setup.world, "absent");
    // Only the committee yea remains, so the record is that one vote.
    expect(issueRecordFor(world, setup.memberId).map((e) => e.act)).toEqual([
      "voted-yea",
    ]);
  });

  it("moves support toward a member whose voters agree, and away when they disagree", () => {
    const setup = billOnTheFloor("yes");
    let world = floorVote(setup, setup.world, "yea");
    const voters = otherVoters(setup, world);
    // Without this the test would pass on an empty electorate.
    expect(voters.length).toBeGreaterThan(0);

    const agree = voters.reduce(
      (next, voterId) => believe(setup, next, voterId, "support", "high"),
      world,
    );
    assertWorldIntegrity(agree);
    const liked = judgeIssueRecord(
      agree,
      setup.memberId,
      setup.jurisdictionId,
    )!;
    expect(liked.eligibleVoters).toBe(voters.length);
    expect(liked.issues[0]).toMatchObject({
      stance: "for",
      agreeing: voters.length,
      disagreeing: 0,
    });
    expect(liked.weight).toBe(
      Math.min(
        UNRESEARCHED_ISSUE_RECORD.maxAbsoluteWeight,
        UNRESEARCHED_ISSUE_RECORD.salienceWeight.high *
          UNRESEARCHED_ISSUE_RECORD.weightPerNetAgreement,
      ),
    );

    world = voters.reduce(
      (next, voterId) => believe(setup, next, voterId, "oppose", "low"),
      world,
    );
    const disliked = judgeIssueRecord(
      world,
      setup.memberId,
      setup.jurisdictionId,
    )!;
    expect(disliked.issues[0]).toMatchObject({
      agreeing: 0,
      disagreeing: voters.length,
    });
    expect(disliked.weight).toBe(
      -UNRESEARCHED_ISSUE_RECORD.salienceWeight.low *
        UNRESEARCHED_ISSUE_RECORD.weightPerNetAgreement,
    );
    // The same weight reaches where a candidate starts in a race here.
    expect(
      startingSupportAdjustment(
        world,
        setup.memberId,
        world.currentDate,
        setup.jurisdictionId,
      ) - startingSupportAdjustment(world, setup.memberId, world.currentDate),
    ).toBe(disliked.weight);
  });

  it("is not moved by voters who are uncertain or have no view", () => {
    const setup = billOnTheFloor("yes");
    let world = floorVote(setup, setup.world, "yea");
    const [first] = otherVoters(setup, world);
    world = believe(setup, world, first!, "uncertain", "central");
    const judged = judgeIssueRecord(
      world,
      setup.memberId,
      setup.jurisdictionId,
    )!;
    expect(judged.weight).toBe(0);
    expect(judged.issues[0]).toMatchObject({ agreeing: 0, disagreeing: 0 });
  });

  it("refuses a direction for a question the bill is not about", () => {
    const scenario = createLegislativeScenario("nebraska");
    const { world, propositionId } = withQuestion(scenario.world);
    expect(() =>
      introduceMeasure(world, {
        stableKey: "issue-record:unlinked-answer",
        jurisdictionId: world.history.legislativeMeasures![0]!.jurisdictionId,
        rulePackId: scenario.pack.packId,
        designation: "LB 902",
        shortTitle: "Answers what it is not about",
        summary: "A direction with no question.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        originChamberKey: CHAMBER,
        propositionAnswers: [{ propositionId, answer: "yes" }],
      }),
    ).toThrow(/not about/);
  });
});
