import type {
  EpisodeFamily,
  EpisodeOption,
  EpisodeStage,
} from "./life-episodes";

/** The fixed episode corpus was withdrawn from ordinary play. New moments
 * must enter through saved facts and a reviewed English bank. */
export const EPISODE_BANK_VERSION = "pg-episode-bank-v1";
export const EPISODE_FAMILIES: readonly EpisodeFamily[] = [];

export function episodeFamily(key: string): EpisodeFamily | null {
  return EPISODE_FAMILIES.find((family) => family.key === key) ?? null;
}

export function episodeStage(
  familyKey: string,
  stageKey: string,
): EpisodeStage | null {
  return (
    episodeFamily(familyKey)?.stages.find((stage) => stage.key === stageKey) ??
    null
  );
}

export function episodeOption(
  familyKey: string,
  stageKey: string,
  optionKey: string,
): EpisodeOption | null {
  return (
    episodeStage(familyKey, stageKey)?.options.find(
      (option) => option.key === optionKey,
    ) ?? null
  );
}

export interface EpisodeBankSummary {
  readonly version: string;
  readonly families: number;
  readonly stages: number;
  readonly options: number;
  readonly familiesWithBranching: number;
  readonly familiesWithQuietEnding: number;
}

export function episodeBankSummary(): EpisodeBankSummary {
  return {
    version: EPISODE_BANK_VERSION,
    families: 0,
    stages: 0,
    options: 0,
    familiesWithBranching: 0,
    familiesWithQuietEnding: 0,
  };
}
