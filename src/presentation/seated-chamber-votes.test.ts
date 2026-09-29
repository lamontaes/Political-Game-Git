import { describe, expect, it } from "vitest";

import { deserializeWorld, serializeWorld } from "../simulation";
import type {
  EntityId,
  MeasureStepKey,
  PrivateBeliefRecord,
  World,
} from "../simulation";
import {
  decideChamberVote,
  publicPartyOf,
  seatedChamberForPack,
} from "../simulation/governing/chamber-votes";
import { stateLegislators } from "../simulation/nationwide-world/state-legislature-opening";
import {
  applyLegislativeCommand,
  institutionOwnsStep,
  openLegislativeWork,
} from "./legislation-world";
import type { LegislativeAssignment } from "./legislation-world";
import { projectMeasureBriefing } from "./legislation-projection";
import { DEFAULT_NEW_GAME_SETUP } from "./new-game";
import { generateOpeningLife, prepareOpeningLife } from "./opening-life";
import { resolvePlayerCapabilities } from "./player-capabilities";

/**
 * A bill the player works on is decided by the state's seated legislators,
 * each for their own reasons, not by a head count written in advance.
 *
 * Nebraska's one-house legislature and Alaska's two chambers with a joint
 * override session: the two legislatures outside Kentucky that a staffer's
 * job opens in today. Kentucky is here too, on purpose and not as a default:
 * an audit found its transit bill always passing the House 58 to 40 on
 * counts copied from a developer fixture, and this is where that stops.
 */

function staffer(placeKey: string) {
  const game = generateOpeningLife(
    prepareOpeningLife({
      ...DEFAULT_NEW_GAME_SETUP,
      placeKey,
      seed: `seated-votes-${placeKey}`,
      startAge: 30,
      startingLife: "legislative-office",
    }),
  ).game!;
  const capabilities = resolvePlayerCapabilities(game.world);
  return openLegislativeWork(game.world, {
    scenarioKey: capabilities.legislativeScenarioKey!,
    playerPersonId: game.playerPersonId,
    jurisdictionId: capabilities.legislativeJurisdictionId!,
  });
}

/** Takes whatever step is open next, waiting where it is not the office's. */
function advance(
  world: World,
  assignment: LegislativeAssignment,
  until: (world: World) => boolean,
): World {
  let next = world;
  for (let i = 0; i < 40 && !until(next); i++) {
    const briefing = projectMeasureBriefing(next, assignment.measureId);
    if (briefing.finished) break;
    const option = briefing.options.find(
      (entry) => !entry.disabledReason && entry.actionKey !== "offer-amendment",
    );
    if (!option) break;
    const step: MeasureStepKey = option.actionKey;
    next = applyLegislativeCommand(next, assignment, {
      kind: institutionOwnsStep(next, assignment, step)
        ? "await-institution"
        : "take-step",
      step,
    }).world;
  }
  return next;
}

function votesOn(world: World, measureId: string) {
  return (world.history.legislativeVotes ?? []).filter(
    (vote) => vote.measureId === measureId,
  );
}

describe.each(["nebraska", "alaska", "kentucky"])(
  "a staffer's bill in %s",
  (place) => {
    const { world, assignment } = staffer(place);
    const pack = assignment.procedure.pack;
    const members = stateLegislators(world, `${pack.packId}:candidacy`);
    const floor = advance(world, assignment, (w) =>
      votesOn(w, assignment.measureId).some((v) => v.purpose === "floor-stage"),
    );

    it("works for a legislator who actually holds a seat", () => {
      expect(assignment.procedure.memberDecisions).toBeDefined();
      const sponsor = members.find(
        (member) => member.personId === assignment.sponsorPersonId,
      );
      expect(sponsor).toBeDefined();
      expect(sponsor!.officeKey.endsWith(`:${pack.chamberOrder[0]}`)).toBe(
        true,
      );
    });

    it("puts the state's seated members in the chambers, and nobody else", () => {
      for (const body of assignment.procedure.bodies) {
        const seated = members.filter(
          (member) => member.officeKey === `${pack.packId}:${body.chamberKey}`,
        );
        expect(body.members.map((m) => m.personId).sort()).toEqual(
          seated.map((m) => m.personId).sort(),
        );
      }
    });

    it("records every member's own decision, with the reason that decided it", () => {
      const votes = votesOn(floor, assignment.measureId);
      const committee = votes.find(
        (vote) => vote.purpose === "committee-report",
      );
      expect(committee).toBeDefined();
      // A committee that will not report the bill ends it there; one that does
      // sends it to a floor where every seated member answers.
      const onFloor = votes.find((vote) => vote.purpose === "floor-stage");
      expect(Boolean(onFloor)).toBe(committee!.outcome === "passed");
      for (const vote of votes) {
        expect(vote.provenance.method).toBe("member-decisions");
        for (const entry of vote.dispositions) {
          expect(entry.personId).not.toBeNull();
          expect(entry.reason).toMatch(/^member:/);
          if (entry.personId === assignment.sponsorPersonId)
            expect(entry.reason).toBe("member:own-bill");
        }
      }
      if (onFloor) {
        const origin = assignment.procedure.bodies.find(
          (body) => body.chamberKey === pack.chamberOrder[0],
        )!;
        expect(onFloor.dispositions.length).toBe(origin.members.length);
      }
    });

    it("gives the same votes after Save and Continue", () => {
      const restored = deserializeWorld(serializeWorld(world));
      const again = advance(restored, assignment, (w) =>
        votesOn(w, assignment.measureId).some(
          (v) => v.purpose === "floor-stage",
        ),
      );
      expect(
        votesOn(again, assignment.measureId).map((v) => v.dispositions),
      ).toEqual(
        votesOn(floor, assignment.measureId).map((v) => v.dispositions),
      );
    });
  },
);

describe("a seated chamber deciding one question", () => {
  const { world, assignment } = staffer("alaska");
  const pack = assignment.procedure.pack;
  const chamberKey = pack.chamberOrder[0]!;
  const chamber = seatedChamberForPack(
    world,
    pack.packId,
    chamberKey,
    "House",
  )!;
  const question = {
    question: {
      measureId: assignment.measureId,
      purpose: "floor-stage" as const,
      forumKey: chamberKey,
      floorStageKey: null,
      amendmentStableKey: null,
      provisionKey: null,
    },
    questionLabel: "Pass the bill",
  };

  it("never votes for the player", () => {
    const player = chamber.body.members[3]!;
    const decided = decideChamberVote(world, {
      stableKey: "test:player",
      question,
      members: chamber.body.members,
      playerPersonId: player.personId,
    });
    expect(
      decided.find((entry) => entry.personId === player.personId),
    ).toMatchObject({
      disposition: "absent",
      reason: "member:player-not-present",
    });
    const cast = decideChamberVote(world, {
      stableKey: "test:player",
      question,
      members: chamber.body.members,
      playerPersonId: player.personId,
      playerBallot: "nay",
    });
    expect(
      cast.find((entry) => entry.personId === player.personId)?.disposition,
    ).toBe("nay");
  });

  it("decides a named few members exactly as a full count does", () => {
    const members = chamber.body.members;
    const full = decideChamberVote(world, {
      stableKey: "test:full",
      question,
      members,
    });
    const named = new Set([members[1]!.memberKey, members[4]!.memberKey]);
    const few = decideChamberVote(world, {
      stableKey: "test:few",
      question,
      members,
      only: named,
    });
    expect(few).toEqual(full.filter((row) => named.has(row.memberKey)));
  });

  it("counts an empty seat as a vacancy, not a voter", () => {
    const members = chamber.body.members.map((member, index) =>
      index === 0 ? { ...member, personId: null } : member,
    );
    const decided = decideChamberVote(world, {
      stableKey: "test:vacancy",
      question,
      members,
    });
    expect(decided[0]).toEqual({
      memberKey: members[0]!.memberKey,
      personId: null,
      disposition: "absent",
    });
  });

  it("decides by party only where the parties contest the question", () => {
    const sponsorParty = publicPartyOf(world, assignment.sponsorPersonId);
    expect(sponsorParty).not.toBeNull();
    const ordinary = decideChamberVote(world, {
      stableKey: "test:party",
      question,
      members: chamber.body.members,
    });
    const override = decideChamberVote(world, {
      stableKey: "test:override",
      question: {
        ...question,
        question: { ...question.question, purpose: "veto-override" as const },
      },
      members: chamber.body.members,
    });
    for (const [index, entry] of ordinary.entries()) {
      if (entry.personId === assignment.sponsorPersonId) continue;
      const same = publicPartyOf(world, entry.personId!) === sponsorParty;
      expect(entry).toMatchObject({
        disposition: "yea",
        reason: same ? "member:party-cue:same" : "member:no-objection",
      });
      expect(override[index]).toMatchObject({
        disposition: same ? "yea" : "nay",
        reason: same ? "member:party-cue:same" : "member:party-cue:other",
      });
    }
    expect(new Set(override.map((entry) => entry.disposition)).size).toBe(2);
  });

  it("retains the exact formed belief behind a member's recorded reason", () => {
    const proposition = Object.values(world.policyCatalog.propositions)[0]!;
    const member = chamber.body.members.find(
      (entry) => entry.personId !== assignment.sponsorPersonId,
    )!;
    const beliefId = "belief:seated-vote-reason" as EntityId;
    const belief: PrivateBeliefRecord = {
      id: beliefId,
      stableKey: "test:seated-vote-reason",
      sequence: world.history.nextSequence - 1,
      personId: member.personId!,
      propositionId: proposition.id,
      formedAt: world.currentDate,
      position: "oppose",
      conviction: "settled",
      salience: "central",
      flexibility: "firm",
      rationale: null,
      formation: {
        reason: "experience:test",
        relevantEventIds: [],
        sourceFactIds: [],
        propositionExposureIds: [],
        memoryIds: [],
        eventKnowledgeIds: [],
        claimIds: [],
        relationshipInteractionIds: [],
        subjectKnowledgeIds: [],
        decisionTraceIds: [],
        cue: null,
        evidenceReference: null,
        note: null,
      },
      supersedesBeliefId: null,
    };
    const informed: World = {
      ...world,
      history: {
        ...world.history,
        privateBeliefs: [...world.history.privateBeliefs, belief],
        legislativeMeasures: world.history.legislativeMeasures!.map(
          (measure) =>
            measure.id === assignment.measureId
              ? {
                  ...measure,
                  propositionAnswers: [
                    { propositionId: proposition.id, answer: "yes" as const },
                  ],
                }
              : measure,
        ),
      },
    };
    const decided = decideChamberVote(informed, {
      stableKey: "test:belief-reason",
      question,
      members: [member],
    });
    expect(decided).toEqual([
      {
        memberKey: member.memberKey,
        personId: member.personId,
        disposition: "nay",
        reason: `member:private-belief:${beliefId}`,
      },
    ]);
  });
});
