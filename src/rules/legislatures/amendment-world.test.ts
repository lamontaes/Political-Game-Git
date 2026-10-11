import { describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { withQuestions } from "../../simulation/vote-bundle.fixture";
import {
  ensureNationalElectionJurisdiction,
  NATIONAL_ELECTION_JURISDICTION,
} from "../../simulation/national-election-geography";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import {
  recordPrivateBelief,
  recordPublicPosition,
  createFormationContext,
} from "../../simulation/politics";
import { publicPartyOf } from "../../simulation/governing/chamber-votes";
import * as nativeVotes from "../../simulation/governing/chamber-votes";
import * as ownVotes from "./chamber-vote";
import * as native from "../../simulation/governing/amendment-authors";
import { introduceMeasure } from "../../simulation/legislation";
import {
  planFloorAmendment,
  type AmendmentPlanningFacts,
} from "./amendment-plans";
import type { World, LegislativeVoteDisposition } from "../../simulation/types";
function key(input: Parameters<typeof nativeVotes.decideChamberVote>[1]) {
  return JSON.stringify({
    stableKey: input.stableKey,
    question: "question" in input ? input.question : null,
    members: input.members,
    only: input.only ? [...input.only] : null,
    nonpartisan: "nonpartisan" in input ? (input.nonpartisan ?? false) : false,
  });
}
function math(plan: ReturnType<typeof planFloorAmendment>) {
  if (!plan) return null;
  const { reasoning, ...rest } = plan;
  void reasoning;
  return rest;
}
describe("legislatures: amendment planning through native public caller", () => {
  it.each(Object.keys(STATES))(
    "matches candidate, prediction-cache and motive math in %s",
    (place) => {
      const setup = withQuestions(
        ensureNationalElectionJurisdiction(
          smallWorld({
            place: `US-${place}`,
            seed: `rules2-leg-amendment:${place}`,
            offices: ["congress"],
          }).world,
        ),
      );
      let world: World = setup.world;
      const members = seatedCongressChamber(world, "house")!
        .body.members.filter((row) => row.personId !== null)
        .slice(0, 9);
      const sponsor = members[0]!.personId!;
      world = { ...world, control: { kind: "person", personId: sponsor } };
      world = introduceMeasure(world, {
        stableKey: `rules2:${place}:amendment-bill`,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_RULE_PACK.packId,
        designation: "H.R. 1",
        shortTitle: "Authored amendment edge",
        summary: "Authored measure for equivalence.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: sponsor,
        originChamberKey: "house",
        propositionIds: [setup.transitId],
        propositionAnswers: [{ propositionId: setup.transitId, answer: "yes" }],
      });
      world = { ...world, control: { kind: "observer" } };
      for (const [index, member] of members.entries())
        for (const [topic, propositionId] of [
          ["transit", setup.transitId],
          ["work", setup.workRuleId],
        ] as const) {
          const position =
            topic === "transit"
              ? index < 4 || index >= 6
                ? "support"
                : "oppose"
              : index < 6
                ? "support"
                : "oppose";
          world = recordPrivateBelief(world, {
            stableKey: `rules2:${place}:amendment-view:${index}:${topic}`,
            personId: member.personId!,
            propositionId,
            formedAt: world.currentDate,
            position,
            conviction: "strong",
            salience: topic === "work" ? "central" : "moderate",
            flexibility: "firm",
            rationale: null,
            formation: createFormationContext("reflection:initial"),
            supersedesBeliefId: null,
          });
          world = recordPublicPosition(world, {
            stableKey: `rules2:${place}:amendment-stated:${index}:${topic}`,
            personId: member.personId!,
            propositionId,
            statedAt: world.currentDate,
            stance: position,
            statement: "Authored statement edge",
            audience: "public",
            venue: null,
            sourceEventId: null,
            supersedesPublicPositionId: null,
          });
        }
      const measure = world.history.legislativeMeasures!.at(-1)!,
        chamber = US_CONGRESS_RULE_PACK.chambers[0]!,
        stage = chamber.floorStages[0]!;
      const input: native.AmendmentAuthorsInput = {
        measureId: measure.id,
        chamber,
        stage,
        members,
        stableKey: `rules2:${place}:amendment`,
        admissible: (_bill, part) => part.propositionId === setup.workRuleId,
      };
      const receipts: {
        key: string;
        rows: readonly LegislativeVoteDisposition[];
      }[] = [];
      const original = nativeVotes.decideChamberVote;
      const capture = vi
        .spyOn(nativeVotes, "decideChamberVote")
        .mockImplementation((at, input, options) => {
          const rows = original(at, input, options);
          receipts.push({ key: key(input), rows });
          return rows;
        });
      let expected: ReturnType<typeof native.planFloorAmendment>;
      try {
        expected = native.planFloorAmendment(world, input);
      } finally {
        capture.mockRestore();
      }
      expect(receipts.length).toBeGreaterThan(0);
      let index = 0;
      // Parent-kernel golden with the already independently tested chamber rule as
      // an explicit dependency seam. Exact questions/rosters/subset order are checked;
      // these receipts do not replace any production fact or shared actor chooser.
      const replay = vi
        .spyOn(ownVotes, "decideChamberVote")
        .mockImplementation((_facts, input) => {
          const receipt = receipts[index++]!;
          expect(key(input)).toBe(receipt.key);
          return receipt.rows;
        });
      try {
        const facts: AmendmentPlanningFacts = {
          onDate: world.currentDate,
          measure,
          answers: measure.propositionAnswers ?? [],
          beliefs: world.history.privateBeliefs,
          playerPersonId: null,
          parties: new Map(
            world.personOrder.map((id) => [id, publicPartyOf(world, id)]),
          ),
          personIds: new Set(world.personOrder),
          votes: new Map(),
        };
        expect(math(planFloorAmendment(facts, input))).toEqual(math(expected!));
        expect(index).toBe(receipts.length);
      } finally {
        replay.mockRestore();
      }
    },
    30000,
  );
});
