import { afterEach, describe, expect, it, vi } from "vitest";

import brazenEffects from "../../data/traits/effects/facet-brazen.json" with { type: "json" };
import { drawRandomPlace } from "../../tests/support/random-place";
import {
  createNewGameWorld,
  DEFAULT_NEW_GAME_SETUP,
} from "../presentation/new-game";
import { addDays } from "./dates";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { encodeRegisteredTrait, ensureTraitDefinition } from "./people-traits";
import {
  personalityCataloguePack,
  PERSONALITY_PACK,
} from "./personality-catalogue";
import { CONTACT_ANSWER_DECISION } from "./people-contact-decisions";
import * as traitRegistryModule from "./trait-registry";
import { npcContactAnswer, proposeContact } from "./people-contact";
import { isPersonAliveAt } from "./vitality-integrity";
import {
  leansForDecision,
  loadTraitPacks,
  traitDefinitionFromPack,
} from "./trait-packs";
import type { EntityId, World } from "./types";

const SEED = "session57-facet-brazen-2026-10-06";
const REASON = "They are not put off by a face-to-face meeting.";

function registryWithBrazenEffect() {
  const catalogue = personalityCataloguePack();
  const registry = loadTraitPacks(
    [{ ...catalogue, effects: [...catalogue.effects, ...brazenEffects] }],
    [...traitRegistryModule.loadedTraitRegistry().decisions.values()],
  );
  expect(registry.report.rejections).toEqual([]);
  expect(
    registry.report.packs.find((pack) => pack.pack === PERSONALITY_PACK)
      ?.consumedBy[`${PERSONALITY_PACK}:facet-brazen`],
  ).toEqual([CONTACT_ANSWER_DECISION.id]);
  expect(leansForDecision(registry, CONTACT_ANSWER_DECISION.id)).toContainEqual(
    expect.objectContaining({
      option: "accept",
      trait: `${PERSONALITY_PACK}:facet-brazen`,
      explanation: REASON,
    }),
  );
  return registry;
}

function newGameAtDrawnPlace(): {
  world: World;
  playerId: EntityId;
  placeKey: string;
} {
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
  return {
    world: game.world,
    playerId: game.playerPersonId,
    placeKey: place.key,
  };
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
  const brazenTendencyId = registeredBrazenTendencyId();
  const alreadyMarked = new Set(
    world.history.personalityTendencies
      .filter((row) => row.personId !== playerId)
      .filter((row) => row.tendencyId === brazenTendencyId)
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

function registeredBrazenTendencyId(): EntityId {
  const trait = registryWithBrazenEffect().traits.get(
    `${PERSONALITY_PACK}:facet-brazen`,
  );
  if (!trait) throw new Error("Missing brazen trait.");
  return traitDefinitionFromPack(trait).id;
}

function recordBrazen(world: World, personId: EntityId): World {
  const trait = registryWithBrazenEffect().traits.get(
    `${PERSONALITY_PACK}:facet-brazen`,
  );
  if (!trait) throw new Error("Missing brazen trait.");
  const withDefinition = ensureTraitDefinition(world, trait);
  const encoded = encodeRegisteredTrait(trait, 2);
  return recordPersonalityTendency(withDefinition, {
    stableKey: `facet-brazen:${personId}:proof`,
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

describe("facet-brazen in a random-place new game", () => {
  it("changes an NPC answer to the same face-to-face request with only this trait added", () => {
    const baseline = newGameAtDrawnPlace();
    const withTrait = newGameAtDrawnPlace();
    expect(withTrait.world.people).toEqual(baseline.world.people);
    vi.spyOn(traitRegistryModule, "traitRegistryFor").mockReturnValue(
      registryWithBrazenEffect(),
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
        stableKey: `facet-brazen:proposal:${pair.from}:${pair.to}`,
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
    const markedWorld = recordBrazen(withTrait.world, matched.to);
    const markedProposal = proposeContact(markedWorld, {
      stableKey: `facet-brazen:proposal:${matched.from}:${matched.to}`,
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
          row.tendencyId === registeredBrazenTendencyId(),
      ),
    ).toBe(true);
    console.info(
      "T9_FACET_BRAZEN_PROOF",
      JSON.stringify({
        seed: SEED,
        placeKey: baseline.placeKey,
        askerPersonId: matched.from,
        responderPersonId: matched.to,
        proposalEventId: matched.baselineProposal.proposal.eventId,
        baselineAnswer: baselineAnswer.answer,
        brazenAnswer: markedAnswer.answer,
        traitRecordId: markedWorld.history.personalityTendencies.at(-1)!.id,
        reason: REASON,
        scope:
          "Test-only registry stub; production JSON loading remains Session 8's work.",
      }),
    );
  }, 60_000);
});
