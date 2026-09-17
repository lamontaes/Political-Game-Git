/**
 * Development-only harness for pointer/keyboard review of the political map
 * before UI mounts it. Not a build input; not a player route.
 *
 *   /map-preview.html?place=5363000&seed=maps-review
 */

import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";

import "../player/player.css";
import "../player/shell.css";
import "../player/world-orientation.css";
import { DEFAULT_NEW_GAME_SETUP } from "../presentation/new-game";
import {
  generateOpeningLife,
  prepareOpeningLife,
} from "../presentation/opening-life";
import type { EntityId } from "../simulation/types";
import {
  DEFAULT_MAP_PREFERENCES,
  readMapPreferences,
  type MapPreferences,
} from "./map-preferences";
import PoliticalMap from "./PoliticalMap";

const STORAGE_KEY = "pg-map-preview-preferences";
const params = new URLSearchParams(window.location.search);
const placeKey = params.get("place") ?? "";
const seed = params.get("seed") ?? "maps-review";

function readStored(): MapPreferences {
  try {
    return readMapPreferences(
      JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"),
    );
  } catch {
    return DEFAULT_MAP_PREFERENCES;
  }
}

function Preview() {
  const game = useMemo(
    () =>
      placeKey
        ? generateOpeningLife(
            prepareOpeningLife({
              ...DEFAULT_NEW_GAME_SETUP,
              placeKey,
              startAge: 30,
              seed,
            }),
          ).game
        : null,
    [],
  );
  const [preferences, setPreferences] = useState<MapPreferences>(readStored);
  const [opened, setOpened] = useState<string>("");
  if (!game)
    return (
      <p style={{ color: "#fff" }}>
        Add ?place=&lt;Census place GEOID&gt; to the URL.
      </p>
    );
  const world = game.world;
  const personId = (
    world.control.kind === "person" ? world.control.personId : ""
  ) as EntityId;
  return (
    <main
      className="life-shell"
      style={{ padding: 16, minHeight: "100vh", background: "#0b1019" }}
    >
      <p
        data-testid="preview-opened"
        style={{ color: "#f3ecdc", margin: "0 0 8px" }}
      >
        {opened
          ? `Would open: ${opened}`
          : "Development preview. Opening a card is shown here instead."}{" "}
        · Day <span data-testid="preview-world-date">{world.currentDate}</span>
      </p>
      <PoliticalMap
        world={world}
        personId={personId}
        preferences={preferences}
        onPreferencesChange={(next) => {
          setPreferences(next);
          try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
          } catch {
            /* private mode: preview keeps working without persistence */
          }
        }}
        onOpenPerson={(id) =>
          setOpened(
            `person ${world.people[id]?.givenName ?? ""} ${world.people[id]?.familyName ?? ""}`,
          )
        }
        onOpenMeasure={(id) => setOpened(`bill ${id}`)}
      />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
