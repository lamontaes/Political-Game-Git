import { MEETINGS_MODULE_ID, type RemarkRow } from "../core2/modules/meetings";
import { SPEECH_OCCASION_ID } from "../core2/modules/people";
import { coreAPI } from "../core2/state";
import type { CoreState } from "../core2/types";

/**
 * The public comment a heard speech was, from the meetings engine's own
 * remark row: its bill and the side the speaker took. Null for any other
 * speech. The speech record names the remark it was given as (its occasion
 * id), which opens the row.
 */
export function remarkOf(
  core: Readonly<CoreState>,
  causeId: string,
): RemarkRow | null {
  if (!core.modules.has(MEETINGS_MODULE_ID)) return null;
  const id = core.durableLog.get(causeId)?.facts?.[SPEECH_OCCASION_ID];
  if (typeof id !== "string" || !id) return null;
  return (
    (coreAPI(core as CoreState)
      .moduleState(MEETINGS_MODULE_ID)
      .table("remarks")
      .get(id) as unknown as RemarkRow | undefined) ?? null
  );
}
