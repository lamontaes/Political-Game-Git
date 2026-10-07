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
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";

const TRAIT = "personality-v1:playful-manner";
const SEED = "t9-playful-manner-two-person-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "playful-manner:low" | "playful-manner:high",
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
      note: "Focused proof fixture for the person's recorded social manner.",
    }),
    supersedesTendencyId: null,
  });
}

describe("playful manner's contact-answer reader", () => {
  it("changes the choice for two named people in a seeded random-place new game", () => {
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

    let world = confer(game.world, people[0]!.id, "playful-manner:high");
    world = confer(world, people[1]!.id, "playful-manner:low");
    const choose = (personId: EntityId) => {
      const considerations = registeredTraitConsiderations(
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
            description: "Suggest another day.",
          },
          { key: "decline", label: "Say no", description: "Do not meet." },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      return { considerations, evaluation };
    };

    const playful = choose(people[0]!.id);
    const serious = choose(people[1]!.id);
    console.info(
      "T9 playful-manner two-person trace",
      JSON.stringify({
        seed: SEED,
        worldId: world.id,
        simulationDate: world.currentDate,
        place: place.displayName,
        people: [
          {
            personId: people[0]!.id,
            name: personName(people[0]!),
            trait: "Playful",
            reasons: playful.considerations.map(
              ({ explanation }) => explanation,
            ),
            choice: playful.evaluation.selectedOptionKey,
          },
          {
            personId: people[1]!.id,
            name: personName(people[1]!),
            trait: "Serious",
            reasons: serious.considerations.map(
              ({ explanation }) => explanation,
            ),
            choice: serious.evaluation.selectedOptionKey,
          },
        ],
      }),
    );

    expect(playful.evaluation.selectedOptionKey).toBe("accept");
    expect(serious.evaluation.selectedOptionKey).toBe("decline");
    expect(playful.evaluation.context.randomness).toBe("none");
    expect(serious.evaluation.context.randomness).toBe("none");
  }, 60_000);
});
