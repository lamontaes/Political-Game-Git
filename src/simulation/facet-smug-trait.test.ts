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
import facetSmugEffects from "../../data/traits/effects/facet-smug.json" with { type: "json" };

// STUB until Session 8's per-trait JSON loader lands: compose this file's rows
// into the existing personality pack in the test only. No shared registry is
// changed by this PR.
function registryWithFacetSmug() {
  const packs = compiledTraitPacks().map((pack) =>
    pack.pack === PERSONALITY_PACK
      ? {
          ...pack,
          effects: [
            ...pack.effects,
            ...(facetSmugEffects as readonly TraitEffectDeclaration[]),
          ],
        }
      : pack,
  );
  const decisions = [
    ...traitRegistryModule.loadedTraitRegistry().decisions.values(),
  ];
  return loadTraitPacks(packs, decisions);
}

describe("facet-smug as an authored trait effect row", () => {
  it("changes only the recorded person's new-game choice and records its reason", () => {
    const place = searchLifePlaces("a", 5000, { scope: "locality" }).at(-1)!;
    expect(place).toBeDefined();
    const seed = "session57-facet-smug-random-place-2026-10-06";
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

    const registry = registryWithFacetSmug();
    expect(registry.report.rejections).toEqual([]);
    expect(
      registry.report.packs.find((pack) => pack.pack === PERSONALITY_PACK)
        ?.consumedBy[`${PERSONALITY_PACK}:facet-smug`],
    ).toEqual([ANOTHER_TERM_DECISION.id]);
    const trait = registry.traits.get(`${PERSONALITY_PACK}:facet-smug`)!;
    const baseline = ensureTraitDefinition(world, trait);
    const smugWorld = recordPersonalityTendency(baseline, {
      stableKey: `session57:${personId}:facet-smug`,
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
    expect(smugWorld.history.personalityTendencies).toHaveLength(
      baseline.history.personalityTendencies.length + 1,
    );

    const registrySpy = vi
      .spyOn(traitRegistryModule, "traitRegistryFor")
      .mockReturnValue(registry);
    try {
      const input = {
        personId,
        stableKey: "session57:facet-smug:another-term",
        subjectKey: "controlled-new-game-seat",
        onDate: world.currentDate,
        termEnds: addDays(world.currentDate, 730),
        serving: [
          {
            stableKey: "session57:known-small-reason-to-seek",
            optionKey: "seek",
            sourceType: "context:current-office" as const,
            direction: "supports" as const,
            importance: "slight" as const,
            confidence: "high" as const,
            explanation: "They have one more piece of work to finish.",
            sourceRefs: [],
          },
        ],
        decisionType: "career.consider-another-term",
        traitsPrepared: true,
      };
      const withoutSmug = decideAnotherTerm(baseline, input);
      const withSmug = decideAnotherTerm(smugWorld, input);
      expect(withoutSmug.seeks).toBe(true);
      expect(withSmug.seeks).toBe(false);
      expect(withSmug.reason).toBe(
        "They are satisfied with what they have achieved.",
      );
      const trace = withSmug.world.history.decisionTraces.at(-1)!;
      expect(trace.context.considerations).toContainEqual(
        expect.objectContaining({
          optionKey: "step-down",
          sourceType: "mind:personality",
          explanation: "They are satisfied with what they have achieved.",
          sourceRefs: [
            expect.objectContaining({ kind: "personality-tendency" }),
          ],
        }),
      );
      const secondInput = {
        ...input,
        personId: comparisonPersonId,
        stableKey: "session57:facet-smug:second-person",
      };
      const secondBaseline = decideAnotherTerm(baseline, secondInput);
      const secondWithOtherPersonSmug = decideAnotherTerm(
        smugWorld,
        secondInput,
      );
      expect(secondWithOtherPersonSmug.seeks).toBe(secondBaseline.seeks);
      expect(secondWithOtherPersonSmug.reason).toBe(secondBaseline.reason);
      expect(
        secondWithOtherPersonSmug.world.history.decisionTraces
          .at(-1)!
          .context.considerations.some(
            (row) => row.sourceType === "mind:personality",
          ),
      ).toBe(false);
      console.info(
        "T9_FACET_SMUG_PROOF",
        JSON.stringify({
          seed,
          placeKey: place.key,
          personId,
          baselineChoice: "seek",
          smugChoice: "step-down",
          traitRecordId: smugWorld.history.personalityTendencies.at(-1)!.id,
          decisionTraceId: trace.id,
          comparisonPersonId,
          comparisonPersonChoice: secondWithOtherPersonSmug.seeks
            ? "seek"
            : "step-down",
          reason: withSmug.reason,
          scope:
            "Controlled new-game actor and one recorded trait difference; the test-only registry composes the per-trait JSON until Session 8's loader lands. The one-sided meaning is satisfaction with past achievements, not a prediction of future success.",
        }),
      );
    } finally {
      registrySpy.mockRestore();
    }
  }, 60_000);
});
