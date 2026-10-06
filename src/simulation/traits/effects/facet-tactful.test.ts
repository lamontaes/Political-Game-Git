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

const TRAIT = "personality-v1:facet-tactful";
const SEED = "t9-facet-tactful-two-person-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "facet-tactful:unmarked" | "facet-tactful:high",
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
    strength: expressionKey.endsWith(":high") ? "strong" : "moderate",
    confidence: "medium",
    scopeTags: [CONTACT_ANSWER_DECISION.scope],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded tact.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-tactful's invitation-answer reader", () => {
  it("changes otherwise identical choices for two people in a random new-game place and prints the trace", () => {
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

    let world = confer(game.world, people[0]!.id, "facet-tactful:high");
    world = confer(world, people[1]!.id, "facet-tactful:unmarked");

    const decide = (personId: EntityId) => {
      const traitReasons = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        `${SEED}:${personId}`,
        CONTACT_ANSWER_DECISION.id,
      ).filter((reason) => reason.stableKey.includes(TRAIT));
      const sharedReason: DecisionConsideration = {
        stableKey: `${SEED}:${personId}:schedule-conflict`,
        optionKey: "decline",
        sourceType: "context:schedule-conflict",
        direction: "supports",
        importance: "slight",
        confidence: "medium",
        explanation: "That day does not work for them.",
        sourceRefs: [],
      };
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
          {
            key: "counter",
            label: "Offer another day",
            description: "Say when they could instead.",
          },
          { key: "decline", label: "Say no", description: "End the request." },
        ],
        constraints: [],
        considerations: [sharedReason, ...traitReasons],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
    };

    const tactful = decide(people[0]!.id);
    const unmarked = decide(people[1]!.id);
    console.info(
      "T9 facet-tactful two-person trace",
      JSON.stringify(
        {
          seed: SEED,
          worldId: world.id,
          date: world.currentDate,
          place: place.displayName,
          people: [
            { name: personName(people[0]!), evaluation: tactful },
            { name: personName(people[1]!), evaluation: unmarked },
          ],
        },
        null,
        2,
      ),
    );

    expect(tactful.selectedOptionKey).toBe("counter");
    expect(unmarked.selectedOptionKey).toBe("decline");
    expect(tactful.context.considerations).toHaveLength(2);
    expect(unmarked.context.considerations).toHaveLength(1);
  }, 60_000);
});
