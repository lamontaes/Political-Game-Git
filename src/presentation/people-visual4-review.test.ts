import { SCENE_REGISTRY } from "./scene-registry";
import { composeSceneCharacter } from "./scene-composition";
import { PRODUCTION_POSE_REGISTRY } from "./visual-integration";
import { PEOPLE_VISUAL4_POSE_ART } from "./people-visual4-review";
import { describe, it, expect } from "vitest";
import report from "../../art/qa/people-visual4/derivation.json";
import {
  PEOPLE_VISUAL4_RECORDS,
  PEOPLE_VISUAL4_CHARACTER_LIBRARY as library,
  PEOPLE_VISUAL4_VISUAL_LIBRARY as visuals,
} from "./people-visual4-review";
import {
  listPersonVisualSelections,
  setPersonVisualSelection,
  listPersonWardrobeFamilies,
  resolvePersonWardrobeContext,
} from "./person-visual-selection";
import { createCharacterProofWorld } from "./character-proof";
import {
  composeCandidateReviewSubject,
  CANDIDATE_REVIEW_PLATE,
} from "./candidate-review";
import { resolvePersonPortrait } from "./person-visual";
import { PRODUCTION_CHARACTER_LIBRARY } from "./visual-integration";
import { serializeWorld, deserializeWorld } from "../simulation/serialization";
const context = { library, poseFamily: "standing-neutral" };

describe("corrected people pipeline", () => {
  it("keeps every source revision outside production and reports every garment/body pair", () => {
    for (const r of PEOPLE_VISUAL4_RECORDS) {
      expect(r.runtime_release_status).toBe("unreleased");
      expect(r.candidate_component).not.toHaveProperty("catalog_generation");
      expect(PRODUCTION_CHARACTER_LIBRARY.components.has(r.asset_id)).toBe(
        false,
      );
    }
    const pairs = report.pairs.filter(
      (p) => "garment" in p && p.garment && !("metric" in p),
    );
    expect(pairs).toHaveLength(36 * 11);
    expect(new Set(pairs.map((p) => p.status))).toContain("failed-fit");
    expect(new Set(pairs.map((p) => p.status))).toContain("measured-candidate");
    for (const p of pairs.filter((p) => p.status === "measured-candidate")) {
      expect(p.measurement?.status).toBe("measured");
      expect(p.measurement!.worstFractionOfBodySpan).toBeLessThanOrEqual(0.03);
    }
  });
  it("exposes every recovered usable frontal hairstyle with exact head and paired back layers", () => {
    const world = createCharacterProofWorld(library, "visual4-hair-test", 1);
    const id = world.personOrder[0]!;
    const bald = listPersonVisualSelections({
      ...context,
      appearance: world.people[id]!.appearance!,
      selectionFilter: { hairFamily: null },
    });
    const bodyFamily = bald.find((c) =>
      c.bodyAssetId.includes("average_man_standing_neutral_front_a"),
    )!.selection.bodyFamily;
    const heads = bald.filter((c) => c.selection.bodyFamily === bodyFamily);
    expect(heads).toHaveLength(9);
    for (const head of heads) {
      const choices = listPersonVisualSelections({
        ...context,
        appearance: world.people[id]!.appearance!,
        selectionFilter: { bodyFamily, headFamily: head.selection.headFamily },
      });
      expect(choices).toHaveLength(56);
      for (const choice of choices) {
        const updated = setPersonVisualSelection(
          world,
          id,
          choice.selection,
          context,
        );
        const subject = composeCandidateReviewSubject({
          personId: id,
          appearance: updated.people[id]!.appearance,
          library,
          visualLibrary: visuals,
          bodyAssetId: choice.bodyAssetId,
          plate: CANDIDATE_REVIEW_PLATE,
        })!;
        expect(subject.plan.complete).toBe(true);
        expect(
          subject.plan.layers
            .filter((l) => l.kind === "hair-front" || l.kind === "hair-back")
            .map((l) => l.assetId)
            .sort(),
        ).toEqual([...choice.hairAssetIds].sort());
      }
    }
  });
  it("projects every complete exact-body wardrobe combination through the shared plan", () => {
    let world = createCharacterProofWorld(library, "visual4-combinations", 1);
    const id = world.personOrder[0]!;
    const choices = listPersonVisualSelections({
      ...context,
      appearance: world.people[id]!.appearance!,
      selectionFilter: { hairFamily: null },
    });
    const byBody = new Map(
      choices.map((choice) => [choice.selection.bodyFamily, choice]),
    );
    let total = 0;
    for (const choice of byBody.values()) {
      world = setPersonVisualSelection(world, id, choice.selection, context);
      const families = listPersonWardrobeFamilies(world.people[id]!, context);
      for (const top of families.top)
        for (const bottom of families.bottom)
          for (const footwear of families.footwear) {
            const wardrobe = resolvePersonWardrobeContext(
              world.people[id]!,
              { personId: id, families: { top, bottom, footwear } },
              context,
            );
            const subject = composeCandidateReviewSubject({
              personId: id,
              appearance: world.people[id]!.appearance,
              wardrobe,
              library,
              visualLibrary: visuals,
              bodyAssetId: choice.bodyAssetId,
              plate: CANDIDATE_REVIEW_PLATE,
            })!;
            expect(
              subject.plan.complete,
              JSON.stringify({
                choice,
                top,
                bottom,
                footwear,
                diagnostics: subject.plan.diagnostics,
              }),
            ).toBe(true);
            total++;
          }
    }
    expect(total).toBe(206);
  });
  it("carries selected canonical identity and actual wardrobe through save, portrait and render plan", () => {
    let world = createCharacterProofWorld(library, "visual4-test", 1);
    const id = world.personOrder[0]!;
    const choices = listPersonVisualSelections({
      ...context,
      appearance: world.people[id]!.appearance!,
    });
    const choice = choices.find(
      (c) =>
        c.bodyAssetId.includes("average_man_standing_neutral_front_a") &&
        c.selection.hairFamily === null,
    )!;
    expect(choice).toBeDefined();
    world = setPersonVisualSelection(world, id, choice.selection, context);
    const original = JSON.stringify(world.people[id]!.appearance);
    const available = listPersonWardrobeFamilies(world.people[id]!, context);
    expect(available.top.length).toBeGreaterThan(1);
    expect(available.bottom.length).toBe(12);
    expect(available.footwear.length).toBeGreaterThan(0);
    const signatures = [];
    for (const top of [
      available.top[0]!,
      available.top[1]!,
      available.top[0]!,
    ]) {
      const pref = {
        personId: id,
        families: {
          top,
          bottom: available.bottom[0]!,
          footwear: available.footwear[0]!,
        },
      };
      const restored = deserializeWorld(serializeWorld(world));
      const wardrobe = resolvePersonWardrobeContext(
        restored.people[id]!,
        JSON.parse(JSON.stringify(pref)),
        context,
      );
      const visual = resolvePersonPortrait(restored.people[id]!, {
        libraries: { characters: library, visuals },
        wardrobe,
      });
      expect(visual.kind).toBe("modular");
      const subject = composeCandidateReviewSubject({
        personId: id,
        appearance: restored.people[id]!.appearance,
        wardrobe,
        library,
        visualLibrary: visuals,
        bodyAssetId: choice.bodyAssetId,
        plate: CANDIDATE_REVIEW_PLATE,
      })!;
      expect(subject.plan.complete).toBe(true);
      expect(JSON.stringify(restored.people[id]!.appearance)).toBe(original);
      signatures.push(
        JSON.stringify(subject.plan.layers.map((layer) => layer.assetId)),
      );
    }
    expect(signatures[0]).toBe(signatures[2]);
    expect(signatures[1]).not.toBe(signatures[0]);
    expect(resolvePersonPortrait(world.people[id]!).kind).toBe("placeholder");
    const scenes = [...SCENE_REGISTRY.scenes.values()].flatMap((scene) =>
      [...scene.anchors.values()]
        .filter(
          (anchor) =>
            anchor.kind === "floor-standing" &&
            scene.floorCalibration &&
            scene.standardBodyWidthPercent !== null,
        )
        .map((anchor) => ({ scene, anchor })),
    );
    const results = scenes.map(({ scene, anchor }) =>
      composeSceneCharacter({
        personId: id,
        displayName: "Canonical review person",
        appearance: world.people[id]!.appearance!,
        scene,
        anchor,
        library,
        visualLibrary: visuals,
        poseRegistry: PRODUCTION_POSE_REGISTRY,
        poseArt: PEOPLE_VISUAL4_POSE_ART,
      }),
    );
    expect(
      results.some((r) => r.complete),
      JSON.stringify(
        results.map((r) => ({
          scene: r.sceneId,
          anchor: r.anchorId,
          diagnostics: r.diagnostics,
        })),
      ),
    ).toBe(true);
  });
});
