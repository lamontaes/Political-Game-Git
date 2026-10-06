import { afterEach, describe, expect, it, vi } from "vitest";

import approvalEffects from "../../data/traits/effects/facet-approval-seeking.json" with { type: "json" };
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../../src/presentation/new-game";
import { addDays } from "./dates";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { encodeRegisteredTrait, ensureTraitDefinition } from "./people-traits";
import {
  personalityCataloguePack,
  PERSONALITY_PACK,
} from "./personality-catalogue";
import { CONTACT_ANSWER_DECISION } from "./people-contact-decisions";
import { ANOTHER_TERM_DECISION } from "./careers/another-term-decision";
import * as traitRegistryModule from "./trait-registry";
import { npcContactAnswer, proposeContact } from "./people-contact";
import { isPersonAliveAt } from "./vitality-integrity";
import { loadTraitPacks, traitDefinitionFromPack } from "./trait-packs";
import type { EntityId, World } from "./types";

const SEED = "session57-facet-approval-seeking-2026-10-06";

function registryWithApprovalEffect() {
  const catalogue = personalityCataloguePack();
  const registry = loadTraitPacks(
    [
      {
        ...catalogue,
        effects: [...catalogue.effects, ...approvalEffects],
      },
    ],
    [CONTACT_ANSWER_DECISION, ANOTHER_TERM_DECISION],
  );
  expect(registry.report.rejections).toEqual([]);
  return registry;
}

function newGameAtDrawnPlace(): { world: World; playerId: EntityId } {
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
  return { world: game.world, playerId: game.playerPersonId };
}

function eligibleNpcPairs(world: World, playerId: EntityId) {
  const pairs: Array<{ from: EntityId; to: EntityId }> = [];
  const npcIds = world.personOrder.filter((id) => {
    const person = world.people[id];
    return (
      person &&
      id !== playerId &&
      person.birthDate < "2008-01-01" &&
      isPersonAliveAt(world, id, {
        asOfDate: world.currentDate,
        historySequenceExclusive: world.history.nextSequence,
      })
    );
  });
  const priorPairs = new Set(
    world.history.relationshipInteractions.map((interaction) =>
      [...interaction.personIds].sort().join("|"),
    ),
  );
  const alreadyMarked = new Set(
    world.history.personalityTendencies
      .filter((row) => row.personId !== playerId)
      .filter((row) => row.tendencyId === approvalTendencyId())
      .map((row) => row.personId),
  );
  for (const from of npcIds) {
    if (alreadyMarked.has(from)) continue;
    for (const to of npcIds) {
      if (from === to || alreadyMarked.has(to)) continue;
      if (priorPairs.has([from, to].sort().join("|"))) continue;
      pairs.push({ from, to });
    }
  }
  return pairs;
}

function approvalTendencyId(): EntityId {
  const trait = registryWithApprovalEffect().traits.get(
    `${PERSONALITY_PACK}:facet-approval-seeking`,
  );
  if (!trait) throw new Error("Missing approval-seeking trait.");
  return traitDefinitionFromPack(trait).id;
}

function recordApprovalSeeking(world: World, personId: EntityId): World {
  const trait = registryWithApprovalEffect().traits.get(
    `${PERSONALITY_PACK}:facet-approval-seeking`,
  );
  if (!trait) throw new Error("Missing approval-seeking trait.");
  const withDefinition = ensureTraitDefinition(world, trait);
  const encoded = encodeRegisteredTrait(trait, 2);
  return recordPersonalityTendency(withDefinition, {
    stableKey: `facet-approval-seeking:${personId}:proof`,
    personId,
    tendencyId: traitDefinitionFromPack(trait).id,
    recordedAt: withDefinition.currentDate,
    expressionKey: encoded.expressionKey,
    strength: encoded.strength,
    confidence: "high",
    scopeTags: ["life:ordinary"],
    provenance: createMindProvenance("authored", {
      note: "Focused decision-proof fixture.",
    }),
    supersedesTendencyId: null,
  });
}

afterEach(() => vi.restoreAllMocks());

describe("facet-approval-seeking in an actual random-place new game", () => {
  it("changes an NPC answer to the same meeting request when only this trait is added", () => {
    const baseline = newGameAtDrawnPlace();
    const withTrait = newGameAtDrawnPlace();
    expect(withTrait.world.people).toEqual(baseline.world.people);
    vi.spyOn(traitRegistryModule, "traitRegistryFor").mockReturnValue(
      registryWithApprovalEffect(),
    );
    let matched:
      | {
          from: EntityId;
          to: EntityId;
          baselineProposal: ReturnType<typeof proposeContact>;
        }
      | undefined;
    for (const pair of eligibleNpcPairs(baseline.world, baseline.playerId)) {
      const proposal = proposeContact(baseline.world, {
        stableKey: `facet-approval-seeking:proposal:${pair.from}:${pair.to}`,
        fromPersonId: pair.from,
        toPersonId: pair.to,
        on: addDays(baseline.world.currentDate, 14),
        purpose: "Meet and catch up.",
      });
      if (
        npcContactAnswer(proposal.world, proposal.proposal.eventId).answer !==
        "accept"
      ) {
        matched = { ...pair, baselineProposal: proposal };
        break;
      }
    }
    expect(matched).toBeDefined();
    if (!matched) return;
    const markedWorld = recordApprovalSeeking(withTrait.world, matched.to);
    const markedProposal = proposeContact(markedWorld, {
      stableKey: `facet-approval-seeking:proposal:${matched.from}:${matched.to}`,
      fromPersonId: matched.from,
      toPersonId: matched.to,
      on: addDays(markedWorld.currentDate, 14),
      purpose: "Meet and catch up.",
    });
    const baselineAnswer = npcContactAnswer(
      matched.baselineProposal.world,
      matched.baselineProposal.proposal.eventId,
    );
    const markedAnswer = npcContactAnswer(
      markedProposal.world,
      markedProposal.proposal.eventId,
    );

    expect(baselineAnswer.answer).not.toBe("accept");
    expect(markedAnswer.answer).toBe("accept");
    expect(
      markedAnswer.world.history.personalityTendencies.some(
        (row) =>
          row.personId === matched.to &&
          row.tendencyId === approvalTendencyId(),
      ),
    ).toBe(true);
  });
});
