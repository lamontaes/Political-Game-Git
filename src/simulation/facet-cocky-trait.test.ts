import { addDays, ageOnDate } from "./dates";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import { searchLifePlaces } from "./life-places";
import { createMindProvenance, recordPersonalityTendency } from "./mind";
import { ensureTraitDefinition } from "./people-traits";
import { activeCareResponsibilitiesAt } from "./life-queries";
import {
  loadTraitPacks,
  traitDefinitionFromPack,
  type TraitEffectDeclaration,
} from "./trait-packs";
import { compiledTraitPacks } from "./compiled-trait-packs";
import { PERSONALITY_PACK } from "./personality-catalogue";
import { ANOTHER_TERM_DECISION } from "./careers/another-term-decision";
import { decideAnotherTerm } from "./careers/another-term";
import * as traitRegistryModule from "./trait-registry";
import { describe, expect, it, vi } from "vitest";
import facetCockyEffects from "../../data/traits/effects/facet-cocky.json" with { type: "json" };

// STUB until Session 8's per-trait JSON loader lands: compose this file's rows
// into the existing personality pack in the test only. No shared registry is
// changed by this PR.
function registryWithFacetCocky() {
  const packs = compiledTraitPacks().map((pack) =>
    pack.pack === PERSONALITY_PACK
      ? {
          ...pack,
          effects: [
            ...pack.effects,
            ...(facetCockyEffects as readonly TraitEffectDeclaration[]),
          ],
        }
      : pack,
  );
  const decisions = [
    ...traitRegistryModule.loadedTraitRegistry().decisions.values(),
  ];
  return loadTraitPacks(packs, decisions);
}

describe("facet-cocky as an authored trait effect row", () => {
  it("changes only the recorded person's new-game choice and records its reason", () => {
    const place = searchLifePlaces("a", 5000, { scope: "locality" }).at(-1)!;
    expect(place).toBeDefined();
    const seed = "session57-facet-cocky-random-place-2026-10-06";
    const game = generateOpeningLife(
      prepareOpeningLife({
        ...DEFAULT_NEW_GAME_SETUP,
        seed,
        placeKey: place.key,
        startAge: 40,
        depth: "summarize-earlier-life",
        questionnaire: "skipped",
      }),
    ).game;
    expect(game).toBeDefined();
    const world = game!.world;
    const personId = world.personOrder.find(
      (id) =>
        id !== game!.playerPersonId &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 30 &&
        activeCareResponsibilitiesAt(world, id).length === 0,
    )!;
    expect(personId).toBeDefined();
    const comparisonPersonId = world.personOrder.find(
      (id) =>
        id !== game!.playerPersonId &&
        id !== personId &&
        ageOnDate(world.people[id]!.birthDate, world.currentDate) >= 30 &&
        activeCareResponsibilitiesAt(world, id).length === 0,
    )!;
    expect(comparisonPersonId).toBeDefined();

    const registry = registryWithFacetCocky();
    expect(registry.report.rejections).toEqual([]);
    expect(
      registry.report.packs.find((pack) => pack.pack === PERSONALITY_PACK)
        ?.consumedBy[`${PERSONALITY_PACK}:facet-cocky`],
    ).toEqual([ANOTHER_TERM_DECISION.id]);
    const trait = registry.traits.get(`${PERSONALITY_PACK}:facet-cocky`)!;
    const baseline = ensureTraitDefinition(world, trait);
    const confident = recordPersonalityTendency(baseline, {
      stableKey: `session57:${personId}:facet-cocky`,
      personId,
      tendencyId: traitDefinitionFromPack(trait).id,
      recordedAt: baseline.currentDate,
      expressionKey: trait.poles.high.key,
      strength: "strong",
      confidence: "high",
      scopeTags: ["personality-v1.test"],
      provenance: createMindProvenance("authored", {
        note: "Controlled comparison: this is the only changed trait record.",
      }),
      supersedesTendencyId: null,
    });
    expect(confident.history.personalityTendencies).toHaveLength(
      baseline.history.personalityTendencies.length + 1,
    );

    const registrySpy = vi
      .spyOn(traitRegistryModule, "traitRegistryFor")
      .mockReturnValue(registry);
    try {
      const input = {
        personId,
        stableKey: "session57:facet-cocky:another-term",
        subjectKey: "controlled-new-game-seat",
        onDate: world.currentDate,
        termEnds: addDays(world.currentDate, 730),
        serving: [
          {
            stableKey: "session57:known-small-reason-to-step-down",
            optionKey: "step-down",
            sourceType: "context:current-office" as const,
            direction: "supports" as const,
            importance: "slight" as const,
            confidence: "high" as const,
            explanation: "They have done enough for this office.",
            sourceRefs: [],
          },
        ],
        decisionType: "career.consider-another-term",
        traitsPrepared: true,
      };
      const withoutCocky = decideAnotherTerm(baseline, input);
      const withCocky = decideAnotherTerm(confident, input);
      expect(withoutCocky.seeks).toBe(false);
      expect(withCocky.seeks).toBe(true);
      expect(withCocky.reason).toBe("They figure they can win again.");
      const trace = withCocky.world.history.decisionTraces.at(-1)!;
      expect(trace.context.considerations).toContainEqual(
        expect.objectContaining({
          optionKey: "seek",
          sourceType: "mind:personality",
          explanation: "They figure they can win again.",
          sourceRefs: [
            expect.objectContaining({ kind: "personality-tendency" }),
          ],
        }),
      );
      const secondInput = {
        ...input,
        personId: comparisonPersonId,
        stableKey: "session57:facet-cocky:second-person",
      };
      const secondBaseline = decideAnotherTerm(baseline, secondInput);
      const secondWithOtherPersonCocky = decideAnotherTerm(
        confident,
        secondInput,
      );
      expect(secondWithOtherPersonCocky.seeks).toBe(secondBaseline.seeks);
      expect(secondWithOtherPersonCocky.reason).toBe(secondBaseline.reason);
      expect(
        secondWithOtherPersonCocky.world.history.decisionTraces
          .at(-1)!
          .context.considerations.some(
            (row) => row.sourceType === "mind:personality",
          ),
      ).toBe(false);
      console.info(
        "T9_FACET_COCKY_PROOF",
        JSON.stringify({
          seed,
          placeKey: place.key,
          personId,
          baselineChoice: "step-down",
          cockyChoice: "seek",
          traitRecordId: confident.history.personalityTendencies.at(-1)!.id,
          decisionTraceId: trace.id,
          comparisonPersonId,
          comparisonPersonChoice: secondWithOtherPersonCocky.seeks
            ? "seek"
            : "step-down",
          reason: withCocky.reason,
          scope:
            "Controlled new-game actor and one recorded trait difference; the test-only registry composes the per-trait JSON until Session 8's loader lands.",
        }),
      );
    } finally {
      registrySpy.mockRestore();
    }
  }, 60_000);
});
