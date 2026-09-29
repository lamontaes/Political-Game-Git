import { describe, expect, it } from "vitest";
import {
  liveQuestionsIn,
  stateCampaignStand,
  type LiveQuestion,
} from "./campaign-stands";
import {
  bodyForChamber,
  createLegislativeScenario,
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
import { allUndertakings, assessUndertaking } from "./undertakings";
import type { EntityId, LegislativeMemberDisposition, World } from "./types";

/**
 * Build 22, step 3: a stand on a bill still in play becomes a public pledge,
 * judged later by the candidate's own vote on it. Nebraska's one-house
 * legislature keeps the path to a roll call short; the question and bill are
 * authored for the test and name no real bill.
 */

const CHAMBER = "legislature";
const AUTHORED = {
  method: "authored-fixture" as const,
  note: "Authored member decisions for this test.",
  sourceEntityIds: [] as readonly EntityId[],
};

function billOnTheFloor(answer: "yes" | "no") {
  const scenario = createLegislativeScenario("nebraska");
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
  const catalog = scenario.world.policyCatalog;
  const jurisdictionId = scenario.world.history.legislativeMeasures!.find(
    (measure) => measure.id === scenario.measureId,
  )!.jurisdictionId;
  let world: World = {
    ...scenario.world,
    policyCatalog: {
      ...catalog,
      domains: { ...catalog.domains, [domain.id]: domain },
      domainOrder: [...catalog.domainOrder, domain.id],
      issues: { ...catalog.issues, [issue.id]: issue },
      issueOrder: [...catalog.issueOrder, issue.id],
      propositions: { ...catalog.propositions, [proposition.id]: proposition },
      propositionOrder: [...catalog.propositionOrder, proposition.id],
    },
  };
  world = introduceMeasure(world, {
    stableKey: "stands:bill",
    jurisdictionId,
    rulePackId: scenario.pack.packId,
    designation: "LB 902",
    shortTitle: "Rural bus service",
    summary: "Written to exercise a campaign pledge.",
    origin: "member-introduction",
    subjectClass: "general-policy",
    originChamberKey: CHAMBER,
    propositionIds: [proposition.id],
    propositionAnswers: [{ propositionId: proposition.id, answer }],
  });
  const measureId = world.history.legislativeMeasures!.find(
    (measure) => measure.stableKey === "stands:bill",
  )!.id;
  const committee = chamberByKey(scenario.pack, CHAMBER).committees[0]!;
  const body = bodyForChamber(scenario, CHAMBER);
  world = referMeasure(world, {
    stableKey: "stands:referral",
    measureId,
    committeeKey: committee.committeeKey,
  });
  world = recordCommitteeDisposition(world, {
    stableKey: "stands:committee",
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
    stableKey: "stands:calendar",
    measureId,
  });
  // The last member sat out the committee, so their first act on the bill is
  // the floor vote.
  const memberId = body.members
    .filter((member) => member.personId !== null)
    .at(-1)!.personId!;
  const floor = (at: World, theirs: LegislativeMemberDisposition) =>
    takeFloorVote(at, {
      stableKey: "stands:floor",
      measureId,
      dispositions: body.members.map((member) => ({
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: member.personId === memberId ? theirs : "yea",
      })),
      electedMembers: body.members.length,
      provenance: AUTHORED,
    });
  return {
    world,
    jurisdictionId,
    measureId,
    propositionId: proposition.id,
    memberId,
    floor,
  };
}

function pledge(world: World, personId: EntityId, question: LiveQuestion) {
  return stateCampaignStand(world, {
    stableKey: `stands:pledge:${personId}`,
    personId,
    question,
    backsTheBill: true,
    statement: `I'll vote for ${question.designation}.`,
    sourceEventId: null,
  });
}

const pledged = (world: World) =>
  allUndertakings(world).filter(
    (entry) => entry.source.store === "campaignCommitments",
  );

describe("A stand on a bill in play", () => {
  it("finds only bills still undecided that say which way they answer", () => {
    const setup = billOnTheFloor("yes");
    const live = liveQuestionsIn(setup.world, setup.jurisdictionId);
    expect(live[0]).toMatchObject({
      measureId: setup.measureId,
      designation: "LB 902",
      propositionId: setup.propositionId,
      answer: "yes",
    });
    // The scenario's own bill names no question, so nobody is asked about it.
    expect(live.map((entry) => entry.measureId)).toEqual([setup.measureId]);
  });

  it("is a public pledge, kept by voting for the bill", () => {
    const setup = billOnTheFloor("yes");
    const question = liveQuestionsIn(setup.world, setup.jurisdictionId)[0]!;
    const world = pledge(setup.world, setup.memberId, question);
    const promise = pledged(world).at(-1)!;
    expect(promise).toMatchObject({
      holderPersonId: setup.memberId,
      audience: "public",
      firmness: "explicit",
      statement: "I'll vote for LB 902.",
    });
    expect(assessUndertaking(world, promise).standing).toBe("outstanding");
    expect(assessUndertaking(setup.floor(world, "yea"), promise)).toMatchObject(
      {
        standing: "kept",
        account: "They voted for LB 902, as they said they would.",
      },
    );
    expect(assessUndertaking(setup.floor(world, "nay"), promise)).toMatchObject(
      {
        standing: "broken",
        account:
          "They voted against LB 902 after saying they would do the opposite.",
      },
    );
  });

  it("reads backing a bill that answers no as a pledge against the question", () => {
    const setup = billOnTheFloor("no");
    const question = liveQuestionsIn(setup.world, setup.jurisdictionId)[0]!;
    const world = pledge(setup.world, setup.memberId, question);
    expect(world.history.campaignCommitments.at(-1)!.stance).toBe("oppose");
    expect(
      assessUndertaking(setup.floor(world, "yea"), pledged(world).at(-1)!)
        .standing,
    ).toBe("kept");
  });

  it("lets a later stand replace an earlier one", () => {
    const setup = billOnTheFloor("yes");
    const question = liveQuestionsIn(setup.world, setup.jurisdictionId)[0]!;
    const first = pledge(setup.world, setup.memberId, question);
    const second = stateCampaignStand(first, {
      stableKey: "stands:pledge:again",
      personId: setup.memberId,
      question,
      backsTheBill: false,
      statement: "I've changed my mind. I'll vote against LB 902.",
      sourceEventId: null,
    });
    const [earlier, later] = pledged(second).slice(-2);
    expect(assessUndertaking(second, earlier!).standing).toBe("superseded");
    expect(assessUndertaking(setup.floor(second, "nay"), later!).standing).toBe(
      "kept",
    );
  });
});
