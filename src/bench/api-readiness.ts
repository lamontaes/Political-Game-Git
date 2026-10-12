import {
  advancePlayerV1,
  resumePlayerV1,
  earliestPlayerStopV1,
} from "../core2/player-v1";
import { resolveSavedTraceV1 } from "../core2/saved-trace-v1";
export function playerApiReadiness() {
  return {
    contract: "core2-part1b-v1",
    implementation: Object.fromEntries(
      Object.entries({
        advancePlayerV1,
        resumePlayerV1,
        earliestPlayerStopV1,
        resolveSavedTraceV1,
      }).map(([name, value]) => [name, typeof value === "function"]),
    ),
    wired: true,
    status: "bench adapter installed",
  };
}
