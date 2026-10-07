import { recordWorldEvent } from "./world";
import notesVisibilityContent from "../../data/content/notes-visibility.json" with { type: "json" };
import type { EditorialStandard } from "./press/records";
import type {
  ChallengeIntensity,
  NotesVisibility,
  PersonalLifeDepiction,
  PlaySettings,
  SaveMode,
  World,
} from "./types";

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  saves: "free",
  challengeIntensity: "standard",
  notesVisibility: "full",
  pressPremise: "realistic",
  personalLifeDepiction: "full",
};

/** One-save remains hidden from new players until the owner enables the option. */
export const ONE_SAVE_OFFERED = false;

export const NOTES_VISIBILITY_LABEL = notesVisibilityContent.label;
export const NOTES_VISIBILITY_OPTIONS =
  notesVisibilityContent.options as readonly {
    readonly value: NotesVisibility;
    readonly label: string;
  }[];

export function playSettingsOf(world: World): PlaySettings {
  const saved = world.playSettings;
  if (!saved) return DEFAULT_PLAY_SETTINGS;
  // Lives saved before OW-1 also carry retired difficulty fields; they are
  // dropped here so nothing can read them.
  return {
    saves: saved.saves ?? DEFAULT_PLAY_SETTINGS.saves,
    challengeIntensity:
      saved.challengeIntensity ?? DEFAULT_PLAY_SETTINGS.challengeIntensity,
    notesVisibility:
      saved.notesVisibility ?? DEFAULT_PLAY_SETTINGS.notesVisibility,
    pressPremise: saved.pressPremise ?? DEFAULT_PLAY_SETTINGS.pressPremise,
    personalLifeDepiction:
      saved.personalLifeDepiction ??
      DEFAULT_PLAY_SETTINGS.personalLifeDepiction,
  };
}

/** Record one player-visible option change as a private, non-canonical event. */
export function setPlaySetting(
  world: World,
  key: "personalLifeDepiction",
  value: PersonalLifeDepiction,
): World;
export function setPlaySetting(
  world: World,
  key: "challenge",
  value: ChallengeIntensity,
): World;
export function setPlaySetting(
  world: World,
  key: "notes",
  value: NotesVisibility,
): World;
export function setPlaySetting(
  world: World,
  key: "personalLifeDepiction" | "challenge" | "notes",
  value: PersonalLifeDepiction | ChallengeIntensity | NotesVisibility,
): World {
  const current = playSettingsOf(world);
  const storedKey =
    key === "challenge"
      ? "challengeIntensity"
      : key === "notes"
        ? "notesVisibility"
        : key;
  if (current[storedKey] === value) return world;
  const next = {
    ...world,
    playSettings: {
      ...current,
      [storedKey]: value,
    },
  };
  return recordWorldEvent(next, {
    stableKey: `play-setting:${world.history.nextSequence}:${key}`,
    type: "player.setting.changed",
    occurredAt: world.currentDate,
    recordedAt: world.currentDate,
    jurisdictionId: null,
    involvedEntityIds: [world.id],
    participants: [],
    personFactConstraints: [],
    visibility: "private",
    tags: ["player-setting", key],
    summary: `The player changed the ${key} setting.`,
    context: {
      location: null,
      socialContext: null,
      pressure: null,
      choice: null,
      motivation: null,
      immediateReaction: null,
    },
  });
}

export function initialPlaySettings(input: {
  readonly saves?: SaveMode;
  readonly challenge?: ChallengeIntensity;
  readonly notes?: NotesVisibility;
  readonly pressPremise?: EditorialStandard;
  readonly personalLifeDepiction?: PersonalLifeDepiction;
}): PlaySettings {
  return {
    saves: input.saves ?? DEFAULT_PLAY_SETTINGS.saves,
    challengeIntensity:
      input.challenge ?? DEFAULT_PLAY_SETTINGS.challengeIntensity,
    notesVisibility: input.notes ?? DEFAULT_PLAY_SETTINGS.notesVisibility,
    pressPremise: input.pressPremise ?? DEFAULT_PLAY_SETTINGS.pressPremise,
    personalLifeDepiction:
      input.personalLifeDepiction ??
      DEFAULT_PLAY_SETTINGS.personalLifeDepiction,
  };
}
