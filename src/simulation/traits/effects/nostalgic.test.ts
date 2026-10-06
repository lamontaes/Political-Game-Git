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

const TRAIT = "personality-v1:facet-nostalgic";
const SEED = "team-9-facet-nostalgic-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "facet-nostalgic:unmarked" | "facet-nostalgic:high",
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
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Two-person proof differing only in recorded nostalgia.",
    }),
    supersedesTendencyId: null,
  });
}

describe("nostalgic contact decision effect", () => {
  it("makes two people differing only in nostalgia choose differently in a random new-game place", () => {
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

    let world = confer(game.world, people[0]!.id, "facet-nostalgic:high");
    world = confer(world, people[1]!.id, "facet-nostalgic:unmarked");

    const choose = (personId: EntityId) => {
      const sharedReason: DecisionConsideration = {
        stableKey: `${SEED}:${personId}:busy`,
        optionKey: "decline",
        sourceType: "context:schedule",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation: "They already have demands on their time.",
        sourceRefs: [],
      };
      const considerations = [
        sharedReason,
        ...registeredTraitConsiderations(
          world,
          loadedTraitRegistry(),
          personId,
          `${SEED}:${personId}`,
          CONTACT_ANSWER_DECISION.id,
        ),
      ];
      return evaluateDecision(world, {
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
          { key: "decline", label: "Say no", description: "Leave it." },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
    };

    const nostalgic = choose(people[0]!.id);
    const unmarked = choose(people[1]!.id);
    console.info(
      "facet-nostalgic two-person trace",
      JSON.stringify({
        seed: SEED,
        worldId: world.id,
        simulationDate: world.currentDate,
        place: place.displayName,
        people: [
          {
            name: personName(people[0]!),
            nostalgia: "strong",
            selected: nostalgic.selectedOptionKey,
            considerations: nostalgic.context.considerations,
          },
          {
            name: personName(people[1]!),
            nostalgia: "unmarked",
            selected: unmarked.selectedOptionKey,
            considerations: unmarked.context.considerations,
          },
        ],
      }),
    );

    expect(nostalgic.selectedOptionKey).toBe("accept");
    expect(unmarked.selectedOptionKey).toBe("decline");
    expect(nostalgic.context.randomness).toBe("none");
    expect(unmarked.context.randomness).toBe("none");
  }, 60_000);
});
