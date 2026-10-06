import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { BARGAINING_ANSWER_OFFER_DECISION } from "../../legislative-bargaining-decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { personName } from "../../people";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { DecisionEvaluation, EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-calm";
const SEED = "t9-facet-calm-two-person-proof";

function conferCalm(
  world: World,
  personId: EntityId,
  expressionKey: "facet-calm:high" | "facet-calm:unmarked",
): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT)!;
  const withCatalog = ensurePeopleTraitCatalog(world);
  const definition = traitDefinitionFromPack(trait);
  const ready: World = withCatalog.mindCatalog.tendencies[definition.id]
    ? withCatalog
    : {
        ...withCatalog,
        mindCatalog: {
          ...withCatalog.mindCatalog,
          tendencies: {
            ...withCatalog.mindCatalog.tendencies,
            [definition.id]: definition,
          },
          tendencyOrder: [
            ...withCatalog.mindCatalog.tendencyOrder,
            definition.id,
          ],
        },
      };
  return recordPersonalityTendency(ready, {
    stableKey: `${SEED}:${personId}:${expressionKey}`,
    personId,
    tendencyId: definition.id,
    recordedAt: ready.currentDate,
    expressionKey,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["government:bargaining"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded calm facet.",
    }),
    supersedesTendencyId: null,
  });
}

describe("calm's bargaining decision reader", () => {
  it("changes the offer response for two people differing only in calm in a random new-game place", () => {
    const rng = new SeededRng(SEED);
    const state = rng.pick(lifePlaceStateIdentities());
    const place = rng.pick(
      searchLifePlaces("", Number.MAX_SAFE_INTEGER, {
        stateJurisdictionKey: state.jurisdictionKey,
      }),
    );
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      startKind: "custom",
      seed: SEED,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
      placeKey: place.key,
      household: "shares-a-home",
    });
    const people = Object.values(game.world.people)
      .filter((person) => person.id !== game.playerPersonId)
      .slice(0, 2);
    expect(people).toHaveLength(2);

    let world = conferCalm(game.world, people[0]!.id, "facet-calm:high");
    world = conferCalm(world, people[1]!.id, "facet-calm:unmarked");
    const decide = (personId: EntityId): DecisionEvaluation =>
      evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: BARGAINING_ANSWER_OFFER_DECISION.id,
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: {
          kind: "context:legislative-bargaining",
          key: "offer-response",
          entityId: null,
        },
        options: [
          {
            key: "hold-off",
            label: "Hold out",
            description: "Hold out for the original ask.",
          },
          {
            key: "take-the-offer",
            label: "Take the offer",
            description: "Work with the language on the table.",
          },
        ],
        constraints: [],
        considerations: [
          {
            stableKey: `${SEED}:${personId}:original-ask`,
            optionKey: "hold-off",
            sourceType: "context:legislative-bargaining",
            direction: "supports",
            importance: "slight",
            confidence: "medium",
            explanation: "The original ask still serves their priorities.",
            sourceRefs: [],
          },
          ...registeredTraitConsiderations(
            world,
            loadedTraitRegistry(),
            personId,
            `${SEED}:${personId}`,
            BARGAINING_ANSWER_OFFER_DECISION.id,
          ),
        ],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });

    const calmDecision = decide(people[0]!.id);
    const unmarkedDecision = decide(people[1]!.id);
    expect(calmDecision.selectedOptionKey).toBe("take-the-offer");
    expect(unmarkedDecision.selectedOptionKey).toBe("hold-off");
    expect(calmDecision.context.considerations).toHaveLength(2);
    expect(unmarkedDecision.context.considerations).toHaveLength(1);

    process.stdout.write(
      `${JSON.stringify({
        receipt: "T9 facet-calm two-person decision trace",
        seed: SEED,
        worldId: world.id,
        currentDate: world.currentDate,
        place: place.displayName,
        jurisdiction: place.stateJurisdictionKey,
        people: [
          {
            name: personName(people[0]!),
            facetCalm: "calm",
            selected: calmDecision.selectedOptionKey,
            reasons: calmDecision.context.considerations.map(
              ({ explanation }) => explanation,
            ),
          },
          {
            name: personName(people[1]!),
            facetCalm: "known unmarked",
            selected: unmarkedDecision.selectedOptionKey,
            reasons: unmarkedDecision.context.considerations.map(
              ({ explanation }) => explanation,
            ),
          },
        ],
      })}\n`,
    );
  }, 60_000);
});
