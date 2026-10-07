import { describe, expect, it } from "vitest";

import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../../presentation/new-game";
import { addDays } from "../../dates";
import { createMindProvenance, recordPersonalityTendency } from "../../mind";
import { ensureTraitDefinition } from "../../people-traits";
import { personName } from "../../people";
import { npcContactAnswer, proposeContact } from "../../relationship-contact";
import { loadedTraitRegistry } from "../../trait-registry";
import { traitDefinitionFromPack } from "../../trait-packs";
import type { EntityId, World } from "../../types";
import { drawRandomPlace } from "../../../../tests/support/random-place";

const TRAIT = "personality-v1:facet-brooding";

function conferBrooding(world: World, personId: EntityId): World {
  const trait = loadedTraitRegistry().traits.get(TRAIT);
  if (!trait) throw new Error(`The build does not load ${TRAIT}.`);
  const prepared = ensureTraitDefinition(world, trait);
  const definition = traitDefinitionFromPack(trait);
  return recordPersonalityTendency(prepared, {
    stableKey: `proof:${TRAIT}:${personId}`,
    personId,
    tendencyId: definition.id,
    recordedAt: prepared.currentDate,
    expressionKey: trait.poles.high.key,
    strength: "strong",
    confidence: "high",
    scopeTags: ["life:ordinary", "relationship:choice"],
    provenance: createMindProvenance("authored", {
      note: "Focused proof of the recorded brooding tendency.",
    }),
    supersedesTendencyId: null,
  });
}

describe("facet-brooding", () => {
  it("adds a brooding reason to one generated person's invitation and not another's", () => {
    const seed = "session42-proof-facet-brooding";
    const place = drawRandomPlace(seed);
    const game = createNewGameWorld({
      ...DEFAULT_NEW_GAME_SETUP,
      seed,
      startKind: "custom",
      placeKey: place.key,
      startAge: 40,
      depth: "summarize-earlier-life",
      questionnaire: "skipped",
    });
    const [askerId, broodingPersonId, comparisonPersonId] =
      game.world.personOrder
        .filter((id) => id !== game.playerPersonId)
        .slice(0, 3);
    if (!askerId || !broodingPersonId || !comparisonPersonId) {
      throw new Error("The generated world needs an asker and two recipients.");
    }
    const broodingProposal = proposeContact(game.world, {
      stableKey: `${seed}:brooding-invitation`,
      fromPersonId: askerId,
      toPersonId: broodingPersonId,
      on: addDays(game.world.currentDate, 3),
      purpose: "Catch up",
      answerInPerson: false,
    });
    const comparisonProposal = proposeContact(game.world, {
      stableKey: `${seed}:comparison-invitation`,
      fromPersonId: askerId,
      toPersonId: comparisonPersonId,
      on: addDays(game.world.currentDate, 4),
      purpose: "Catch up",
      answerInPerson: false,
    });
    const ordinary = npcContactAnswer(
      broodingProposal.world,
      broodingProposal.proposal.eventId,
    );
    const world = conferBrooding(broodingProposal.world, broodingPersonId);
    const brooding = npcContactAnswer(world, broodingProposal.proposal.eventId);
    const comparison = npcContactAnswer(
      comparisonProposal.world,
      comparisonProposal.proposal.eventId,
    );
    const traceFor = (source: World, proposalId: EntityId) =>
      source.history.decisionTraces.find(
        ({ context }) => context.stableKey === `contact:${proposalId}:answer`,
      );
    const ordinaryTrace = traceFor(
      ordinary.world,
      broodingProposal.proposal.eventId,
    );
    const broodingTrace = traceFor(
      brooding.world,
      broodingProposal.proposal.eventId,
    );
    const comparisonTrace = traceFor(
      comparison.world,
      comparisonProposal.proposal.eventId,
    );
    const traitReason = broodingTrace?.context.considerations.find(
      ({ stableKey }) => stableKey.includes(TRAIT),
    );

    expect(ordinary.answer).toBe("accept");
    expect(brooding.answer).toBe("accept");
    expect(
      ordinaryTrace?.context.considerations.some(({ stableKey }) =>
        stableKey.includes(TRAIT),
      ),
    ).toBe(false);
    expect(traitReason).toMatchObject({
      optionKey: "decline",
      sourceRefs: [{ kind: "personality-tendency" }],
    });
    expect(
      comparisonTrace?.context.considerations.some(({ stableKey }) =>
        stableKey.includes(TRAIT),
      ),
    ).toBe(false);
    process.stdout.write(
      `${JSON.stringify({
        seed,
        worldId: world.id,
        date: world.currentDate,
        place: place.displayName,
        asker: personName(world.people[askerId]!),
        broodingPerson: personName(world.people[broodingPersonId]!),
        ordinaryChoice: ordinary.answer,
        broodingChoice: brooding.answer,
        reason: traitReason?.explanation,
        comparisonPerson: personName(world.people[comparisonPersonId]!),
        comparisonChoice: comparison.answer,
      })}\n`,
    );
  });
});
