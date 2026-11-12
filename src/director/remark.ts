import {
  MEETINGS_MODULE_ID,
  remarksOn,
  type RemarkRow,
} from "../core2/modules/meetings";
import { P } from "../core2/parameters";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

const REMARK_SPEECH = "speech:remark:";

/**
 * The public comment a heard speech was, from the meetings engine's own
 * remark row: its bill and the side the speaker took. Null for any other
 * speech. The speech record names no bill, so its id, which the meetings
 * engine gives as `speech:remark:<bill>:<speaker>`, says which remark to read
 * (stopgapId: SG-DIRECTOR-speech-occasion, as speechOccasion reads it).
 */
export function remarkOf(
  core: Readonly<CoreState>,
  causeId: string,
): RemarkRow | null {
  if (!causeId.startsWith(REMARK_SPEECH)) return null;
  if (!core.modules.has(MEETINGS_MODULE_ID)) return null;
  const rest = causeId.slice(REMARK_SPEECH.length);
  const cut = rest.lastIndexOf(":");
  if (cut <= P.zero) return null;
  const billId = rest.slice(P.zero, cut);
  const speakerId = rest.slice(cut + P.one);
  return (
    remarksOn(coreAPI(core as CoreState), billId).find(
      (row) => row.personId === speakerId,
    ) ?? null
  );
}
