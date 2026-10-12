import { afterAll, describe, expect, it, vi } from "vitest";
import { smallWorld } from "../../../tests/fixtures/small-world";
import { STATES } from "../../simulation/state-reference";
import { US_CONGRESS_RULE_PACK } from "../../simulation/congress-rule-pack";
import {
  NATIONAL_ELECTION_JURISDICTION,
  ensureNationalElectionJurisdiction,
} from "../../simulation/national-election-geography";
import { seatedCongressChamber } from "../../simulation/governing/congress-chambers";
import { introduceMeasure } from "../../simulation/legislation";
import {
  recordPrivateBelief,
  createFormationContext,
} from "../../simulation/politics";
import {
  recordPersonalityTendency,
  createMindProvenance,
} from "../../simulation/mind";
import { traitRegistryFor } from "../../simulation/trait-registry";
import { traitDefinitionFromPack } from "../../simulation/trait-packs";
import { readTrait } from "../../simulation/trait-readings";
import { PEOPLE_MIND_VERSION } from "../../simulation/people-trait-definitions";
import * as members from "../../simulation/legislative-member-decisions";
import * as chooser from "../../simulation/governing/member-vote-decision";
import { decideChamberVote } from "../../simulation/governing/chamber-votes";
import { weighRecordedPolicyBeliefs } from "./belief-weights";
import { deriveMemberDisposition } from "./member-disposition";
import { federalColleaguesOf as nativeColleagues } from "../../simulation/patronage/federal-circle";
import { federalColleaguesOf } from "./seated-officeholders";
import { currentStateExecutiveHolders } from "../../simulation/nationwide-world/state-executives";
import { projectCongress } from "../../simulation/living-world/congress";
import type { DecisionConsideration, World } from "../../simulation/types";

// The actor chooser remains native. Only its rule-consumer math is lifted;
// authored belief/trait records exercise private weighting through that caller.
describe("legislatures: recorded actor-input weights and account extraction", () => {
  let reweighted = 0;
  afterAll(() => expect(reweighted).toBeGreaterThan(0));
  it.each(Object.keys(STATES))(
    "matches native deliberation and member accounts in %s",
    (place) => {
      let world: World = smallWorld({
        place: `US-${place}`,
        seed: `rules2-actor-consumers:${place}`,
        offices: ["congress", "governor"],
      }).world;
      world = { ...world, control: { kind: "observer" } };
      world = ensureNationalElectionJurisdiction(world);
      const member = seatedCongressChamber(world, "house")!.body.members.find(
        (row) => row.personId,
      )!;
      const personId = member.personId!;
      const question = world.policyCatalog.propositionOrder
        .map((id) => world.policyCatalog.propositions[id]!)
        .find((row) =>
          world.policyCatalog.issues[row.issueId]?.levels?.includes("federal"),
        )!;
      world = introduceMeasure(world, {
        stableKey: `rules2:${place}:actor-bill`,
        jurisdictionId: NATIONAL_ELECTION_JURISDICTION.id,
        rulePackId: US_CONGRESS_RULE_PACK.packId,
        designation: "H.R. 902",
        shortTitle: "Authored deliberation control",
        summary: "Native actor-input edge.",
        origin: "member-introduction",
        subjectClass: "general-policy",
        sponsorPersonId: personId,
        originChamberKey: "house",
        propositionIds: [question.id],
        propositionAnswers: [{ propositionId: question.id, answer: "yes" }],
      });
      const measure = world.history.legislativeMeasures!.at(-1)!;
      world = recordPrivateBelief(world, {
        stableKey: `rules2:${place}:actor-view`,
        personId,
        propositionId: question.id,
        formedAt: world.currentDate,
        position: "support",
        conviction: "strong",
        salience: "central",
        flexibility: "firm",
        rationale: "Authored actor-input control.",
        formation: createFormationContext("experience:life", {
          note: "Authored recorded-view control.",
        }),
        supersedesBeliefId: null,
      });
      const trait = traitRegistryFor(world).traits.get(
        `${PEOPLE_MIND_VERSION}:deliberation`,
      )!;
      expect(trait).toBeDefined();
      const tendencyId = traitDefinitionFromPack(trait).id;
      // This generated fixture omits this registered trait's catalog entry.
      // Admit its unchanged declaration before the native tendency writer.
      world = {
        ...world,
        mindCatalog: {
          ...world.mindCatalog,
          tendencyOrder: [
            ...new Set([...world.mindCatalog.tendencyOrder, tendencyId]),
          ],
          tendencies: {
            ...world.mindCatalog.tendencies,
            [tendencyId]: traitDefinitionFromPack(trait),
          },
        },
      };
      const asked: members.MemberVoteQuestion = {
        question: {
          measureId: measure.id,
          purpose: "floor-stage",
          forumKey: "house",
          floorStageKey: null,
          amendmentStableKey: null,
          provisionKey: null,
        },
        questionLabel: "Authored policy passage",
      };
      for (const expressionKey of [
        trait.scale.balancedKey,
        trait.poles.low.key,
        trait.poles.high.key,
      ]) {
        world = recordPersonalityTendency(world, {
          stableKey: `rules2:${place}:actor-trait:${expressionKey}`,
          personId,
          tendencyId,
          recordedAt: world.currentDate,
          expressionKey,
          strength: "strong",
          confidence: "medium",
          scopeTags: [],
          provenance: createMindProvenance("authored", {
            note: "Explicit trait-pole edge.",
          }),
          supersedesTendencyId:
            world.history.personalityTendencies
              .filter(
                (row) =>
                  row.personId === personId && row.tendencyId === tendencyId,
              )
              .at(-1)?.id ?? null,
        });
        let beforeWeights: readonly DecisionConsideration[] = [];
        const actorInputs: Parameters<typeof chooser.decideMemberVote>[1][] =
          [];
        const reasonOriginal = members.memberVoteConsiderations,
          actorOriginal = chooser.decideMemberVote;
        const reasons = vi
          .spyOn(members, "memberVoteConsiderations")
          .mockImplementation((at, input) => {
            const result = reasonOriginal(at, input);
            beforeWeights = result.filter(
              (row) => row.stableKey !== "member:nothing-decisive",
            );
            return result;
          });
        const actor = vi
          .spyOn(chooser, "decideMemberVote")
          .mockImplementation((at, input) => {
            actorInputs.push(input);
            return actorOriginal(at, input);
          });
        try {
          decideChamberVote(world, {
            stableKey: `rules2:${place}:actor-floor:${expressionKey}`,
            question: asked,
            members: [member],
            playerPersonId: null,
          });
        } finally {
          reasons.mockRestore();
          actor.mockRestore();
        }
        const weighted = weighRecordedPolicyBeliefs(
          readTrait(world, personId, trait),
          personId,
          beforeWeights,
        );
        const keys = new Set(beforeWeights.map((row) => row.stableKey));
        expect(actorInputs.length).toBeGreaterThan(0);
        expect(
          actorInputs[0]!.considerations.filter((row) =>
            keys.has(row.stableKey),
          ),
        ).toEqual(weighted);
        if (
          weighted.some(
            (row, index) => row.importance !== beforeWeights[index]?.importance,
          )
        )
          reweighted++;
        let receipt: ReturnType<typeof chooser.decideMemberVote> | null = null;
        const selected = vi
          .spyOn(chooser, "decideMemberVote")
          .mockImplementation((at, input) => {
            receipt = actorOriginal(at, input);
            return receipt;
          });
        const input = {
          stableKey: `rules2:${place}:actor-account:${expressionKey}`,
          personId,
          question: asked,
        };
        let expected;
        try {
          expected = members.deriveMemberDisposition(world, input);
        } finally {
          selected.mockRestore();
        }
        expect(receipt).not.toBeNull();
        const { world: written, ...result } = expected;
        expect(written).toBeDefined();
        expect(
          deriveMemberDisposition(
            {
              personIds: new Set(world.personOrder),
              measure,
              memberEvaluation: receipt!,
            },
            input,
          ),
        ).toEqual(result);
      }
      expect(
        federalColleaguesOf({
          congress: projectCongress(world),
          stateExecutiveHolders: currentStateExecutiveHolders(world),
        }),
      ).toEqual(nativeColleagues(world));
    },
    30000,
  );
});
