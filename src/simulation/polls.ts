import { isEligibleVoterIn } from "./issue-record";
import { stableHash } from "./ids";
import { makeIsoDate } from "./dates";
import type { EntityId, World } from "./types";

/** Select from the registered electorate by a poll-specific stable key only. */
export function selectedPollRespondents(
  world: World,
  jurisdictionId: EntityId,
  fieldedAt: string,
  sampleSize: number,
  stableKey: string,
): readonly EntityId[] {
  if (!Number.isSafeInteger(sampleSize) || sampleSize <= 0)
    throw new Error("A poll sample size must be a positive integer.");
  if (!stableKey.trim()) throw new Error("A poll needs a stable key.");
  const asOf = makeIsoDate(fieldedAt);
  const eligible = world.personOrder.filter((personId) =>
    isEligibleVoterIn(world, personId, jurisdictionId, asOf),
  );
  return eligible
    .map((personId, order) => ({
      personId,
      order,
      key: stableHash(`${stableKey}:${personId}`),
    }))
    .sort(
      (left, right) =>
        left.key.localeCompare(right.key) || left.order - right.order,
    )
    .slice(0, sampleSize)
    .sort((left, right) => left.order - right.order)
    .map(({ personId }) => personId);
}

/** Two-sided 95% normal-approximation margin, using the worst-case p=.5. */
export function worstCasePollMarginOfError95(
  completedInterviews: number,
): number | null {
  if (!Number.isSafeInteger(completedInterviews) || completedInterviews < 0)
    throw new Error("Completed interviews must be a nonnegative integer.");
  if (completedInterviews === 0) return null;
  return 1.96 * Math.sqrt(0.25 / completedInterviews);
}

/** Commissioning remains blocked until a real survey payee and place-price basis exist. */
export function commissionPoll(
  world: World,
  input: {
    readonly sponsorId: EntityId;
    readonly contestId?: EntityId;
    readonly officialId?: EntityId;
    readonly sampleSize: number;
    readonly fieldedAt: string;
  },
): never {
  void world;
  void input;
  throw new Error(
    "Cannot commission a paid poll yet: no modeled polling vendor/resource endpoint or researched place-wage price adjustment exists.",
  );
}
