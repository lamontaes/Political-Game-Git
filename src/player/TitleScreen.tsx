import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { BrowserWorldSummary } from "../presentation/browser-world-repository";
import { SCENE_REGISTRY } from "../presentation/scene-registry";
import {
  ambientPresentation,
  orderedAmbientCycle,
  TITLE_AMBIENT_HOLD_MS,
  titleAmbientFrame,
  type TitleAmbientRoom,
} from "../presentation/title-ambient";
import {
  titleHeroFromSaveSummary,
  visualLibraryVersion,
} from "../presentation/title-hero";
import {
  resolveTitlePresentation,
  TITLE_TABLEAU_REGISTRY,
  type TitlePresentation,
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
 *
 * The copy and the controls arrived from the other direction. The narrative
 * branch had repaired this same screen while it still lived in
 * `PlayerGame.tsx` — the canonical product name instead of the legacy
 * placeholder, no tagline, and Options and Quit present rather than missing,
 * with Quit disabled and honest about why instead of absent or lying. Both
 * changes were real, so the reconciliation kept this component and re-homed
 * those three into it rather than choosing a winner. The graphics decisions
 * above stay this lane's; the words below are the narrative lane's.
 *
 * PACKET 77 — WHAT THE SECOND PLAYTEST CHANGED HERE.
 *
 * The human saw art behind a menu that covered it. Three repairs, and each one
 * is a composition decision rather than a new graphics system:
 *
 *   - the room is the page and the menu is a panel on it, compact and to one
 *     side at desktop widths, so the environment is what you look at;
 *   - the room drifts, and every fifteen seconds it gives way to another
 *     released room, which is the difference between a picture and a place;
 *   - a viewer who has asked their system for less motion gets the rooms
 *     without the movement.
 *
 * The cycle is presentation and provably nothing else. It advances one integer
 * on a timer, and every decision that follows is a pure function in
 * `title-ambient.ts`. There is no path from here into a World or an RNG.
 */

/** Honours the viewer's own motion preference, and follows it if it changes. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listen = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listen);
    return () => query.removeEventListener("change", listen);
  }, []);
  return reduced;
}

/**
 * How many holds have passed.
 *
 * One interval, cleared on unmount, and stopped entirely when there is nothing
 * to cycle to. Nothing else in this component keeps time.
 */
function useAmbientStep(active: boolean): number {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(
      () => setStep((current) => current + 1),
      TITLE_AMBIENT_HOLD_MS,
    );
    return () => window.clearInterval(timer);
  }, [active]);
  return step;
}

/**
 * The room behind whatever is on screen, drifting.
 *
 * Exported because the character creator has to stand in the same world as the
 * title: the second playtest reported New Game "breaking to a blank standalone
 * form", and continuity of place is most of the repair. Both screens hand this
 * their children and it paints underneath them.
 *
 * `resolved` is the presentation a save justifies, when there is one. It goes
 * first in the cycle so a returning player arrives in their own room, and the
 * ordinary rooms follow. Passing nothing — which is what the creator does —
 * gives the front door's own cycle.
 *
 * The children are a function of the room's description rather than plain
 * nodes, so each screen can put that line where its own layout wants it. The
 * title panel has carried it since #86 and keeps carrying it there.
 */
export function AmbientTableau({
  resolved = null,
  children,
}: {
  readonly resolved?: TitlePresentation | null;
  readonly children: (roomDescription: string) => ReactNode;
}) {
  const cycle = useMemo<readonly TitleAmbientRoom[]>(() => {
    const ambient = orderedAmbientCycle(
      TITLE_TABLEAU_REGISTRY,
      SCENE_REGISTRY,
      PRODUCTION_VISUAL_LIBRARY,
    );
    const scene = resolved?.scene;
    const tableau = resolved?.tableau;
    if (!scene?.raster || !tableau) return ambient;
    if (!PRODUCTION_VISUAL_LIBRARY.has(scene.raster.assetId)) return ambient;
    const first: TitleAmbientRoom = {
      tableauId: tableau.tableauId,
      sceneId: scene.sceneId,
      label: tableau.label,
    };
    return [first, ...ambient.filter((room) => room.sceneId !== first.sceneId)];
  }, [resolved]);

  const reducedMotion = usePrefersReducedMotion();
  const step = useAmbientStep(cycle.length > 1);
  const frame = titleAmbientFrame(cycle, step);

  /**
   * Index 0 is the resolver's own presentation, so a hero or a silhouette is
   * drawn exactly as the resolver asked. Every later room is an ordinary empty
   * one, because the cycle has nobody in it.
   */
  const presentationFor = (room: TitleAmbientRoom | null, index: number) => {
    if (!room) return null;
    if (index === 0 && resolved && room.sceneId === resolved.scene?.sceneId) {
      return resolved;
    }
    return ambientPresentation(room, TITLE_TABLEAU_REGISTRY, SCENE_REGISTRY);
  };

  const showing = frame ? presentationFor(frame.current, frame.index) : null;
  const leaving = frame?.leaving
    ? presentationFor(
        frame.leaving,
        (frame.index - 1 + cycle.length) % cycle.length,
      )
    : null;

  const presentation = showing ?? resolved ?? TYPOGRAPHIC_ONLY;
  const cycleKey = frame ? `${frame.index}:${step}` : "still";
  const leavingCycleKey =
    frame?.leaving && frame.index >= 0
      ? `${(frame.index - 1 + cycle.length) % cycle.length}:${step - 1}`
      : null;

  return (
    <TitleTableau
      presentation={presentation}
      leaving={leaving}
      drifting={!reducedMotion}
      cycleKey={cycleKey}
      leavingCycleKey={leavingCycleKey}
    >
      {children(presentation.description)}
    </TitleTableau>
  );
}

/** What the wrapper paints when there is no art and no save: nothing at all. */
const TYPOGRAPHIC_ONLY: TitlePresentation = {
  kind: "typographic",
  tableau: null,
  scene: null,
  heroAnchorId: null,
  heroName: null,
  description: "The title screen.",
  reasons: ["No banked tableau is available."],
};

/**
 * The presentation a save summary justifies, resolved outside any screen.
 *
 * Lifted out so the persistent ambient shell can resolve the same room the
 * title would have resolved for itself. Both call this; neither has its own
 * opinion about which room a returning player arrives in.
 */
export function resolvedTitlePresentation(
  saves: readonly BrowserWorldSummary[],
): TitlePresentation {
  return resolveTitlePresentation({
    hero: titleHeroFromSaveSummary(saves[0]),
    assetLibraryVersion: visualLibraryVersion(PRODUCTION_VISUAL_LIBRARY),
    registry: TITLE_TABLEAU_REGISTRY,
    scenes: SCENE_REGISTRY,
  });
}

export function TitleScreen({
  saves,
  savesUnavailable,
  problem,
  onNewGame,
  onContinue,
  onOpenSaves,
  onOpenOptions,
}: {
  readonly saves: readonly BrowserWorldSummary[];
  readonly savesUnavailable: boolean;
  readonly problem: string | null;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onOpenSaves: () => void;
  readonly onOpenOptions: () => void;
}) {
  const recent = saves[0];

  // The room behind this screen is painted by the persistent ambient shell in
  // `PlayerGame`, not here. Mounting a second tableau was what made New Game
  // flash: two of them, each with its own cycle and its own cover transform,
  // swapped at a route change.
  return (
    <main className="game-title" data-testid="title-screen">
      {/*
            The room is the picture; it does not need a line telling the player
            it is a room (Task A). The environment-description prose — "a hall …
            with nobody in it" — is gone, and the scene stands on its own.
          */}
      <h1>Our Civic Duty</h1>
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
              {recent.residence ? ` \u00b7 ${recent.residence.name}` : ""}
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
        <button
          type="button"
          data-testid="open-options"
          onClick={onOpenOptions}
        >
          Options
        </button>
        <button type="button" data-testid="quit" disabled>
          Quit
          <small>Not available in this build.</small>
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
  );
}
