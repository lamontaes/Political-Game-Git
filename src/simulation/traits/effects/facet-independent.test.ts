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
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-independent";
const SEED = "t9-facet-independent-two-person-proof";

function conferIndependence(world: World, personId: EntityId): World {
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
    stableKey: `${SEED}:${personId}:independent`,
    personId,
    tendencyId: definition.id,
    recordedAt: ready.currentDate,
    expressionKey: "facet-independent:high",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded independence.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-independent's scheduling choice reader", () => {
  it("changes the choice for two named people in a seeded random new-game place and prints the trace", () => {
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

    const world = conferIndependence(game.world, people[0]!.id);
    const decide = (personId: EntityId) =>
      evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: CONTACT_ANSWER_DECISION.id,
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
          {
            key: "accept",
            label: "Agree",
            description: "Meet them that day.",
          },
          {
            key: "counter",
            label: "Offer another day",
            description: "Say when they could instead.",
          },
          {
            key: "decline",
            label: "Say no",
            description: "Leave it for another time.",
          },
        ],
        constraints: [],
        considerations: [
          {
            stableKey: `${SEED}:${personId}:meeting-is-welcome`,
            optionKey: "accept",
            sourceType: "context:fixture",
            direction: "supports",
            importance: "slight",
            confidence: "medium",
            explanation: "They welcome the meeting.",
            sourceRefs: [],
          },
          ...registeredTraitConsiderations(
            world,
            loadedTraitRegistry(),
            personId,
            `${SEED}:${personId}`,
            CONTACT_ANSWER_DECISION.id,
          ),
        ],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });

    const independent = decide(people[0]!.id);
    const comparison = decide(people[1]!.id);
    const trace = {
      seed: SEED,
      worldId: game.world.id,
      date: world.currentDate,
      place: place.displayName,
      people: [
        {
          id: people[0]!.id,
          name: personName(people[0]!),
          trait: TRAIT,
          selected: independent.selectedOptionKey,
          reasons: independent.context.considerations,
        },
        {
          id: people[1]!.id,
          name: personName(people[1]!),
          trait: "unrecorded",
          selected: comparison.selectedOptionKey,
          reasons: comparison.context.considerations,
        },
      ],
    };
    console.info("T9 facet-independent proof trace", JSON.stringify(trace));

    expect(personName(people[0]!)).not.toBe(personName(people[1]!));
    expect(independent.selectedOptionKey).toBe("counter");
    expect(independent.context.randomness).toBe("none");
    expect(independent.context.considerations).toHaveLength(2);
    expect(independent.context.considerations[1]?.sourceRefs[0]?.kind).toBe(
      "personality-tendency",
    );
    expect(comparison.selectedOptionKey).toBe("accept");
    expect(comparison.context.considerations).toHaveLength(1);
  }, 60_000);
});
