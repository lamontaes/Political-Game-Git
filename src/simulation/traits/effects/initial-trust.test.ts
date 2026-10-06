import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { evaluateDecision } from "../../decisions";
import { lifePlaceStateIdentities, searchLifePlaces } from "../../life-places";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { personName } from "../../people";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:initial-trust";
const SEED = "session-75-initial-trust-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "initial-trust:low" | "initial-trust:high",
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
      note: "Focused proof fixture for the person's recorded initial trust.",
    }),
    supersedesTendencyId: null,
  });
}

describe("initial trust's contact decision reader", () => {
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

    let world = confer(game.world, people[0]!.id, "initial-trust:high");
    world = confer(world, people[1]!.id, "initial-trust:low");
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
          { key: "accept", label: "Agree", description: "Meet them that day." },
          {
            key: "counter",
            label: "Offer another day",
            description: "Say when they could instead.",
          },
          {
            key: "decline",
            label: "Say no",
            description: "Decline the invitation.",
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

    const trusting = choose(people[0]!.id);
    const suspicious = choose(people[1]!.id);
    console.info(
      JSON.stringify({
        seed: SEED,
        worldId: world.id,
        date: world.currentDate,
        place: place.displayName,
        traces: [
          {
            person: personName(people[0]!),
            trait: "Trusting",
            choice: trusting.evaluation.selectedOptionKey,
            reasons: trusting.considerations.map(
              ({ explanation }) => explanation,
            ),
          },
          {
            person: personName(people[1]!),
            trait: "Suspicious",
            choice: suspicious.evaluation.selectedOptionKey,
            reasons: suspicious.considerations.map(
              ({ explanation }) => explanation,
            ),
          },
        ],
      }),
    );

    expect(trusting.evaluation.selectedOptionKey).toBe("accept");
    expect(suspicious.evaluation.selectedOptionKey).toBe("decline");
  }, 60_000);
});
