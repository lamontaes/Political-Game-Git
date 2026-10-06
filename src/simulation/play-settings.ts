import { recordWorldEvent } from "./world";
import type {
  ChallengeIntensity,
  FamilyMoneyPremise,
  NotebookNotesSetting,
  PlaySettings,
  PressPremise,
  SaveMode,
  World,
} from "./types";

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  challenge: "standard",
  notes: "full",
  saves: "free",
  premises: {
    familyMoney: "ordinary",
    press: "realistic",
    ongoingMoneyCosts: "standard",
  },
};

/** One-save remains hidden from new players until the owner enables the option. */
export const ONE_SAVE_OFFERED = false;

export function playSettingsOf(world: World): PlaySettings {
  return world.playSettings ?? DEFAULT_PLAY_SETTINGS;
}

/** Record one player-visible option change as a private, non-canonical event. */
export function setPlaySetting(
  world: World,
  key: "challenge",
  value: ChallengeIntensity,
): World;
export function setPlaySetting(
  world: World,
  key: "notes",
  value: NotebookNotesSetting,
): World;
export function setPlaySetting(
  world: World,
  key: "challenge" | "notes",
  value: ChallengeIntensity | NotebookNotesSetting,
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
  readonly challenge?: ChallengeIntensity;
  readonly notes?: NotebookNotesSetting;
  readonly saves?: SaveMode;
  readonly familyMoney?: FamilyMoneyPremise;
  readonly press?: PressPremise;
}): PlaySettings {
  return {
    challenge: input.challenge ?? DEFAULT_PLAY_SETTINGS.challenge,
    notes: input.notes ?? DEFAULT_PLAY_SETTINGS.notes,
    saves: input.saves ?? DEFAULT_PLAY_SETTINGS.saves,
    premises: {
      familyMoney:
        input.familyMoney ?? DEFAULT_PLAY_SETTINGS.premises.familyMoney,
      press: input.press ?? DEFAULT_PLAY_SETTINGS.premises.press,
      ongoingMoneyCosts: "standard",
    },
  };
}
