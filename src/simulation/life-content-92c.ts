import type {
  EpisodeFamily,
  EpisodeOption,
  EpisodeStage,
} from "./life-episodes";

/** Compatibility names for a withdrawn fixed-content wave. No prose or
 * playable scene is retained in the shipped source. */
export interface KernelProvenance {
  readonly kernelId: string;
  readonly episodeKey: string;
  readonly stageKey: string;
  readonly track: "A" | "B" | "C" | "E";
  readonly isKernel: boolean;
}

export const LIFE_CONTENT_92C_KERNELS: readonly KernelProvenance[] = [];
export const LIFE_CONTENT_92C_SCHOOL_STAGES: readonly EpisodeStage[] = [];
export const LIFE_CONTENT_92C_HOME_STAGES: readonly EpisodeStage[] = [];
export const LIFE_CONTENT_92C_CIVIC_STAGES: readonly EpisodeStage[] = [];
export const LIFE_CONTENT_92C_WORK_STAGES: readonly EpisodeStage[] = [];
export const LIFE_CONTENT_92C_POLITICAL_STAGES: readonly EpisodeStage[] = [];
export const LIFE_CONTENT_92C_COMPANIONSHIP_STAGES: readonly EpisodeStage[] =
  [];
export const LIFE_CONTENT_92C_FAMILIES: readonly EpisodeFamily[] = [];
export const LIFE_CONTENT_92C_PROSE_PENDING_STAGES: ReadonlySet<string> =
  new Set();

export function lifeContent92cStages(): readonly {
  readonly episodeKey: string;
  readonly stage: EpisodeStage;
}[] {
  return [];
}

export function lifeContent92cOptions(): readonly {
  readonly episodeKey: string;
  readonly stageKey: string;
  readonly option: EpisodeOption;
}[] {
  return [];
}
