/**
 * The saved-world orientation contract L reads: ROLE W's `alive43-world/v1`.
 *
 * Re-exported rather than restated, so the reader cannot drift from what W's
 * writer and projection actually produce. Any field L needs beyond these is a
 * request to W, not a local addition.
 */
export {
  LIVING_WORLD_CONTRACT_VERSION,
  type ChamberKey,
  type ChamberTotals,
  type ChamberView,
  type CongressView,
  type PartyView,
  type PublicHolderView,
  type SeatOccupant,
  type SeatView,
} from "../simulation";
export {
  projectWorldOrientation,
  type LocalityGovernmentView,
  type WorldOrientation,
} from "./living-world-orientation";
