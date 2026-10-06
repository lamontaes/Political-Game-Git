import type { EntityId } from "../simulation/types";
import type { EngineRecipe } from "./appearance-engine/pack";

/** A scene control supplies the recipe it actually drew, or none for old art. */
export type ScenePersonSelectionHandler = (
  personId: string,
  recipe?: EngineRecipe,
) => void;

/** The recipe actually drawn in the current scene, never a wardrobe write. */
export interface PersonSceneAppearance {
  readonly personId: EntityId;
  readonly onDate: string;
  readonly recipe: EngineRecipe;
}

/** Keep the portrait identity and framing; carry only the scene's clothes. */
export function withSceneClothing(
  portrait: EngineRecipe,
  personId: EntityId,
  onDate: string,
  scene: PersonSceneAppearance | undefined,
): EngineRecipe {
  if (
    !scene ||
    scene.personId !== personId ||
    scene.onDate !== onDate ||
    scene.recipe.presentation !== portrait.presentation
  ) {
    return portrait;
  }
  return {
    ...portrait,
    outfit: scene.recipe.outfit,
    colors: scene.recipe.colors ? { ...scene.recipe.colors } : undefined,
  };
}
