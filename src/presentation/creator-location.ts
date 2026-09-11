import {
  lifePlaceByKey,
  type LifePlace,
  type LifePlaceScope,
} from "../simulation";
import type { NewGameSetup, NewGameStartKind } from "./new-game";

/**
 * The creator's unfinished location, distinct from a committed `NewGameSetup`.
 *
 * `DEFAULT_NEW_GAME_SETUP.placeKey` remains `kentucky` so old callers, replays
 * and saved worlds keep their explicit location. A fresh Normal start must not
 * inherit that as a hidden selection.
 */
export interface CreatorLocationDraft {
  readonly stateJurisdictionKey: string | null;
  readonly placeKey: string | null;
}

export function emptyCreatorLocation(): CreatorLocationDraft {
  return { stateJurisdictionKey: null, placeKey: null };
}

/** Rebuild a draft from an already-chosen setup (replay, tests, custom seeds). */
export function creatorLocationFromPlaceKey(
  placeKey: string | null | undefined,
): CreatorLocationDraft {
  if (!placeKey) return emptyCreatorLocation();
  const place = lifePlaceByKey(placeKey);
  if (!place) return emptyCreatorLocation();
  return {
    stateJurisdictionKey: place.stateJurisdictionKey,
    placeKey: place.key,
  };
}

export function selectCreatorState(
  draft: CreatorLocationDraft,
  stateJurisdictionKey: string,
): CreatorLocationDraft {
  const place = draft.placeKey ? lifePlaceByKey(draft.placeKey) : null;
  const keep =
    place !== null && place.stateJurisdictionKey === stateJurisdictionKey;
  return {
    stateJurisdictionKey,
    placeKey: keep ? draft.placeKey : null,
  };
}

export function clearCreatorState(): CreatorLocationDraft {
  return emptyCreatorLocation();
}

export function selectCreatorPlace(
  draft: CreatorLocationDraft,
  place: LifePlace,
): CreatorLocationDraft {
  if (
    draft.stateJurisdictionKey &&
    place.stateJurisdictionKey !== draft.stateJurisdictionKey
  ) {
    return draft;
  }
  return {
    stateJurisdictionKey:
      place.stateJurisdictionKey ?? draft.stateJurisdictionKey,
    placeKey: place.key,
  };
}

export function creatorPlaceIsAllowed(
  place: LifePlace,
  startKind: NewGameStartKind,
): boolean {
  if (startKind === "custom") return true;
  return place.scope === "locality";
}

export function creatorLocationIsReady(
  draft: CreatorLocationDraft,
  startKind: NewGameStartKind = "normal",
): boolean {
  if (!draft.placeKey) return false;
  const place = lifePlaceByKey(draft.placeKey);
  if (!place) return false;
  return creatorPlaceIsAllowed(place, startKind);
}

export function committedPlaceKey(
  draft: CreatorLocationDraft,
  startKind: NewGameStartKind = "normal",
): string | null {
  return creatorLocationIsReady(draft, startKind) ? draft.placeKey : null;
}

export function withCreatorLocation(
  setup: NewGameSetup,
  draft: CreatorLocationDraft,
): NewGameSetup {
  const startKind = setup.startKind ?? "normal";
  const placeKey = committedPlaceKey(draft, startKind);
  return { ...setup, placeKey: placeKey ?? "" };
}

export function selectedCreatorPlace(
  draft: CreatorLocationDraft,
): LifePlace | null {
  return draft.placeKey ? lifePlaceByKey(draft.placeKey) : null;
}

export function creatorPlaceScope(
  draft: CreatorLocationDraft,
): LifePlaceScope | null {
  return selectedCreatorPlace(draft)?.scope ?? null;
}

/**
 * Hometown results stay collapsed after an explicit pick so Next remains on
 * screen. They reopen only for a deliberate replacement — a new search or
 * Change — without clearing the committed town until another locality is
 * chosen. Changing state still uses `selectCreatorState`.
 */
export function creatorPlaceListOpen(
  selectedPlaceKey: string | null,
  replacing: boolean,
): boolean {
  return selectedPlaceKey === null || replacing;
}
