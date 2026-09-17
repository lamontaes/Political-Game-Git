import { describe, expect, it } from "vitest";
import {
  componentsAtGeneration,
  resolveCharacterRecipe,
} from "./character-components";
import {
  ENGINE_PEOPLE29_TEMPLATES,
  MODULAR45_GENERATION,
  PREPARED_SKIN_RAMPS,
  generatedPreparedMaterial,
  preparedFamily,
  preparedRampsAt,
  validatePreparedAppearance,
} from "./engine-people29-data";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "./engine-people29-review";
import {
  commitCorrectedGeneration,
  proposeCorrectedGeneration,
  resolveCompleteOutfit,
} from "./complete-outfit";
import { listPersonVisualSelections } from "./person-visual-selection";
import { resolvePose41 } from "./pose41-adapter";
import { creatorAppearanceDraft } from "./creator-appearance-preview";
import {
  MODULAR45_REGISTRY,
  PRIVATE_CANDIDATE_ART_AVAILABLE,
} from "./private-candidate-manifests";
import type { PersonAppearance } from "../simulation/types";
import {
  appearanceAgeState,
  appearanceForNewPerson,
} from "./appearance-lifecycle";

// The corrected people generation is owner-private art.
const needsRepair =
  !PRIVATE_CANDIDATE_ART_AVAILABLE ||
  MODULAR45_REGISTRY.generations.length === 0;
const FAMILIES = [
  "masc-lean",
  "masc-average",
  "masc-heavy",
  "fem-lean",
  "fem-average",
  "fem-heavy",
] as const;
const FACES = ["lean", "average", "heavy"] as const;
const G = MODULAR45_GENERATION ?? 13;

function person(
  family: string,
  face: string,
  hair: string | null,
  generation = G,
): PersonAppearance {
  const prepared = preparedFamily(`ep41-${family}-body`)!;
  return {
    seed: `m45-${family}-${face}-${hair}`,
    recipeVersion: "appearance-recipe-v2",
    catalogGeneration: generation,
    selection: {
      bodyFamily: `ep41-${family}-body`,
      headFamily: `ep41-${family}-head-${face}`,
      hairFamily: hair === null ? null : `ep41-${family}-hair-${hair}`,
    },
    material: generatedPreparedMaterial(prepared, "m45", generation),
  };
}

describe.skipIf(needsRepair)("MODULAR45 corrected people generation", () => {
  it("adds generation 13 without changing what generation 12 draws", () => {
    expect(G).toBe(13);
    expect(library.catalogGeneration).toBeGreaterThanOrEqual(G);
    const twelve = componentsAtGeneration(library, 12).map((c) => c.assetId);
    expect(twelve.some((id) => id.endsWith("-m45"))).toBe(false);
    expect(twelve).toContain("ep41-masc-heavy-head-lean-v2");
    const thirteen = componentsAtGeneration(library, G).map((c) => c.assetId);
    expect(thirteen).toContain("ep41-masc-heavy-head-lean-m45");
    expect(thirteen).not.toContain("ep41-masc-heavy-head-lean-v2");
    expect(thirteen).not.toContain("ep41-masc-heavy-body");
  });

  it("gives every corrected layer a prepared template so materials apply", () => {
    // Without a template the browser draws the raw file and ignores swatches.
    const drawn = componentsAtGeneration(library, G)
      .map((c) => c.assetId)
      .filter((id) => id.endsWith("-m45"));
    expect(drawn.length).toBe(100);
    for (const id of drawn)
      expect(ENGINE_PEOPLE29_TEMPLATES[id], id).toBeDefined();
  });

  it("offers every hairstyle and no hair with every face, independently", () => {
    for (const family of FAMILIES)
      for (const face of FACES) {
        const options = listPersonVisualSelections({
          appearance: person(family, face, face),
          library,
          poseFamily: "standing-neutral",
          selectionFilter: {
            bodyFamily: `ep41-${family}-body`,
            headFamily: `ep41-${family}-head-${face}`,
          },
        });
        expect(
          options.map((o) => o.selection.hairFamily).sort(),
          `${family}/${face}`,
        ).toEqual(
          [...FACES.map((h) => `ep41-${family}-hair-${h}`), null].sort(),
        );
        for (const hair of [...FACES, null]) {
          const recipe = resolveCharacterRecipe(
            {
              appearance: person(family, face, hair),
              poseFamily: "standing-neutral",
            },
            library,
          );
          const ids = recipe.context.components.map((c) => c.assetId);
          expect(ids).toContain(`ep41-${family}-head-${face}-m45`);
          const hairIds = ids.filter((id) => id.includes("-hair-"));
          if (hair === null) expect(hairIds).toEqual([]);
          else
            expect(hairIds).toEqual([
              hair === face
                ? `ep41-${family}-hair-${hair}-m45`
                : `ep41-${family}-hair-${hair}-on-${face}-m45`,
            ]);
        }
      }
  });

  it("maps skin only where the generation can draw it", () => {
    for (const family of FAMILIES) {
      const prepared = preparedFamily(`ep41-${family}-body`)!;
      expect(
        preparedRampsAt(prepared, "skin", G)
          .map((r) => r.id)
          .filter((id) => id !== "source-colour"),
      ).toEqual(PREPARED_SKIN_RAMPS);
      expect(PREPARED_SKIN_RAMPS).toHaveLength(7);
      expect(preparedRampsAt(prepared, "skin", 12).map((r) => r.id)).toEqual([
        "source-colour",
      ]);
      // Historical defaults for older pins are unchanged.
      expect(generatedPreparedMaterial(prepared, "seed-a", 12)).toEqual(
        generatedPreparedMaterial(prepared, "seed-a"),
      );
      expect(
        generatedPreparedMaterial(prepared, "seed-a", 12).palettes.skin,
      ).toBe("source-colour");
      expect(PREPARED_SKIN_RAMPS).toContain(
        generatedPreparedMaterial(prepared, "seed-a", G).palettes.skin,
      );
      const base = person(family, "average", "average");
      for (const skin of PREPARED_SKIN_RAMPS) {
        const next = {
          ...base,
          material: {
            ...base.material!,
            palettes: { ...base.material!.palettes, skin },
          },
        };
        expect(() => validatePreparedAppearance(next)).not.toThrow();
        expect(
          resolveCompleteOutfit({
            appearance: next,
            library,
            poseFamily: "standing-neutral",
          }).ok,
        ).toBe(true);
        expect(() =>
          validatePreparedAppearance({ ...next, catalogGeneration: 12 }),
        ).toThrow();
      }
    }
  });

  it("moves an older saved person to corrected artwork only when asked", () => {
    const old = person("masc-heavy", "lean", "lean", 12);
    expect(old.material!.palettes.skin).toBe("source-colour");
    const outfit = resolveCompleteOutfit({
      appearance: old,
      library,
      poseFamily: "standing-neutral",
    });
    expect(outfit.ok).toBe(true);
    const saved: PersonAppearance = {
      ...old,
      outfit: {
        version: "complete-outfit-v1",
        families: outfit.ok ? outfit.families : {},
      },
    };
    const proposal = proposeCorrectedGeneration(
      saved,
      G,
      library,
      "standing-neutral",
    );
    expect(proposal.ok).toBe(true);
    expect(proposal.appearance!.catalogGeneration).toBe(G);
    expect(proposal.appearance!.selection).toEqual(saved.selection);
    expect(proposal.appearance!.material!.palettes.skin).toBe("skin-4");
    expect(proposal.ok && proposal.families).toEqual(saved.outfit!.families);

    const setup = {
      startKind: "custom",
      seed: "m45-adopt",
      placeKey: "lexington-fayette",
      startAge: 30,
      depth: "play-formative-years",
      startingLife: "ordinary-life",
      household: "shares-a-home",
      givenName: "Adopt",
      familyName: "Review",
      gender: "male",
      pronouns: "he-him",
      questionnaire: "skipped",
      appearanceCatalogGeneration: 12,
      appearanceRecipeVersion: "appearance-recipe-v2",
      appearanceOutfitVersion: "complete-outfit-v2",
    } as const;
    const world = creatorAppearanceDraft(setup, library)!;
    const id = world.personOrder[0]!;
    const before = world.people[id]!.appearance!;
    expect(before.catalogGeneration).toBe(12);
    const next = proposeCorrectedGeneration(
      before,
      G,
      library,
      "standing-neutral",
    );
    expect(next.ok).toBe(true);
    const adopted = commitCorrectedGeneration(world, id, next.appearance!, {
      library,
      poseFamily: "standing-neutral",
    });
    expect(adopted.people[id]!.appearance!.catalogGeneration).toBe(G);
    expect(adopted.people[id]!.appearance!.selection).toEqual(before.selection);
    // The original World is untouched; an update never rewrites identity.
    expect(world.people[id]!.appearance).toBe(before);
    expect(() =>
      commitCorrectedGeneration(
        world,
        id,
        {
          ...next.appearance!,
          selection: { ...next.appearance!.selection!, hairFamily: null },
        },
        { library, poseFamily: "standing-neutral" },
      ),
    ).toThrow();
  });

  it("fits seated and listening poses for every face and hairstyle", () => {
    for (const family of FAMILIES)
      for (const sleeve of ["short", "long"] as const)
        for (const face of FACES)
          for (const hair of [...FACES, null])
            for (const pose of [
              "seated-guest-neutral",
              "standing-listening",
            ] as const) {
              const shoes = componentsAtGeneration(library, G).some(
                (c) => c.assetId === `ep41-${family}-shoes-m45`,
              )
                ? `ep41-${family}-shoes-m45`
                : `ep41-${family}-shoes`;
              const result = resolvePose41({
                pose,
                bodyAssetId: `ep41-${family}-body-m45`,
                headAssetId: `ep41-${family}-head-${face}-m45`,
                hairAssetId:
                  hair === null
                    ? null
                    : hair === face
                      ? `ep41-${family}-hair-${hair}-m45`
                      : `ep41-${family}-hair-${hair}-on-${face}-m45`,
                outfitAssetIds: [
                  `ep41-${family}-${sleeve}-sleeve-torso-m45`,
                  `ep41-${family}-${sleeve}-sleeve-collar-m45`,
                  `ep41-${family}-trousers-m45`,
                  shoes,
                ],
                candidatePreview: true,
              });
              expect(
                result.status,
                `${family}/${sleeve}/${face}/${hair}/${pose}`,
              ).toBe("ready");
            }
  });
});

describe("appearance lifecycle interface for PEOPLE", () => {
  it("derives the life stage from the birth date on read", () => {
    expect(
      appearanceAgeState({ birthDate: "2010-06-01" }, "2026-05-31"),
    ).toMatchObject({
      stage: "child",
      supported: false,
    });
    expect(
      appearanceAgeState({ birthDate: "2008-06-01" }, "2026-06-01"),
    ).toMatchObject({
      stage: "adult",
      supported: true,
    });
    expect(
      appearanceAgeState({ birthDate: "1950-01-01" }, "2026-06-01").stage,
    ).toBe("older");
    expect(
      appearanceAgeState({ birthDate: null }, "2026-06-01").supported,
    ).toBe(false);
  });

  it.skipIf(needsRepair)(
    "gives new relatives their own pinned appearance once",
    () => {
      const setup = {
        startKind: "custom",
        seed: "m45-family",
        appearanceCatalogGeneration: G,
        placeKey: "lexington-fayette",
        startAge: 40,
        depth: "play-formative-years",
        startingLife: "ordinary-life",
        household: "shares-a-home",
        givenName: "Parent",
        familyName: "Review",
        gender: "female",
        pronouns: "she-her",
        questionnaire: "skipped",
        appearanceRecipeVersion: "appearance-recipe-v2",
        appearanceOutfitVersion: "complete-outfit-v2",
      } as const;
      const world = creatorAppearanceDraft(setup, library)!;
      const parent = world.people[world.personOrder[0]!]!;
      const add = (id: string, birthDate: string) => ({
        ...world,
        people: {
          ...world.people,
          [id]: { ...parent, id, birthDate, appearance: undefined },
        },
        personOrder: [...world.personOrder, id],
      });
      const adultWorld = add("person-adult-child", "1990-01-01");
      const adult = appearanceForNewPerson(
        adultWorld,
        "person-adult-child",
        { birthDate: "1990-01-01" },
        library,
      )!;
      expect(adult.catalogGeneration).toBe(library.catalogGeneration);
      expect(adult.selection).toBeDefined();
      expect(PREPARED_SKIN_RAMPS).toContain(adult.material!.palettes.skin);
      const sibling = appearanceForNewPerson(
        add("person-adult-sibling", "1992-01-01"),
        "person-adult-sibling",
        { birthDate: "1992-01-01" },
        library,
      )!;
      expect(sibling.seed).not.toBe(adult.seed);
      const child = appearanceForNewPerson(
        add("person-young-child", "2020-01-01"),
        "person-young-child",
        { birthDate: "2020-01-01" },
        library,
      )!;
      expect(child.selection).toBeUndefined();
      expect(child.catalogGeneration).toBe(library.catalogGeneration);
      expect(() =>
        appearanceForNewPerson(
          world,
          world.personOrder[0]!,
          { birthDate: "1986-01-01" },
          library,
        ),
      ).toThrow();
    },
  );
});
