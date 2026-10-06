import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { PLEA_DECISION } from "../../justice/court-decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { personName } from "../../people";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:truthfulness";
const SEED = "t9-truthfulness-two-person-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "truthfulness:low" | "truthfulness:high",
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
      note: "Focused proof fixture for the person's recorded truthfulness.",
    }),
    supersedesTendencyId: null,
  });
}

describe("truthfulness's plea decision reader", () => {
  it("makes two people differing only in truthfulness choose differently in a random new-game place", () => {
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

    let world = confer(game.world, people[0]!.id, "truthfulness:high");
    world = confer(world, people[1]!.id, "truthfulness:low");
    const choose = (personId: EntityId) => {
      const considerations = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        `${SEED}:${personId}`,
        PLEA_DECISION.id,
      ).filter((row) => row.stableKey.includes(`:trait:${TRAIT}:`));
      const evaluation = evaluateDecision(world, {
        stableKey: `${SEED}:plea:${personId}`,
        decisionType: "justice.plea",
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: { kind: "context:case", key: "plea", entityId: null },
        options: [
          {
            key: "plead",
            label: "Plead guilty",
            description: "Admit the offense.",
          },
          {
            key: "trial",
            label: "Go to trial",
            description: "Maintain a denial.",
          },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      return { considerations, evaluation };
    };

    const honest = choose(people[0]!.id);
    const deceitful = choose(people[1]!.id);
    console.info(
      "T9 truthfulness proof trace",
      JSON.stringify({
        seed: SEED,
        worldId: world.id,
        date: world.currentDate,
        place: place.displayName,
        people: [
          {
            name: personName(people[0]!),
            trait: "honest",
            choice: honest.evaluation.selectedOptionKey,
            reasons: honest.considerations.map((row) => row.explanation),
          },
          {
            name: personName(people[1]!),
            trait: "deceitful",
            choice: deceitful.evaluation.selectedOptionKey,
            reasons: deceitful.considerations.map((row) => row.explanation),
          },
        ],
      }),
    );

    expect(honest.considerations).toHaveLength(1);
    expect(deceitful.considerations).toHaveLength(1);
    expect(honest.evaluation.selectedOptionKey).toBe("plead");
    expect(deceitful.evaluation.selectedOptionKey).toBe("trial");
  }, 60_000);
});
