import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { personName } from "../../people";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { DecisionConsideration, EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-slow-to-warm-up";
const SEED = "t9-facet-slow-to-warm-up-two-person-proof";

function conferSlowToWarmUp(world: World, personId: EntityId): World {
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
    stableKey: `${SEED}:${personId}:slow-to-warm-up`,
    personId,
    tendencyId: definition.id,
    recordedAt: ready.currentDate,
    expressionKey: "facet-slow-to-warm-up:high",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["social:approach"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded social approach.",
    }),
    supersedesTendencyId: null,
  });
}

describe("slow-to-warm-up's contact-answer reader", () => {
  it("changes the choice for two otherwise matched people in a seeded random new-game place", () => {
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

    const world = conferSlowToWarmUp(game.world, people[0]!.id);
    const sharedReason: DecisionConsideration = {
      stableKey: `${SEED}:shared-free-evening`,
      optionKey: "accept",
      sourceType: "context:life",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "They have a free evening and would enjoy company.",
      sourceRefs: [],
    };
    const choose = (personId: EntityId) => {
      const traitReasons = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        `${SEED}:${personId}`,
        CONTACT_ANSWER_DECISION.id,
      );
      const evaluation = evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: "people.contact-answer",
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: {
          kind: "context:life",
          key: "meeting-request",
          entityId: null,
        },
        options: [
          { key: "accept", label: "Agree", description: "Meet that day." },
          {
            key: "counter",
            label: "Offer another day",
            description: "Suggest a later day.",
          },
          { key: "decline", label: "Say no", description: "Do not meet." },
        ],
        constraints: [],
        considerations: [sharedReason, ...traitReasons],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      return { evaluation, traitReasons };
    };

    const slow = choose(people[0]!.id);
    const unmarked = choose(people[1]!.id);
    const trace = {
      seed: SEED,
      worldId: world.id,
      date: world.currentDate,
      place: place.displayName,
      people: [
        {
          id: people[0]!.id,
          name: personName(people[0]!),
          trait: "slow-to-warm-up: strong",
          reasons: slow.evaluation.context.considerations.map(
            ({ optionKey, explanation }) => ({ optionKey, explanation }),
          ),
          choice: slow.evaluation.selectedOptionKey,
        },
        {
          id: people[1]!.id,
          name: personName(people[1]!),
          trait: "unrecorded",
          reasons: unmarked.evaluation.context.considerations.map(
            ({ optionKey, explanation }) => ({ optionKey, explanation }),
          ),
          choice: unmarked.evaluation.selectedOptionKey,
        },
      ],
    };
    console.info("T9 facet-slow-to-warm-up proof", JSON.stringify(trace));

    expect(slow.traitReasons).toHaveLength(1);
    expect(unmarked.traitReasons).toHaveLength(0);
    expect(slow.evaluation.selectedOptionKey).toBe("counter");
    expect(unmarked.evaluation.selectedOptionKey).toBe("accept");
  }, 60_000);
});
