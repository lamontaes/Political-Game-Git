import { describe, expect, it } from "vitest";

import { artPreviewLibraries } from "./art-preview";
import {
  PEOPLE_VISUAL4_CHARACTER_LIBRARY,
  PEOPLE_VISUAL4_UNDRESSABLE_BODIES,
} from "./people-visual4-review";
import {
  CANDIDATE_REVIEW_CHARACTER_LIBRARY,
  PRODUCTION_CHARACTER_LIBRARY,
} from "./visual-integration";
import { resolveCharacterRecipe } from "./character-components";
import {
  COHERENT_APPEARANCE_RECIPE_VERSION,
  LEGACY_APPEARANCE_RECIPE_VERSION,
  derivePersonAppearance,
} from "../simulation/person-appearance";

/**
 * The life candidate path composes from the fitted provider, and keeps doing so.
 *
 * MODULAR-GEN14's first concrete target: the preview the owner plays in — room,
 * dossier, wardrobe, portrait — was wired to the OLDER candidate lift, whose own
 * comment says candidates there are reviewed unfitted and that no candidate has
 * a fit profile. The corrected Visual4 registry, its compatible hair and its
 * measured per-body fit bank were reachable only from the developer proof route.
 * Two providers, and the worse one was the one being played.
 *
 * These are the properties that made the switch worth making, asserted so the
 * wire cannot come loose again quietly.
 */
describe("the life candidate preview provider", () => {
  const preview = artPreviewLibraries("candidate-review");

  it("is the Visual4 provider, not the older unfitted lift", () => {
    expect(preview).not.toBeNull();
    expect(preview!.characters).toBe(PEOPLE_VISUAL4_CHARACTER_LIBRARY);
    expect(preview!.characters).not.toBe(CANDIDATE_REVIEW_CHARACTER_LIBRARY);
  });

  /*
   * The fit bank is the whole difference between a garment on a body and a
   * garment beside one. The older lift carries none, which is why swapping the
   * provider was the fix rather than a preference.
   */
  it("carries the measured garment fit bank", () => {
    expect(preview!.characters.fit).not.toBeNull();
    expect(CANDIDATE_REVIEW_CHARACTER_LIBRARY.fit).toBeNull();
  });

  it("leaves the production path completely alone", () => {
    expect(artPreviewLibraries("production")).toBeNull();
    expect(PRODUCTION_CHARACTER_LIBRARY.components.size).toBeGreaterThan(0);
    expect(PRODUCTION_CHARACTER_LIBRARY).not.toBe(preview!.characters);
  });
});

describe("which bodies a seeded person can be given", () => {
  /*
   * A body nothing can dress is not a selectable body.
   *
   * The library already said this for garments and hair — "an empty
   * compatibility list is a measured refusal" — and had never applied it to the
   * one part that decides whether a person exists at all. Six of eleven banked
   * body families have no top, bottom or footwear between them, and the
   * resolver kept handing identities to them: the body refused and every slot
   * behind it reported empty, so fifteen of twenty-four seeded people composed
   * nothing.
   */
  it("resolves a complete recipe for every seeded person", () => {
    const failures: string[] = [];
    for (let index = 0; index < 96; index += 1) {
      const recipe = resolveCharacterRecipe(
        {
          appearance: derivePersonAppearance(`gen14-regression-${index}`),
          poseFamily: "standing-neutral",
          unresolvableRequiredSlots: "diagnose",
        },
        PEOPLE_VISUAL4_CHARACTER_LIBRARY,
      );
      const diagnostics = recipe.context.diagnostics ?? [];
      if (diagnostics.length > 0)
        failures.push(
          `seed ${index}: ${diagnostics.map((entry) => entry.code).join(", ")}`,
        );
    }
    expect(failures).toEqual([]);
  });

  function spread(version: string): {
    readonly bodies: number;
    readonly heads: number;
  } {
    const bodies = new Set<string>();
    const heads = new Set<string>();
    for (let index = 0; index < 96; index += 1) {
      const recipe = resolveCharacterRecipe(
        {
          appearance: derivePersonAppearance(
            `gen14-regression-${index}`,
            version,
          ),
          poseFamily: "standing-neutral",
          unresolvableRequiredSlots: "diagnose",
        },
        PEOPLE_VISUAL4_CHARACTER_LIBRARY,
      );
      for (const component of recipe.context.components) {
        if (component.kind === "body") bodies.add(component.assetId);
        if (component.kind === "head") heads.add(component.assetId);
      }
    }
    return { bodies: bodies.size, heads: heads.size };
  }

  /*
   * Variety is the point of a combinatorial system, and one body for everybody
   * is the failure this work exists to fix. The older lift offered two bodies
   * for every person in the game; this asserts the floor is meaningfully above
   * that, without pinning an exact number that new art should be free to raise.
   *
   * This is a property of the LIFT, so it is measured on the unconstrained draw
   * — appearance recipe v1, which filters on nothing but declared compatibility.
   * The provider offers five dressable bodies and nine heads here; if the wire
   * came loose and the older two-body lift were reached again, this fails.
   */
  it("spreads those people across several bodies and heads", () => {
    const measured = spread(LEGACY_APPEARANCE_RECIPE_VERSION);
    expect(measured.bodies).toBeGreaterThanOrEqual(5);
    expect(measured.heads).toBeGreaterThanOrEqual(5);
  });

  /*
   * And what a life started now does with that same bank.
   *
   * Appearance recipe v2 keeps a face in the same measured skin as the body
   * carrying it, and that narrows the faces a given body can draw: every body
   * stays in play, the heads drop to the two that measure into the dressable
   * bodies' tone range. That is a stated property of the art — nine banked
   * heads clustered darker than five dressable bodies — and not a policy knob;
   * `appearance-recipe-v2.test.ts` carries the tolerance sweep behind it and
   * the control that v1 people keep resolving to v1 components.
   *
   * Asserted here so the narrowing stays visible at the provider boundary, and
   * so more heads measured into that range raise it rather than break it.
   */
  it("keeps every body but fewer faces under the coherent recipe", () => {
    const measured = spread(COHERENT_APPEARANCE_RECIPE_VERSION);
    expect(measured.bodies).toBeGreaterThanOrEqual(5);
    expect(measured.heads).toBeGreaterThanOrEqual(2);
    expect(measured.heads).toBeLessThan(
      spread(LEGACY_APPEARANCE_RECIPE_VERSION).heads,
    );
  });

  /*
   * The excluded bodies are a stated gap, not a silence.
   *
   * Reported so the asset request can be read off the bank itself rather than
   * guessed at, and so a family that gains a garment stops being excluded
   * without anyone editing a list by hand.
   */
  it("names every excluded body and what it lacks", () => {
    expect(PEOPLE_VISUAL4_UNDRESSABLE_BODIES.length).toBeGreaterThan(0);
    for (const refusal of PEOPLE_VISUAL4_UNDRESSABLE_BODIES) {
      expect(refusal.family).toMatch(/pv4$/);
      expect(refusal.missing.length).toBeGreaterThan(0);
      for (const kind of refusal.missing)
        expect(["top", "bottom", "footwear"]).toContain(kind);
    }
    const excluded = new Set(
      PEOPLE_VISUAL4_UNDRESSABLE_BODIES.map((entry) => entry.family),
    );
    for (const component of PEOPLE_VISUAL4_CHARACTER_LIBRARY.components.values())
      if (component.definition.kind === "body")
        expect(excluded.has(component.definition.family)).toBe(false);
  });
});
