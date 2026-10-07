import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { personName } from "../../people";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import {
  BUILT_IN_TRAIT_DECISIONS,
  loadedTraitRegistry,
} from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-light-hearted";
const SEED = "session42-proof-facet-light-hearted";

function recordLightHearted(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT)!;
  const definition = traitDefinitionFromPack(trait);
  const ready: World = {
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
  return recordPersonalityTendency(ready, {
    stableKey: `${SEED}:${personId}:light-hearted`,
    personId,
    tendencyId: definition.id,
    recordedAt: world.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary", "career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded light-heartedness.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-light-hearted in a random new game", () => {
  it("affects the marked person's work choice and leaves another person unmarked", () => {
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

    const markedWorld = recordLightHearted(game.world, people[0]!.id);
    const declaration = BUILT_IN_TRAIT_DECISIONS.find(
      ({ id }) => id === "labor.worker-quit",
    )!;
    const decide = (world: World, personId: EntityId) =>
      evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: declaration.id,
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: {
          kind: "context:life",
          key: "minor-work-setback",
          entityId: null,
        },
        options: [
          {
            key: "continue-work",
            label: "Keep working",
            description: "Continue after a minor setback.",
          },
          {
            key: "quit",
            label: "Leave the job",
            description: "Stop working there.",
          },
        ],
        constraints: [],
        considerations: registeredTraitConsiderations(
          world,
          loadedTraitRegistry(),
          personId,
          `${SEED}:${personId}`,
          declaration.id,
        ),
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });

    const marked = decide(markedWorld, people[0]!.id);
    const unmarked = decide(markedWorld, people[1]!.id);
    const trace = {
      seed: SEED,
      place: `${place.displayName}, US-${state.usps}`,
      people: [
        {
          name: personName(people[0]!),
          tendency: "facet-light-hearted high",
          choice: marked.selectedOptionKey,
          reasons: marked.context.considerations,
        },
        {
          name: personName(people[1]!),
          tendency: "unmarked",
          choice: unmarked.selectedOptionKey,
          reasons: unmarked.context.considerations,
        },
      ],
    };
    process.stderr.write(`TRAIT PROOF ${JSON.stringify(trace)}\n`);

    expect(marked.selectedOptionKey).toBe("continue-work");
    expect(marked.context.considerations[0]?.sourceRefs[0]?.kind).toBe(
      "personality-tendency",
    );
    expect(unmarked.selectedOptionKey).toBeNull();
    expect(unmarked.context.considerations).toEqual([]);
  }, 60_000);
});
