import { useEffect, useMemo, useState } from "react";

import {
  createLifeStartWorld,
  performLifeAction,
  type EntityId,
  type LifeActionKey,
  type World,
} from "../simulation";
import {
  BrowserWorldRepository,
  SerializedAutosaveCoordinator,
  type BrowserWorldSummary,
} from "../presentation/browser-world-repository";
import { LifeTitleScreen } from "./LifeTitleScreen";
import { NewGameFlow, type NewLifeDraft } from "./NewGameFlow";
import { LifeHome } from "./LifeHome";
import {
  LoadGameScreen,
  PauseMenu,
  SettingsScreen,
  type LifeSettings,
} from "./LifeOverlays";

type GameMode = "title" | "new-game" | "active" | "load-game" | "settings";

export function PlayerGame() {
  const repository = useMemo(() => new BrowserWorldRepository(), []);
  const coordinator = useMemo(
    () => new SerializedAutosaveCoordinator(repository),
    [repository],
  );

  const [mode, setMode] = useState<GameMode>("title");
  const [world, setWorld] = useState<World | null>(null);
  const [playerPersonId, setPlayerPersonId] = useState<EntityId | null>(null);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [saves, setSaves] = useState<readonly BrowserWorldSummary[]>([]);
  const [isLoadingSaves, setIsLoadingSaves] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isSettingsInGame, setIsSettingsInGame] = useState(false);
  const [isLoadInGame, setIsLoadInGame] = useState(false);

  const [settings, setSettings] = useState<LifeSettings>({
    textSize: "standard",
    reduceMotion: false,
  });

  // Apply visual settings to document body
  useEffect(() => {
    document.body.setAttribute("data-life-text", settings.textSize);
    document.body.setAttribute(
      "data-life-motion",
      settings.reduceMotion ? "reduced" : "normal",
    );
  }, [settings]);

  // Load existing saves on boot
  useEffect(() => {
    let cancelled = false;
    async function fetchSaves() {
      setIsLoadingSaves(true);
      try {
        const list = await repository.list();
        if (!cancelled) {
          setSaves(list);
          setErrorMessage(null);
        }
      } catch (err) {
        if (!cancelled) {
          setErrorMessage(
            err instanceof Error ? err.message : "Unable to read saves.",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSaves(false);
        }
      }
    }
    void fetchSaves();
    return () => {
      cancelled = true;
    };
  }, [repository]);

  // Global Escape key handling
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (mode === "active") {
        if (isSettingsInGame) {
          setIsSettingsInGame(false);
          return;
        }
        if (isLoadInGame) {
          setIsLoadInGame(false);
          return;
        }
        setIsPaused((prev) => !prev);
      } else if (
        mode === "new-game" ||
        mode === "load-game" ||
        mode === "settings"
      ) {
        setMode("title");
        setErrorMessage(null);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mode, isPaused, isSettingsInGame, isLoadInGame]);

  async function handleBeginNewGame(draft: NewLifeDraft) {
    setIsStarting(true);
    setErrorMessage(null);
    try {
      const createdWorld = createLifeStartWorld(draft);
      if (createdWorld.control.kind !== "person") {
        throw new Error("Created world missing person control.");
      }
      const playerId = createdWorld.control.personId;

      setSaveState("saving");
      await coordinator.save(createdWorld);
      setSaveState("saved");

      const refreshed = await repository.list();
      setSaves(refreshed);

      setWorld(createdWorld);
      setPlayerPersonId(playerId);
      setMode("active");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to create game.",
      );
      setSaveState("error");
    } finally {
      setIsStarting(false);
    }
  }

  async function handleContinue() {
    setErrorMessage(null);
    try {
      const recent = await repository.mostRecent();
      if (!recent) {
        setErrorMessage("No saved lives found to continue.");
        return;
      }
      const loaded = await repository.load(recent.saveId);
      if (!loaded || loaded.control.kind !== "person") {
        throw new Error("Saved world could not be loaded.");
      }
      setWorld(loaded);
      setPlayerPersonId(loaded.control.personId);
      setMode("active");
      const refreshed = await repository.list();
      setSaves(refreshed);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to continue save.",
      );
    }
  }

  async function handleLoadSave(saveId: string) {
    setErrorMessage(null);
    try {
      const loaded = await repository.load(saveId as EntityId);
      if (!loaded || loaded.control.kind !== "person") {
        throw new Error("Selected saved world could not be loaded.");
      }
      setWorld(loaded);
      setPlayerPersonId(loaded.control.personId);
      setIsPaused(false);
      setIsLoadInGame(false);
      setMode("active");
      const refreshed = await repository.list();
      setSaves(refreshed);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to load save.",
      );
    }
  }

  async function handleDeleteSave(saveId: string) {
    setErrorMessage(null);
    try {
      await repository.remove(saveId as EntityId);
      const refreshed = await repository.list();
      setSaves(refreshed);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to delete save.",
      );
    }
  }

  function handleAction(actionKey: LifeActionKey) {
    if (!world || !playerPersonId) return;

    try {
      const nextWorld = performLifeAction(world, playerPersonId, actionKey);
      setWorld(nextWorld);
      setSaveState("saving");

      void coordinator
        .save(nextWorld)
        .then(async () => {
          setSaveState("saved");
          const refreshed = await repository.list();
          setSaves(refreshed);
        })
        .catch((err) => {
          console.error("Autosave failed:", err);
          setSaveState("error");
        });
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Action failed to resolve.",
      );
    }
  }

  async function handleManualSave() {
    if (!world) return;
    setSaveState("saving");
    try {
      await coordinator.save(world);
      setSaveState("saved");
      const refreshed = await repository.list();
      setSaves(refreshed);
    } catch (err) {
      setSaveState("error");
      setErrorMessage(err instanceof Error ? err.message : "Save failed.");
    }
  }

  // Route/View rendering
  if (mode === "title") {
    return (
      <LifeTitleScreen
        saves={saves}
        isLoading={isLoadingSaves}
        message={errorMessage}
        onNewGame={() => {
          setErrorMessage(null);
          setMode("new-game");
        }}
        onContinue={handleContinue}
        onLoadGame={() => {
          setErrorMessage(null);
          setMode("load-game");
        }}
        onSettings={() => {
          setErrorMessage(null);
          setMode("settings");
        }}
      />
    );
  }

  if (mode === "new-game") {
    return (
      <NewGameFlow
        isStarting={isStarting}
        error={errorMessage}
        onCancel={() => {
          setErrorMessage(null);
          setMode("title");
        }}
        onBegin={handleBeginNewGame}
      />
    );
  }

  if (mode === "load-game") {
    return (
      <LoadGameScreen
        saves={saves}
        title="Load Game"
        error={errorMessage}
        onLoad={handleLoadSave}
        onDelete={handleDeleteSave}
        onBack={() => {
          setErrorMessage(null);
          setMode("title");
        }}
      />
    );
  }

  if (mode === "settings") {
    return (
      <SettingsScreen
        settings={settings}
        onChange={setSettings}
        onBack={() => {
          setErrorMessage(null);
          setMode("title");
        }}
      />
    );
  }

  if (mode === "active" && world && playerPersonId) {
    return (
      <>
        <LifeHome
          world={world}
          playerPersonId={playerPersonId}
          saveState={saveState}
          onAction={handleAction}
          onPause={() => setIsPaused(true)}
        />
        {isPaused ? (
          isSettingsInGame ? (
            <SettingsScreen
              settings={settings}
              onChange={setSettings}
              onBack={() => setIsSettingsInGame(false)}
              overlay
            />
          ) : isLoadInGame ? (
            <div className="life-overlay" role="dialog" aria-modal="true">
              <LoadGameScreen
                saves={saves}
                title="Load another save"
                error={errorMessage}
                onLoad={handleLoadSave}
                onDelete={handleDeleteSave}
                onBack={() => setIsLoadInGame(false)}
              />
            </div>
          ) : (
            <PauseMenu
              saveState={saveState}
              onResume={() => setIsPaused(false)}
              onSave={handleManualSave}
              onLoad={() => setIsLoadInGame(true)}
              onSettings={() => setIsSettingsInGame(true)}
              onTitle={() => {
                setIsPaused(false);
                setMode("title");
              }}
            />
          )
        ) : null}
      </>
    );
  }

  return (
    <LifeTitleScreen
      saves={saves}
      isLoading={isLoadingSaves}
      message={errorMessage}
      onNewGame={() => setMode("new-game")}
      onContinue={handleContinue}
      onLoadGame={() => setMode("load-game")}
      onSettings={() => setMode("settings")}
    />
  );
}
