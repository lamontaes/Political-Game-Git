import type { BrowserWorldSummary } from "./browser-world-repository";
import { placeDressCode } from "./dress-code";
import {
  engineStandingHeightPercent,
  type PlacedScenePerson,
} from "./life-scene-people";
import type { TitlePresentation } from "./title-tableau";

/**
 * THE TITLE'S HERO, DRAWN BY THE PEOPLE ENGINE.
 *
 * A returning player's most recent character stands at the tableau's hero
 * anchor, looking the way they looked when the game was saved, dressed for
 * the room: formal at a hearing-room lectern, everyday at home. The save
 * summary carries their look (browser-world-repository.ts `playerLooks`), so
 * the title needs no world to draw them.
 *
 * The figure is sized and placed the way life scenes place a standing engine
 * person (engineStandingHeightPercent): the soles on the anchor's floor line.
 *
 * Null when there is nothing honest to draw: no hero tableau, no look in the
 * save (a child, or a save made before looks were saved), or an anchor the
 * scene does not have.
 */
export function titleEngineHero(
  presentation: TitlePresentation,
  summary: BrowserWorldSummary | undefined,
): PlacedScenePerson | null {
  const scene = presentation.scene;
  if (
    presentation.kind !== "hero-in-tableau" ||
    !scene ||
    !presentation.heroAnchorId ||
    !summary?.playerLooks
  )
    return null;
  const anchor = scene.anchors.get(presentation.heroAnchorId);
  if (!anchor) return null;
  const looks = summary.playerLooks;
  const recipe =
    looks[placeDressCode(scene.sceneId).dress] ??
    looks.casual ??
    Object.values(looks)[0];
  if (!recipe) return null;
  const heightPercent = engineStandingHeightPercent(scene, anchor, recipe);
  // The box is only a frame for the figure, which is drawn from its height
  // and centered on the anchor; its width follows the figure's proportions.
  const widthPercent =
    (heightPercent / 2.55) * (scene.plate.height / scene.plate.width);
  return {
    personId: summary.playerPersonId,
    name: summary.playerName,
    relationship: null,
    anchorId: anchor.id,
    seated: false,
    leftPercent: anchor.xPercent - widthPercent / 2,
    topPercent: anchor.contactFloorYPercent - heightPercent,
    widthPercent,
    heightPercent,
    layers: [],
    engine: recipe,
    hasArt: true,
    presence: summary.playerName,
  };
}
