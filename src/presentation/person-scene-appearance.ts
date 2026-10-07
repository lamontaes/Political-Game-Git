import type { EngineRecipe } from "./appearance-engine/pack";

/** A scene control supplies the recipe it actually drew, or none for old art. */
export type ScenePersonSelectionHandler = (
  personId: string,
  recipe?: EngineRecipe,
) => void;
