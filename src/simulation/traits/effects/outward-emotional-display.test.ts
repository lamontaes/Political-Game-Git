import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { CLEMENCY_PETITION_DECISION } from "../../justice/clemency-decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { personName } from "../../people";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:outward-emotional-display";
const SEED = "t9-outward-emotional-display-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey:
    "outward-emotional-display:low" | "outward-emotional-display:high",
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
      note: "Focused proof fixture for outward emotional display.",
    }),
    supersedesTendencyId: null,
  });
}

describe("outward emotional display's clemency decision reader", () => {
  it("changes the choice for two people in a seeded random new-game place and prints the trace", () => {
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

    let world = confer(
      game.world,
      people[0]!.id,
      "outward-emotional-display:high",
    );
    world = confer(world, people[1]!.id, "outward-emotional-display:low");
    const choose = (personId: EntityId) => {
      const considerations = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        `${SEED}:${personId}`,
        CLEMENCY_PETITION_DECISION.id,
      );
      const evaluation = evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: CLEMENCY_PETITION_DECISION.id,
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: { kind: "context:life", key: "clemency", entityId: null },
        options: [
          {
            key: "petition",
            label: "Petition",
            description: "Ask for clemency.",
          },
          { key: "wait", label: "Wait", description: "Do not ask yet." },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      return { considerations, evaluation };
    };

    const expressive = choose(people[0]!.id);
    const stoic = choose(people[1]!.id);
    console.info(
      "T9 outward-emotional-display trace",
      JSON.stringify(
        {
          seed: SEED,
          worldId: world.id,
          date: world.currentDate,
          place: place.displayName,
          people: [
            {
              personId: people[0]!.id,
              name: personName(people[0]!),
              trait: "Emotionally expressive",
              selected: expressive.evaluation.selectedOptionKey,
              considerations: expressive.considerations,
            },
            {
              personId: people[1]!.id,
              name: personName(people[1]!),
              trait: "Stoic",
              selected: stoic.evaluation.selectedOptionKey,
              considerations: stoic.considerations,
            },
          ],
        },
        null,
        2,
      ),
    );

    expect(expressive.evaluation.selectedOptionKey).toBe("petition");
    expect(stoic.evaluation.selectedOptionKey).toBe("wait");
    expect(expressive.considerations).toHaveLength(1);
    expect(stoic.considerations).toHaveLength(1);
  }, 60_000);
});
