/**
 * Map-only interface preferences.
 *
 * UI owns the shell preference record and its storage. This module owns the
 * shape, defaults and validation of the one `map` field UI registers there,
 * so a saved map view reopens the way it was left and a damaged record
 * degrades to defaults instead of breaking the shell.
 *
 * The history date is deliberately not saved: reopening a save always shows
 * the current day.
 */

import { MAP_MODE_LAYER, type MapMode } from "./political-map-model";
import type { MapLayerId } from "./geometry-types";
import type { ViewBox } from "./map-view";

export interface MapPreferences {
  readonly initialized?: boolean;
  readonly selection?: {
    readonly layer: MapLayerId;
    readonly geoid: string;
    readonly stateUsps: string;
    readonly name: string;
  } | null;
  readonly view?: ViewBox;
  readonly mode: MapMode;
  /** Focused state or D.C. postal code; null is the national view. */
  readonly stateUsps: string | null;
  readonly labels: boolean;
  /** "map" draws the map beside the list; "list" shows the list alone. */
  readonly presentation: "map" | "list";
}

export const DEFAULT_MAP_PREFERENCES: MapPreferences = {
  mode: "house",
  stateUsps: null,
  labels: true,
  presentation: "map",
};

const MODES = new Set(Object.keys(MAP_MODE_LAYER));

/** Accepts untrusted stored input; every bad field falls back on its own. */
export function readMapPreferences(value: unknown): MapPreferences {
  if (!value || typeof value !== "object") return DEFAULT_MAP_PREFERENCES;
  const record = value as Record<string, unknown>;
  const stateUsps =
    typeof record.stateUsps === "string" && /^[A-Z]{2}$/.test(record.stateUsps)
      ? record.stateUsps
      : null;
  const mode =
    typeof record.mode === "string" && MODES.has(record.mode)
      ? (record.mode as MapMode)
      : DEFAULT_MAP_PREFERENCES.mode;
  const selected = record.selection as MapPreferences["selection"];
  const view = record.view as MapPreferences["view"];
  return {
    ...(record.initialized === true ? { initialized: true } : {}),
    ...(record.selection === null
      ? { selection: null }
      : selected &&
          [
            "state",
            "congressional",
            "state-upper",
            "state-lower",
            "county",
            "place",
          ].includes(selected.layer) &&
          typeof selected.geoid === "string" &&
          typeof selected.name === "string" &&
          typeof selected.stateUsps === "string"
        ? { selection: selected }
        : {}),
    ...(view &&
    [view.x, view.y, view.w, view.h].every(Number.isFinite) &&
    view.w > 0 &&
    view.h > 0
      ? { view }
      : {}),
    // A state-only layer without a state would draw nothing; fall back.
    mode:
      stateUsps || mode === "house" || mode === "senate"
        ? mode
        : DEFAULT_MAP_PREFERENCES.mode,
    stateUsps,
    labels:
      typeof record.labels === "boolean"
        ? record.labels
        : DEFAULT_MAP_PREFERENCES.labels,
    presentation:
      record.presentation === "list" || record.presentation === "map"
        ? record.presentation
        : DEFAULT_MAP_PREFERENCES.presentation,
  };
}

export function patchMapPreferences(
  current: MapPreferences,
  patch: Partial<MapPreferences>,
): MapPreferences {
  return readMapPreferences({ ...current, ...patch });
}
