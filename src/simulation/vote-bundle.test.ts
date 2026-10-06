import { describe, expect, it } from "vitest";

import { bodyForChamber } from "./legislation-scenarios";
import { offerFloorAmendment } from "./legislation";
import { adoptProvisionRevisions } from "./legislative-politics";
import { memberVoteConsiderations } from "./legislative-member-decisions";
import { chamberByKey } from "./legislature-rules";
import { createFormationContext, recordPrivateBelief } from "./politics";
import { issueRecordFor } from "./issue-record";
import { publicFaceOfPart, whoCaresAbout } from "./provision-public-face";
import { deserializeWorld, serializeWorld } from "./serialization";
import type { EntityId, LegislativeVoteRecord, World } from "./types";
import {
  AUTHORED,
  CHAMBER,
  WORK_SECTION,
  amend,
  billOnTheFloor,
  everyone,
  floor,
} from "./vote-bundle.fixture";
import {
  measureAnswersAt,
  stancesFromVote,
  voteReadingsOf,
  voteBundle,
  voteQuestionKind,
} from "./vote-bundle";
import { assertWorldIntegrity } from "./world";

function votesOf(world: World, measureId: EntityId) {
  return (world.history.legislativeVotes ?? []).filter(
    (vote) => vote.measureId === measureId,
  );
}

function byPurpose(
  world: World,
  measureId: EntityId,
  purpose: LegislativeVoteRecord["purpose"],
): LegislativeVoteRecord {
  return votesOf(world, measureId).find((vote) => vote.purpose === purpose)!;
}

describe("what was on the table at each recorded vote", () => {
  it("keeps an adopted amendment's section in every later vote, and out of earlier ones", () => {
    const setup = billOnTheFloor();
    let world = amend(setup, setup.world, "yea");
    world = floor(setup, world, "nay");
    assertWorldIntegrity(world);

    const committee = voteBundle(
      world,
      byPurpose(world, setup.measureId, "committee-report"),
    );
    expect(committee.kind).toBe("committee-report");
    expect(committee.parts.map((part) => part.answers?.propositionId)).toEqual([
      setup.transitId,
    ]);

    const amendment = voteBundle(
      world,
      byPurpose(world, setup.measureId, "amendment"),
    );
    expect(amendment.kind).toBe("amendment");
    expect(amendment.amendment?.status).toBe("adopted");
    expect(amendment.parts).toEqual([
      expect.objectContaining({
        source: "amendment-section",
        provisionKey: "work-requirement",
        answers: { propositionId: setup.workRuleId, answer: "yes" },
      }),
    ]);

    const passage = voteBundle(
      world,
      byPurpose(world, setup.measureId, "floor-stage"),
    );
    expect(passage.parts.map((part) => part.source)).toEqual([
      "filed-question",
      "section",
    ]);
    expect(passage.sections.map((section) => section.provisionKey)).toEqual([
      "work-requirement",
    ]);
  });

  it("keeps a rejected amendment's offered text on its own vote and out of the bill", () => {
    const setup = billOnTheFloor();
    let world = amend(setup, setup.world, "nay");
    world = floor(setup, world, "yea");
    const amendment = voteBundle(
      world,
      byPurpose(world, setup.measureId, "amendment"),
    );
    expect(amendment.amendment?.status).toBe("rejected");
    expect(amendment.parts.map((part) => part.provisionKey)).toEqual([
      "work-requirement",
    ]);
    const passage = voteBundle(
      world,
      byPurpose(world, setup.measureId, "floor-stage"),
    );
    expect(passage.sections).toEqual([]);
    expect(measureAnswersAt(world, setup.measureId)).toEqual([
      { propositionId: setup.transitId, answer: "yes" },
    ]);
  });

  it("reads the same bundles back from a saved and reloaded world", () => {
    const setup = billOnTheFloor();
    let world = amend(setup, setup.world, "yea");
    world = floor(setup, world, "yea");
    const reloaded = deserializeWorld(serializeWorld(world));
    for (const vote of votesOf(world, setup.measureId)) {
      const again = votesOf(reloaded, setup.measureId).find(
        (candidate) => candidate.id === vote.id,
      )!;
      expect(voteBundle(reloaded, again)).toEqual(voteBundle(world, vote));
    }
  });

  it("names a chamber's last floor stage as passage and earlier ones as stages", () => {
    const setup = billOnTheFloor();
    const world = floor(setup, setup.world, "yea");
    const stages = chamberByKey(setup.scenario.pack, CHAMBER).floorStages;
    const vote = byPurpose(world, setup.measureId, "floor-stage");
    expect(voteQuestionKind(world, vote)).toBe(
      stages.length === 1 ? "passage" : "stage",
    );
  });

  it("refuses to carry in a section the adopted amendment did not offer as written", () => {
    const setup = billOnTheFloor();
    const world = offerFloorAmendment(setup.world, {
      stableKey: "vote-bundle:amendment",
      measureId: setup.measureId,
      description: "Require adults receiving assistance to work.",
      offeredByLabel: "Senator for District 12",
      dispositions: everyone(setup, "yea"),
      electedMembers: bodyForChamber(setup.scenario, CHAMBER).members.length,
      provenance: AUTHORED,
      proposedSections: [WORK_SECTION(setup.workRuleId)],
    });
    const amendment = world.history.legislativeAmendments!.at(-1)!;
    expect(() =>
      adoptProvisionRevisions(world, [
        {
          stableKey: "vote-bundle:work-section",
          measureId: setup.measureId,
          amendmentId: amendment.id,
          supersedesProvisionId: null,
          provisionKey: "work-requirement",
          sectionNumber: 1,
          heading: "Work requirement",
          text: "An adult receiving assistance shall work.",
          beneficiary: {
            kind: "general-application",
            appliesToLabel: "adults receiving public assistance",
          },
          applicationScope: {
            jurisdictionId: setup.jurisdictionId,
            segmentKey: null,
          },
          // Offered as a yes; carried in as a no.
          answers: { propositionId: setup.workRuleId, answer: "no" },
        },
      ]),
    ).toThrow(/did not offer section 'work-requirement' as written/);
  });
});

describe("the voting record reads the bundle, not only what the bill was filed to do", () => {
  it("puts a section an amendment added on the record of a member who voted for the bill", () => {
    const setup = billOnTheFloor();
    let world = amend(setup, setup.world, "yea", "nay");
    world = floor(setup, world, "yea");
    const record = issueRecordFor(world, setup.memberId);
    expect(
      record
        .filter((entry) => entry.act === "voted-yea")
        .map((entry) => [entry.propositionId, entry.stance])
        .sort(),
    ).toEqual(
      [
        [setup.transitId, "for"],
        [setup.workRuleId, "for"],
      ].sort(),
    );
  });

  it("reads a nay on the amendment as a stance against its section", () => {
    const setup = billOnTheFloor();
    const world = amend(setup, setup.world, "yea", "nay");
    const vote = byPurpose(world, setup.measureId, "amendment");
    const bundle = voteBundle(world, vote);
    expect(stancesFromVote(bundle, "nay")).toEqual([
      expect.objectContaining({
        propositionId: setup.workRuleId,
        stance: "against",
      }),
    ]);
    expect(stancesFromVote(bundle, "absent")).toEqual([]);
  });

  it("lets a member weigh an amendment by their own view of what it adds", () => {
    const setup = billOnTheFloor();
    const world = recordPrivateBelief(setup.world, {
      stableKey: "vote-bundle:member-view",
      personId: setup.memberId,
      propositionId: setup.workRuleId,
      formedAt: setup.world.currentDate,
      position: "oppose",
      conviction: "strong",
      salience: "high",
      flexibility: "firm",
      rationale: null,
      formation: createFormationContext("reflection:initial"),
      supersedesBeliefId: null,
    });
    const considerations = memberVoteConsiderations(world, {
      stableKey: "vote-bundle:member",
      personId: setup.memberId,
      question: {
        question: {
          measureId: setup.measureId,
          purpose: "amendment",
          forumKey: CHAMBER,
          floorStageKey: null,
          amendmentStableKey: "vote-bundle:amendment",
          provisionKey: "work-requirement",
        },
        questionLabel: "On adopting the amendment",
        pendingChange: {
          provisionKey: "work-requirement",
          beneficiaryLabels: [],
          addsExposureMinorUnits: 0,
          answers: [{ propositionId: setup.workRuleId, answer: "yes" }],
        },
      },
    });
    expect(
      considerations.find(
        (entry) =>
          entry.stableKey === `member:private-belief:${setup.workRuleId}`,
      ),
    ).toMatchObject({ optionKey: "vote-nay", importance: "strong" });
  });
});

describe("the public face of a part of a bill", () => {
  it("labels a part by the question it answers and counts who cares from held views", () => {
    const setup = billOnTheFloor();
    const voters = setup.world.personOrder.slice(0, 3);
    let world = setup.world;
    voters.forEach((personId, index) => {
      world = recordPrivateBelief(world, {
        stableKey: `vote-bundle:voter-view:${index}`,
        personId,
        propositionId: setup.workRuleId,
        formedAt: world.currentDate,
        position: index === 0 ? "oppose" : "support",
        conviction: "moderate",
        salience: index === 0 ? "central" : "low",
        flexibility: "negotiable",
        rationale: null,
        formation: createFormationContext("reflection:initial"),
        supersedesBeliefId: null,
      });
    });
    world = amend(setup, world, "yea");
    const part = voteBundle(
      world,
      byPurpose(world, setup.measureId, "amendment"),
    ).parts[0]!;
    expect(publicFaceOfPart(world, part)).toEqual({
      label: "Work requirement for assistance",
      propositionId: setup.workRuleId,
      answer: "yes",
      issueLabel: "Public assistance",
    });
    const cares = whoCaresAbout(world, setup.workRuleId, setup.jurisdictionId);
    // Only views held by people who can vote there are counted, and the
    // people with no view are counted as such, not dropped.
    expect(
      cares.support.people + cares.oppose.people + cares.noSettledView,
    ).toBe(cares.eligibleVoters);
    expect(cares.support.people + cares.oppose.people).toBeLessThanOrEqual(3);
  });

  it("reads a member's stance and local views from the recorded bundle without writing", () => {
    const setup = billOnTheFloor();
    const worldWithVote = floor(setup, setup.world, "nay");
    const vote = byPurpose(worldWithVote, setup.measureId, "floor-stage");
    const before = serializeWorld(worldWithVote);
    const readings = voteReadingsOf(worldWithVote, vote.id, setup.memberId);

    expect(readings).toHaveLength(1);
    expect(readings[0]).toMatchObject({
      publicFace: {
        label: "Fund rural transit",
        propositionId: setup.transitId,
        answer: "yes",
      },
      stance: "against",
    });
    expect(readings[0]?.whoCares?.jurisdictionId).toBe(setup.jurisdictionId);
    expect(serializeWorld(worldWithVote)).toBe(before);
  });

  it("gives a part that answers no question only its own heading", () => {
    const world = billOnTheFloor().world;
    expect(
      publicFaceOfPart(world, {
        source: "section",
        provisionId: null,
        provisionKey: "signage",
        heading: "Station signage",
        answers: null,
      }),
    ).toEqual({
      label: "Station signage",
      propositionId: null,
      answer: null,
      issueLabel: null,
    });
  });
});
