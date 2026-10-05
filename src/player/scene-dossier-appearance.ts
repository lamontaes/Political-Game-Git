import type { StoryScene } from "../presentation/life-story";
import type { PersonSceneAppearance } from "../presentation/person-scene-appearance";
import type { EngineRecipe } from "../presentation/appearance-engine/pack";
import type { EntityId } from "../simulation";

export interface SelectedSceneAppearance {
  readonly sceneKey: string;
  readonly appearance: PersonSceneAppearance;
  readonly expanded?: boolean;
}

/** Identify the actual projected moment even when date and room are unchanged. */
export function sceneMomentKey(scene: StoryScene): string {
  return JSON.stringify([
    scene.kind,
    scene.kind === "episode"
      ? [scene.beat.instanceKey, scene.beat.stageKey]
      : scene.kind === "adult" || scene.kind === "formative"
        ? scene.situationKey
        : null,
    scene.kind === "formative" ? scene.withPersonId : null,
    scene.presentPeople.map((person) => person.personId),
  ]);
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

interface SceneDossierContext {
  readonly personId: string | null;
  readonly onDate: string;
  readonly sceneKey: string;
  readonly inScene: boolean;
  readonly inExpandedRecord?: boolean;
}

/** Only explicit expansion from the selected scene card carries its context. */
export function expandSceneAppearance(
  selected: SelectedSceneAppearance | null,
  context: SceneDossierContext,
): SelectedSceneAppearance | null {
  const appearance = currentSceneAppearance(selected, context);
  return context.inScene && selected && appearance
    ? { ...selected, expanded: true }
    : null;
}

/** Reject changed person, date, scene or non-scene entry before rendering. */
export function currentSceneAppearance(
  selected: SelectedSceneAppearance | null,
  context: SceneDossierContext,
): PersonSceneAppearance | undefined {
  return (context.inScene ||
    (context.inExpandedRecord && selected?.expanded)) &&
    selected?.sceneKey === context.sceneKey &&
    selected.appearance.personId === context.personId &&
    selected.appearance.onDate === context.onDate
    ? selected.appearance
    : undefined;
}
