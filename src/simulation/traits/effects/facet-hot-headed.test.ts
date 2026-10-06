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
import { JOB_TRAIT_DECISIONS } from "../jobs-decisions";

const TRAIT = "personality-v1:facet-hot-headed";
const SEED = "session-85-hot-headed-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "facet-hot-headed:high" | "facet-hot-headed:unmarked",
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
    strength: expressionKey.endsWith(":high") ? "strong" : "subtle",
    confidence: "medium",
    scopeTags: ["career:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded hot-headedness.",
    }),
    supersedesTendencyId: null,
  });
}

describe("hot-headed job decision effects", () => {
  it("makes two otherwise identical people choose differently in a random new-game place and prints the trace", () => {
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

    let world = confer(game.world, people[0]!.id, "facet-hot-headed:high");
    world = confer(world, people[1]!.id, "facet-hot-headed:unmarked");
    const sharedReason: DecisionConsideration = {
      stableKey: `${SEED}:job-is-worth-keeping`,
      optionKey: "continue-work",
      sourceType: "context:employment",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "The job remains worth keeping despite today's frustration.",
      sourceRefs: [],
    };
    const choose = (personId: EntityId) => {
      const traitReasons = registeredTraitConsiderations(
        world,
        loadedTraitRegistry(),
        personId,
        `${SEED}:${personId}`,
        JOB_TRAIT_DECISIONS.workerQuit.id,
      );
      const evaluation = evaluateDecision(world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: JOB_TRAIT_DECISIONS.workerQuit.id,
        actorPersonId: personId,
        cutoff: {
          asOfDate: world.currentDate,
          historySequenceExclusive: world.history.nextSequence,
        },
        subject: {
          kind: "context:life",
          key: "frustrating-job",
          entityId: null,
        },
        options: [
          {
            key: "continue-work",
            label: "Continue working",
            description: "Stay in the job.",
          },
          { key: "quit", label: "Quit", description: "Leave the job now." },
        ],
        constraints: [],
        considerations: [sharedReason, ...traitReasons],
        perceptionIds: [],
        randomness: "none",
        retention: "ephemeral",
      });
      return { evaluation, traitReasons };
    };

    const hotHeaded = choose(people[0]!.id);
    const unmarked = choose(people[1]!.id);
    console.info(
      "HOT_HEADED_TWO_PERSON_TRACE",
      JSON.stringify({
        seed: SEED,
        worldId: world.id,
        date: world.currentDate,
        place: place.displayName,
        decision: JOB_TRAIT_DECISIONS.workerQuit.id,
        people: [
          {
            id: people[0]!.id,
            name: personName(people[0]!),
            trait: "hot-headed",
            reasons: hotHeaded.traitReasons.map((reason) => reason.explanation),
            choice: hotHeaded.evaluation.selectedOptionKey,
          },
          {
            id: people[1]!.id,
            name: personName(people[1]!),
            trait: "unmarked",
            reasons: unmarked.traitReasons.map((reason) => reason.explanation),
            choice: unmarked.evaluation.selectedOptionKey,
          },
        ],
      }),
    );

    expect(hotHeaded.evaluation.selectedOptionKey).toBe("quit");
    expect(unmarked.evaluation.selectedOptionKey).toBe("continue-work");
    expect(hotHeaded.traitReasons).toHaveLength(1);
    expect(unmarked.traitReasons).toHaveLength(0);
  }, 60_000);
});
