import { townLeases } from "../simulation/living-world/town-rent";
import { resourceFlowTermsAt } from "../simulation/resource-queries";
import { spreadOf } from "../simulation/sample-spread";
import type { World } from "../simulation/types";

export interface CurrentWorldPeerEstimate {
  readonly mean: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly standardDeviation: number;
  readonly comparison: string;
  readonly peers: readonly {
    readonly entityId: string;
    readonly name: string;
    readonly value: number;
    readonly sourceRecordIds: readonly string[];
  }[];
}

/** Only observed current-game values contribute; no calibration or draws. */
function summarize(
  peers: CurrentWorldPeerEstimate["peers"],
  comparison: string,
): CurrentWorldPeerEstimate | null {
  const readable = peers.filter(
    (peer) => Number.isFinite(peer.value) && peer.value >= 0,
  );
  if (!readable.length) return null;
  const spread = spreadOf(readable.map((peer) => peer.value));
  return {
    mean: spread.mean,
    minimum: Math.min(...readable.map((peer) => peer.value)),
    maximum: Math.max(...readable.map((peer) => peer.value)),
    standardDeviation: spread.standardDeviation,
    comparison,
    peers: readable,
  };
}

export function currentWorldPopulationEstimate(
  world: World,
  stateUsps: string,
): CurrentWorldPeerEstimate | null {
  const governments = (world.publicBudgets?.governments ?? []).filter(
    (row) => row.level === "state",
  );
  const target = governments.find(
    (row) =>
      row.stateKey === `US-${stateUsps}` &&
      Number.isFinite(row.population) &&
      row.population >= 0,
  );
  // A saved figure for the actual place is more specific than a peer mean.
  const peers =
    target && Number.isFinite(target.population)
      ? [target]
      : governments.filter((row) => row.stateKey !== `US-${stateUsps}`);
  return summarize(
    peers.map((row) => ({
      entityId: row.jurisdictionId,
      name: row.name,
      value: row.population,
      sourceRecordIds: [row.key],
    })),
    target
      ? "this place's current government record"
      : "current state-level government records",
  );
}

/** Simulated turnout is distinct from historical self-reported registration. */
export function currentWorldVotingEstimate(
  world: World,
  stateUsps: string,
): CurrentWorldPeerEstimate | null {
  const latest = new Map<
    string,
    NonNullable<World["placeOutcomes"]>["months"][number]["records"][number]
  >();
  for (const month of world.placeOutcomes?.months ?? []) {
    if (month.month > world.currentDate) continue;
    for (const row of month.records) {
      if (
        row.measure !== "voting.turnout-pct" ||
        row.stateKey !== undefined ||
        row.month > world.currentDate
      )
        continue;
      const previous = latest.get(row.placeKey);
      if (!previous || row.month > previous.month)
        latest.set(row.placeKey, row);
    }
  }
  const target = latest.get(`US-${stateUsps}`);
  const peers = target ? [target] : [...latest.values()];
  return summarize(
    peers.map((row) => ({
      entityId: row.jurisdictionId,
      name: world.jurisdictions[row.jurisdictionId]?.name ?? row.placeKey,
      value: row.value,
      sourceRecordIds: [
        `place-outcomes:${row.placeKey}:${row.month}:${row.measure}`,
      ],
    })),
    target
      ? "this place's saved current turnout"
      : "saved current state-level turnout records",
  );
}

export function currentWorldTwoBedroomRentEstimate(
  world: World,
  jurisdictionId: string,
): CurrentWorldPeerEstimate | null {
  const visible = (sequence: number, date: string) =>
    sequence < world.history.nextSequence && date <= world.currentDate;
  const leaseWorld: World = {
    ...world,
    history: {
      ...world.history,
      resourceObligations: world.history.resourceObligations.filter((row) =>
        visible(row.sequence, row.establishedAt),
      ),
      resourceObligationStates: world.history.resourceObligationStates.filter(
        (row) => visible(row.sequence, row.effectiveAt),
      ),
      resourceFlows: world.history.resourceFlows.filter((row) =>
        visible(row.sequence, row.recordedAt),
      ),
      housingTenures: world.history.housingTenures.filter((row) =>
        visible(row.sequence, row.startedAt),
      ),
      dwellings: world.history.dwellings.filter((row) =>
        visible(row.sequence, row.establishedAt),
      ),
    },
  };
  const candidates = townLeases(leaseWorld).flatMap((lease) => {
    if (
      lease.ended ||
      lease.bedrooms !== 2 ||
      lease.flow.recordedAt > world.currentDate ||
      lease.flow.startsAt > world.currentDate
    )
      return [];
    const terms = resourceFlowTermsAt(world, lease.flow.id);
    if (
      !terms ||
      terms.status !== "active" ||
      terms.amount.currency !== "USD" ||
      terms.cadenceKind !== "schedule:monthly"
    )
      return [];
    return [
      {
        entityId: lease.dwellingId,
        name: `${world.history.dwellings.find((row) => row.id === lease.dwellingId)?.locationLabel ?? lease.dwellingId}, ${world.jurisdictions[lease.town]?.name ?? lease.town}`,
        town: lease.town,
        value: terms.amount.minorUnits / 100,
        sourceRecordIds: [
          lease.obligationId,
          lease.tenureId,
          lease.flow.id,
          terms.id,
        ],
      },
    ];
  });
  const local = candidates.filter((row) => row.town === jurisdictionId);
  const kind = world.jurisdictions[jurisdictionId]?.kind;
  const sameKind = candidates.filter(
    (row) => kind !== undefined && world.jurisdictions[row.town]?.kind === kind,
  );
  return summarize(
    local.length ? local : sameKind.length ? sameKind : candidates,
    local.length
      ? "current two-bedroom leases in this place"
      : sameKind.length
        ? "current two-bedroom leases in places of the same kind"
        : "current two-bedroom leases in the game",
  );
}

export function currentWorldEstimateCaption(
  estimate: CurrentWorldPeerEstimate,
): string {
  const format = (value: number) => Math.round(value).toLocaleString("en-US");
  return `Estimated from ${estimate.comparison}. Observed range ${format(estimate.minimum)}–${format(estimate.maximum)}; spread ${format(estimate.standardDeviation)}. Places: ${[...new Set(estimate.peers.map((peer) => peer.name))].join(", ")}.`;
}
