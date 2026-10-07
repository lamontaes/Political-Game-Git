import type { LegislativeMemberDisposition } from "./types";
import type { VoteBundle, VoteBundlePart } from "./vote-bundle";

export type VoteReadingClass = "honest" | "misleading" | "false";

/** Classifies the claim that a member voted against one part of a bill. */
export function classifyVoteReading(
  bundle: VoteBundle,
  disposition: LegislativeMemberDisposition | null,
  claimedPart: VoteBundlePart,
): VoteReadingClass {
  if (!bundle.parts.some((part) => samePart(part, claimedPart))) return "false";
  if (disposition !== "nay") return "false";

  if (bundle.parts.length === 1) return "honest";
  const mainQuestion = bundle.parts.find(
    (part) => part.source === "filed-question",
  );
  return mainQuestion && samePart(mainQuestion, claimedPart)
    ? "honest"
    : "misleading";
}

function samePart(left: VoteBundlePart, right: VoteBundlePart): boolean {
  return (
    left.source === right.source &&
    left.provisionId === right.provisionId &&
    left.provisionKey === right.provisionKey &&
    left.heading === right.heading &&
    left.answers?.propositionId === right.answers?.propositionId &&
    left.answers?.answer === right.answers?.answer
  );
}
