import { congressSeats } from "./living-world/congress-seats";
import { candidacyPackById } from "./candidacy-packs";
import { recordByStableKey } from "./history-index";
import { stateSeatDemocraticShare } from "./nationwide-world/state-legislature-candidates";
import {
  STATE_LEGISLATURE_KEYS,
  stateLegislativeSeats,
} from "./nationwide-world/state-legislature-opening";
import { politicalStartingConditions } from "./world-setup/conditions";
import type { EntityId, IsoDate, World } from "./types";

/** A saved district baseline is evidence for an estimate, never a respondent. */
export interface CampaignPollingEstimatePeer {
  readonly seatKey: string;
  readonly sourceEntityId: EntityId;
  readonly referenceDate: IsoDate;
  readonly democraticShare: number;
}

export interface CampaignPollingEstimate {
  readonly label: "Estimate, no poll of your own yet";
  readonly comparison:
    | "same-state-and-chamber"
    | "same-chamber"
    | "same-pack-and-office"
    | "same-state-congress-districts"
    | "congress-districts";
  readonly democraticShare: number;
  /** Population spread of the listed game records, not a sampling margin. */
  readonly standardDeviation: number;
  readonly minimum: number;
  readonly maximum: number;
  readonly peers: readonly CampaignPollingEstimatePeer[];
}

/**
 * Read a congressional district estimate from this save's recorded seat leans.
 * Prefer the same state and chamber; disclose the broader chamber comparison
 * when that state has no recorded shares. No candidate support is read here.
 * Opening lean cannot establish subsequent polling drift or a respondent count.
 */
export function campaignDistrictPollingEstimate(
  world: World,
  seatKey: string,
): CampaignPollingEstimate {
  const seats = congressSeats();
  const target = seats.find((seat) => seat.seatKey === seatKey);
  if (!target) throw new Error(`Unknown congressional seat: ${seatKey}`);
  return congressEstimate(world, target.chamberKey, target.stateUsps);
}

function congressEstimate(
  world: World,
  chamberKey: string,
  stateUsps: string,
): CampaignPollingEstimate {
  const seats = congressSeats();
  const conditions = politicalStartingConditions(world);
  if (!conditions) throw new Error("This save has no recorded district leans.");
  const identities = new Map(seats.map((seat) => [seat.seatKey, seat]));
  const comparable = conditions.seats.flatMap((record) => {
    const identity = identities.get(record.seatKey);
    const share = record.generatedShare;
    if (
      identity?.chamberKey !== chamberKey ||
      record.baselineKind !== "certified-two-party" ||
      share === null ||
      !Number.isFinite(share) ||
      share < 0 ||
      share > 1
    ) {
      return [];
    }
    return [{ identity, record, share }];
  });
  const local = comparable.filter(
    ({ identity }) => identity.stateUsps === stateUsps,
  );
  const selected = local.length ? local : comparable;
  if (!selected.length) {
    throw new Error("This save has no comparable recorded district shares.");
  }
  const peers = selected
    .map(({ record, share }) => ({
      seatKey: record.seatKey,
      sourceEntityId: conditions.id,
      referenceDate: conditions.effectiveDate,
      democraticShare: share,
    }))
    .sort((left, right) => left.seatKey.localeCompare(right.seatKey));
  return summarizePeers(
    peers,
    local.length ? "same-state-and-chamber" : "same-chamber",
  );
}

/**
 * Read the saved state chamber's district leans, including vacant seats.
 * When its shares are missing, use recorded congressional district peers and
 * disclose that broader comparison. Those districts are legislative electoral
 * geographies; their lean is never represented as this campaign's own poll.
 */
export function campaignStateDistrictPollingEstimate(
  world: World,
  packId: string,
  officeKey: string,
): CampaignPollingEstimate {
  const opening = recordByStableKey(
    world.history.events,
    STATE_LEGISLATURE_KEYS.opening(packId),
  );
  const peers = (opening ? stateLegislativeSeats(world, packId) : [])
    .filter((seat) => seat.officeKey === officeKey)
    .flatMap((seat) => {
      const share = stateSeatDemocraticShare(
        world,
        packId,
        seat.officeKey,
        seat.ordinal,
      );
      return share === null
        ? []
        : [
            {
              seatKey: `${packId}|${seat.officeKey}|${seat.ordinal}`,
              sourceEntityId: opening!.id,
              referenceDate: opening!.occurredAt,
              democraticShare: share,
            },
          ];
    })
    .sort((left, right) => left.seatKey.localeCompare(right.seatKey));
  if (!peers.length) {
    const pack = candidacyPackById(packId);
    if (!pack?.offices.some((office) => office.officeKey === officeKey)) {
      throw new Error("Unknown state legislative office.");
    }
    const estimate = congressEstimate(
      world,
      "us-house",
      pack.jurisdictionKey.replace(/^US-/, ""),
    );
    return {
      ...estimate,
      comparison:
        estimate.comparison === "same-state-and-chamber"
          ? "same-state-congress-districts"
          : "congress-districts",
    };
  }
  return summarizePeers(peers, "same-pack-and-office");
}

function summarizePeers(
  peers: readonly CampaignPollingEstimatePeer[],
  comparison: CampaignPollingEstimate["comparison"],
): CampaignPollingEstimate {
  if (!peers.length) {
    throw new Error("This save has no comparable recorded district shares.");
  }
  const democraticShare =
    peers.reduce((sum, peer) => sum + peer.democraticShare, 0) / peers.length;
  const variance =
    peers.reduce(
      (sum, peer) => sum + (peer.democraticShare - democraticShare) ** 2,
      0,
    ) / peers.length;
  return {
    label: "Estimate, no poll of your own yet",
    comparison,
    democraticShare,
    standardDeviation: Math.sqrt(variance),
    minimum: Math.min(...peers.map((peer) => peer.democraticShare)),
    maximum: Math.max(...peers.map((peer) => peer.democraticShare)),
    peers,
  };
}
