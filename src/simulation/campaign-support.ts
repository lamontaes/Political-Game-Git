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

/**
 * How far campaigning can carry one candidate's share.
 *
 * BLANKET RULE, not sourced. Before this, a gain was the same size at 90% as
 * at 40%, so steady canvassing ran one playtest candidate from 48% to 96% over
 * sixteen field weeks, and the memo reported that number honestly. Real
 * contested races rarely end past two to one, because the voters still
 * undecided late are the hardest to move and the other side's voters are not
 * moved by door-knocking at all.
 *
 * What it applies: work moves support at full strength up to half the field.
 * Above half, each gain is scaled by the headroom left below the ceiling, so it
 * shrinks steadily and reaches nothing at the ceiling. It applies to every
 * candidate, player and rival alike, and only to what campaigning earns: a
 * share that comes from a rival's loss is not capped here.
 *
 * Not modelled: the size of the electorate (an afternoon on the doors is worth
 * the same in a town of two thousand and a district of two hundred thousand),
 * partisan lean, and turnout. Filed with ChatGPT as
 * `campaign-activity-effects-by-race-size`, beside
 * `realistic-vote-shares-and-how-far-a-campaign-moves-them`.
 */
export const CAMPAIGN_SUPPORT_CEILING_BASIS_POINTS = 7_500;
const FULL_STRENGTH_BELOW_BASIS_POINTS = 5_000;

/**
 * The part of a requested gain that campaigning can actually earn from a
 * candidate's current share: all of it at or below half, a shrinking part of it
 * above half, and none of it at the ceiling.
 */
export function effectiveGainBasisPoints(
  currentBasisPoints: number,
  requestedBasisPoints: number,
): number {
  const requested = Math.max(0, Math.floor(requestedBasisPoints));
  if (currentBasisPoints >= CAMPAIGN_SUPPORT_CEILING_BASIS_POINTS) return 0;
  // The part of the gain that lands below half is taken whole.
  const whole = Math.min(
    requested,
    Math.max(0, FULL_STRENGTH_BELOW_BASIS_POINTS - currentBasisPoints),
  );
  const from = currentBasisPoints + whole;
  const rest = requested - whole;
  const headroom = CAMPAIGN_SUPPORT_CEILING_BASIS_POINTS - from;
  const span =
    CAMPAIGN_SUPPORT_CEILING_BASIS_POINTS - FULL_STRENGTH_BELOW_BASIS_POINTS;
  return whole + Math.min(headroom, Math.floor((rest * headroom) / span));
}

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
 * `gainBasisPoints` (less as the gainer nears the campaign ceiling), taken evenly (in sorted-id order) from the rest of the
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
  let remaining = effectiveGainBasisPoints(
    current[gainerPersonId]!,
    gainBasisPoints,
  );
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
): SupportWrite {
  return writeSupport(
    world,
    campaign,
    supportAfterGain(
      world,
      campaign,
      input.gainerPersonId,
      input.gainBasisPoints,
    ),
    input,
  );
}

/**
 * Support for every candidate after `loserPersonId` loses up to
 * `lossBasisPoints`, never below the floor, handed evenly (in sorted-id order)
 * to the rest of the field. The mirror of `supportAfterGain`: a share lost by
 * one candidate is a share somebody else now holds.
 */
export function supportAfterLoss(
  world: World,
  campaign: CampaignRecord,
  loserPersonId: EntityId,
  lossBasisPoints: number,
): Readonly<Record<string, number>> {
  const current = Object.fromEntries(
    campaign.candidateSupportScopes.map((scope) => [
      scope.candidatePersonId,
      quantityBasisPoints(latestSupportState(world, campaign, scope)),
    ]),
  ) as Record<string, number>;
  if (current[loserPersonId] === undefined) {
    throw new Error(
      `That person is not a candidate in this contest: ${loserPersonId}`,
    );
  }
  const others = campaign.candidateSupportScopes
    .map((scope) => scope.candidatePersonId)
    .filter((personId) => personId !== loserPersonId)
    .sort();
  if (others.length === 0) return current;
  const lost = Math.min(
    Math.max(0, Math.floor(lossBasisPoints)),
    Math.max(0, current[loserPersonId]! - SUPPORT_FLOOR_BASIS_POINTS),
  );
  current[loserPersonId] = current[loserPersonId]! - lost;
  let remaining = lost;
  for (let index = 0; index < others.length; index += 1) {
    const share = Math.ceil(remaining / (others.length - index));
    current[others[index]!] = current[others[index]!]! + share;
    remaining -= share;
  }
  return current;
}

/** Record support after a loss; stable keys as in `recordSupportShift`. */
export function recordSupportLoss(
  world: World,
  campaign: CampaignRecord,
  input: {
    readonly stableKeyBase: string;
    readonly loserPersonId: EntityId;
    readonly lossBasisPoints: number;
    readonly sourceEntityIds: readonly EntityId[];
  },
): SupportWrite {
  return writeSupport(
    world,
    campaign,
    supportAfterLoss(
      world,
      campaign,
      input.loserPersonId,
      input.lossBasisPoints,
    ),
    input,
  );
}

interface SupportWrite {
  readonly world: World;
  readonly stateIds: readonly EntityId[];
  readonly stateIdByPerson: Readonly<Record<string, EntityId>>;
}

function writeSupport(
  world: World,
  campaign: CampaignRecord,
  support: Readonly<Record<string, number>>,
  input: {
    readonly stableKeyBase: string;
    readonly sourceEntityIds: readonly EntityId[];
  },
): SupportWrite {
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
