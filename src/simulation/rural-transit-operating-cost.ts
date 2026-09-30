import observations from "../../data/research/transit/ntd-2023-rural-demand-response-costs.json";
import { stableHash } from "./ids";
import type { EntityId, World } from "./types";

/** A stable world/place cost characteristic, never a draw of a person's action.
 * Uses the empirical distribution of 1,025 NTD reporting mode/service records.
 * No inflation adjustment or marginal-cost interpretation is asserted.
 */
export function ruralTransitOperatingCostAt(
  world: Pick<World, "seed">,
  jurisdictionId: EntityId,
) {
  const index =
    Number.parseInt(
      stableHash(`ntd-2023-rural-dr:${world.seed}:${jurisdictionId}`).slice(
        0,
        8,
      ),
      16,
    ) % observations.rows.length;
  const row = observations.rows[index]!;
  return {
    minorUnitsPerVehicleRevenueHour: Math.round(row.usdPerVRH * 100),
    sourceNTDId: row.ntdId,
    sourceTypeOfService: row.tos,
    sourceYear: 2023,
    basis: "estimated-from-ntd-average-operating-cost" as const,
  };
}
