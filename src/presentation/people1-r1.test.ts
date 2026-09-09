import { describe, expect, it } from "vitest";
import { deserializeWorld, serializeWorld } from "../simulation/serialization";
import {
  createCharacterProofWorld,
  composeCharacterProof,
  CHARACTER_PROOF_SCENE,
} from "./character-proof";
import {
  PRODUCTION_CHARACTER_LIBRARY as library,
  PRODUCTION_VISUAL_LIBRARY as visuals,
} from "./visual-integration";
import {
  WAVE_A_REVIEW_CHARACTER_LIBRARY,
  WAVE_A_REVIEW_VISUAL_LIBRARY,
  WAVE_A_WARDROBE_RECORDS,
  composeCandidateReviewSubject,
} from "./candidate-review";
import { resolveCharacterRecipe } from "./character-components";
import { createRunBFixture } from "./run-b-fixture";
import { resolvePersonPortrait } from "./person-visual";

const casual = {
  id: "casual-v1",
  families: { top: ["dev-tee-teal", "dev-g2-knit-olive"] },
};
const formal = {
  id: "formal-v1",
  families: { top: ["dev-blazer-navy", "dev-g2-suit-charcoal"] },
};

describe("PEOPLE1-R1 consumers", () => {
  it("serializes a real world and changes wardrobe without changing saved person, face, hair, body or generation", () => {
    const world = createCharacterProofWorld(library);
    const before = serializeWorld(world);
    const casualPlans = composeCharacterProof(
      world,
      library,
      visuals,
      CHARACTER_PROOF_SCENE,
      casual,
    );
    const reloaded = deserializeWorld(before);
    const formalPlans = composeCharacterProof(
      reloaded,
      library,
      visuals,
      CHARACTER_PROOF_SCENE,
      formal,
    );
    expect(serializeWorld(reloaded)).toBe(before);
    for (let i = 0; i < casualPlans.stage.length; i++) {
      const a = casualPlans.stage[i]!.plan,
        b = formalPlans.stage[i]!.plan;
      expect(a.complete).toBe(true);
      expect(b.complete).toBe(true);
      expect(b.identity).toEqual(a.identity);
      expect(b.recipeKey).toBe(a.recipeKey);
      const ids = (plan: typeof a, clothing: boolean) =>
        plan.layers
          .filter((layer) =>
            clothing
              ? layer.kind === "top"
              : [
                  "body",
                  "head",
                  "hair-front",
                  "hair-back",
                  "facial-hair",
                  "eyewear",
                ].includes(layer.kind),
          )
          .map((layer) => layer.assetId);
      expect(ids(a, false)).toEqual(ids(b, false));
      expect(ids(a, true)).not.toEqual(ids(b, true));
    }
    expect(
      composeCharacterProof(
        reloaded,
        library,
        visuals,
        CHARACTER_PROOF_SCENE,
        casual,
      ),
    ).toEqual(casualPlans);
  });

  it("fails closed for an unavailable contextual wardrobe without rerolling identity", () => {
    const appearance =
      createCharacterProofWorld(library).people[
        createCharacterProofWorld(library).personOrder[0]!
      ]!.appearance!;
    const regular = resolveCharacterRecipe(
      { appearance, poseFamily: "standing-neutral" },
      library,
    );
    const unavailable = resolveCharacterRecipe(
      {
        appearance,
        poseFamily: "standing-neutral",
        wardrobe: { id: "unsupported", families: { top: ["not-a-family"] } },
      },
      library,
    );
    expect(unavailable.identity).toEqual(regular.identity);
    expect(unavailable.context.components.some((c) => c.kind === "top")).toBe(
      false,
    );
    expect(
      unavailable.context.diagnostics.some(
        (d) => d.code === "required-slot-empty" && d.kind === "top",
      ),
    ).toBe(true);
  });

  it("honours baked heads in render plans and retains seated garment gaps", () => {
    for (const record of WAVE_A_WARDROBE_RECORDS.filter(
      (r) => r.candidate_component?.kind === "body",
    )) {
      const subject = composeCandidateReviewSubject({
        library: WAVE_A_REVIEW_CHARACTER_LIBRARY,
        visualLibrary: WAVE_A_REVIEW_VISUAL_LIBRARY,
        bodyAssetId: record.asset_id,
        plate: CHARACTER_PROOF_SCENE.plate,
      })!;
      expect(subject.plan.missing).not.toContain("slot:head");
      expect(subject.plan.layers.some((layer) => layer.kind === "head")).toBe(
        false,
      );
      expect(
        subject.plan.diagnostics.some((d) => d.code === "slot-painted-by-body"),
      ).toBe(true);
      if (record.candidate_component!.pose_family!.startsWith("seated")) {
        expect(subject.plan.complete).toBe(false);
        expect(subject.plan.missing).toContain("slot:bottom");
      }
      for (const component of subject.recipe.context.components) {
        const families = WAVE_A_REVIEW_CHARACTER_LIBRARY.components.get(
          component.assetId,
        )!.definition.compatible_body_families;
        if (families)
          expect(families).toContain(subject.recipe.identity.bodyFamily);
      }
    }
  });

  it("uses an authored likeness only for its saved appearance and refuses a future catalog", () => {
    const fixture = createRunBFixture();
    for (const entry of fixture.scenePeople) {
      expect(
        resolvePersonPortrait(fixture.world.people[entry.personId]!).kind,
      ).toBe("authored");
    }
    const world = createCharacterProofWorld(library);
    const person = world.people[world.personOrder[0]!]!;
    expect(
      resolvePersonPortrait({
        ...person,
        appearance: {
          ...person.appearance!,
          catalogGeneration: library.catalogGeneration + 1,
        },
      }),
    ).toEqual({
      kind: "placeholder",
      reason: "catalog-generation-unavailable",
    });
  });

  it("never puts candidate bodies or DEV-only likenesses into normal dossiers", () => {
    const world = createCharacterProofWorld(library);
    for (const person of Object.values(world.people))
      expect(resolvePersonPortrait(person).kind).toBe("placeholder");
    for (const record of WAVE_A_WARDROBE_RECORDS)
      expect(library.components.has(record.asset_id)).toBe(false);
  });
});
