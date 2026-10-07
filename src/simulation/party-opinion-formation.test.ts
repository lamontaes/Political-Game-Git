import { describe, expect, it } from "vitest";
import { createDemoWorld } from "./demo";
import { PARTY_QUESTIONS } from "./party-questions-data";
import {
  evaluatePoliticalBeliefFormation,
  applyNpcPoliticalBeliefFormation,
} from "./political-belief-formation";
import { partyOpinionSubject } from "./political-opinion-subjects";
import { deserializeWorld, serializeWorld } from "./serialization";
import { assertWorldIntegrity } from "./world";
import { createNewGameWorld } from "../presentation/new-game";
import { sampledProofLocalityForState } from "../presentation/new-game-geography";
import { lifePlaceStateIdentities } from "./life-places";

describe("canonical party opinions in the one belief pipeline", () => {
  it("records no opinion from missing reasons for actual people in all 56 places", () => {
    const places = lifePlaceStateIdentities();
    expect(places).toHaveLength(56);
    for (const place of places) {
      const seed = `n2-party-no-opinion:${place.usps}`;
      const game = createNewGameWorld({
        startKind: "custom",
        placeKey: sampledProofLocalityForState(place.jurisdictionKey).key,
        startAge: 34,
        depth: "summarize-earlier-life",
        startingLife: "ordinary-life",
        household: "shares-a-home",
        seed,
        givenName: null,
        familyName: null,
      });
      const personId = game.world.personOrder.find(
        (id) => id !== game.playerPersonId,
      )!;
      expect(personId, `${place.name}/${seed}`).toBeDefined();
      const proposal = evaluatePoliticalBeliefFormation(game.world, {
        stableKey: "fixture:missing-reasons",
        personId,
        subject: partyOpinionSubject(PARTY_QUESTIONS[0].key),
        randomness: "none",
      });
      expect(proposal.outcome, `${place.name}/${seed}`).toBe("no-opinion");
      const next = applyNpcPoliticalBeliefFormation(game.world, proposal);
      expect(next.history.privateBeliefs, `${place.name}/${seed}`).toEqual(
        game.world.history.privateBeliefs,
      );
      expect(next.history.decisionTraces.at(-1)?.selectedOptionKey).toBe(
        "no-opinion",
      );
      const saved = deserializeWorld(serializeWorld(next));
      expect(saved.history.decisionTraces.at(-1)?.context.subject.key).toBe(
        `party-question:${PARTY_QUESTIONS[0].key}`,
      );
    }
  }, 120_000);
  it.each(
    PARTY_QUESTIONS.flatMap((question) =>
      question.options.map((option) => ({ question, option })),
    ),
  )(
    "saves $question.key / $option.key with its own subject and durable reason",
    ({ question, option }) => {
      let world = createDemoWorld(
        `party-opinion:${question.key}:${option.key}`,
      );
      const personId = world.personOrder[1]!;
      const proposal = evaluatePoliticalBeliefFormation(world, {
        stableKey: "fixture:canonical-party-view",
        personId,
        subject: partyOpinionSubject(question.key),
        randomness: "none",
        beliefDimensions: {
          conviction: "strong",
          salience: "high",
          flexibility: "conditional",
        },
        factors: [
          {
            stableKey: "explicit-fixture",
            favors: `option:${option.key}`,
            sourceType: "context:fixture",
            importance: "decisive",
            confidence: "high",
            explanation: "Explicit categorical test preference.",
            sourceRefs: [],
          },
        ],
      });
      expect(proposal.outcome).toBe(`option:${option.key}`);
      world = applyNpcPoliticalBeliefFormation(world, proposal);
      const belief = world.history.privateBeliefs.at(-1)!;
      expect(belief).toMatchObject({
        propositionId: null,
        subject: partyOpinionSubject(question.key),
        optionKey: option.key,
      });
      expect(belief.formation.decisionTraceIds).toEqual([
        world.history.decisionTraces.at(-1)!.id,
      ]);
      expect(world.policyCatalog.propositionOrder).not.toContain(question.key);
      const saved = deserializeWorld(serializeWorld(world));
      expect(saved.history.privateBeliefs).toEqual(
        world.history.privateBeliefs,
      );
      const again = evaluatePoliticalBeliefFormation(saved, {
        stableKey: "fixture:reconsider",
        personId,
        subject: partyOpinionSubject(question.key),
        randomness: "none",
        beliefDimensions: {
          conviction: "strong",
          salience: "high",
          flexibility: "conditional",
        },
      });
      expect(again.outcome).toBe(`option:${option.key}`);
      const continued = applyNpcPoliticalBeliefFormation(saved, again);
      expect(continued.history.privateBeliefs.at(-1)!.supersedesBeliefId).toBe(
        belief.id,
      );
      assertWorldIntegrity(continued);
    },
  );

  it("rejects missing subjects and categorical outcomes from another question", () => {
    const world = createDemoWorld("party-opinion:invalid");
    expect(() => partyOpinionSubject("unregistered:question")).toThrow(
      /Unknown party question/,
    );
    expect(() =>
      evaluatePoliticalBeliefFormation(world, {
        stableKey: "bad-option",
        personId: world.personOrder[1]!,
        subject: partyOpinionSubject(PARTY_QUESTIONS[0].key),
        factors: [
          {
            stableKey: "wrong-option",
            favors: "option:household-costs",
            sourceType: "context:fixture",
            importance: "decisive",
            confidence: "high",
            explanation: "Invalid option fixture",
            sourceRefs: [],
          },
        ],
      }),
    ).toThrow(/Invalid political belief-formation outcome/);
  });
});
