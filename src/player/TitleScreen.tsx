import { useMemo } from "react";

import type { BrowserWorldSummary } from "../presentation/browser-world-repository";
import { SCENE_REGISTRY } from "../presentation/scene-registry";
import {
  titleHeroFromSaveSummary,
  visualLibraryVersion,
} from "../presentation/title-hero";
import {
  resolveTitlePresentation,
  TITLE_TABLEAU_REGISTRY,
} from "../presentation/title-tableau";
import { PRODUCTION_VISUAL_LIBRARY } from "../presentation/visual-integration";
import { TitleTableau } from "./TitleTableau";

/**
 * The title screen.
 *
 * It lived inside `PlayerGame.tsx` until the graphics lane needed to give it a
 * backdrop. Moving it out is not tidying: `PlayerGame.tsx` is another branch's
 * surface, and a title screen that grows a scene, a tier ladder and a camera
 * inside it would put graphics work permanently in the middle of somebody
 * else's file. Here, the shell keeps one import and this file keeps the rest.
 *
 * Nothing about which room appears is decided here. The screen hands the
 * resolver what a save summary can honestly support and renders whatever comes
 * back, including the case where what comes back is no art at all.
 */

export function TitleScreen({
  saves,
  savesUnavailable,
  problem,
  onNewGame,
  onContinue,
  onOpenSaves,
}: {
  readonly saves: readonly BrowserWorldSummary[];
  readonly savesUnavailable: boolean;
  readonly problem: string | null;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onOpenSaves: () => void;
}) {
  const recent = saves[0];

  /**
   * The backdrop is resolved from the same contract every other scene uses,
   * and from nothing this component knows on its own.
   *
   * The title screen used to be plain markup on a pale page while the tableau
   * architecture sat unused beside it, so approved art existed and the front
   * door of the game never showed any of it. What is passed in is only what a
   * save summary can support — a name, an age, whether a residence is on
   * record — and the resolver decides the rest. If it decides there is nothing
   * truthful to show, the markup below is exactly what it always was.
   */
  const presentation = useMemo(
    () =>
      resolveTitlePresentation({
        hero: titleHeroFromSaveSummary(recent),
        assetLibraryVersion: visualLibraryVersion(PRODUCTION_VISUAL_LIBRARY),
        registry: TITLE_TABLEAU_REGISTRY,
        scenes: SCENE_REGISTRY,
      }),
    [recent],
  );

  return (
    <TitleTableau presentation={presentation}>
      <main className="game-title" data-testid="title-screen">
        <h1>Political Game</h1>
        <p className="game-title-line">A life, and the places it can reach.</p>
        <p className="game-title-scene" data-testid="title-scene-description">
          {presentation.description}
        </p>
        <div className="game-title-actions">
          <button type="button" data-testid="new-game" onClick={onNewGame}>
            New game
          </button>
          <button
            type="button"
            data-testid="continue"
            onClick={onContinue}
            disabled={!recent}
          >
            Continue
            {recent ? (
              <small>
                {recent.playerName}, {recent.playerAge}
                {recent.residence ? ` · ${recent.residence.name}` : ""}
              </small>
            ) : null}
          </button>
          <button
            type="button"
            data-testid="open-saves"
            onClick={onOpenSaves}
            disabled={saves.length === 0}
          >
            Saved games
            {saves.length > 0 ? <small>{saves.length} saved</small> : null}
          </button>
        </div>
        {savesUnavailable ? (
          <p className="game-note">
            This browser will not let the game store anything, so a game played
            here will not still be here later.
          </p>
        ) : null}
        {problem ? <p className="game-problem">{problem}</p> : null}
      </main>
    </TitleTableau>
  );
}
