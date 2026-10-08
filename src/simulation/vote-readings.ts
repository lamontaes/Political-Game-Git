import type { VoteBundle, VoteBundlePart } from "./vote-bundle";
import type { LegislativeMemberDisposition } from "./types";

export type VoteReadingClass = "honest" | "misleading" | "false";

export interface VoteReadingClassification {
  readonly classification: VoteReadingClass;
  readonly part: VoteBundlePart | null;
}

/** Classify a claim that a member voted against one part of a saved vote. */
export function classifyVoteReading(
  bundle: VoteBundle,
  disposition: LegislativeMemberDisposition | null,
  partIndex: number,
): VoteReadingClassification {
  const part = bundle.parts[partIndex] ?? null;
  if (!part || (disposition !== "yea" && disposition !== "nay"))
    return { classification: "false", part };

  if (disposition !== "nay") return { classification: "false", part };

  const mainQuestion = bundle.parts.find(
    (candidate) => candidate.source === "filed-question",
  );
  if (bundle.parts.length === 1 || part === mainQuestion)
    return { classification: "honest", part };

  return { classification: "misleading", part };
}
