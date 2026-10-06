import { measureById } from "./legislation";
import { personName } from "./people";
import { publicFaceOfPart } from "./provision-public-face";
import { voteBundle, type VoteBundlePart } from "./vote-bundle";
import type { EntityId, World } from "./types";

export type VoteReadingClass = "honest" | "misleading" | "false";

export interface VoteReadingClaim {
  readonly voteId: EntityId;
  readonly personId: EntityId;
  readonly part: VoteBundlePart;
  readonly wording: string;
  readonly classification: VoteReadingClass;
}

/**
 * Classify a rival's plain claim that a named member voted against one part.
 * The vote bundle is the only source of truth: no popularity or weights enter.
 */
export function classifyVoteReading(
  world: World,
  voteId: EntityId,
  personId: EntityId,
  part: VoteBundlePart,
): VoteReadingClaim | null {
  const vote = (world.history.legislativeVotes ?? []).find(
    (row) => row.id === voteId,
  );
  if (!vote) return null;
  const bundle = voteBundle(world, vote);
  const isInBundle = bundle.parts.some((row) => samePart(row, part));
  const disposition = vote.dispositions.find(
    (row) => row.personId === personId,
  )?.disposition;
  const measure = measureById(world, vote.measureId);
  const person = world.people[personId];
  const name = person ? personName(person) : "The member";
  const wording = `${name} voted against ${publicFaceOfPart(world, part).label}`;
  let classification: VoteReadingClass;
  if (!isInBundle || (disposition !== "yea" && disposition !== "nay")) {
    classification = "false";
  } else if (disposition === "yea") {
    classification = "false";
  } else if (
    bundle.parts.length === 1 ||
    (part.answers !== null &&
      measure?.propositionIds?.[0] === part.answers.propositionId)
  ) {
    classification = "honest";
  } else {
    classification = "misleading";
  }
  return { voteId, personId, part, wording, classification };
}

function samePart(left: VoteBundlePart, right: VoteBundlePart): boolean {
  return (
    left.source === right.source &&
    left.provisionId === right.provisionId &&
    left.provisionKey === right.provisionKey &&
    left.answers?.propositionId === right.answers?.propositionId
  );
}
