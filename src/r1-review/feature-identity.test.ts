import { expect, it } from "vitest";
import { privateModularInputs } from "../presentation/private-test-inputs";
import {
  defaultPreparedMaterial,
  preparedFamily,
  selectPreparedBody,
} from "../presentation/engine-people29-data";
import { ENGINE_PEOPLE29_CHARACTER_LIBRARY as library } from "../presentation/engine-people29-review";
import type { PersonAppearance } from "../simulation/types";
const available = privateModularInputs(
  "feature identity",
  ["art/manifest/character_candidate_modular45_registry.json"],
  library.catalogGeneration >= 16,
);
it.skipIf(!available)(
  "refuses a missing selected feature instead of replacing it with the body default",
  () => {
    const bodyFamily = "ep41-masc-lean-body";
    const appearance: PersonAppearance = {
      seed: "feature-identity",
      recipeVersion: "appearance-recipe-v2",
      catalogGeneration: 16,
      selection: {
        bodyFamily,
        headFamily: "m47-face-ellis",
        hairFamily: "m47-hair-coily-crop",
      },
      material: defaultPreparedMaterial(preparedFamily(bodyFamily)!, 16),
    };
    expect(selectPreparedBody(appearance, bodyFamily)).toBeDefined();
    const corrupt = {
      ...appearance,
      material: {
        ...appearance.material!,
        features: {
          ...appearance.material!.features,
          eyes: {
            ...appearance.material!.features.eyes,
            variant: "unavailable-selected-eyes",
          },
        },
      },
    };
    const before = JSON.stringify(corrupt);
    expect(selectPreparedBody(corrupt, bodyFamily)).toBeUndefined();
    expect(JSON.stringify(corrupt)).toBe(before);
  },
);
