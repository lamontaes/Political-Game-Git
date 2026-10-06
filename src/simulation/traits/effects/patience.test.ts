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
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { SeededRng } from "../../rng";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:patience";
const SEED = "t9-patience-two-person-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "patience:low" | "patience:high",
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
    scopeTags: ["friends"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof: the evaluated people differ only in patience.",
    }),
    supersedesTendencyId: null,
  });
}

describe("patience's delayed-contact decision reader", () => {
  it("makes two people differing only in patience choose differently in a random new-game place", () => {
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

    let world = confer(game.world, people[0]!.id, "patience:high");
    world = confer(world, people[1]!.id, "patience:low");
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
          key: "delayed-meeting",
          entityId: null,
        },
        options: [
          { key: "accept", label: "Agree", description: "Meet that day." },
          {
            key: "counter",
            label: "Offer another day",
            description: "Meet later.",
          },
          { key: "decline", label: "Say no", description: "Do not meet." },
        ],
        constraints: [],
        considerations,
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      return { considerations, evaluation };
    };

    const patient = choose(people[0]!.id);
    const impatient = choose(people[1]!.id);
    console.info(
      "T9 patience trace",
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
              trait: "patient",
              selected: patient.evaluation.selectedOptionKey,
              trace: patient.considerations,
            },
            {
              personId: people[1]!.id,
              name: personName(people[1]!),
              trait: "impatient",
              selected: impatient.evaluation.selectedOptionKey,
              trace: impatient.considerations,
            },
          ],
        },
        null,
        2,
      ),
    );

    expect(patient.evaluation.selectedOptionKey).toBe("counter");
    expect(impatient.evaluation.selectedOptionKey).toBe("decline");
    expect(patient.considerations[0]?.sourceRefs[0]?.kind).toBe(
      "personality-tendency",
    );
    expect(impatient.considerations[0]?.sourceRefs[0]?.kind).toBe(
      "personality-tendency",
    );
  }, 60_000);
});
