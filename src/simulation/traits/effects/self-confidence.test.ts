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
import { ANOTHER_TERM_DECISION } from "../../careers/another-term-decision";

const TRAIT = "personality-v1:self-confidence";
const SEED = "session-75-self-confidence-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "self-confidence:low" | "self-confidence:high",
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
    scopeTags: ["career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded self-confidence.",
    }),
    supersedesTendencyId: null,
  });
}

describe("self-confidence's career decision reader", () => {
  it("changes the same decision for two named people in a seeded random new-game place", () => {
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
    expect(personName(people[0]!)).not.toBe(personName(people[1]!));

    let world = confer(game.world, people[0]!.id, "self-confidence:high");
    world = confer(world, people[1]!.id, "self-confidence:low");
    const choose = (personId: EntityId) => {
      const considerations = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        `${SEED}:${personId}`,
        ANOTHER_TERM_DECISION.id,
      );
      return evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: "career.consider-another-term",
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: { kind: "context:life", key: "another-term", entityId: null },
        options: [
          {
            key: "seek",
            label: "Run again",
            description: "Seek another term.",
          },
          {
            key: "step-down",
            label: "Step down",
            description: "Leave office.",
          },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      }).selectedOptionKey;
    };

    expect(
      choose(people[0]!.id),
      `${personName(people[0]!)} in ${place.displayName}`,
    ).toBe("seek");
    expect(
      choose(people[1]!.id),
      `${personName(people[1]!)} in ${place.displayName}`,
    ).toBe("step-down");
  }, 60_000);
});
