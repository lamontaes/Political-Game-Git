import { afterAll, describe, expect, it, vi } from "vitest";
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
import * as nativeLegislation from "../../simulation/legislation";
import * as nativeProvisions from "../../simulation/legislative-politics";
import { measureAnswersAt } from "../../simulation/vote-bundle";
import * as nativeProcedure from "../../simulation/legislative-procedure-world";
import { knownRule } from "../../simulation/legislature-rules";
import {
  offerPlannedAmendment,
  type AmendmentOfferFacts,
  type AmendmentOfferPlan,
} from "./amendment-offers";
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
  let positivePlans = 0;
  let adoptedSections = 0;
  afterAll(() => {
    expect(positivePlans).toBeGreaterThan(0);
    expect(adoptedSections).toBeGreaterThan(0);
  });
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
        subjectClass: "appropriation",
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
        chamber = US_CONGRESS_RULE_PACK.chambers.find(
          (row) => row.chamberKey === "house",
        )!,
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
      const fullBody = seatedCongressChamber(world, "house")!.body;
      const committee = chamber.committees[0]!;
      world = nativeLegislation.referMeasure(world, {
        stableKey: `rules2:${place}:amendment-referral`,
        measureId: measure.id,
        committeeKey: committee.committeeKey,
      });
      world = nativeLegislation.recordCommitteeDisposition(world, {
        stableKey: `rules2:${place}:amendment-report`,
        measureId: measure.id,
        recommendation: "favorable",
        rationale:
          "Authored committee recommendation for the amendment golden.",
        dispositions: fullBody.members
          .slice(0, committee.appointedMembers)
          .map((row) => ({
            memberKey: row.memberKey,
            personId: row.personId,
            disposition: "yea",
          })),
        provenance: {
          method: "authored-fixture",
          note: "Authored committee edge",
          sourceEntityIds: [],
        },
      });
      world = nativeLegislation.placeMeasureOnCalendar(world, {
        stableKey: `rules2:${place}:amendment-calendar`,
        measureId: measure.id,
      });
      // Shared actor preparation stays an explicit upstream World boundary.
      const prepared = native.formAmendmentAuthorsViews(world, input);
      const offerFacts = (
        at: World,
        adoptedPlan: AmendmentOfferFacts["adoptedPlan"],
      ): AmendmentOfferFacts => ({
        onDate: at.currentDate,
        measure,
        answers: measureAnswersAt(at, measure.id),
        beliefs: at.history.privateBeliefs,
        playerPersonId: null,
        parties: new Map(
          at.personOrder.map((id) => [id, publicPartyOf(at, id)]),
        ),
        personIds: new Set(at.personOrder),
        votes: new Map(),
        amendments: at.history.legislativeAmendments ?? [],
        provisions: nativeProvisions.currentMeasureProvisions(at, measure.id),
        policyCatalog: at.policyCatalog,
        jurisdictionNames: new Map(
          at.jurisdictionOrder.map((id) => [id, at.jurisdictions[id]!.name]),
        ),
        prepared: true,
        adoptedPlan,
        voteFacts: null,
      });
      const before = offerFacts(prepared, null);
      expect(
        offerPlannedAmendment({ ...before, prepared: false }, input),
      ).toEqual({
        kind: "prepare",
        commands: [{ command: "formAmendmentAuthorsViews", input }],
      });
      const offers: {
        input: Parameters<typeof nativeLegislation.offerFloorAmendment>[1];
        world: World;
      }[] = [];
      const revisions: Parameters<
        typeof nativeProvisions.adoptProvisionRevisions
      >[1][] = [];
      receipts.length = 0;
      const offerOriginal = nativeLegislation.offerFloorAmendment;
      const revisionOriginal = nativeProvisions.adoptProvisionRevisions;
      const offerCapture = vi
        .spyOn(nativeLegislation, "offerFloorAmendment")
        .mockImplementation((at, request) => {
          // Congress's unchanged packs leave amendment admission unresolved.
          // Preserve that refusal, then use an explicitly authored admission
          // control to test the parent request/resume math and actual writer.
          // This is a boundary golden, never an ordinary congressional event.
          expect(() => offerOriginal(at, request)).toThrow(/unresolved/);
          const readPack = nativeProcedure.legislativeRulePackForWorld;
          const admission = vi
            .spyOn(nativeProcedure, "legislativeRulePackForWorld")
            .mockImplementation((at, packId) => {
              const pack = readPack(at, packId);
              return {
                ...pack,
                chambers: pack.chambers.map((row) => {
                  const source = {
                    ...row.referral.source,
                    authority: "game-profile" as const,
                    verification: "game-profile" as const,
                    citation: "Authored amendment-admission edge",
                    sourceTitle: "Authored golden input",
                    sourceUrl: null,
                  };
                  return {
                    ...row,
                    amendments: {
                      ...row.amendments,
                      floorAmendmentsAllowed: knownRule(true, source),
                    },
                    floorStages: row.floorStages.map((stage) => ({
                      ...stage,
                      amendable: knownRule(true, source),
                    })),
                  };
                }),
              };
            });
          try {
            const next = offerOriginal(at, request);
            offers.push({ input: request, world: next });
            return next;
          } finally {
            admission.mockRestore();
          }
        });
      const revisionCapture = vi
        .spyOn(nativeProvisions, "adoptProvisionRevisions")
        .mockImplementation((at, request) => {
          revisions.push(request);
          return revisionOriginal(at, request);
        });
      const voteCapture = vi
        .spyOn(nativeVotes, "decideChamberVote")
        .mockImplementation((at, request, options) => {
          const rows = original(at, request, options);
          receipts.push({ key: key(request), rows });
          return rows;
        });
      let after: World;
      try {
        after = native.offerPlannedAmendment(prepared, input);
      } finally {
        offerCapture.mockRestore();
        revisionCapture.mockRestore();
        voteCapture.mockRestore();
      }
      index = 0;
      const offerReplay = vi
        .spyOn(ownVotes, "decideChamberVote")
        .mockImplementation((_facts, request) => {
          const receipt = receipts[index++]!;
          expect(key(request)).toBe(receipt.key);
          return receipt.rows;
        });
      try {
        const plan = offerPlannedAmendment(before, input) as AmendmentOfferPlan;
        expect(index).toBe(receipts.length);
        if (!offers.length) expect(plan.kind).toBe("idle");
        else {
          positivePlans++;
          expect(plan.kind).toBe("applied");
          expect(plan.commands![0]!.command).toBe("offerFloorAmendment");
          // Only the already-registered English explanation is outside this math shelf.
          const omitExplanation = (
            request: (typeof offers)[number]["input"],
          ) => ({
            ...request,
            provenance: { ...request.provenance, note: undefined },
          });
          expect(
            omitExplanation(
              plan.commands![0]!.input as (typeof offers)[number]["input"],
            ),
          ).toEqual(omitExplanation(offers[0]!.input));
          const resume = offerPlannedAmendment(
            offerFacts(offers[0]!.world, plan.resumePlan!),
            input,
          );
          expect(index).toBe(receipts.length); // No second actor evaluation on resume.
          if (revisions.length) {
            adoptedSections++;
            expect(resume).toEqual({
              kind: "applied",
              commands: [
                { command: "adoptProvisionRevisions", input: revisions[0] },
              ],
            });
          } else expect(resume.kind).toBe("idle");
          expect(
            offerPlannedAmendment(offerFacts(after!, null), input).kind,
          ).toBe("idle");
          expect(native.offerPlannedAmendment(after!, input)).toBe(after!);
        }
      } finally {
        offerReplay.mockRestore();
      }
    },
    30000,
  );
});
