import type { PersonSceneAppearance } from "../presentation/person-scene-appearance";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";
import type { EntityId } from "../simulation";

export interface SelectedSceneAppearance {
  readonly sceneKey: string;
  readonly appearance: PersonSceneAppearance;
}

/** Forward the selected entry's resolved recipe, without resolving clothing again. */
export function selectSceneAppearance(
  entry:
    { readonly personId: string; readonly engine?: EngineRecipe } | undefined,
  onDate: string,
  sceneKey: string,
): SelectedSceneAppearance | null {
  return entry?.engine
    ? {
        sceneKey,
        appearance: {
          personId: entry.personId as EntityId,
          onDate,
          recipe: entry.engine,
        },
      }
    : null;
}

/** Reject stale context immediately; the caller also clears its transient state. */
export function currentSceneAppearance(
  selected: SelectedSceneAppearance | null,
  context: {
    readonly personId: string | null;
    readonly onDate: string;
    readonly sceneKey: string;
    readonly inScene: boolean;
  },
): PersonSceneAppearance | undefined {
  return context.inScene &&
    selected?.sceneKey === context.sceneKey &&
    selected.appearance.personId === context.personId &&
    selected.appearance.onDate === context.onDate
    ? selected.appearance
    : undefined;
}
