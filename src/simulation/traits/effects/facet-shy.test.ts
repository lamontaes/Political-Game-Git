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
import type {
  DecisionConsideration,
  EntityId,
  PersonalityTendencyRecord,
  World,
} from "../../types";

const TRAIT = "personality-v1:facet-shy";
const SEED = "session-77-facet-shy-proof";

function confer(
  world: World,
  personId: EntityId,
  expressionKey: "facet-shy:low" | "facet-shy:high",
): { readonly world: World; readonly record: PersonalityTendencyRecord } {
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
  const next = recordPersonalityTendency(ready, {
    stableKey: `${SEED}:${personId}:${expressionKey}`,
    personId,
    tendencyId: definition.id,
    recordedAt: ready.currentDate,
    expressionKey,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["social:approach"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for the person's recorded shyness.",
    }),
    supersedesTendencyId: null,
  });
  return {
    world: next,
    record: next.history.personalityTendencies.at(-1)!,
  };
}

describe("facet-shy's contact-answer reader", () => {
  it("changes the same social choice for two people in a seeded random new-game place", () => {
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

    const unmarked = confer(game.world, people[0]!.id, "facet-shy:low");
    const shy = confer(unmarked.world, people[1]!.id, "facet-shy:high");
    const sharedReason: DecisionConsideration = {
      stableKey: `${SEED}:shared-interest`,
      optionKey: "accept",
      sourceType: "context:life",
      direction: "supports",
      importance: "slight",
      confidence: "medium",
      explanation: "They are interested in meeting.",
      sourceRefs: [],
    };
    const choose = (personId: EntityId) => {
      const considerations = [
        sharedReason,
        ...registeredTraitConsiderations(
          shy.world,
          loadedTraitRegistry(),
          personId,
          `${SEED}:${personId}`,
          CONTACT_ANSWER_DECISION.id,
        ),
      ];
      const evaluation = evaluateDecision(shy.world, {
        stableKey: `${SEED}:decision:${personId}`,
        decisionType: "people.contact-answer",
        actorPersonId: personId,
        cutoff: {
          asOfDate: shy.world.currentDate,
          historySequenceExclusive: shy.world.history.nextSequence,
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
            description: "Ask for time before meeting.",
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

    const unmarkedChoice = choose(people[0]!.id);
    const shyChoice = choose(people[1]!.id);
    const trace = {
      seed: SEED,
      worldId: shy.world.id,
      date: shy.world.currentDate,
      place: place.displayName,
      people: [
        {
          id: people[0]!.id,
          name: personName(people[0]!),
          traitRecordId: unmarked.record.id,
          expression: unmarked.record.expressionKey,
          choice: unmarkedChoice.evaluation.selectedOptionKey,
          reasons: unmarkedChoice.considerations.map((row) => row.explanation),
        },
        {
          id: people[1]!.id,
          name: personName(people[1]!),
          traitRecordId: shy.record.id,
          expression: shy.record.expressionKey,
          choice: shyChoice.evaluation.selectedOptionKey,
          reasons: shyChoice.considerations.map((row) => row.explanation),
        },
      ],
    };
    console.log(
      `FACET-SHY TWO-PERSON TRACE\n${JSON.stringify(trace, null, 2)}`,
    );

    expect(unmarkedChoice.evaluation.selectedOptionKey).toBe("accept");
    expect(shyChoice.evaluation.selectedOptionKey).toBe("counter");
    expect(unmarkedChoice.considerations).toEqual([sharedReason]);
    expect(shyChoice.considerations).toHaveLength(2);
  }, 60_000);
});
