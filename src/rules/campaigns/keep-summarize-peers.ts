// Lifted unchanged from src/simulation/campaign-polling-estimate.ts; RULES-3, 2026-10-11.
import type { EntityId, IsoDate } from "../../simulation/types";

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

export function summarizePeers(
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
