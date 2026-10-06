import { recordWorldEvent } from "./world";
import type {
  ChallengeIntensity,
  FamilyMoneyPremise,
  NotebookNotesSetting,
  PersonalLifeDepiction,
  PlaySettings,
  PressPremise,
  SaveMode,
  World,
} from "./types";

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  challenge: "standard",
  notes: "full",
  saves: "free",
  personalLifeDepiction: "full",
  premises: {
    familyMoney: "ordinary",
    press: "realistic",
    ongoingMoneyCosts: "standard",
  },
};

/** One-save remains hidden from new players until the owner enables the option. */
export const ONE_SAVE_OFFERED = false;

export function playSettingsOf(world: World): PlaySettings {
  const saved = world.playSettings;
  if (!saved) return DEFAULT_PLAY_SETTINGS;
  return {
    ...DEFAULT_PLAY_SETTINGS,
    ...saved,
    personalLifeDepiction:
      saved.personalLifeDepiction ??
      DEFAULT_PLAY_SETTINGS.personalLifeDepiction,
  };
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
  key: "personalLifeDepiction",
  value: PersonalLifeDepiction,
): World;
export function setPlaySetting(
  world: World,
  key: "challenge" | "notes" | "personalLifeDepiction",
  value: ChallengeIntensity | NotebookNotesSetting | PersonalLifeDepiction,
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
  readonly personalLifeDepiction?: PersonalLifeDepiction;
  readonly familyMoney?: FamilyMoneyPremise;
  readonly press?: PressPremise;
}): PlaySettings {
  return {
    challenge: input.challenge ?? DEFAULT_PLAY_SETTINGS.challenge,
    notes: input.notes ?? DEFAULT_PLAY_SETTINGS.notes,
    saves: input.saves ?? DEFAULT_PLAY_SETTINGS.saves,
    personalLifeDepiction:
      input.personalLifeDepiction ??
      DEFAULT_PLAY_SETTINGS.personalLifeDepiction,
    premises: {
      familyMoney:
        input.familyMoney ?? DEFAULT_PLAY_SETTINGS.premises.familyMoney,
      press: input.press ?? DEFAULT_PLAY_SETTINGS.premises.press,
      ongoingMoneyCosts: "standard",
    },
  };
}
