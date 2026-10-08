import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { drawRandomPlace } from "../../../../tests/support/random-place";
import { evaluateDecision } from "../../decisions";
import { CONTACT_ANSWER_DECISION } from "../../people-contact-decisions";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensurePeopleTraitCatalog } from "../../people-traits";
import { personName } from "../../people";
import { registeredTraitConsiderations } from "../../trait-readings";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";

const TRAIT = "personality-v1:facet-blunt";
const SEED = "t9-facet-blunt-two-person-proof";

function recordBluntness(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT)!;
  const definition = traitDefinitionFromPack(trait);
  let ready = ensurePeopleTraitCatalog(world);
  if (!ready.mindCatalog.tendencies[definition.id]) {
    ready = {
      ...ready,
      mindCatalog: {
        ...ready.mindCatalog,
        tendencies: {
          ...ready.mindCatalog.tendencies,
          [definition.id]: definition,
        },
        tendencyOrder: [...ready.mindCatalog.tendencyOrder, definition.id],
      },
    };
  }

  return recordPersonalityTendency(ready, {
    stableKey: `${SEED}:${personId}:blunt`,
    personId,
    tendencyId: definition.id,
    recordedAt: ready.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "medium",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof fixture for a person's recorded bluntness.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-blunt decision effects", () => {
  it("changes one resident's contact answer while an unmarked resident stays the same", () => {
    const place = drawRandomPlace(SEED);
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
    const residents = game.world.personOrder
      .filter((personId) => personId !== game.playerPersonId)
      .slice(0, 2);
    expect(residents).toHaveLength(2);

    const world = recordBluntness(game.world, residents[0]!);
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

    const bluntAnswer = decide(residents[0]!);
    const unmarkedAnswer = decide(residents[1]!);
    console.info(
      "T9 facet-blunt two-person proof",
      JSON.stringify({
        seed: SEED,
        place: place.displayName,
        people: [
          {
            id: residents[0],
            name: personName(world.people[residents[0]!]!),
            trait: TRAIT,
            selected: bluntAnswer.selectedOptionKey,
            reasons: bluntAnswer.context.considerations,
          },
          {
            id: residents[1],
            name: personName(world.people[residents[1]!]!),
            trait: "unmarked",
            selected: unmarkedAnswer.selectedOptionKey,
            reasons: unmarkedAnswer.context.considerations,
          },
        ],
      }),
    );

    expect(bluntAnswer.selectedOptionKey).toBe("counter");
    expect(bluntAnswer.context.randomness).toBe("none");
    expect(
      bluntAnswer.context.considerations.some(
        (reason) => reason.sourceRefs[0]?.kind === "personality-tendency",
      ),
    ).toBe(true);
    expect(unmarkedAnswer.selectedOptionKey).toBe("accept");
    expect(unmarkedAnswer.context.considerations).toHaveLength(1);
  }, 60_000);
});
