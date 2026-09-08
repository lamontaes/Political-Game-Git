import { useCallback, useEffect, useMemo, useReducer } from "react";

import { PROTOTYPE_CONTENT_NOTICE, type EntityRef } from "./data";
import { SceneShell } from "./SceneShell";
import { TitleScreen, type TitleAction } from "./TitleScreen";
import {
  INITIAL_STATE,
  activeView,
  canGoBack,
  prototypeReducer,
} from "./state";
import {
  CalendarWorkspace,
  EntityWorkspace,
  JournalWorkspace,
  OfficesWorkspace,
  OptionsWorkspace,
  PeopleWorkspace,
  PersonalWorkspace,
  SavedGamesWorkspace,
  type WorkspaceContext,
} from "./workspaces";
import "./prototype.css";

/**
 * UI-PROTOTYPE-01.
 *
 * DEVELOPMENT-ONLY VISUAL PROTOTYPE. Served from `ui-prototype.html`, which the
 * production entry never references and the production build never takes as an
 * input. Nothing here writes a save, touches the World, or advances time.
 */

const TITLE_SCENE_ID = "civic-community-meeting-title";

export function PrototypeApp() {
  const [state, dispatch] = useReducer(prototypeReducer, INITIAL_STATE);

  /**
   * Escape closes the highest active transient layer and only that one.
   *
   * It is registered once, at the top, because "the highest layer" is a
   * property of the whole prototype rather than of whichever component happens
   * to be mounted — a per-component handler is how Escape ends up closing two
   * things at once, or the wrong one.
   */
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      dispatch({ type: "escape" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const openEntity = useCallback(
    (ref: EntityRef) => dispatch({ type: "open-entity", ref }),
    [],
  );

  const context: WorkspaceContext = useMemo(
    () => ({
      state,
      dispatch,
      openEntity,
      back: () => dispatch({ type: "back" }),
      close: () => dispatch({ type: "go-to-scene" }),
      canGoBack: canGoBack(state),
    }),
    [state, openEntity],
  );

  const titleActions: readonly TitleAction[] = [
    {
      id: "new-game",
      label: "New Game",
      onSelect: () => dispatch({ type: "enter-shell" }),
    },
    {
      id: "continue",
      label: "Continue",
      onSelect: () => dispatch({ type: "enter-shell" }),
    },
    {
      id: "saved-games",
      label: "Saved Games",
      onSelect: () =>
        dispatch({ type: "open-title-overlay", overlay: "saved-games" }),
    },
    {
      id: "options",
      label: "Options",
      onSelect: () =>
        dispatch({ type: "open-title-overlay", overlay: "options" }),
    },
    {
      /*
       * Quit is shown truthfully rather than hidden or faked. A page cannot
       * close a tab it did not open, so the control says so instead of being a
       * button that does nothing when pressed.
       */
      id: "quit",
      label: "Quit",
      onSelect: () => undefined,
      disabledReason: "A browser tab cannot close itself",
    },
  ];

  const view = activeView(state);

  const workspace = (() => {
    if (state.screen !== "shell") return null;
    switch (view.surface) {
      case "scene":
        return null;
      case "people":
        return <PeopleWorkspace context={context} />;
      case "calendar":
        return <CalendarWorkspace context={context} />;
      case "personal":
        return <PersonalWorkspace context={context} />;
      case "offices":
        return <OfficesWorkspace context={context} />;
      case "journal":
        return <JournalWorkspace context={context} />;
      case "entity":
        return <EntityWorkspace context={context} entityRef={view.ref} />;
    }
  })();

  return (
    <div
      className="p-app"
      data-motion={state.motion}
      data-screen={state.screen}
      data-surface={view.surface}
    >
      <div className="p-devbar">
        <strong>UI-PROTOTYPE-01</strong>
        <span>Development only · not the production route</span>
        <span className="p-devbar-note">{PROTOTYPE_CONTENT_NOTICE}</span>
        {state.screen === "shell" ? (
          <button
            type="button"
            className="p-button"
            data-testid="devbar-title"
            onClick={() => dispatch({ type: "return-to-title" })}
          >
            Title screen
          </button>
        ) : null}
      </div>

      {state.screen === "title" ? (
        <>
          <TitleScreen sceneId={TITLE_SCENE_ID} actions={titleActions} />
          {state.titleOverlay === "saved-games" ? (
            <div className="p-title-overlay">
              <SavedGamesWorkspace
                onClose={() => dispatch({ type: "close-title-overlay" })}
              />
            </div>
          ) : null}
          {state.titleOverlay === "options" ? (
            <div className="p-title-overlay">
              <OptionsWorkspace
                context={context}
                onClose={() => dispatch({ type: "close-title-overlay" })}
              />
            </div>
          ) : null}
        </>
      ) : (
        <SceneShell
          state={state}
          dispatch={dispatch}
          openEntity={openEntity}
          onOptions={() =>
            dispatch({ type: "open-title-overlay", overlay: "options" })
          }
        >
          {workspace}
          {state.titleOverlay === "options" ? (
            <div className="p-title-overlay">
              <OptionsWorkspace
                context={context}
                onClose={() => dispatch({ type: "close-title-overlay" })}
              />
            </div>
          ) : null}
        </SceneShell>
      )}

      <p className="p-sr-only" role="status" aria-live="polite">
        {state.announcement}
      </p>
    </div>
  );
}
