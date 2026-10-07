import { recordWorldEvent } from "./world";
import type {
  PersonalLifeDepiction,
  PlaySettings,
  SaveMode,
  World,
} from "./types";

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  saves: "free",
  personalLifeDepiction: "full",
};

/** One-save remains hidden from new players until the owner enables the option. */
export const ONE_SAVE_OFFERED = false;

export function playSettingsOf(world: World): PlaySettings {
  const saved = world.playSettings;
  if (!saved) return DEFAULT_PLAY_SETTINGS;
  // Lives saved before OW-1 also carry retired difficulty fields; they are
  // dropped here so nothing can read them.
  return {
    saves: saved.saves ?? DEFAULT_PLAY_SETTINGS.saves,
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
): World {
  const current = playSettingsOf(world);
  if (current[key] === value) return world;
  const next = {
    ...world,
    playSettings: { ...current, [key]: value },
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
  readonly personalLifeDepiction?: PersonalLifeDepiction;
}): PlaySettings {
  return {
    saves: input.saves ?? DEFAULT_PLAY_SETTINGS.saves,
    personalLifeDepiction:
      input.personalLifeDepiction ??
      DEFAULT_PLAY_SETTINGS.personalLifeDepiction,
  };
}
