import {
  mostRecentWorldMetricStateAt,
  recordWorldMetricState,
} from "./world-metrics";
import { createExactQuantity } from "./quantity";
import type {
  CampaignCandidateSupportScope,
  CampaignRecord,
  EntityId,
  World,
  WorldMetricStateRecord,
} from "./types";

/**
 * Canonical campaign support, shared by the player's campaign and by opponent
 * campaigns in the same contest.
 *
 * Support is a share, so any gain is a transfer from everybody else in the
 * contest. One writer serves both sides, so an opponent's canvass and the
 * player's canvass are the same kind of fact and nobody's work is scored on a
 * separate scale. None of this is re-exported by the simulation barrel.
 */

/** No candidate is allowed to fall below one percent of canonical support. */
export const SUPPORT_FLOOR_BASIS_POINTS = 100;

/** Support is carried in basis points of one, so ten thousand is everybody. */
export const SUPPORT_DENOMINATOR = 10_000;

export function quantityBasisPoints(state: WorldMetricStateRecord): number {
  if (
    state.value.kind !== "quantity" ||
    state.value.quantity.unit !== "rate:share"
  ) {
    throw new Error("Campaign support state is not an exact share.");
  }
  const scaled =
    (state.value.quantity.numerator * SUPPORT_DENOMINATOR) /
    state.value.quantity.denominator;
  if (!Number.isSafeInteger(scaled)) {
    throw new Error("Campaign support cannot be represented in basis points.");
  }
  return scaled;
}

export function latestSupportState(
  world: World,
  campaign: CampaignRecord,
  scope: CampaignCandidateSupportScope,
): WorldMetricStateRecord {
  const state = mostRecentWorldMetricStateAt(
    world,
    campaign.supportMetricId,
    { jurisdictionId: campaign.jurisdictionId, segmentKey: scope.segmentKey },
    {
      asOfDate: world.currentDate,
      historySequenceExclusive: world.history.nextSequence,
    },
  );
  if (!state) {
    throw new Error(
      `Campaign support state is missing: ${scope.candidatePersonId}`,
    );
  }
  return state;
}

/**
 * Support for every candidate after `gainerPersonId` gains up to
 * `gainBasisPoints`, taken evenly (in sorted-id order) from the rest of the
 * field and never below the floor.
 */
export function supportAfterGain(
  world: World,
  campaign: CampaignRecord,
  gainerPersonId: EntityId,
  gainBasisPoints: number,
): Readonly<Record<string, number>> {
  const current = Object.fromEntries(
    campaign.candidateSupportScopes.map((scope) => [
      scope.candidatePersonId,
      quantityBasisPoints(latestSupportState(world, campaign, scope)),
    ]),
  ) as Record<string, number>;
  if (current[gainerPersonId] === undefined) {
    throw new Error(
      `That person is not a candidate in this contest: ${gainerPersonId}`,
    );
  }
  const others = campaign.candidateSupportScopes
    .map((scope) => scope.candidatePersonId)
    .filter((personId) => personId !== gainerPersonId)
    .sort();
  let remaining = Math.max(0, Math.floor(gainBasisPoints));
  let removed = 0;
  for (let index = 0; index < others.length && remaining > 0; index += 1) {
    const otherId = others[index]!;
    const share = Math.ceil(remaining / (others.length - index));
    const take = Math.min(
      share,
      Math.max(0, current[otherId]! - SUPPORT_FLOOR_BASIS_POINTS),
    );
    current[otherId] = current[otherId]! - take;
    remaining -= take;
    removed += take;
  }
  current[gainerPersonId] = current[gainerPersonId]! + removed;
  return current;
}

/**
 * Record support for every candidate in `campaign`'s contest after a gain,
 * superseding any same-day point state. Stable keys are
 * `${stableKeyBase}:support:${candidatePersonId}`.
 */
export function recordSupportShift(
  world: World,
  campaign: CampaignRecord,
  input: {
    readonly stableKeyBase: string;
    readonly gainerPersonId: EntityId;
    readonly gainBasisPoints: number;
    readonly sourceEntityIds: readonly EntityId[];
  },
): {
  readonly world: World;
  readonly stateIds: readonly EntityId[];
  readonly stateIdByPerson: Readonly<Record<string, EntityId>>;
} {
  const support = supportAfterGain(
    world,
    campaign,
    input.gainerPersonId,
    input.gainBasisPoints,
  );
  let next = world;
  const stateIds: EntityId[] = [];
  const stateIdByPerson: Record<string, EntityId> = {};
  for (const scope of campaign.candidateSupportScopes) {
    const samePeriod = next.history.metricStates
      .filter(
        (state) =>
          state.metricId === campaign.supportMetricId &&
          state.scope.jurisdictionId === campaign.jurisdictionId &&
          state.scope.segmentKey === scope.segmentKey &&
          state.referencePeriod.kind === "point" &&
          state.referencePeriod.at === next.currentDate,
      )
      .at(-1);
    next = recordWorldMetricState(next, {
      stableKey: `${input.stableKeyBase}:support:${scope.candidatePersonId}`,
      metricId: campaign.supportMetricId,
      scope: {
        jurisdictionId: campaign.jurisdictionId,
        segmentKey: scope.segmentKey,
      },
      referencePeriod: { kind: "point", at: next.currentDate },
      value: {
        kind: "quantity",
        quantity: createExactQuantity(
          support[scope.candidatePersonId]!,
          SUPPORT_DENOMINATOR,
          "rate:share",
        ),
      },
      recordedAt: next.currentDate,
      provenance: {
        kind: "simulated",
        sourceEntityIds: [...input.sourceEntityIds],
      },
      supersedesStateId: samePeriod?.id ?? null,
    });
    const stateId = next.history.metricStates.at(-1)!.id;
    stateIds.push(stateId);
    stateIdByPerson[scope.candidatePersonId] = stateId;
  }
  return { world: next, stateIds, stateIdByPerson };
}
