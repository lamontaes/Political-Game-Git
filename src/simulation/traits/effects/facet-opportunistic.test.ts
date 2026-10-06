import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { ANOTHER_TERM_DECISION } from "../../careers/another-term-decision";
import { evaluateDecision } from "../../decisions";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { traitDefinitionFromPack } from "../../trait-packs";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-opportunistic";

function confer(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT);
  if (!trait) throw new Error(`The build does not load ${TRAIT}.`);
  const definition = traitDefinitionFromPack(trait);
  const withCatalog: World = {
    ...world,
    mindCatalog: {
      ...world.mindCatalog,
      tendencies: {
        ...world.mindCatalog.tendencies,
        [definition.id]: definition,
      },
      tendencyOrder: world.mindCatalog.tendencyOrder.includes(definition.id)
        ? world.mindCatalog.tendencyOrder
        : [...world.mindCatalog.tendencyOrder, definition.id],
    },
  };
  return recordPersonalityTendency(withCatalog, {
    stableKey: `proof:${TRAIT}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: withCatalog.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Controlled proof of the registered trait reader.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-opportunistic effect reader", () => {
  it("adds a recorded reason for one named person and none for a peer without the trait", () => {
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed: "session-81-opportunistic-proof",
      startKind: "custom",
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
    });
    const [opportunisticId, peerId] = game.world.personOrder.filter(
      (id) => id !== game.playerPersonId,
    );
    expect(opportunisticId).toBeDefined();
    expect(peerId).toBeDefined();
    const world = confer(game.world, opportunisticId!);
    const registry = loadedTraitRegistry();

    const opportunistic = registeredTraitConsiderations(
      world,
      registry,
      opportunisticId!,
      "another-term:proof",
      ANOTHER_TERM_DECISION.id,
    );
    const peer = registeredTraitConsiderations(
      world,
      registry,
      peerId!,
      "another-term:proof",
      ANOTHER_TERM_DECISION.id,
    );

    expect(world.people[opportunisticId!]?.givenName).toBeTruthy();
    expect(world.people[peerId!]?.givenName).toBeTruthy();
    expect(opportunistic).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          optionKey: "seek",
          explanation:
            "They see another term as a useful opening worth pursuing.",
        }),
      ]),
    );
    expect(peer).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          stableKey: expect.stringContaining(TRAIT),
        }),
      ]),
    );

    const decide = (personId: EntityId, considerations: typeof opportunistic) =>
      evaluateDecision(world, {
        stableKey: `another-term:proof:${personId}`,
        decisionType: ANOTHER_TERM_DECISION.id,
        actorPersonId: personId,
        subject: { kind: "context:career", key: personId, entityId: null },
        options: [
          { key: "seek", label: "Seek", description: "Seek another term." },
          {
            key: "step-down",
            label: "Step down",
            description: "Leave the office at the end of the term.",
          },
        ],
        considerations,
        constraints: [],
        preferences: [],
        randomness: "none",
        retention: "ephemeral",
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
      });

    expect(decide(opportunisticId!, opportunistic).selectedOptionKey).toBe(
      "seek",
    );
    expect(decide(peerId!, peer).outcomeKind).toBe("undecided");
  });
});
