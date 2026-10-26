/**
 * The bench player driven through the federal day, as the play screen does
 * it: day by day (or skipping), a federal hold handed to the caller, what
 * the caller leaves left to the character, the polls and the desk left to
 * the character too.
 */
import type { BenchPlayer } from "../../src/bench/player";
import type { CoreAPI } from "../../src/core2/types";
import {
  deskWaiting,
  leaveDeskToCharacter,
} from "../../src/core2/modules/office-day";
import {
  heldFederal,
  releaseFederal,
} from "../../src/core2/office-day-federal";

export function playThrough(
  player: BenchPlayer,
  api: CoreAPI,
  date: string,
  onHold: (key: string) => void = () => {},
  mode: "day" | "skip" = "day",
): void {
  for (let guard = 0; guard < 20_000; guard++) {
    if (player.pollingPlace) player.leavePolls();
    const packet = player.packet;
    if (packet?.kind === "stop") {
      for (const key of heldFederal(api)) onHold(key);
      for (const key of heldFederal(api)) releaseFederal(api, key);
      for (const bill of deskWaiting(api)) leaveDeskToCharacter(api, bill.id);
      player.resume({ kind: "stop", pauseId: packet.pauseId });
      continue;
    }
    if (packet?.kind === "choice") {
      player.resume({ kind: "own-choice", pauseId: packet.pauseId });
      continue;
    }
    if (api.state.date >= date) return;
    player.advance(mode);
  }
  throw new Error(`The day did not reach ${date}`);
}
