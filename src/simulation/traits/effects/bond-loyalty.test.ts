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
import type { DecisionEvaluation, EntityId, World } from "../../types";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";

const TRAIT = "personality-v1:bond-loyalty";
const SEED = "t9-bond-loyalty-two-person-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "bond-loyalty:low" | "bond-loyalty:high",
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
      note: "Focused proof fixture for the person's recorded bond loyalty.",
    }),
    supersedesTendencyId: null,
  });
}

describe("bond loyalty's contact decision reader", () => {
  it("changes the same choice for two named people in a seeded random new-game place", () => {
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

    let world = confer(game.world, people[0]!.id, "bond-loyalty:high");
    world = confer(world, people[1]!.id, "bond-loyalty:low");
    const choose = (personId: EntityId): DecisionEvaluation => {
      const considerations = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        `${SEED}:${personId}`,
        CONTACT_ANSWER_DECISION.id,
      );
      expect(considerations).toHaveLength(1);
      return evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: "people.contact-answer",
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: { kind: "context:life", key: "known-contact", entityId: null },
        options: [
          { key: "accept", label: "Accept", description: "Accept the plan." },
          {
            key: "counter",
            label: "Counter",
            description: "Offer another plan.",
          },
          {
            key: "decline",
            label: "Decline",
            description: "Decline the plan.",
          },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
    };

    const loyal = choose(people[0]!.id);
    const disloyal = choose(people[1]!.id);
    const trace = {
      seed: SEED,
      worldId: game.world.id,
      date: world.currentDate,
      place: place.displayName,
      people: [
        {
          id: people[0]!.id,
          name: personName(people[0]!),
          trait: "Loyal",
          choice: loyal.selectedOptionKey,
          reasons: loyal.context.considerations.map(
            ({ explanation }) => explanation,
          ),
        },
        {
          id: people[1]!.id,
          name: personName(people[1]!),
          trait: "Disloyal",
          choice: disloyal.selectedOptionKey,
          reasons: disloyal.context.considerations.map(
            ({ explanation }) => explanation,
          ),
        },
      ],
    };
    console.info("T9 bond-loyalty proof", JSON.stringify(trace, null, 2));

    expect(loyal.selectedOptionKey, JSON.stringify(trace)).toBe("accept");
    expect(disloyal.selectedOptionKey, JSON.stringify(trace)).toBe("decline");
  }, 60_000);
});
