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
import type { DecisionConsideration, EntityId, World } from "../../types";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";

const TRAIT = "personality-v1:facet-charming";
const SEED = "t9-facet-charming-two-person-proof";

function conferCharm(world: World, personId: EntityId): World {
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
    stableKey: `${SEED}:${personId}:charming`,
    personId,
    tendencyId: definition.id,
    recordedAt: ready.currentDate,
    expressionKey: "facet-charming:high",
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for this person's recorded charming manner.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-charming's contact-answer reader", () => {
  it("changes otherwise identical decision inputs for two people in a seeded random new-game place", () => {
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

    const world = conferCharm(game.world, people[0]!.id);
    const baseline: DecisionConsideration = {
      stableKey: `${SEED}:prior-commitment`,
      optionKey: "decline",
      sourceType: "context:schedule-conflict",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "They already have something else planned.",
      sourceRefs: [],
    };
    const choose = (personId: EntityId) => {
      const traitConsiderations = registeredTraitConsiderations(
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
          { key: "accept", label: "Agree", description: "Meet them that day." },
          {
            key: "counter",
            label: "Offer another day",
            description: "Say when they could instead.",
          },
          { key: "decline", label: "Say no", description: "Leave it there." },
        ],
        constraints: [],
        considerations: [baseline, ...traitConsiderations],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      return { evaluation, traitConsiderations };
    };

    const charming = choose(people[0]!.id);
    const unmarked = choose(people[1]!.id);
    console.info(
      "T9 facet-charming proof",
      JSON.stringify({
        seed: SEED,
        worldId: game.world.id,
        date: world.currentDate,
        place: place.displayName,
        people: [
          {
            id: people[0]!.id,
            name: personName(people[0]!),
            trait: "charming",
            choice: charming.evaluation.selectedOptionKey,
            trace: charming.evaluation.optionEvaluations,
          },
          {
            id: people[1]!.id,
            name: personName(people[1]!),
            trait: "unrecorded",
            choice: unmarked.evaluation.selectedOptionKey,
            trace: unmarked.evaluation.optionEvaluations,
          },
        ],
      }),
    );

    expect(charming.traitConsiderations).toMatchObject([
      {
        optionKey: "counter",
        explanation:
          "They keep the exchange open with an attentive, responsive answer.",
      },
    ]);
    expect(unmarked.traitConsiderations).toEqual([]);
    expect(charming.evaluation.selectedOptionKey).toBe("counter");
    expect(unmarked.evaluation.selectedOptionKey).toBe("decline");
  }, 60_000);
});
